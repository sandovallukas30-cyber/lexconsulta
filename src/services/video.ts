/** Convierte el enlace de un video en algo que se pueda mostrar dentro de Prima Lex. Solo YouTube, Vimeo y archivos de video directos. */

export type Incrustado =
  | { tipo: 'iframe'; src: string; origen: 'YouTube' | 'Vimeo' }
  | { tipo: 'video'; src: string }
  | { tipo: 'ninguno'; motivo: string }

const ID_YT = /^[\w-]{11}$/
const HOSTS_YT = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be'])
const EXT_VIDEO = /\.(mp4|webm|ogv|m4v|mov)$/i

/** «1h2m3s», «90s» o «90» → segundos. */
function segundos(t: string | null): number {
  if (!t) return 0
  if (/^\d+$/.test(t)) return Math.min(Number(t), 86400)
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(t)
  if (!m) return 0
  return Math.min((Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0), 86400)
}

export function incrustar(texto: string): Incrustado {
  const limpio = texto.trim()
  if (!limpio) return { tipo: 'ninguno', motivo: 'Pega el enlace de un video.' }
  let url: URL
  try {
    url = new URL(/^[a-z]+:\/\//i.test(limpio) ? limpio : `https://${limpio}`)
  } catch {
    return { tipo: 'ninguno', motivo: 'Ese enlace no es válido.' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { tipo: 'ninguno', motivo: 'Solo se aceptan enlaces http o https.' }
  const host = url.hostname.toLowerCase()

  if (HOSTS_YT.has(host)) {
    const partes = url.pathname.split('/').filter(Boolean)
    let id = host === 'youtu.be' ? partes[0] : url.searchParams.get('v') ?? ''
    if (!id && ['shorts', 'embed', 'live', 'v'].includes(partes[0] ?? '')) id = partes[1] ?? ''
    const lista = url.searchParams.get('list')
    const inicio = segundos(url.searchParams.get('t') ?? url.searchParams.get('start'))
    const extra = `rel=0${inicio ? `&start=${inicio}` : ''}`
    if (id && ID_YT.test(id)) return { tipo: 'iframe', origen: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${id}?${extra}${lista && /^[\w-]+$/.test(lista) ? `&list=${lista}` : ''}` }
    if (lista && /^[\w-]+$/.test(lista)) return { tipo: 'iframe', origen: 'YouTube', src: `https://www.youtube-nocookie.com/embed/videoseries?list=${lista}&${extra}` }
    return { tipo: 'ninguno', motivo: 'No reconozco el video de YouTube en ese enlace.' }
  }

  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p))
    if (id) return { tipo: 'iframe', origen: 'Vimeo', src: `https://player.vimeo.com/video/${id}` }
    return { tipo: 'ninguno', motivo: 'No reconozco el video de Vimeo en ese enlace.' }
  }

  if (EXT_VIDEO.test(url.pathname)) return { tipo: 'video', src: url.toString() }
  return { tipo: 'ninguno', motivo: 'Ese sitio no se puede mostrar aquí: ábrelo en otra pestaña y deja Prima Lex al lado con el temporizador.' }
}

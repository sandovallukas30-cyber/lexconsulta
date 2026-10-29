import type { MapaMental } from '../types'

/** De un mapa mental a un apunte, sin IA: el mapa se recorre desde su raíz y
 *  cada rama se vuelve una sección; lo de más adentro, viñetas con sangría.
 *
 *  - Un nodo con «nota al margen» pasa a «- **nodo:** nota»: justo el formato
 *    que el repaso convierte en tarjeta. Si es un título de sección, la nota
 *    va en un recuadro 📝 debajo.
 *  - Una conexión con etiqueta (p. ej. «requisito») se escribe como ~requisito~
 *    antes del texto.
 *  - Un nodo «Término: definición» (con el término corto) también pasa a tarjeta.
 *  - El orden de los hermanos es el de lectura en la pantalla (de arriba hacia abajo). */

type Nodo = MapaMental['nodos'][number]
interface Hijo {
  id: string
  etiqueta?: string
}

const FECHA_AL_FINAL = /\s+—\s+\d{1,2}\s+\p{L}+\.?\s+\d{4}$/u
const RE_TERMINO = /^([^:\n]{2,50}):\s+(\S.*)$/

/** El título del mapa sin la fecha que se le pega al crearlo. */
export const tituloSinFecha = (t: string): string => t.replace(FECHA_AL_FINAL, '').trim()

const limpiar = (t: string): string => t.replace(/\s+/g, ' ').replace(/^[#>•\-\s]+/, '').trim()
const norm = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export function mapaAApunte(mapa: Pick<MapaMental, 'titulo' | 'nodos' | 'conexiones'>): { titulo: string; contenido: string } {
  const titulo = tituloSinFecha(mapa.titulo) || 'Apunte desde un mapa mental'
  const nodos = new Map<string, Nodo>(mapa.nodos.map((n) => [n.id, n]))
  const hijos = new Map<string, Hijo[]>()
  const conPadre = new Set<string>()
  const lectura = (a: Nodo, b: Nodo) => a.posicion.y - b.posicion.y || a.posicion.x - b.posicion.x

  for (const c of mapa.conexiones) {
    if (c.desde === c.hasta || !nodos.has(c.desde) || !nodos.has(c.hasta)) continue
    const lista = hijos.get(c.desde) ?? []
    if (!lista.some((h) => h.id === c.hasta)) lista.push({ id: c.hasta, etiqueta: c.etiqueta?.trim() || undefined })
    hijos.set(c.desde, lista)
    conPadre.add(c.hasta)
  }
  for (const lista of hijos.values()) lista.sort((a, b) => lectura(nodos.get(a.id)!, nodos.get(b.id)!))

  const visitado = new Set<string>()
  const lineas: string[] = []
  const texto = (n: Nodo) => limpiar(n.texto) || '(sin texto)'
  const pendientes = (id: string) => (hijos.get(id) ?? []).filter((h) => !visitado.has(h.id))

  /** Texto de una viñeta: tarjeta si el nodo tiene nota o tiene forma «Término: definición». */
  function viñeta(n: Nodo, etiqueta?: string): string {
    const t = texto(n)
    const nota = limpiar(n.nota ?? '')
    if (nota) return `**${t.replace(/:\s*$/, '')}:** ${nota}`
    const m = RE_TERMINO.exec(t)
    if (m && m[1].trim().split(' ').length <= 6) return `**${m[1].trim()}:** ${m[2].trim()}`
    return etiqueta ? `~${etiqueta}~ ${t}` : t
  }

  function bullets(id: string, prof: number, etiqueta?: string) {
    if (visitado.has(id)) return
    visitado.add(id)
    const n = nodos.get(id)!
    lineas.push(`${'\t'.repeat(prof)}- ${viñeta(n, etiqueta)}`)
    for (const h of pendientes(id)) bullets(h.id, prof + 1, h.etiqueta)
  }

  /** Lo que cuelga de un título: primero las hojas sueltas como viñetas, después cada rama como sección. */
  function cuerpo(id: string, nivelHijos: 2 | 3) {
    const lista = pendientes(id)
    const hojas = lista.filter((h) => pendientes(h.id).length === 0)
    const ramas = lista.filter((h) => !hojas.includes(h))
    for (const h of hojas) bullets(h.id, 0, h.etiqueta)
    for (const h of ramas) {
      if (visitado.has(h.id)) continue
      if (nivelHijos <= 3) seccion(h.id, nivelHijos)
    }
  }

  function seccion(id: string, nivel: 2 | 3) {
    if (visitado.has(id)) return
    visitado.add(id)
    const n = nodos.get(id)!
    if (lineas.length > 0) lineas.push('')
    lineas.push(`${'#'.repeat(nivel)} ${texto(n)}`)
    const nota = limpiar(n.nota ?? '')
    if (nota) lineas.push(`> 📝 ${nota}`)
    if (nivel === 2) cuerpo(id, 3)
    else for (const h of pendientes(id)) bullets(h.id, 0, h.etiqueta) // más adentro de «###» todo son viñetas anidadas
  }

  const raices = mapa.nodos.filter((n) => !conPadre.has(n.id)).sort((a, b) => a.posicion.x - b.posicion.x || a.posicion.y - b.posicion.y)
  if (raices.length === 0 && mapa.nodos.length > 0) raices.push([...mapa.nodos].sort((a, b) => a.posicion.x - b.posicion.x || a.posicion.y - b.posicion.y)[0])

  // una raíz sin nada colgando no es una sección: va a «Otras ideas»
  const conHijos = raices.filter((r) => (hijos.get(r.id)?.length ?? 0) > 0)
  if (conHijos.length === 1 && norm(texto(conHijos[0])) === norm(titulo)) {
    // la raíz es el título del mapa: no se repite como sección
    const r = conHijos[0]
    visitado.add(r.id)
    const nota = limpiar(r.nota ?? '')
    if (nota) lineas.push(`> 📝 ${nota}`)
    cuerpo(r.id, 2)
  } else {
    for (const r of conHijos) seccion(r.id, 2)
  }

  const sueltos = mapa.nodos.filter((n) => !visitado.has(n.id) && !(norm(texto(n)) === norm(titulo) && !conPadre.has(n.id) && !hijos.has(n.id))).sort(lectura)
  if (sueltos.length > 0) {
    if (lineas.length > 0) lineas.push('')
    lineas.push('## Otras ideas')
    for (const n of sueltos) bullets(n.id, 0)
  }

  return { titulo, contenido: lineas.join('\n').trim() }
}

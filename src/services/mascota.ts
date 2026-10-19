/** Mascota de Prima Lex: dibujo (SVG propio) y estado de ánimo según lo que
 *  pasa en tu día. Lógica pura: sirve igual para la pantalla y para la imagen
 *  del resumen semanal. */

export type TipoMascota = 'lechuza' | 'perro' | 'gato'
export type AccesorioMascota = 'ninguno' | 'birrete' | 'lentes'
export type ColorMascota = 'miel' | 'chocolate' | 'gris' | 'crema' | 'carbon' | 'indigo'
export type Animo = 'normal' | 'feliz' | 'dormida' | 'preocupada' | 'concentrada'

export const TIPOS_MASCOTA: { id: TipoMascota; nombre: string }[] = [
  { id: 'lechuza', nombre: 'Lechuza' },
  { id: 'perro', nombre: 'Perro' },
  { id: 'gato', nombre: 'Gato' },
]

export const ACCESORIOS_MASCOTA: { id: AccesorioMascota; nombre: string }[] = [
  { id: 'ninguno', nombre: 'Nada' },
  { id: 'birrete', nombre: 'Birrete' },
  { id: 'lentes', nombre: 'Lentes' },
]

interface Paleta {
  nombre: string
  base: string
  claro: string
  oscuro: string
}

export const COLORES_MASCOTA: Record<ColorMascota, Paleta> = {
  miel: { nombre: 'Miel', base: '#d9a066', claro: '#f3dcb8', oscuro: '#a8723a' },
  chocolate: { nombre: 'Chocolate', base: '#8a5a3c', claro: '#c99a76', oscuro: '#5e3a24' },
  gris: { nombre: 'Gris', base: '#9aa1b5', claro: '#dde1ec', oscuro: '#6b7390' },
  crema: { nombre: 'Crema', base: '#efd8b0', claro: '#fbf1dc', oscuro: '#c9a870' },
  carbon: { nombre: 'Carbón', base: '#4a4f63', claro: '#8d93aa', oscuro: '#2c2f3e' },
  indigo: { nombre: 'Índigo', base: '#7b7fe8', claro: '#c9cbf7', oscuro: '#4346c4' },
}

export const esTipoMascota = (v: unknown): v is TipoMascota => v === 'lechuza' || v === 'perro' || v === 'gato'
export const esColorMascota = (v: unknown): v is ColorMascota => typeof v === 'string' && v in COLORES_MASCOTA
export const esAccesorioMascota = (v: unknown): v is AccesorioMascota => v === 'ninguno' || v === 'birrete' || v === 'lentes'

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------

const TINTA = '#1f2344'

/** Un ojo en (x, y) según el ánimo. */
function ojo(x: number, y: number, r: number, animo: Animo, lado: -1 | 1): string {
  switch (animo) {
    case 'feliz':
      return `<path d="M${x - r} ${y + r * 0.35} Q${x} ${y - r * 1.1} ${x + r} ${y + r * 0.35}" fill="none" stroke="${TINTA}" stroke-width="3.2" stroke-linecap="round"/>`
    case 'dormida':
      return `<path d="M${x - r} ${y} Q${x} ${y + r * 0.7} ${x + r} ${y}" fill="none" stroke="${TINTA}" stroke-width="3" stroke-linecap="round"/>`
    case 'preocupada':
      return (
        `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x}" cy="${y + 1}" r="${r * 0.55}" fill="${TINTA}"/>` +
        `<path d="M${x - r - 1} ${y - r - 3 + lado * 3} L${x + r + 1} ${y - r - 3 - lado * 3}" stroke="${TINTA}" stroke-width="2.6" stroke-linecap="round"/>`
      )
    case 'concentrada':
      return (
        `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + lado * 0.6}" cy="${y + 1}" r="${r * 0.55}" fill="${TINTA}"/>` +
        `<path d="M${x - r - 0.5} ${y - 1} L${x + r + 0.5} ${y - 1}" stroke="${TINTA}" stroke-width="3" stroke-linecap="round"/>`
      )
    default:
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${r * 0.56}" fill="${TINTA}"/><circle cx="${x - r * 0.2}" cy="${y - r * 0.22}" r="${r * 0.18}" fill="#fff"/>`
  }
}

function accesorioSvg(acc: AccesorioMascota, cabezaY: number, ojosY: number, sep: number): string {
  if (acc === 'birrete') {
    const y = cabezaY
    return (
      `<g><path d="M44 ${y + 6} L60 ${y - 2} L76 ${y + 6} L76 ${y + 14} Q60 ${y + 20} 44 ${y + 14} Z" fill="#2c2f3e"/>` +
      `<path d="M30 ${y + 2} L60 ${y - 12} L90 ${y + 2} L60 ${y + 14} Z" fill="#1f2344"/>` +
      `<path d="M60 ${y + 2} L86 ${y + 6} L86 ${y + 20}" fill="none" stroke="#e0a82e" stroke-width="2" stroke-linecap="round"/><circle cx="86" cy="${y + 22}" r="3" fill="#e0a82e"/></g>`
    )
  }
  if (acc === 'lentes') {
    return (
      `<g fill="none" stroke="#2c2f3e" stroke-width="2.6"><circle cx="${60 - sep}" cy="${ojosY}" r="12"/><circle cx="${60 + sep}" cy="${ojosY}" r="12"/>` +
      `<path d="M${60 - sep + 12} ${ojosY} L${60 + sep - 12} ${ojosY}"/></g>`
    )
  }
  return ''
}

function lechuza(p: Paleta, animo: Animo, acc: AccesorioMascota): string {
  return (
    `<ellipse cx="60" cy="108" rx="30" ry="5" fill="#000" opacity=".1"/>` +
    `<path d="M30 42 L24 20 L46 34 Z" fill="${p.oscuro}"/><path d="M90 42 L96 20 L74 34 Z" fill="${p.oscuro}"/>` +
    `<ellipse cx="60" cy="66" rx="36" ry="40" fill="${p.base}"/>` +
    `<ellipse cx="60" cy="80" rx="22" ry="24" fill="${p.claro}"/>` +
    `<path d="M45 76 q4 5 8 0 M57 84 q4 5 8 0 M49 92 q4 5 8 0" fill="none" stroke="${p.base}" stroke-width="2" stroke-linecap="round" opacity=".55"/>` +
    `<ellipse cx="27" cy="74" rx="10" ry="22" fill="${p.oscuro}" transform="rotate(8 27 74)"/><ellipse cx="93" cy="74" rx="10" ry="22" fill="${p.oscuro}" transform="rotate(-8 93 74)"/>` +
    `<circle cx="45" cy="56" r="15" fill="${p.claro}"/><circle cx="75" cy="56" r="15" fill="${p.claro}"/>` +
    ojo(45, 56, 10, animo, -1) + ojo(75, 56, 10, animo, 1) +
    `<path d="M55 66 L65 66 L60 76 Z" fill="#f2a93b"/>` +
    `<path d="M48 104 l-3 6 M54 104 l-1 6 M66 104 l1 6 M72 104 l3 6" stroke="#f2a93b" stroke-width="3" stroke-linecap="round"/>` +
    accesorioSvg(acc, 22, 56, 15)
  )
}

function perro(p: Paleta, animo: Animo, acc: AccesorioMascota): string {
  const lengua = animo === 'feliz' ? `<path d="M55 84 Q60 98 65 84 Z" fill="#ef7a8a"/>` : ''
  const boca =
    animo === 'feliz'
      ? `<path d="M50 80 Q60 92 70 80" fill="#7a2c3a" stroke="${TINTA}" stroke-width="2.4" stroke-linejoin="round"/>`
      : animo === 'preocupada'
      ? `<path d="M52 86 Q60 80 68 86" fill="none" stroke="${TINTA}" stroke-width="2.6" stroke-linecap="round"/>`
      : `<path d="M60 76 L60 82 M52 84 Q60 90 68 84" fill="none" stroke="${TINTA}" stroke-width="2.6" stroke-linecap="round"/>`
  return (
    `<ellipse cx="60" cy="108" rx="30" ry="5" fill="#000" opacity=".1"/>` +
    `<ellipse cx="26" cy="54" rx="13" ry="26" fill="${p.oscuro}" transform="rotate(14 26 54)"/><ellipse cx="94" cy="54" rx="13" ry="26" fill="${p.oscuro}" transform="rotate(-14 94 54)"/>` +
    `<circle cx="60" cy="62" r="36" fill="${p.base}"/>` +
    `<ellipse cx="60" cy="78" rx="19" ry="15" fill="${p.claro}"/>` +
    ojo(44, 56, 7.5, animo, -1) + ojo(76, 56, 7.5, animo, 1) +
    `<ellipse cx="60" cy="72" rx="7" ry="5" fill="${TINTA}"/>` +
    boca + lengua +
    accesorioSvg(acc, 24, 56, 16)
  )
}

function gato(p: Paleta, animo: Animo, acc: AccesorioMascota): string {
  const boca =
    animo === 'feliz'
      ? `<path d="M52 78 Q56 84 60 78 Q64 84 68 78" fill="none" stroke="${TINTA}" stroke-width="2.4" stroke-linecap="round"/>`
      : animo === 'preocupada'
      ? `<path d="M53 83 Q60 77 67 83" fill="none" stroke="${TINTA}" stroke-width="2.4" stroke-linecap="round"/>`
      : `<path d="M52 79 Q56 84 60 79 Q64 84 68 79" fill="none" stroke="${TINTA}" stroke-width="2.2" stroke-linecap="round"/>`
  return (
    `<ellipse cx="60" cy="108" rx="30" ry="5" fill="#000" opacity=".1"/>` +
    `<path d="M28 44 L26 14 L52 30 Z" fill="${p.base}"/><path d="M92 44 L94 14 L68 30 Z" fill="${p.base}"/>` +
    `<path d="M32 38 L31 22 L45 32 Z" fill="#f4a3b4"/><path d="M88 38 L89 22 L75 32 Z" fill="#f4a3b4"/>` +
    `<ellipse cx="60" cy="64" rx="38" ry="34" fill="${p.base}"/>` +
    `<path d="M60 31 l0 10 M50 33 l2 8 M70 33 l-2 8" stroke="${p.oscuro}" stroke-width="3" stroke-linecap="round" opacity=".6"/>` +
    `<ellipse cx="60" cy="76" rx="16" ry="12" fill="${p.claro}"/>` +
    ojo(44, 58, 8, animo, -1) + ojo(76, 58, 8, animo, 1) +
    `<path d="M56 71 L64 71 L60 76 Z" fill="#ef7a8a"/>` +
    boca +
    `<path d="M30 70 L12 66 M30 76 L12 78 M90 70 L108 66 M90 76 L108 78" stroke="${TINTA}" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>` +
    accesorioSvg(acc, 26, 58, 16)
  )
}

/** Marcado SVG de la mascota (propio, sin datos del usuario: seguro para insertar). */
export function mascotaSvg(p: { tipo: TipoMascota; color: ColorMascota; accesorio: AccesorioMascota; animo: Animo }): string {
  const paleta = COLORES_MASCOTA[p.color] ?? COLORES_MASCOTA.indigo
  const cuerpo = p.tipo === 'perro' ? perro(paleta, p.animo, p.accesorio) : p.tipo === 'gato' ? gato(paleta, p.animo, p.accesorio) : lechuza(paleta, p.animo, p.accesorio)
  const zzz = p.animo === 'dormida' ? `<path d="M92 16h9l-9 10h9" fill="none" stroke="#8a92b0" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M103 6h6l-6 8h6" fill="none" stroke="#8a92b0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img">${cuerpo}${zzz}</svg>`
}

// ---------------------------------------------------------------------------
// Estado de ánimo y frases
// ---------------------------------------------------------------------------

export interface SituacionMascota {
  /** 0-23 */
  hora: number
  enfocando: boolean
  enClase: boolean
  minutosHoy: number
  metaMin: number
  tareasHechasHoy: number
  tareasPendientesHoy: number
  tareasVencidas: number
  /** Días hasta la próxima evaluación sin nota (null si no hay). */
  diasSolemne: number | null
  rachaDias: number
}

export type Situacion = 'duerme' | 'enfoque' | 'clase' | 'solemne' | 'vencidas' | 'meta' | 'todoHecho' | 'normal'

export function situacionDe(s: SituacionMascota): Situacion {
  if (s.hora >= 23 || s.hora < 6) return 'duerme'
  if (s.enfocando) return 'enfoque'
  if (s.enClase) return 'clase'
  if (s.diasSolemne !== null && s.diasSolemne <= 1) return 'solemne'
  if (s.tareasVencidas > 0) return 'vencidas'
  if (s.metaMin > 0 && s.minutosHoy >= s.metaMin) return 'meta'
  if (s.tareasHechasHoy > 0 && s.tareasPendientesHoy === 0) return 'todoHecho'
  return 'normal'
}

const ANIMO: Record<Situacion, Animo> = {
  duerme: 'dormida',
  enfoque: 'concentrada',
  clase: 'concentrada',
  solemne: 'preocupada',
  vencidas: 'preocupada',
  meta: 'feliz',
  todoHecho: 'feliz',
  normal: 'normal',
}

export const animoDe = (s: Situacion): Animo => ANIMO[s]

const hashSemilla = (t: string) => {
  let h = 0
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0
  return h
}

/** Lo que dice la mascota. `semilla` mantiene la frase estable un rato (no cambia en cada render). */
export function fraseMascota(s: Situacion, datos: SituacionMascota, nombre: string, semilla: string): string {
  const elegir = (l: string[]) => l[hashSemilla(semilla + s) % l.length]
  switch (s) {
    case 'duerme':
      return elegir(['Zzz… es tarde, ya descansa un poco.', 'Zzz… lo que no alcanzaste, mañana se ve más fácil.'])
    case 'enfoque':
      return elegir(['Shhh… modo concentración. Yo vigilo.', 'Sigue así, voy en silencio contigo.', 'Un bloque más y listo.'])
    case 'clase':
      return elegir(['Ojo con la clase: yo guardo silencio.', 'Anota lo importante, lo demás se ordena después.'])
    case 'solemne':
      return datos.diasSolemne === 0
        ? elegir(['Hoy es el día. Respira, ya hiciste lo que podías.', 'Tú puedes. Yo me quedo con las patas cruzadas.'])
        : elegir(['Mañana hay solemne… un último repaso liviano y a dormir.', 'A mí me da nervio la solemne, pero confío en ti.'])
    case 'vencidas':
      return datos.tareasVencidas === 1
        ? elegir(['Tienes una tarea atrasada. ¿La sacamos del camino?', 'Hay una tarea vencida esperándote. Una sola, ¡se puede!'])
        : elegir([`Tienes ${datos.tareasVencidas} tareas atrasadas. Vamos de a una.`, `Hay ${datos.tareasVencidas} tareas vencidas. Empieza por la más fácil.`])
    case 'meta':
      return elegir(['¡Meta del día cumplida! Qué orgullo.', '¡Lo lograste! Hoy ya puedes descansar con calma.', '¡Qué día! Meta lista.'])
    case 'todoHecho':
      return elegir(['¡Todo hecho por hoy! Eso se celebra.', 'Lista de hoy completa. ¡Bien ahí!'])
    default:
      if (datos.rachaDias >= 3) return elegir([`Llevas ${datos.rachaDias} días seguidos estudiando. ¡No la cortes!`, `¡${datos.rachaDias} días de racha! Aquí estoy para seguirla.`])
      if (datos.hora < 12) return elegir(['¡Buenos días! ¿Qué toca hoy?', 'Hola, soy ' + nombre + '. Partamos suave.'])
      if (datos.hora < 20) return elegir(['¿Un bloque de enfoque?', 'Hola de nuevo. ¿Avanzamos algo?'])
      return elegir(['Buenas noches. ¿Un repaso cortito antes de dormir?', 'Ya casi termina el día. ¿Cómo vamos?'])
  }
}

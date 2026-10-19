import type { DisenoRamo, Ramo } from '../types'

/** Datos de presentación de un ramo: profesores y diseño de su franja de color.
 *  Todo puro (sin React), para poder probarlo. */

export const DISENOS: { id: DisenoRamo; nombre: string }[] = [
  { id: 'olas', nombre: 'Olas' },
  { id: 'facetas', nombre: 'Facetas' },
  { id: 'arcos', nombre: 'Arcos' },
  { id: 'rayas', nombre: 'Rayas' },
]

/** Todos los profesores del ramo, sin vacíos ni repetidos. `profesores` manda; si no existe
 *  (ramos antiguos), vale el único `profesor`. */
export function profesoresDe(r: Pick<Ramo, 'profesor' | 'profesores'>): string[] {
  const base = r.profesores && r.profesores.length > 0 ? r.profesores : r.profesor ? [r.profesor] : []
  const vistos = new Set<string>()
  const salida: string[] = []
  for (const n of base) {
    const nombre = n.replace(/\s+/g, ' ').trim()
    const clave = nombre.toLowerCase()
    if (nombre && !vistos.has(clave)) {
      vistos.add(clave)
      salida.push(nombre)
    }
  }
  return salida
}

/** "Juan Vio" · "Juan Vio y Ana Soto" · "Juan Vio, Ana Soto y 1 más". */
export function resumenProfesores(nombres: string[], max = 2): string {
  if (nombres.length <= 1) return nombres[0] ?? ''
  if (nombres.length === 2 && max >= 2) return `${nombres[0]} y ${nombres[1]}`
  const vistos = nombres.slice(0, max)
  const resto = nombres.length - vistos.length
  return resto > 0 ? `${vistos.join(', ')} y ${resto} más` : `${vistos.slice(0, -1).join(', ')} y ${vistos[vistos.length - 1]}`
}

function hash(texto: string): number {
  let h = 5381
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0
  return h >>> 0
}

/** El diseño elegido o, si no hay, uno estable según el ramo (cada ramo mantiene el suyo). */
export function disenoDe(r: Pick<Ramo, 'id' | 'diseno'>): DisenoRamo {
  if (r.diseno && DISENOS.some((d) => d.id === r.diseno)) return r.diseno
  return DISENOS[hash(r.id) % DISENOS.length].id
}

function luz(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** Color de texto con buen contraste sobre un color de ramo: blanco, o tinta oscura si el fondo es muy claro.
 *  Si el color no es un #rrggbb (p. ej. una variable CSS), se asume un fondo oscuro. */
export function textoSobre(color: string): '#ffffff' | '#1f2344' {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return '#ffffff'
  const l = luz(color)
  const contrasteBlanco = 1.05 / (l + 0.05)
  const contrasteOscuro = (l + 0.05) / (luz('#1f2344') + 0.05)
  return contrasteBlanco >= contrasteOscuro ? '#ffffff' : '#1f2344'
}

// ---------- color tenue de la franja ----------

function aHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function deHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return `#${[f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`
}

const CONTRASTE_MIN = 4.6

/** Versión suave del color de un ramo para la franja de su ficha y su cabecera: menos saturada y
 *  lo bastante oscura para que el texto blanco se lea siempre (el color elegido para el ramo no se
 *  toca; solo cambia cómo se pinta la franja). Si el color no es un #rrggbb (p. ej. una variable
 *  CSS), se mezcla con una tinta oscura para lograr el mismo efecto. */
export function colorTenue(color: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return `color-mix(in srgb, ${color} 72%, #2a2f55)`
  const [h, s0, l0] = aHsl(color)
  const s = Math.min(s0 * 0.58, 0.5)
  let l = Math.min(Math.max(l0, 0.3), 0.46)
  // si todavía no llega al contraste del texto blanco, se oscurece de a poco
  while (l > 0.2 && 1.05 / (luz(deHsl(h, s, l)) + 0.05) < CONTRASTE_MIN) l -= 0.01
  return deHsl(h, s, l)
}

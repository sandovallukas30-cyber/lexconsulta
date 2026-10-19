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

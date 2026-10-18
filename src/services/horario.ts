import type { BloqueHorario } from '../types'
import { fechaLocalISO } from './actividadEstudio'

/** Horario estructurado de un ramo y generación de las clases del semestre
 *  (A1 de la auditoría). Lógica pura, sin estado. */

export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const DIAS_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** Día de la semana de una fecha YYYY-MM-DD: 0 = lunes … 6 = domingo. */
export function diaSemanaISO(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number)
  return (new Date(a, m - 1, d).getDay() + 6) % 7
}

const porDiaYHora = (a: BloqueHorario, b: BloqueHorario) => a.dia - b.dia || a.inicio.localeCompare(b.inicio)

/** "Lun 08:30–09:50 · Mié 10:00" */
export function formatearHorario(bloques: BloqueHorario[]): string {
  return [...bloques]
    .sort(porDiaYHora)
    .map((b) => `${DIAS_CORTOS[b.dia]} ${b.inicio}${b.fin ? `–${b.fin}` : ''}`)
    .join(' · ')
}

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
function pascua(anio: number): Date {
  const a = anio % 19
  const b = Math.floor(anio / 100)
  const c = anio % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(anio, mes - 1, dia)
}

/** Feriados de Chile de fecha fija más Viernes y Sábado Santo. NO incluye los
 *  que la ley mueve de día (San Pedro y San Pablo, Pueblos Indígenas, Encuentro
 *  de Dos Mundos, Iglesias Evangélicas) ni jornadas electorales: son una
 *  ayuda, y el estudiante revisa el calendario de su universidad. */
export function feriadosChile(anio: number): Set<string> {
  const fijos = ['01-01', '05-01', '05-21', '07-16', '08-15', '09-18', '09-19', '11-01', '12-08', '12-25']
  const set = new Set(fijos.map((f) => `${anio}-${f}`))
  const p = pascua(anio)
  for (const delta of [-2, -1]) {
    const x = new Date(p.getFullYear(), p.getMonth(), p.getDate() + delta)
    set.add(fechaLocalISO(x))
  }
  return set
}

export interface ClaseGenerada {
  fecha: string
  hora: string
  sala?: string
}

/** Una clase por cada bloque del horario entre `desde` y `hasta` (ambos
 *  incluidos), salvo las fechas que ya tienen clase y, si se pide, feriados. */
export function generarFechasClases(p: {
  desde: string
  hasta: string
  bloques: BloqueHorario[]
  omitirFeriados: boolean
  fechasExistentes: Set<string>
}): ClaseGenerada[] {
  const out: ClaseGenerada[] = []
  if (p.bloques.length === 0 || p.desde > p.hasta) return out
  const [a, m, d] = p.desde.split('-').map(Number)
  const cursor = new Date(a, m - 1, d)
  const feriados = new Map<number, Set<string>>()
  for (let guard = 0; guard < 400; guard++) {
    const iso = fechaLocalISO(cursor)
    if (iso > p.hasta) break
    const anio = cursor.getFullYear()
    if (!feriados.has(anio)) feriados.set(anio, feriadosChile(anio))
    const esFeriado = p.omitirFeriados && feriados.get(anio)!.has(iso)
    if (!esFeriado && !p.fechasExistentes.has(iso)) {
      const dia = (cursor.getDay() + 6) % 7
      for (const b of [...p.bloques].filter((x) => x.dia === dia).sort(porDiaYHora)) {
        out.push({ fecha: iso, hora: b.inicio, ...(b.sala ? { sala: b.sala } : {}) })
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

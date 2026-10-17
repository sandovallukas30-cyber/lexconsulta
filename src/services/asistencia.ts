import type { SesionClase } from '../types'

/** Asistencia a clases con el margen de faltas que te queda. Lógica pura. */

export const ASISTENCIA_MIN_DEFECTO = 75

/** Con menos clases cargadas el margen no es confiable (falta el resto del semestre). */
const MIN_CLASES_PARA_MARGEN = 8

export type EstadoAsistencia = 'sin' | 'bien' | 'cuidado' | 'riesgo'

export interface ResumenAsistencia {
  /** Clases del cronograma (todo el semestre cargado). */
  total: number
  registradas: number
  presentes: number
  faltas: number
  /** Porcentaje sobre las clases ya registradas, o null si no hay registros. */
  pct: number | null
  min: number
  /** Faltas que todavía puedes tener sin bajar del mínimo al final del semestre. */
  margen: number
  /** ¿Hay clases suficientes cargadas para que el margen sea confiable? */
  margenConfiable: boolean
  estado: EstadoAsistencia
}

export function resumenAsistencia(clases: SesionClase[], min: number = ASISTENCIA_MIN_DEFECTO): ResumenAsistencia {
  const total = clases.length
  const registradas = clases.filter((c) => c.asistio !== undefined)
  const presentes = registradas.filter((c) => c.asistio).length
  const faltas = registradas.length - presentes
  const maxFaltas = Math.floor(total * (1 - min / 100))
  const margen = maxFaltas - faltas
  const pct = registradas.length > 0 ? Math.round((presentes / registradas.length) * 100) : null
  const margenConfiable = total >= MIN_CLASES_PARA_MARGEN
  let estado: EstadoAsistencia = 'sin'
  if (pct !== null) {
    estado = margenConfiable ? (margen < 0 ? 'riesgo' : margen <= 1 ? 'cuidado' : 'bien') : pct < min ? 'riesgo' : pct < min + 8 ? 'cuidado' : 'bien'
  }
  return { total, registradas: registradas.length, presentes, faltas, pct, min, margen, margenConfiable, estado }
}

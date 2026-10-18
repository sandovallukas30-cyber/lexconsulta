import type { TareaPlan } from '../types'
import { lunesDe, minutosEnFecha, minutosPorRamo, type SesionFoco } from './enfoque'
import { sumarDiasISO } from './tareasPlan'

/** Resumen de la semana (lunes a domingo) para mirarlo en pantalla y para la
 *  imagen que se comparte. Lógica pura. */

export interface ResumenSemana {
  desde: string
  hasta: string
  minutos: number
  sesiones: number
  /** Días de la semana con algo de estudio (enfoque, apuntes, tareas, repaso). */
  diasEstudio: number
  porDia: { fecha: string; minutos: number }[]
  tareasHechas: number
  ramoTop: { ramoId: string | null; minutos: number } | null
  racha: number
  /** Mejor día de la semana (0 = lunes), o null si no hubo enfoque. */
  mejorDia: number | null
}

export function resumenSemana(p: { sesiones: SesionFoco[]; tareas: TareaPlan[]; diasActividad: string[]; hoy: string; racha: number }): ResumenSemana {
  const desde = lunesDe(p.hoy)
  const hasta = sumarDiasISO(desde, 6)
  const fechas = Array.from({ length: 7 }, (_, i) => sumarDiasISO(desde, i))
  const porDia = fechas.map((fecha) => ({ fecha, minutos: minutosEnFecha(p.sesiones, fecha) }))
  const enSemana = p.sesiones.filter((s) => s.fecha >= desde && s.fecha <= hasta)
  const actividad = new Set(p.diasActividad.filter((d) => d >= desde && d <= hasta))
  for (const d of porDia) if (d.minutos > 0) actividad.add(d.fecha)
  const mejor = porDia.reduce((m, d, i) => (d.minutos > (porDia[m]?.minutos ?? 0) ? i : m), 0)
  return {
    desde,
    hasta,
    minutos: porDia.reduce((s, d) => s + d.minutos, 0),
    sesiones: enSemana.length,
    diasEstudio: actividad.size,
    porDia,
    tareasHechas: p.tareas.filter((t) => t.hecha && t.hechaEn !== null && t.hechaEn >= desde && t.hechaEn <= hasta).length,
    ramoTop: minutosPorRamo(enSemana, desde).find((r) => r.ramoId !== null) ?? null,
    racha: p.racha,
    mejorDia: porDia[mejor].minutos > 0 ? mejor : null,
  }
}

/** Una frase para cerrar la semana, según cuánto se estudió. */
export function mensajeSemana(r: Pick<ResumenSemana, 'minutos' | 'diasEstudio' | 'tareasHechas'>): string {
  if (r.minutos >= 600) return 'Semana de campeonato. Ahora a descansar con orgullo.'
  if (r.minutos >= 300) return 'Muy buen ritmo esta semana. Así se llega lejos.'
  if (r.minutos > 0 || r.tareasHechas > 0) return 'Un paso a la vez: esta semana avanzaste.'
  return 'Semana tranquila. El lunes se empieza de nuevo.'
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** «13 – 19 oct» o «28 sep – 4 oct». */
export function rangoSemana(desde: string, hasta: string): string {
  const [, m1, d1] = desde.split('-').map(Number)
  const [, m2, d2] = hasta.split('-').map(Number)
  return m1 === m2 ? `${d1} – ${d2} ${MESES[m2 - 1]}` : `${d1} ${MESES[m1 - 1]} – ${d2} ${MESES[m2 - 1]}`
}

import type { PrioridadTarea } from '../types'
import { sumarDiasISO } from './tareasPlan'

/** Plan de estudio para una evaluación: reparte tus apuntes y tarjetas en los
 *  días que quedan, con un simulacro y un repaso final al cierre. Sin IA: solo
 *  reglas. Lógica pura (recibe la fecha de hoy). */

export interface PasoPlan {
  titulo: string
  /** YYYY-MM-DD */
  fecha: string
  prioridad: PrioridadTarea
  subtareas: string[]
}

export interface EntradaPlan {
  evaluacion: string
  ramo: string
  /** YYYY-MM-DD */
  fechaEval: string
  hoy: string
  /** Títulos de los apuntes del ramo, en el orden en que conviene estudiarlos. */
  apuntes: string[]
  tarjetasPendientes: number
  /** Cuántos días antes empieza el plan como máximo (por defecto 14). */
  maxDias?: number
}

const DIA_MS = 86_400_000
const aDate = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}
export const diasEntreISO = (desde: string, hasta: string) => Math.round((aDate(hasta).getTime() - aDate(desde).getTime()) / DIA_MS)

/** Quita el prefijo con que se marcan las tareas de un plan, para reconocerlas. */
export const origenDePlan = (evaluacionId: string) => `eval:${evaluacionId}`

export function generarPlan(e: EntradaPlan): PasoPlan[] {
  const n = diasEntreISO(e.hoy, e.fechaEval)
  if (n <= 0) return []
  const primero = Math.max(0, n - (e.maxDias ?? 14))
  const offsets = Array.from({ length: n - primero }, (_, i) => primero + i)
  if (offsets.length === 0) return []
  const dia = (o: number) => sumarDiasISO(e.hoy, o)
  const pasos: PasoPlan[] = []

  // el día antes: repaso final
  const ultimo = offsets[offsets.length - 1]
  pasos.push({
    titulo: `${e.evaluacion}: repaso final`,
    fecha: dia(ultimo),
    prioridad: 'alta',
    subtareas: ['Releer tus ideas clave', ...(e.tarjetasPendientes > 0 ? ['Repasar las tarjetas pendientes'] : []), 'Dejar todo listo y dormir bien'],
  })
  let reservados = 1
  // dos días antes: simulacro
  if (offsets.length >= 3) {
    pasos.push({
      titulo: `${e.evaluacion}: simulacro`,
      fecha: dia(offsets[offsets.length - 2]),
      prioridad: 'alta',
      subtareas: ['Escribe un esquema de memoria, sin mirar', 'Corrígelo con tus apuntes y anota lo que falló'],
    })
    reservados = 2
  }

  const estudio = offsets.slice(0, offsets.length - reservados)
  if (estudio.length > 0) {
    const items = e.apuntes.length > 0 ? e.apuntes : [`la materia de ${e.ramo}`]
    // el apunte k va al día floor(k * días / apuntes): se reparten parejo
    const porDia = new Map<number, string[]>()
    items.forEach((t, k) => {
      const idx = Math.min(estudio.length - 1, Math.floor((k * estudio.length) / items.length))
      porDia.set(idx, [...(porDia.get(idx) ?? []), t])
    })
    for (const [idx, lista] of [...porDia.entries()].sort(([a], [b]) => a - b)) {
      const titulo =
        lista.length === 1 ? `${e.evaluacion}: estudiar «${lista[0]}»` : lista.length === 2 ? `${e.evaluacion}: estudiar «${lista[0]}» y «${lista[1]}»` : `${e.evaluacion}: estudiar ${lista.length} apuntes`
      pasos.push({
        titulo,
        fecha: dia(estudio[idx]),
        prioridad: 'media',
        subtareas: lista.length >= 3 ? lista : lista.length > 0 && e.apuntes.length > 0 ? ['Leer con calma', 'Subrayar o resumir lo esencial'] : ['Releer y resumir lo principal'],
      })
    }
    if (e.tarjetasPendientes > 0) {
      pasos.push({
        titulo: `${e.evaluacion}: repasar las ${e.tarjetasPendientes} tarjetas pendientes`,
        fecha: dia(estudio[Math.floor(estudio.length / 2)]),
        prioridad: 'media',
        subtareas: [],
      })
    }
  }
  return pasos.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.prioridad === 'alta' ? -1 : 1))
}

/** La frase de la cuenta regresiva de una evaluación. */
export function fraseCuentaRegresiva(dias: number, plan?: { hechas: number; total: number }): string {
  const base =
    dias <= 0 ? 'Hoy es el día. Respira, ya hiciste lo que podías.'
    : dias === 1 ? 'Mañana: repaso liviano y a dormir temprano.'
    : dias <= 3 ? 'Recta final: un bloque de enfoque al día y llegas tranquilo.'
    : dias <= 7 ? 'Esta semana toca ordenar el repaso.'
    : dias <= 14 ? 'Hay margen, pero conviene partir.'
    : 'Todavía lejos: ve avanzando sin apuro.'
  if (plan && plan.total > 0) return `${base} Plan: ${plan.hechas} de ${plan.total} pasos listos.`
  return base
}

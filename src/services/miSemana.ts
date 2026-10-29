import { diasDeSemana, itemsPorFecha, type EstadoCalendario, type TipoItem } from './calendario'
import { sumarDiasISO } from './tareasPlan'

/** «Mi semana» en Hoy: el resumen de los siete días (lunes a domingo) y el
 *  nombre de la semana que se está mirando. Lógica pura; el detalle de cada
 *  día sale de `itemsPorFecha`, igual que el Calendario. */

const TODOS = new Set<TipoItem>(['clase', 'evaluacion', 'tarea'])

export interface DiaSemana {
  fecha: string
  clases: number
  /** Nombres de las evaluaciones del día que aún no tienen nota. */
  evaluaciones: string[]
  /** Tareas con fecha ese día que siguen pendientes. */
  tareas: number
}

export const lunesDe = (fecha: string): string => diasDeSemana(fecha)[0]

export function resumenSemana(e: EstadoCalendario, fecha: string): DiaSemana[] {
  const dias = diasDeSemana(fecha)
  const items = itemsPorFecha(e, dias[0], dias[6], TODOS)
  return dias.map((d) => {
    const del = items.get(d) ?? []
    return {
      fecha: d,
      clases: del.filter((i) => i.tipo === 'clase').length,
      evaluaciones: del.filter((i) => i.tipo === 'evaluacion' && !i.hecha).map((i) => i.titulo),
      tareas: del.filter((i) => i.tipo === 'tarea' && !i.hecha).length,
    }
  })
}

const largo = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
}

/** «Esta semana», «Próxima semana», «Semana pasada» o «Del 3 al 9 de noviembre». */
export function etiquetaSemana(fecha: string, hoy: string): string {
  const lunes = lunesDe(fecha)
  const lunesHoy = lunesDe(hoy)
  if (lunes === lunesHoy) return 'Esta semana'
  if (lunes === sumarDiasISO(lunesHoy, 7)) return 'Próxima semana'
  if (lunes === sumarDiasISO(lunesHoy, -7)) return 'Semana pasada'
  const domingo = sumarDiasISO(lunes, 6)
  const [, m1] = lunes.split('-')
  const [, m2] = domingo.split('-')
  const dia1 = Number(lunes.split('-')[2])
  return m1 === m2 ? `Del ${dia1} al ${largo(domingo)}` : `Del ${largo(lunes)} al ${largo(domingo)}`
}

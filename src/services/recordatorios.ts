import type { EstadoCalendario } from './calendario'
import { itemsPorFecha } from './calendario'
import { nombreRamo, sumarDiasISO } from './tareasPlan'

/** Resumen y avisos del día (de los recordatorios de Orbis, adaptados a la web).
 *  Lógica pura: arma el texto; quién lo muestra y cuándo es del hook. */

export interface Aviso {
  titulo: string
  cuerpo: string
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** «Hoy tienes 2 clases y 3 tareas» + evaluaciones a 3 días, la víspera y el mismo día.
 *  Devuelve null si no hay nada que avisar. */
export function avisoDelDia(estado: EstadoCalendario, hoy: string): Aviso | null {
  const lineas: string[] = []
  const hoyItems = itemsPorFecha(estado, hoy, hoy, new Set(['clase', 'evaluacion', 'tarea'])).get(hoy) ?? []
  const clases = hoyItems.filter((i) => i.tipo === 'clase' && !i.hecha)
  const tareas = estado.tareasPlan.filter((t) => !t.hecha && t.fecha !== null && t.fecha <= hoy)
  const partes = [clases.length > 0 && plural(clases.length, 'clase', 'clases'), tareas.length > 0 && plural(tareas.length, 'tarea', 'tareas')].filter(Boolean)
  if (partes.length > 0) lineas.push(`Hoy tienes ${partes.join(' y ')}.`)

  const evaluaciones = itemsPorFecha(estado, hoy, sumarDiasISO(hoy, 3), new Set(['evaluacion']))
  for (const [fecha, items] of [...evaluaciones.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const dias = Math.round((new Date(fecha + 'T12:00').getTime() - new Date(hoy + 'T12:00').getTime()) / 86_400_000)
    const cuando = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`
    for (const it of items) {
      if (it.hecha) continue
      const ramo = nombreRamo(it.ramoId, estado.ramos)
      lineas.push(`Evaluación ${cuando}: ${it.titulo}${ramo ? ` (${ramo})` : ''}.`)
    }
  }
  if (lineas.length === 0) return null
  return { titulo: 'Tu día en Prima Lex', cuerpo: lineas.join(' ') }
}

import type { DatosAcademicosModulo, Ramo, TareaPlan } from '../types'
import { fechaLocalISO } from './actividadEstudio'
import { sumarDiasISO } from './tareasPlan'

/** Lo que se dibuja en el Calendario: clases, evaluaciones y tareas con fecha
 *  juntas por día. Lógica pura. */

export type TipoItem = 'clase' | 'evaluacion' | 'tarea'

export interface ItemCalendario {
  id: string
  tipo: TipoItem
  fecha: string
  hora?: string
  titulo: string
  /** Ramo (o módulo del catálogo) al que pertenece, si tiene. */
  ramoId: string | null
  /** Clase ya vista, tarea hecha o evaluación con nota. */
  hecha: boolean
  detalle?: string
}

export interface EstadoCalendario {
  academicoModulos: Record<string, DatosAcademicosModulo>
  tareasPlan: TareaPlan[]
  ramos: Ramo[]
}

export const NOMBRE_TIPO: Record<TipoItem, string> = { clase: 'Clases', evaluacion: 'Evaluaciones', tarea: 'Tareas' }

/** Items entre `desde` y `hasta` (ambos incluidos) agrupados por fecha. */
export function itemsPorFecha(e: EstadoCalendario, desde: string, hasta: string, tipos: Set<TipoItem>): Map<string, ItemCalendario[]> {
  const mapa = new Map<string, ItemCalendario[]>()
  const meter = (it: ItemCalendario) => {
    if (it.fecha < desde || it.fecha > hasta || !tipos.has(it.tipo)) return
    const l = mapa.get(it.fecha)
    if (l) l.push(it)
    else mapa.set(it.fecha, [it])
  }
  for (const [moduloId, d] of Object.entries(e.academicoModulos)) {
    for (const c of d.clases) {
      meter({ id: `c-${c.id}`, tipo: 'clase', fecha: c.fecha, hora: c.hora, titulo: c.tema || 'Clase', ramoId: moduloId, hecha: c.completada, ...(c.sala ? { detalle: c.sala } : {}) })
    }
    for (const ev of d.evaluaciones) {
      meter({
        id: `e-${ev.id}`, tipo: 'evaluacion', fecha: ev.fecha, titulo: ev.nombre, ramoId: moduloId, hecha: ev.nota !== null,
        detalle: ev.nota !== null ? `Nota ${String(ev.nota).replace('.', ',')}` : `${ev.ponderacion}% de la nota`,
      })
    }
  }
  for (const t of e.tareasPlan) {
    if (t.fecha) meter({ id: `t-${t.id}`, tipo: 'tarea', fecha: t.fecha, titulo: t.titulo, ramoId: t.ramoId, hecha: t.hecha })
  }
  const orden: Record<TipoItem, number> = { evaluacion: 0, clase: 1, tarea: 2 }
  for (const l of mapa.values()) {
    l.sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') || orden[a.tipo] - orden[b.tipo] || a.titulo.localeCompare(b.titulo))
  }
  return mapa
}

/** Las 42 celdas (6 semanas, lunes primero) del mes `mes` (0-11) de `anio`. */
export function celdasMes(anio: number, mes: number): string[] {
  const primero = new Date(anio, mes, 1)
  const desfase = (primero.getDay() + 6) % 7
  const inicio = new Date(anio, mes, 1 - desfase)
  return Array.from({ length: 42 }, (_, i) => fechaLocalISO(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)))
}

/** Los 7 días (lunes a domingo) de la semana que contiene `fecha`. */
export function diasDeSemana(fecha: string): string[] {
  const [a, m, d] = fecha.split('-').map(Number)
  const dow = (new Date(a, m - 1, d).getDay() + 6) % 7
  const lunes = sumarDiasISO(fecha, -dow)
  return Array.from({ length: 7 }, (_, i) => sumarDiasISO(lunes, i))
}

export function nombreMes(anio: number, mes: number): string {
  const t = new Date(anio, mes, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number)
  const t = new Date(a, m - 1, d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

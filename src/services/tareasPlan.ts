import type { PrioridadTarea, Ramo, TareaPlan } from '../types'
import { MODULOS } from '../data/modulos'
import { fechaLocalISO } from './actividadEstudio'
import { diasHasta, formatearCountdown } from './modulosAcademico'

/** Lógica pura de las tareas del plan personal (vistas Tareas y Hoy). */

export type FiltroTareas = 'hoy' | 'proximas' | 'todas' | 'hechas'

export const hoyISO = (): string => fechaLocalISO(new Date())

export function mananaISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return fechaLocalISO(d)
}

const PESO_PRIORIDAD: Record<PrioridadTarea, number> = { alta: 0, media: 1, baja: 2 }

/** Nombre del ramo (propio o del catálogo) o null si no hay / ya no existe. */
export function nombreRamo(id: string | null, ramos: Ramo[]): string | null {
  if (!id) return null
  return ramos.find((r) => r.id === id)?.nombre ?? MODULOS.find((m) => m.id === id)?.nombre ?? null
}

export function colorRamo(id: string | null, ramos: Ramo[]): string {
  if (!id) return 'var(--accent-base)'
  return ramos.find((r) => r.id === id)?.color ?? MODULOS.find((m) => m.id === id)?.color ?? 'var(--accent-base)'
}

/** Pendiente y con fecha de hoy o ya vencida. */
export const esParaHoy = (t: TareaPlan): boolean => !t.hecha && t.fecha !== null && diasHasta(t.fecha) <= 0

/** Fecha primero (sin fecha al final), luego prioridad, luego la más nueva. */
function comparar(a: TareaPlan, b: TareaPlan): number {
  if (a.fecha !== b.fecha) {
    if (a.fecha === null) return 1
    if (b.fecha === null) return -1
    return a.fecha.localeCompare(b.fecha)
  }
  const p = PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad]
  return p !== 0 ? p : b.creada - a.creada
}

export function filtrarTareas(tareas: TareaPlan[], filtro: FiltroTareas, ramoId: string | null = null): TareaPlan[] {
  const delRamo = ramoId ? tareas.filter((t) => t.ramoId === ramoId) : tareas
  switch (filtro) {
    case 'hoy':
      return delRamo.filter(esParaHoy).sort(comparar)
    case 'proximas':
      return delRamo.filter((t) => !t.hecha && t.fecha !== null && diasHasta(t.fecha) > 0).sort(comparar)
    case 'todas':
      return delRamo.filter((t) => !t.hecha).sort(comparar)
    case 'hechas':
      return delRamo.filter((t) => t.hecha).sort((a, b) => (b.hechaEn ?? '').localeCompare(a.hechaEn ?? '') || b.actualizada - a.actualizada)
  }
}

export function contarPorFiltro(tareas: TareaPlan[]): Record<FiltroTareas, number> {
  return {
    hoy: tareas.filter(esParaHoy).length,
    proximas: tareas.filter((t) => !t.hecha && t.fecha !== null && diasHasta(t.fecha) > 0).length,
    todas: tareas.filter((t) => !t.hecha).length,
    hechas: tareas.filter((t) => t.hecha).length,
  }
}

export interface EtiquetaFecha {
  texto: string
  tono: 'vencida' | 'hoy' | 'normal'
}

/** "Hoy", "Mañana", "Vie 23 oct" o "Vencida (3 d)". */
export function etiquetaFecha(fecha: string, hecha = false): EtiquetaFecha {
  const dias = diasHasta(fecha)
  if (!hecha && dias < 0) return { texto: `Vencida · ${formatearCountdown(dias).toLowerCase()}`, tono: 'vencida' }
  if (dias === 0) return { texto: 'Hoy', tono: hecha ? 'normal' : 'hoy' }
  if (dias === 1) return { texto: 'Mañana', tono: 'normal' }
  const [a, m, d] = fecha.split('-').map(Number)
  const texto = new Date(a, m - 1, d).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')
  return { texto: texto.charAt(0).toUpperCase() + texto.slice(1), tono: 'normal' }
}

export function progresoSubtareas(t: TareaPlan): { hechas: number; total: number } {
  return { hechas: t.subtareas.filter((s) => s.hecha).length, total: t.subtareas.length }
}

export const ETIQUETA_PRIORIDAD: Record<PrioridadTarea, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }

/** Suma `dias` a una fecha YYYY-MM-DD (en hora local, sin saltos por el huso). */
export function sumarDiasISO(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const f = new Date(a, m - 1, d)
  f.setDate(f.getDate() + dias)
  return fechaLocalISO(f)
}

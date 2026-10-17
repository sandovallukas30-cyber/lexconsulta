import { fechaLocalISO } from './actividadEstudio'
import { sumarDiasISO } from './tareasPlan'

/** Lógica pura de la sección Enfoque (Pomodoro y Flowtime): formatos y
 *  estadísticas sobre las sesiones guardadas. Sin estado ni efectos. */

export type Modo = 'foco' | 'corto' | 'largo'
/** Pomodoro: bloques de tiempo fijo. Flowtime: el reloj sube y paras cuando se acaba la concentración. */
export type Tecnica = 'pomodoro' | 'flowtime'

export const NOMBRE_MODO: Record<Modo, string> = { foco: 'Enfoque', corto: 'Descanso corto', largo: 'Descanso largo' }

export interface SesionFoco {
  id: string
  /** milisegundos desde 1970 */
  inicio: number
  minutos: number
  ramoId: string | null
  tareaId: string | null
  tipo: Tecnica
  /** YYYY-MM-DD local del inicio */
  fecha: string
  /** Cómo te concentraste, de 1 a 5 (se pide al terminar la sesión). */
  calidad?: number
  nota?: string
  /** Veces que apretaste «Me distraje». */
  distracciones?: number
  /** Fondo y sonido con que trabajaste (para saber qué ambiente te funciona). */
  fondo?: string
  sonido?: string
}

/** 25:00, 04:07 o, pasada la hora, 1:05:09. */
export function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const dos = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`
}

/** 95 -> "1 h 35 min", 40 -> "40 min", 0 -> "0 min". */
export function horasMin(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h} h` : `${h} h ${r} min`
}

/** Descanso que sugiere Flowtime según lo que enfocaste, en minutos. */
export function descansoSugerido(minutosEnfocados: number): number {
  return minutosEnfocados < 25 ? 5 : minutosEnfocados < 50 ? 8 : minutosEnfocados < 90 ? 10 : 15
}

export const fechaDeMs = (ms: number): string => fechaLocalISO(new Date(ms))

export function minutosEnFecha(sesiones: SesionFoco[], fecha: string): number {
  return sesiones.reduce((s, x) => (x.fecha === fecha ? s + x.minutos : s), 0)
}

/** Los últimos `dias` días terminando en `hasta` (inclusive), del más antiguo al más nuevo. */
export function minutosPorDia(sesiones: SesionFoco[], hasta: string, dias: number): { fecha: string; minutos: number }[] {
  const porFecha = new Map<string, number>()
  for (const s of sesiones) porFecha.set(s.fecha, (porFecha.get(s.fecha) ?? 0) + s.minutos)
  const out: { fecha: string; minutos: number }[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const f = sumarDiasISO(hasta, -i)
    out.push({ fecha: f, minutos: porFecha.get(f) ?? 0 })
  }
  return out
}

/** Días seguidos en que se llegó a la meta. Si hoy aún no llega, cuenta desde ayer
 *  (no se "rompe" la racha por no haber terminado el día todavía). */
export function rachaMeta(sesiones: SesionFoco[], meta: number, hoy: string): number {
  if (meta <= 0) return 0
  const porFecha = new Map<string, number>()
  for (const s of sesiones) porFecha.set(s.fecha, (porFecha.get(s.fecha) ?? 0) + s.minutos)
  let dia = (porFecha.get(hoy) ?? 0) >= meta ? hoy : sumarDiasISO(hoy, -1)
  let racha = 0
  while ((porFecha.get(dia) ?? 0) >= meta && racha < 3650) {
    racha++
    dia = sumarDiasISO(dia, -1)
  }
  return racha
}

/** Minutos por ramo desde `desde` (inclusive), de mayor a menor; sin ramo = null. */
export function minutosPorRamo(sesiones: SesionFoco[], desde: string): { ramoId: string | null; minutos: number }[] {
  const mapa = new Map<string | null, number>()
  for (const s of sesiones) if (s.fecha >= desde) mapa.set(s.ramoId, (mapa.get(s.ramoId) ?? 0) + s.minutos)
  return [...mapa.entries()].map(([ramoId, minutos]) => ({ ramoId, minutos })).sort((a, b) => b.minutos - a.minutos)
}

/** Lunes de la semana de `fecha`. */
export function lunesDe(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number)
  const dow = (new Date(a, m - 1, d).getDay() + 6) % 7
  return sumarDiasISO(fecha, -dow)
}

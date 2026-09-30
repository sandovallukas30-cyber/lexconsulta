import type { Urgencia } from '../../../services/modulosAcademico'

export const VERDE = 'var(--accent-base)'

export type Tab = 'resumen' | 'clases' | 'examenes' | 'textos' | 'apuntes' | 'casos'

export function formatearFechaCorta(iso: string): string {
  if (!iso) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

export function colorUrgencia(u: Urgencia): string {
  if (u === 'vencido') return 'text-zinc-400'
  if (u === 'urgente') return 'text-red-600'
  if (u === 'proximo') return 'text-amber-600'
  return ''
}

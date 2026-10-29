import type { DatosAcademicosModulo, EstadoTarjetaRepaso } from '../types'
import { estaPendiente, tarjetasDe, type TarjetaRepaso } from './tarjetasApunte'

/** Mazos de repaso con filtros: junta las tarjetas de varias asignaturas y las
 *  acota por estado («las que me cuestan», «nuevas»…) y por sección del apunte.
 *  Sin datos nuevos: todo sale de los apuntes y del progreso de repaso que ya
 *  existe. Lógica pura. */

export type FiltroEstado = 'pendientes' | 'dificiles' | 'nuevas' | 'todas'

export const NOMBRES_ESTADO: Record<FiltroEstado, string> = {
  pendientes: 'Me toca hoy',
  dificiles: 'Las que me cuestan',
  nuevas: 'Nuevas',
  todas: 'Todas',
}

export interface TarjetaDeMazo extends TarjetaRepaso {
  ramoId: string
  apunteTitulo: string
}

export interface FiltrosMazo {
  /** Asignaturas elegidas; vacío = todas. */
  ramos: string[]
  estado: FiltroEstado
  /** Sección del apunte (el último título antes de la tarjeta); vacío = todas. */
  seccion: string
}

export const FILTROS_INICIALES: FiltrosMazo = { ramos: [], estado: 'pendientes', seccion: '' }

/** Dificultad FSRS desde la que una tarjeta se considera «de las que me cuestan». */
const DIFICULTAD_ALTA = 7

/** Todas las tarjetas de «término: definición» y de «idea clave» de los apuntes de las asignaturas dadas. */
export function tarjetasDeAsignaturas(academico: Record<string, DatosAcademicosModulo>, ramos: string[] = []): TarjetaDeMazo[] {
  const ids = ramos.length > 0 ? ramos : Object.keys(academico)
  const salida: TarjetaDeMazo[] = []
  for (const ramoId of ids) {
    for (const apunte of academico[ramoId]?.apuntes ?? []) {
      for (const t of tarjetasDe(apunte)) salida.push({ ...t, ramoId, apunteTitulo: apunte.titulo })
    }
  }
  return salida
}

/** Las que cuestan: se olvidaron alguna vez, se han fallado dos veces o más, o FSRS les calcula dificultad alta. */
export function esDificil(e: EstadoTarjetaRepaso | undefined): boolean {
  if (!e) return false
  return (e.olvidos ?? 0) >= 1 || e.fallos >= 2 || (e.dificultad ?? 0) >= DIFICULTAD_ALTA
}

export function coincideEstado(estado: FiltroEstado, e: EstadoTarjetaRepaso | undefined, ahora: number): boolean {
  if (estado === 'todas') return true
  if (estado === 'nuevas') return !e
  if (estado === 'dificiles') return esDificil(e)
  return estaPendiente(e, ahora)
}

export function filtrarMazo(tarjetas: TarjetaDeMazo[], estados: Record<string, EstadoTarjetaRepaso>, filtros: FiltrosMazo, ahora: number = Date.now()): TarjetaDeMazo[] {
  return tarjetas.filter((t) => {
    if (filtros.ramos.length > 0 && !filtros.ramos.includes(t.ramoId)) return false
    if (filtros.seccion && (t.seccion ?? '') !== filtros.seccion) return false
    return coincideEstado(filtros.estado, estados[t.id], ahora)
  })
}

/** Cuántas tarjetas da cada estado con el resto de los filtros puesto (para mostrarlo en los botones). */
export function contarPorEstado(tarjetas: TarjetaDeMazo[], estados: Record<string, EstadoTarjetaRepaso>, filtros: FiltrosMazo, ahora: number = Date.now()): Record<FiltroEstado, number> {
  const cuenta = (estado: FiltroEstado) => filtrarMazo(tarjetas, estados, { ...filtros, estado }, ahora).length
  return { pendientes: cuenta('pendientes'), dificiles: cuenta('dificiles'), nuevas: cuenta('nuevas'), todas: cuenta('todas') }
}

/** Secciones que existen en las asignaturas elegidas (sin las vacías), de la más tarjetas a la menos. */
export function seccionesDe(tarjetas: TarjetaDeMazo[], ramos: string[] = []): { seccion: string; n: number }[] {
  const cuenta = new Map<string, number>()
  for (const t of tarjetas) {
    if (ramos.length > 0 && !ramos.includes(t.ramoId)) continue
    if (!t.seccion) continue
    cuenta.set(t.seccion, (cuenta.get(t.seccion) ?? 0) + 1)
  }
  return Array.from(cuenta, ([seccion, n]) => ({ seccion, n })).sort((a, b) => b.n - a.n || a.seccion.localeCompare(b.seccion))
}

/** Título para el encabezado del repaso según los filtros. */
export function tituloMazo(filtros: FiltrosMazo, nombresRamos: string[]): string {
  const donde = filtros.ramos.length === 0 ? 'todas mis asignaturas' : nombresRamos.join(', ')
  const extra = filtros.seccion ? ` · ${filtros.seccion}` : ''
  return `${NOMBRES_ESTADO[filtros.estado]} · ${donde}${extra}`
}

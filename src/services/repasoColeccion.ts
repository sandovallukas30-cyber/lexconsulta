import type { ArticuloColeccion } from '../types'
import { resultados, TARJETA_NUEVA, textosIntervalo, type EstadoFSRS, type NotaRepaso } from './fsrs'

/** Repaso de los artículos de las Colecciones con FSRS-5 (el mismo algoritmo que las tarjetas de los apuntes).
 *  Antes era un Leitner de 5 cajas: los artículos que ya tenían caja siguen desde ese intervalo, sin perder nada. */

const DIA = 86_400_000
/** Intervalos de las cajas del repaso anterior. */
const DIAS_POR_CAJA: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }

/** Estado FSRS de un artículo: el guardado, o uno equivalente a su caja de antes. */
export function estadoArticulo(a: Pick<ArticuloColeccion, 'fsrs' | 'caja' | 'proximoRepaso'>): EstadoFSRS {
  if (a.fsrs) return a.fsrs
  if (a.caja === undefined && a.proximoRepaso === undefined) return TARJETA_NUEVA
  const dias = DIAS_POR_CAJA[a.caja ?? 1] ?? 1
  // la última vez que se repasó: su próxima fecha menos el intervalo de su caja
  const ultima = a.proximoRepaso !== undefined ? a.proximoRepaso - dias * DIA : null
  return { fase: 'repaso', estabilidad: dias, dificultad: 5, ultima, olvidos: 0 }
}

/** Caja aproximada al intervalo (se sigue guardando para ordenar y por compatibilidad con copias antiguas). */
function cajaPorDias(dias: number | null): number {
  if (dias === null || dias <= 1) return 1
  if (dias <= 3) return 2
  if (dias <= 7) return 3
  if (dias <= 14) return 4
  return 5
}

/** El artículo después de responder con `nota` (1 Otra vez, 2 Difícil, 3 Bien, 4 Fácil). */
export function aplicarNota<T extends ArticuloColeccion>(a: T, nota: NotaRepaso, ahora: number = Date.now()): T {
  const r = resultados(estadoArticulo(a), ahora)[nota]
  return { ...a, fsrs: r.estado, caja: cajaPorDias(r.dias), proximoRepaso: r.vence }
}

/** Textos de los 4 botones («10 min», «1 d», «4 d»…). */
export function intervalosArticulo(a: Pick<ArticuloColeccion, 'fsrs' | 'caja' | 'proximoRepaso'>, ahora: number = Date.now()): Record<NotaRepaso, string> {
  return textosIntervalo(estadoArticulo(a), ahora)
}

/** Convierte la respuesta de antes («la sabía / no la sabía») a nota FSRS. */
export const notaDe = (r: 'sabia' | 'no_sabia' | NotaRepaso): NotaRepaso => (r === 'sabia' ? 3 : r === 'no_sabia' ? 1 : r)

/** Si un valor guardado (respaldo, archivo compartido) es un estado FSRS válido. */
export function esEstadoFSRS(x: unknown): x is EstadoFSRS {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    (o.fase === 'nueva' || o.fase === 'aprendiendo' || o.fase === 'repaso') &&
    typeof o.estabilidad === 'number' && Number.isFinite(o.estabilidad) &&
    typeof o.dificultad === 'number' && Number.isFinite(o.dificultad) &&
    (o.ultima === null || typeof o.ultima === 'number') &&
    typeof o.olvidos === 'number'
  )
}

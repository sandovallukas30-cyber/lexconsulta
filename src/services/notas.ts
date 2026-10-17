import type { EvaluacionModulo } from '../types'

/** Notas de un ramo en la escala chilena (1,0 a 7,0; se aprueba con 4,0).
 *  Lógica pura, usada por el simulador y por el resumen del semestre. */

export const NOTA_APROBAR = 4

/** Nota llevada a escala 7 (por si una evaluación se cargó sobre 100). */
export const nota7 = (e: Pick<EvaluacionModulo, 'nota' | 'notaMaxima'>): number | null =>
  e.nota === null ? null : (e.nota / (e.notaMaxima || 7)) * 7

export const formatoNota = (n: number): string => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',')

export type EstadoNotas = 'sin-datos' | 'completo' | 'asegurado' | 'posible' | 'imposible'

export interface ResumenNotas {
  /** Promedio ponderado de lo ya evaluado. */
  promedio: number | null
  /** % de la nota final ya evaluado. */
  pesoEvaluado: number
  /** % que aún no tiene nota (cargado o no). */
  pesoRestante: number
  /** % de la nota final que ni siquiera está cargado como evaluación. */
  pesoSinCargar: number
  /** Promedio que se necesita en lo que queda para llegar al objetivo. */
  necesaria: number | null
  estado: EstadoNotas
}

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function resumenNotas(evals: EvaluacionModulo[], objetivo: number = NOTA_APROBAR): ResumenNotas {
  const conNota = evals.filter((e) => e.nota !== null)
  const pesoEvaluado = suma(conNota.map((e) => e.ponderacion))
  const ponderado = suma(conNota.map((e) => (nota7(e) as number) * e.ponderacion))
  const pesoRestante = Math.max(0, 100 - pesoEvaluado)
  const pesoCargadoPendiente = suma(evals.filter((e) => e.nota === null).map((e) => e.ponderacion))
  const necesaria = pesoRestante > 1e-6 ? (objetivo * 100 - ponderado) / pesoRestante : null
  let estado: EstadoNotas = 'completo'
  if (evals.length === 0) estado = 'sin-datos'
  else if (necesaria !== null) estado = necesaria <= 1 ? 'asegurado' : necesaria > 7 ? 'imposible' : 'posible'
  return {
    promedio: pesoEvaluado > 0 ? ponderado / pesoEvaluado : null,
    pesoEvaluado,
    pesoRestante,
    pesoSinCargar: Math.max(0, pesoRestante - pesoCargadoPendiente),
    necesaria,
    estado,
  }
}

/** "¿Y si saco…?": nota final con notas hipotéticas en las evaluaciones pendientes. */
export function simular(evals: EvaluacionModulo[], hipoteticas: Record<string, number>): { promedio: number | null; final: number | null; pesoCubierto: number } {
  let ponderado = 0
  let peso = 0
  for (const e of evals) {
    const n = e.nota !== null ? nota7(e) : hipoteticas[e.id]
    if (n === null || n === undefined || Number.isNaN(n)) continue
    ponderado += n * e.ponderacion
    peso += e.ponderacion
  }
  return { promedio: peso > 0 ? ponderado / peso : null, final: peso >= 100 - 1e-6 ? ponderado / peso : null, pesoCubierto: peso }
}

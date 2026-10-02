import type { EstadoTarjetaRepaso } from '../types'

/** Núcleo ÚNICO de la repetición espaciada (Leitner de 5 cajas) para todo lo
 *  que se repasa en Prima Lex: tarjetas de apuntes, artículos de colecciones
 *  y preguntas. Antes la tabla de días vivía copiada en tarjetasApunte.ts y en
 *  useStore.ts (registrarRepaso); un ajuste en una no llegaba a la otra. */

export const DIAS_POR_CAJA: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }
export const DIA_MS = 24 * 60 * 60 * 1000

/** "Me la sabía" sube una caja; "no me la sabía" vuelve a la 1 (mañana). */
export function cajaSiguiente(cajaActual: number, resultado: 'sabia' | 'no_sabia'): number {
  return resultado === 'sabia' ? Math.min(5, cajaActual + 1) : 1
}

export function proximoRepasoDesde(caja: number, ahora = Date.now()): number {
  return ahora + (DIAS_POR_CAJA[caja] ?? 1) * DIA_MS
}

export function siguienteEstado(previo: EstadoTarjetaRepaso | undefined, resultado: 'sabia' | 'no_sabia', ahora = Date.now()): EstadoTarjetaRepaso {
  const caja = cajaSiguiente(previo?.caja ?? 0, resultado)
  return {
    caja,
    // "no la sabía" vuelve mañana (y además antes, dentro de la misma sesión)
    proximo: proximoRepasoDesde(caja, ahora),
    aciertos: (previo?.aciertos ?? 0) + (resultado === 'sabia' ? 1 : 0),
    fallos: (previo?.fallos ?? 0) + (resultado === 'no_sabia' ? 1 : 0),
    ultimo: ahora,
  }
}

export function estaPendiente(estado: { proximo: number } | undefined, ahora = Date.now()): boolean {
  return !estado || estado.proximo <= ahora
}

/** Conversión de puntaje a nota en la escala chilena con exigencia: con el
 *  porcentaje de exigencia del curso (60 % lo más común) se saca un 4,0, con
 *  0 puntos un 1,0 y con el puntaje completo un 7,0. Entre medio, dos tramos
 *  rectos. Lógica pura. */

export const EXIGENCIA_COMUN = 60

export function puntajeANota(puntaje: number, maximo: number, exigencia: number = EXIGENCIA_COMUN): number | null {
  if (![puntaje, maximo, exigencia].every(Number.isFinite)) return null
  if (maximo <= 0 || exigencia <= 0 || exigencia >= 100 || puntaje < 0) return null
  const p = Math.min(1, puntaje / maximo)
  const e = exigencia / 100
  return p >= e ? 4 + (3 * (p - e)) / (1 - e) : 1 + (3 * p) / e
}

/** Puntaje que hay que juntar para sacar `nota` (de 1,0 a 7,0) con esa exigencia. */
export function puntajeParaNota(nota: number, maximo: number, exigencia: number = EXIGENCIA_COMUN): number | null {
  if (![nota, maximo, exigencia].every(Number.isFinite)) return null
  if (maximo <= 0 || exigencia <= 0 || exigencia >= 100 || nota < 1 || nota > 7) return null
  const e = exigencia / 100
  const p = nota >= 4 ? e + ((nota - 4) * (1 - e)) / 3 : ((nota - 1) * e) / 3
  return p * maximo
}

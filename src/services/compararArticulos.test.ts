import { describe, expect, it } from 'vitest'
import { contarPropias, marcarDiferencias, normalizarNumeroArticulo } from './compararArticulos'

const A = 'La acusación contra el Presidente podrá interponerse mientras esté en funciones y en los seis meses siguientes.'
const B = 'La acusación contra los Ministros podrá interponerse mientras estén en funciones o en los tres meses siguientes.'

describe('comparar artículos', () => {
  it('marca solo lo que el otro artículo no tiene', () => {
    const propios = marcarDiferencias(A, B).filter((t) => t.propio).map((t) => t.texto)
    expect(propios).toEqual(['Presidente', 'seis'])
    const delOtro = marcarDiferencias(B, A).filter((t) => t.propio).map((t) => t.texto)
    expect(delOtro).toEqual(['Ministros', 'tres'])
  })

  it('conserva el texto completo', () => {
    expect(marcarDiferencias(A, B).map((t) => t.texto).join('')).toBe(A)
  })

  it('«treinta» y «30» cuentan como lo mismo', () => {
    expect(marcarDiferencias('plazo de treinta días', 'plazo de 30 días').some((t) => t.propio)).toBe(false)
  })

  it('cuenta palabras propias distintas', () => {
    expect(contarPropias(marcarDiferencias('seis seis meses', 'tres meses'))).toBe(1)
  })

  it('entiende el número de artículo escrito de varias formas', () => {
    expect(normalizarNumeroArticulo('53')).toBe('Art. 53')
    expect(normalizarNumeroArticulo('art 53')).toBe('Art. 53')
    expect(normalizarNumeroArticulo('Artículo 1 bis')).toBe('Art. 1 bis')
    expect(normalizarNumeroArticulo('hola')).toBeNull()
  })
})

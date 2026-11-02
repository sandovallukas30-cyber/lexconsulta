import { describe, expect, it } from 'vitest'
import type { CodigoData } from '../types'
import civil from '../data/codigoCivil.json'
import { citadoPor } from './citadoPor'

const codigo = (articulos: { a: string; t: string }[]): CodigoData => ({ codigo: 'X', tipo: 'civ', fuente: '', total_articulos: articulos.length, articulos })

describe('citadoPor', () => {
  it('junta los artículos que citan a uno, sin repetir y en orden', () => {
    const d = codigo([
      { a: 'Art. 1', t: 'Regla general.' },
      { a: 'Art. 2', t: 'Lo dispuesto en el artículo 1 se aplica también aquí, conforme al artículo 1.' },
      { a: 'Art. 3', t: 'Véanse los artículos 1 y 2.' },
    ])
    expect(citadoPor(d, 'civ', 'Art. 1')).toEqual(['Art. 2', 'Art. 3'])
    expect(citadoPor(d, 'civ', 'Art. 2')).toEqual(['Art. 3'])
    expect(citadoPor(d, 'civ', 'Art. 3')).toEqual([])
  })

  it('no cuenta «el artículo anterior», citas a artículos que no existen ni citas a otros códigos', () => {
    const d = codigo([
      { a: 'Art. 1', t: 'Regla general.' },
      { a: 'Art. 2', t: 'Lo dicho en el artículo anterior. Ver artículo 99. El artículo 1 del Código Penal.' },
    ])
    expect(citadoPor(d, 'civ', 'Art. 1')).toEqual([])
  })

  it('con el Código Civil real: el 150 (patrimonio reservado de la mujer casada) aparece citado en varios artículos', () => {
    const r = citadoPor(civil as CodigoData, 'civ', 'Art. 150')
    expect(r.length).toBeGreaterThanOrEqual(5)
    expect(r).not.toContain('Art. 150')
  })
})

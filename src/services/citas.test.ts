import { describe, expect, it } from 'vitest'
import { citaPrecisa, frasesConCita } from './citas'

describe('citaPrecisa', () => {
  it('artículo de código: «art. 1545 CC»', () => {
    expect(citaPrecisa('civ', 'Art. 1545')).toBe('art. 1545 CC')
  })
  it('con inciso', () => {
    expect(citaPrecisa('civ', 'Art. 1445', { inciso: 2, numero: null, letra: null, propio: false })).toBe('art. 1445 inc. 2° CC')
  })
  it('número con incisos propios: el número va antes («art. 19 N° 3 inc. 6° CPR»)', () => {
    expect(citaPrecisa('con', 'Art. 19', { inciso: 6, numero: '3', letra: null, propio: true })).toBe('art. 19 N° 3 inc. 6° CPR')
  })
  it('ítem de una lista bajo un inciso: el inciso va antes («art. 65 inc. 4° N° 6 CPR»)', () => {
    expect(citaPrecisa('con', 'Art. 65', { inciso: 4, numero: '6', letra: null, propio: false })).toBe('art. 65 inc. 4° N° 6 CPR')
  })
  it('letra', () => {
    expect(citaPrecisa('con', 'Art. 52', { inciso: null, numero: '1', letra: 'a', propio: false })).toBe('art. 52 N° 1 letra a) CPR')
  })
  it('leyes: «art. 3 Ley 19.496»', () => {
    expect(citaPrecisa('cns', 'Art. 3')).toMatch(/^art\. 3 Ley 19\.496/)
  })
})

describe('frasesConCita', () => {
  it('la frase va entre comillas angulares y la cita entre paréntesis', () => {
    expect(frasesConCita('civ', 'Art. 1545', 'Todo contrato  legalmente celebrado', null)).toBe('«Todo contrato legalmente celebrado» (art. 1545 CC)')
  })
})

import { citaDeVarios } from './citas'

describe('citaDeVarios', () => {
  const inc = (n: number) => ({ inciso: n, numero: null, letra: null, propio: false })
  it('incisos seguidos: «incs. 2° a 4°»', () => {
    expect(citaDeVarios('civ', 'Art. 1445', [inc(2), inc(3), inc(4)])).toBe('art. 1445 incs. 2° a 4° CC')
  })
  it('dentro de un mismo número con incisos propios', () => {
    const n = (i: number | null) => ({ inciso: i, numero: '3', letra: null, propio: true })
    expect(citaDeVarios('con', 'Art. 19', [n(null), n(2), n(3)])).toBe('art. 19 N° 3 incs. 1° a 3° CPR')
  })
  it('un solo inciso repetido da la cita simple', () => {
    expect(citaDeVarios('civ', 'Art. 1445', [inc(2), inc(2)])).toBe('art. 1445 inc. 2° CC')
  })
})

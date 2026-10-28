import { describe, expect, it } from 'vitest'
import { pistaDe } from './tarjetasApunte'

const LARGA = 'vínculo jurídico entre personas determinadas, en virtud del cual una debe dar, hacer o no hacer algo'

describe('pista de una tarjeta (sin IA)', () => {
  it('nivel 0 no muestra nada', () => {
    expect(pistaDe(LARGA, 0).texto).toBe('')
  })

  it('cada nivel muestra 3 palabras más y nunca entrega la respuesta completa', () => {
    const n1 = pistaDe(LARGA, 1)
    expect(n1.texto).toBe('vínculo jurídico entre…')
    expect(n1.hayMas).toBe(true)
    const n2 = pistaDe(LARGA, 2)
    expect(n2.texto).toBe('vínculo jurídico entre personas determinadas, en…')
    const palabras = LARGA.split(' ').length
    for (let nivel = 1; nivel <= 20; nivel++) {
      const p = pistaDe(LARGA, nivel)
      expect(p.texto.replace('…', '').trim().split(' ').length).toBeLessThanOrEqual(Math.floor(palabras / 2))
    }
    expect(pistaDe(LARGA, 20).hayMas).toBe(false)
  })

  it('con una o dos palabras muestra solo las primeras letras', () => {
    expect(pistaDe('Prescripción', 1).texto).toBe('P…')
    expect(pistaDe('Prescripción', 2).texto).toBe('Pr…')
    expect(pistaDe('Prescripción', 2).hayMas).toBe(false)
    expect(pistaDe('acción reivindicatoria', 1).texto).toBe('a… r…')
  })

  it('ignora saltos de línea y espacios repetidos', () => {
    expect(pistaDe('uno  dos\n tres cuatro cinco seis', 1).texto).toBe('uno dos tres…')
  })

  it('una respuesta vacía no da pista', () => {
    const p = pistaDe('   ', 1)
    expect(p.texto).toBe('')
    expect(p.hayMas).toBe(false)
  })
})

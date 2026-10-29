import { describe, expect, it } from 'vitest'
import { puntajeANota, puntajeParaNota } from './puntaje'

describe('puntajeANota', () => {
  it('con la exigencia justa se saca un 4,0; con 0 un 1,0; con todo un 7,0', () => {
    expect(puntajeANota(60, 100)).toBeCloseTo(4, 10)
    expect(puntajeANota(0, 100)).toBeCloseTo(1, 10)
    expect(puntajeANota(100, 100)).toBeCloseTo(7, 10)
  })
  it('los tramos son rectos a cada lado de la exigencia', () => {
    expect(puntajeANota(30, 100)).toBeCloseTo(2.5, 10)
    expect(puntajeANota(80, 100)).toBeCloseTo(5.5, 10)
  })
  it('sirve con cualquier puntaje máximo y otra exigencia', () => {
    expect(puntajeANota(36, 60)).toBeCloseTo(4, 10)
    expect(puntajeANota(50, 100, 50)).toBeCloseTo(4, 10)
    expect(puntajeANota(75, 100, 50)).toBeCloseTo(5.5, 10)
  })
  it('un puntaje por sobre el máximo no pasa de 7,0', () => {
    expect(puntajeANota(120, 100)).toBeCloseTo(7, 10)
  })
  it('devuelve null con datos que no sirven', () => {
    expect(puntajeANota(10, 0)).toBeNull()
    expect(puntajeANota(-1, 100)).toBeNull()
    expect(puntajeANota(10, 100, 0)).toBeNull()
    expect(puntajeANota(10, 100, 100)).toBeNull()
    expect(puntajeANota(Number.NaN, 100)).toBeNull()
  })
})

describe('puntajeParaNota', () => {
  it('es la inversa de puntajeANota', () => {
    for (const nota of [1, 2.5, 3.9, 4, 4.7, 5.5, 7]) {
      const pts = puntajeParaNota(nota, 80) as number
      expect(puntajeANota(pts, 80)).toBeCloseTo(nota, 10)
    }
  })
  it('para un 4,0 pide la exigencia del máximo', () => {
    expect(puntajeParaNota(4, 100)).toBeCloseTo(60, 10)
    expect(puntajeParaNota(4, 50, 55)).toBeCloseTo(27.5, 10)
  })
  it('rechaza notas fuera de 1,0 a 7,0', () => {
    expect(puntajeParaNota(0.5, 100)).toBeNull()
    expect(puntajeParaNota(7.5, 100)).toBeNull()
  })
})

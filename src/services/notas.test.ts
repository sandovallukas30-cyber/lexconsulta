import { describe, expect, it } from 'vitest'
import type { EvaluacionModulo } from '../types'
import { formatoNota, nota7, resumenNotas, simular } from './notas'

const ev = (id: string, ponderacion: number, nota: number | null, notaMaxima = 7): EvaluacionModulo => ({
  id, nombre: id, fecha: '2026-10-01', ponderacion, notaMaxima, nota,
})

describe('formatoNota', () => {
  it('una decimal con coma', () => {
    expect(formatoNota(5.25)).toBe('5,3')
    expect(formatoNota(4)).toBe('4,0')
  })
})

describe('nota7', () => {
  it('lleva a escala 7 una nota sobre 100', () => {
    expect(nota7({ nota: 70, notaMaxima: 100 })).toBeCloseTo(4.9)
    expect(nota7({ nota: null, notaMaxima: 7 })).toBeNull()
  })
})

describe('resumenNotas', () => {
  it('sin evaluaciones no hay datos', () => {
    expect(resumenNotas([]).estado).toBe('sin-datos')
  })

  it('calcula la nota necesaria para llegar a 4,0', () => {
    // 5,2 con un 30% ya evaluado: (400 - 5,2*30) / 70
    const r = resumenNotas([ev('a', 30, 5.2), ev('b', 70, null)])
    expect(r.promedio).toBeCloseTo(5.2)
    expect(r.pesoEvaluado).toBe(30)
    expect(r.necesaria).toBeCloseTo(3.486, 2)
    expect(r.estado).toBe('posible')
  })

  it('aprobado asegurado cuando ya no hace falta nada', () => {
    expect(resumenNotas([ev('a', 80, 7), ev('b', 20, null)]).estado).toBe('asegurado')
  })

  it('imposible cuando ni con 7,0 alcanza', () => {
    expect(resumenNotas([ev('a', 90, 1.0), ev('b', 10, null)]).estado).toBe('imposible')
  })

  it('completo cuando todo está evaluado', () => {
    const r = resumenNotas([ev('a', 50, 5), ev('b', 50, 6)])
    expect(r.estado).toBe('completo')
    expect(r.promedio).toBeCloseTo(5.5)
  })

  it('avisa cuánto falta cargar', () => {
    const r = resumenNotas([ev('a', 30, 5), ev('b', 20, null)])
    expect(r.pesoSinCargar).toBe(50)
  })
})

describe('simular', () => {
  const evals = [ev('a', 30, 5.2), ev('b', 30, null), ev('c', 40, null)]

  it('con todo cubierto da la nota final', () => {
    const r = simular(evals, { b: 5, c: 6 })
    expect(r.final).toBeCloseTo((5.2 * 30 + 5 * 30 + 6 * 40) / 100)
  })

  it('con parte cubierta no da nota final pero sí un promedio parcial', () => {
    const r = simular(evals, { b: 5 })
    expect(r.final).toBeNull()
    expect(r.pesoCubierto).toBe(60)
    expect(r.promedio).toBeCloseTo((5.2 * 30 + 5 * 30) / 60)
  })

  it('sin hipótesis, solo cuenta lo ya evaluado', () => {
    expect(simular(evals, {}).pesoCubierto).toBe(30)
  })
})

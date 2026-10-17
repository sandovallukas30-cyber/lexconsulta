import { describe, expect, it } from 'vitest'
import type { SesionClase } from '../types'
import { resumenAsistencia } from './asistencia'

const clases = (n: number, asistio: (boolean | undefined)[] = []): SesionClase[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, fecha: '2026-10-01', tema: `Clase ${i + 1}`, completada: false, asistio: asistio[i] }))

describe('resumenAsistencia', () => {
  it('sin registros: sin porcentaje', () => {
    const r = resumenAsistencia(clases(32))
    expect(r.pct).toBeNull()
    expect(r.estado).toBe('sin')
  })

  it('con 32 clases y 75% se pueden perder 8', () => {
    const r = resumenAsistencia(clases(32, [true, true, false, false]))
    expect(r.faltas).toBe(2)
    expect(r.margen).toBe(6)
    expect(r.pct).toBe(50)
    expect(r.estado).toBe('bien')
  })

  it('cuidado cuando queda 1 falta o menos', () => {
    const faltas = [...Array(7).fill(false)]
    expect(resumenAsistencia(clases(32, faltas)).estado).toBe('cuidado')
  })

  it('riesgo cuando ya se pasó el límite', () => {
    const r = resumenAsistencia(clases(32, [...Array(9).fill(false)]))
    expect(r.margen).toBe(-1)
    expect(r.estado).toBe('riesgo')
  })

  it('con pocas clases cargadas el margen no es confiable', () => {
    const r = resumenAsistencia(clases(4, [true, false]))
    expect(r.margenConfiable).toBe(false)
  })

  it('respeta otro mínimo', () => {
    const r = resumenAsistencia(clases(20, [false]), 80)
    expect(r.margen).toBe(3) // 20 * 20% = 4 faltas permitidas, ya 1
  })
})

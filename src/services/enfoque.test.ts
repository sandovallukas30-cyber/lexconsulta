import { describe, expect, it } from 'vitest'
import { descansoSugerido, horasMin, lunesDe, minutosEnFecha, minutosPorDia, minutosPorRamo, mmss, rachaMeta, type SesionFoco } from './enfoque'

const ses = (fecha: string, minutos: number, ramoId: string | null = null): SesionFoco => ({
  id: `s-${fecha}-${minutos}-${ramoId}`, inicio: 0, minutos, ramoId, tareaId: null, tipo: 'pomodoro', fecha,
})

describe('mmss', () => {
  it('formatea minutos y segundos', () => {
    expect(mmss(25 * 60_000)).toBe('25:00')
    expect(mmss(4 * 60_000 + 7_000)).toBe('04:07')
    expect(mmss(0)).toBe('00:00')
  })
  it('redondea hacia arriba (no muestra 00:00 con tiempo por correr)', () => {
    expect(mmss(200)).toBe('00:01')
  })
  it('pasada la hora muestra h:mm:ss', () => {
    expect(mmss(3_725_000)).toBe('1:02:05')
  })
  it('no da negativos', () => {
    expect(mmss(-5000)).toBe('00:00')
  })
})

describe('horasMin', () => {
  it('formatea minutos y horas', () => {
    expect(horasMin(0)).toBe('0 min')
    expect(horasMin(40)).toBe('40 min')
    expect(horasMin(60)).toBe('1 h')
    expect(horasMin(95)).toBe('1 h 35 min')
  })
})

describe('descansoSugerido (Flowtime)', () => {
  it('crece con lo enfocado', () => {
    expect(descansoSugerido(10)).toBe(5)
    expect(descansoSugerido(30)).toBe(8)
    expect(descansoSugerido(60)).toBe(10)
    expect(descansoSugerido(120)).toBe(15)
  })
})

describe('estadísticas de sesiones', () => {
  const sesiones = [ses('2026-10-16', 50, 'a'), ses('2026-10-16', 30, 'b'), ses('2026-10-15', 120, 'a'), ses('2026-10-14', 125)]

  it('minutos en una fecha', () => {
    expect(minutosEnFecha(sesiones, '2026-10-16')).toBe(80)
    expect(minutosEnFecha(sesiones, '2026-10-01')).toBe(0)
  })

  it('últimos N días, del más antiguo al más nuevo, con ceros', () => {
    const r = minutosPorDia(sesiones, '2026-10-16', 4)
    expect(r.map((d) => d.fecha)).toEqual(['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'])
    expect(r.map((d) => d.minutos)).toEqual([0, 125, 120, 80])
  })

  it('minutos por ramo, de mayor a menor', () => {
    const r = minutosPorRamo(sesiones, '2026-10-15')
    expect(r[0]).toEqual({ ramoId: 'a', minutos: 170 })
    expect(r.find((x) => x.ramoId === 'b')?.minutos).toBe(30)
    expect(r.find((x) => x.ramoId === null)).toBeUndefined() // la de sin ramo es del 14, fuera de rango
  })

  it('racha de días con la meta cumplida', () => {
    expect(rachaMeta(sesiones, 120, '2026-10-16')).toBe(2) // 15 y 14 (hoy aún no llega, cuenta desde ayer)
    expect(rachaMeta(sesiones, 80, '2026-10-16')).toBe(3) // hoy ya llegó a 80
    expect(rachaMeta(sesiones, 0, '2026-10-16')).toBe(0)
    expect(rachaMeta([], 60, '2026-10-16')).toBe(0)
  })
})

describe('lunesDe', () => {
  it('devuelve el lunes de la semana', () => {
    expect(lunesDe('2026-10-16')).toBe('2026-10-12') // viernes
    expect(lunesDe('2026-10-12')).toBe('2026-10-12')
    expect(lunesDe('2026-10-18')).toBe('2026-10-12') // domingo
  })
})

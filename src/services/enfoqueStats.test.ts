import { describe, expect, it } from 'vitest'
import type { SesionFoco } from './enfoque'
import {
  ambienteQueFunciona, calidadPromedio, mapaSemanaHora, mejorRacha, patrones, porHora, resumenFoco, serieSemanas,
} from './enfoqueStats'

const HOY = '2026-10-16' // viernes

const ses = (fecha: string, hora: number, minutos: number, extra: Partial<SesionFoco> = {}): SesionFoco => {
  const [a, m, d] = fecha.split('-').map(Number)
  return { id: `s-${fecha}-${hora}-${minutos}-${Math.random()}`, inicio: new Date(a, m - 1, d, hora, 0).getTime(), minutos, ramoId: null, tareaId: null, tipo: 'pomodoro', fecha, ...extra }
}

describe('resumenFoco', () => {
  it('suma hoy, 7 y 30 días, y compara contra la semana anterior', () => {
    const l = [ses('2026-10-16', 10, 60), ses('2026-10-12', 10, 40), ses('2026-10-07', 10, 50), ses('2026-09-20', 10, 100)]
    const r = resumenFoco(l, HOY)
    expect(r.hoy).toBe(60)
    expect(r.semana).toBe(100)
    expect(r.mes).toBe(250)
    expect(r.total).toBe(250)
    expect(r.masLarga).toBe(100)
    expect(r.tendencia).toBeCloseTo((100 - 50) / 50) // 7 días vs. los 7 anteriores
  })
  it('sin semana anterior no hay tendencia', () => {
    expect(resumenFoco([ses(HOY, 9, 30)], HOY).tendencia).toBeNull()
  })
})

describe('serieSemanas', () => {
  it('semanas de lunes a domingo, de la más antigua a la actual', () => {
    const r = serieSemanas([ses('2026-10-13', 9, 30), ses('2026-10-06', 9, 20)], HOY, 3)
    expect(r.map((x) => x.fecha)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12'])
    expect(r.map((x) => x.minutos)).toEqual([0, 20, 30])
  })
})

describe('mejorRacha', () => {
  it('cuenta días seguidos con la meta cumplida', () => {
    const l = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06'].map((f) => ses(f, 9, 60))
    expect(mejorRacha(l, 60)).toBe(3)
    expect(mejorRacha(l, 90)).toBe(0)
    expect(mejorRacha(l, 0)).toBe(0)
  })
})

describe('porHora / mapaSemanaHora', () => {
  it('reparte una sesión entre las horas que ocupa', () => {
    const s = ses(HOY, 9, 90) // 9:00 a 10:30
    const h = porHora([s])
    expect(h[9]).toBeCloseTo(60)
    expect(h[10]).toBeCloseTo(30)
  })
  it('ubica el día de la semana (lunes = 0)', () => {
    const m = mapaSemanaHora([ses(HOY, 14, 30)]) // viernes = 4
    expect(m[4][14]).toBeCloseTo(30)
    expect(m[0].every((v) => v === 0)).toBe(true)
  })
})

describe('patrones', () => {
  it('con menos de 8 sesiones no inventa nada', () => {
    expect(patrones([ses(HOY, 9, 30)], HOY)).toEqual([])
  })
  it('encuentra la mejor franja con suficientes sesiones', () => {
    const l = Array.from({ length: 10 }, (_, i) => ses(`2026-10-${String(i + 1).padStart(2, '0')}`, 9, 45))
    const h = patrones(l, HOY)
    expect(h[0].titulo).toBe('Tu mejor franja')
    expect(h[0].texto).toMatch(/^Estudias más entre las \d\d:00 y las \d\d:00: 100 %/)
  })
})

describe('calidad y ambiente', () => {
  it('promedio de calidad solo con sesiones calificadas', () => {
    expect(calidadPromedio([ses(HOY, 9, 30)])).toBeNull()
    expect(calidadPromedio([ses(HOY, 9, 30, { calidad: 4 }), ses(HOY, 10, 30, { calidad: 2 })])).toBe(3)
  })
  it('compara fondos con al menos 3 sesiones calificadas cada uno', () => {
    const lluvia = [5, 4, 5].map((c) => ses(HOY, 9, 40, { calidad: c, fondo: 'lluvia', sonido: 'lluvia' }))
    const nada = [3, 2, 3].map((c) => ses(HOY, 12, 40, { calidad: c }))
    const poca = [ses(HOY, 15, 40, { calidad: 5, fondo: 'bosque' })]
    const r = ambienteQueFunciona([...lluvia, ...nada, ...poca])
    expect(r.calificadas).toBe(7)
    expect(r.fondos.map((f) => f.clave)).toEqual(['lluvia'])
    expect(r.sonidos[0].clave).toBe('lluvia')
    expect(r.base).toBeCloseTo((3 + 2 + 3) / 3)
  })
})

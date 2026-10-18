import { describe, expect, it } from 'vitest'
import type { TareaPlan } from '../types'
import type { SesionFoco } from './enfoque'
import { mensajeSemana, rangoSemana, resumenSemana } from './resumenSemanal'

const HOY = '2026-10-16' // viernes; la semana va del lunes 12 al domingo 18

const ses = (fecha: string, minutos: number, ramoId: string | null = 'r1'): SesionFoco => ({
  id: `s${fecha}${minutos}${ramoId}`, inicio: 0, minutos, ramoId, tipo: 'pomodoro', tareaId: null, fecha,
})
const tarea = (hechaEn: string | null): TareaPlan => ({ id: Math.random().toString(), titulo: 't', ramoId: null, fecha: null, prioridad: 'media', hecha: !!hechaEn, hechaEn, subtareas: [], creada: 1, actualizada: 1 })

describe('resumenSemana', () => {
  const r = resumenSemana({
    sesiones: [ses('2026-10-12', 60), ses('2026-10-14', 100, 'r2'), ses('2026-10-14', 30), ses('2026-10-05', 500), ses('2026-10-19', 40)],
    tareas: [tarea('2026-10-13'), tarea('2026-10-16'), tarea('2026-10-05'), tarea(null)],
    diasActividad: ['2026-10-12', '2026-10-15', '2026-10-01'],
    hoy: HOY,
    racha: 3,
  })

  it('toma lunes a domingo de la semana de hoy', () => {
    expect(r.desde).toBe('2026-10-12')
    expect(r.hasta).toBe('2026-10-18')
    expect(r.porDia).toHaveLength(7)
  })
  it('suma solo lo de esa semana', () => {
    expect(r.minutos).toBe(190)
    expect(r.sesiones).toBe(3)
    expect(r.tareasHechas).toBe(2)
  })
  it('días activos: enfoque más actividad registrada, sin repetir', () => {
    expect(r.diasEstudio).toBe(3) // 12, 14 (enfoque) y 15 (actividad)
  })
  it('ramo más estudiado y mejor día', () => {
    expect(r.ramoTop).toEqual({ ramoId: 'r2', minutos: 100 }) // r1 suma 90
    expect(r.mejorDia).toBe(2) // miércoles 14: 130 min
  })
  it('sin enfoque no hay mejor día', () => {
    expect(resumenSemana({ sesiones: [], tareas: [], diasActividad: [], hoy: HOY, racha: 0 }).mejorDia).toBeNull()
  })
})

describe('textos', () => {
  it('mensaje según lo estudiado', () => {
    expect(mensajeSemana({ minutos: 700, diasEstudio: 6, tareasHechas: 3 })).toContain('campeonato')
    expect(mensajeSemana({ minutos: 320, diasEstudio: 4, tareasHechas: 0 })).toContain('buen ritmo')
    expect(mensajeSemana({ minutos: 20, diasEstudio: 1, tareasHechas: 0 })).toContain('avanzaste')
    expect(mensajeSemana({ minutos: 0, diasEstudio: 0, tareasHechas: 0 })).toContain('tranquila')
  })
  it('rango de fechas', () => {
    expect(rangoSemana('2026-10-12', '2026-10-18')).toBe('12 – 18 oct')
    expect(rangoSemana('2026-09-28', '2026-10-04')).toBe('28 sep – 4 oct')
  })
})

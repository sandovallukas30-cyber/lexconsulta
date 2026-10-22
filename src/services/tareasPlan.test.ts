import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TareaPlan } from '../types'
import { contarPorFiltro, etiquetaFecha, filtrarTareas, progresoSubtareas, proximoDiaISO, sumarDiasISO } from './tareasPlan'

const HOY = '2026-10-16'

const tarea = (id: string, extra: Partial<TareaPlan> = {}): TareaPlan => ({
  id, titulo: id, ramoId: null, fecha: null, prioridad: 'media', hecha: false, hechaEn: null, subtareas: [], creada: 1, actualizada: 1, ...extra,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 16, 12, 0, 0)) // 16-oct-2026, hora local
})
afterEach(() => vi.useRealTimers())

describe('proximoDiaISO', () => {
  it('el viernes desde un viernes es el de la semana siguiente; desde otro día, el más cercano', () => {
    expect(proximoDiaISO(5)).toBe('2026-10-23') // hoy es viernes 16-oct-2026
    expect(proximoDiaISO(1)).toBe('2026-10-19') // lunes
    expect(proximoDiaISO(5, new Date(2026, 9, 19, 9))).toBe('2026-10-23') // desde el lunes
  })
})

describe('sumarDiasISO', () => {
  it('cruza meses y años', () => {
    expect(sumarDiasISO('2026-10-31', 1)).toBe('2026-11-01')
    expect(sumarDiasISO('2026-12-31', 1)).toBe('2027-01-01')
    expect(sumarDiasISO('2026-03-01', -1)).toBe('2026-02-28')
    expect(sumarDiasISO('2028-03-01', -1)).toBe('2028-02-29')
  })
  it('no se corre por el cambio de hora', () => {
    expect(sumarDiasISO('2026-09-05', 1)).toBe('2026-09-06')
    expect(sumarDiasISO('2026-04-04', 1)).toBe('2026-04-05')
  })
})

describe('filtrarTareas', () => {
  const tareas = [
    tarea('vencida', { fecha: '2026-10-10' }),
    tarea('hoy', { fecha: HOY }),
    tarea('manana', { fecha: '2026-10-17' }),
    tarea('sinFecha'),
    tarea('hecha', { fecha: HOY, hecha: true, hechaEn: '2026-10-15' }),
    tarea('otroRamo', { fecha: HOY, ramoId: 'x' }),
  ]

  it('Hoy: vencidas y de hoy, sin las hechas', () => {
    expect(filtrarTareas(tareas, 'hoy').map((t) => t.id)).toEqual(['vencida', 'hoy', 'otroRamo'])
  })
  it('Próximas: solo con fecha futura', () => {
    expect(filtrarTareas(tareas, 'proximas').map((t) => t.id)).toEqual(['manana'])
  })
  it('Todas: pendientes con las sin fecha al final', () => {
    const ids = filtrarTareas(tareas, 'todas').map((t) => t.id)
    expect(ids[ids.length - 1]).toBe('sinFecha')
    expect(ids).not.toContain('hecha')
  })
  it('Hechas', () => {
    expect(filtrarTareas(tareas, 'hechas').map((t) => t.id)).toEqual(['hecha'])
  })
  it('filtra por ramo', () => {
    expect(filtrarTareas(tareas, 'todas', 'x').map((t) => t.id)).toEqual(['otroRamo'])
  })
  it('misma fecha: primero la de mayor prioridad', () => {
    const r = filtrarTareas([tarea('b', { fecha: HOY, prioridad: 'baja' }), tarea('a', { fecha: HOY, prioridad: 'alta' })], 'hoy')
    expect(r.map((t) => t.id)).toEqual(['a', 'b'])
  })
  it('cuenta por filtro', () => {
    expect(contarPorFiltro(tareas)).toEqual({ hoy: 3, proximas: 1, todas: 5, hechas: 1 })
  })
})

describe('etiquetaFecha', () => {
  it('hoy, mañana y vencida', () => {
    expect(etiquetaFecha(HOY)).toEqual({ texto: 'Hoy', tono: 'hoy' })
    expect(etiquetaFecha('2026-10-17')).toEqual({ texto: 'Mañana', tono: 'normal' })
    expect(etiquetaFecha('2026-10-13').tono).toBe('vencida')
  })
  it('una tarea hecha nunca se marca vencida', () => {
    expect(etiquetaFecha('2026-10-13', true).tono).toBe('normal')
  })
})

describe('progresoSubtareas', () => {
  it('cuenta hechas y total', () => {
    const t = tarea('t', { subtareas: [{ id: '1', titulo: 'a', hecha: true }, { id: '2', titulo: 'b', hecha: false }] })
    expect(progresoSubtareas(t)).toEqual({ hechas: 1, total: 2 })
  })
})

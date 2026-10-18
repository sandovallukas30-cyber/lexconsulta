import { describe, expect, it } from 'vitest'
import { diasEntreISO, fraseCuentaRegresiva, generarPlan, type EntradaPlan } from './planEstudio'

const base: EntradaPlan = { evaluacion: 'Solemne 1', ramo: 'Orgánico', fechaEval: '2026-10-29', hoy: '2026-10-19', apuntes: ['Fuentes', 'Estado', 'Poder'], tarjetasPendientes: 0 }

describe('diasEntreISO', () => {
  it('cuenta días de calendario', () => {
    expect(diasEntreISO('2026-10-19', '2026-10-29')).toBe(10)
    expect(diasEntreISO('2026-10-29', '2026-10-19')).toBe(-10)
    expect(diasEntreISO('2026-10-31', '2026-11-02')).toBe(2)
  })
})

describe('generarPlan', () => {
  it('sin días por delante no hay plan', () => {
    expect(generarPlan({ ...base, fechaEval: '2026-10-19' })).toEqual([])
    expect(generarPlan({ ...base, fechaEval: '2026-10-10' })).toEqual([])
  })

  it('termina con repaso final el día antes, con prioridad alta', () => {
    const p = generarPlan(base)
    const ultimo = p[p.length - 1]
    expect(ultimo.fecha).toBe('2026-10-28')
    expect(ultimo.titulo).toContain('repaso final')
    expect(ultimo.prioridad).toBe('alta')
  })

  it('con 3 o más días suma un simulacro dos días antes', () => {
    const s = generarPlan(base).find((x) => x.titulo.includes('simulacro'))
    expect(s?.fecha).toBe('2026-10-27')
    expect(generarPlan({ ...base, fechaEval: '2026-10-21' }).some((x) => x.titulo.includes('simulacro'))).toBe(false)
  })

  it('todos los pasos caen entre hoy y el día anterior a la evaluación, sin repetir apuntes', () => {
    const p = generarPlan({ ...base, apuntes: ['A', 'B', 'C', 'D', 'E', 'F'] })
    for (const x of p) {
      expect(x.fecha >= '2026-10-19').toBe(true)
      expect(x.fecha < '2026-10-29').toBe(true)
    }
    const texto = p.map((x) => x.titulo + x.subtareas.join()).join('|')
    for (const a of ['A', 'B', 'C', 'D', 'E', 'F']) expect(texto.match(new RegExp(`«?${a}»?`, 'g'))?.length).toBeGreaterThanOrEqual(1)
  })

  it('reparte los apuntes parejo en los días de estudio', () => {
    const estudio = generarPlan({ ...base, apuntes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] }).filter((x) => x.titulo.includes('estudiar'))
    const fechas = new Set(estudio.map((x) => x.fecha))
    expect(fechas.size).toBeGreaterThan(3)
    expect(estudio.length).toBeLessThanOrEqual(8)
  })

  it('sin apuntes igual arma un plan genérico', () => {
    const p = generarPlan({ ...base, apuntes: [] })
    expect(p.some((x) => x.titulo.includes('la materia de Orgánico'))).toBe(true)
  })

  it('suma las tarjetas pendientes, y a la vuelta de mañana solo queda el repaso final', () => {
    expect(generarPlan({ ...base, tarjetasPendientes: 12 }).some((x) => x.titulo.includes('12 tarjetas'))).toBe(true)
    const manana = generarPlan({ ...base, fechaEval: '2026-10-20' })
    expect(manana).toHaveLength(1)
    expect(manana[0].fecha).toBe('2026-10-19')
  })

  it('no empieza más de 14 días antes', () => {
    const p = generarPlan({ ...base, fechaEval: '2026-12-20' })
    expect(p[0].fecha >= '2026-12-06').toBe(true)
  })
})

describe('fraseCuentaRegresiva', () => {
  it('cambia el tono con los días y suma el avance del plan', () => {
    expect(fraseCuentaRegresiva(0)).toContain('Hoy es el día')
    expect(fraseCuentaRegresiva(1)).toContain('Mañana')
    expect(fraseCuentaRegresiva(20)).toContain('lejos')
    expect(fraseCuentaRegresiva(5, { hechas: 2, total: 7 })).toContain('2 de 7')
  })
})

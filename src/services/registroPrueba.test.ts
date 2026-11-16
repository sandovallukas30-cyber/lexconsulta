import { describe, expect, it } from 'vitest'
import type { RegistroPrueba } from '../types'
import { aplicarResultados, MAX_REGISTROS, pendientes, resumenPorTipo, type ResultadoPrueba } from './registroPrueba'

const res = (id: string, ok: boolean, extra: Partial<ResultadoPrueba> = {}): ResultadoPrueba => ({ id, tipo: 'numero', etiqueta: id, origen: id.split(':')[0], ok, ...extra })

describe('registro de errores del modo prueba', () => {
  it('cuenta aciertos y fallos y guarda cómo salió la última vez', () => {
    let reg = aplicarResultados({}, [res('t1:numero', false)], 100)
    reg = aplicarResultados(reg, [res('t1:numero', true)], 200)
    expect(reg['t1:numero']).toMatchObject({ aciertos: 1, fallos: 1, ok: true, ultimo: 200 })
  })

  it('lo pendiente es lo que falló la última vez, lo que más falla primero', () => {
    let reg = aplicarResultados({}, [res('a:numero', false), res('b:numero', false), res('c:numero', true)], 1)
    reg = aplicarResultados(reg, [res('b:numero', false)], 2)
    expect(pendientes(reg).map(([id]) => id)).toEqual(['b:numero', 'a:numero'])
  })

  it('filtra por ramo y unidad', () => {
    const reg = aplicarResultados({}, [res('a:numero', false, { ramoId: 'r1', unidadId: 'u1' }), res('b:numero', false, { ramoId: 'r1', unidadId: 'u2' }), res('c:numero', false, { ramoId: 'r2' })], 1)
    expect(pendientes(reg, { ramoId: 'r1' })).toHaveLength(2)
    expect(pendientes(reg, { ramoId: 'r1', unidadIds: ['u2'] }).map(([id]) => id)).toEqual(['b:numero'])
    expect(pendientes(reg, { unidadIds: ['__sin__'] }).map(([id]) => id)).toEqual(['c:numero'])
  })

  it('resume por tipo, del que más falla al que menos', () => {
    const reg = aplicarResultados(
      {},
      [res('a:numero', false), res('b:numero', false), res('c:definicion', true, { tipo: 'definicion' }), res('d:definicion', false, { tipo: 'definicion' })],
      1
    )
    const r = resumenPorTipo(reg)
    expect(r.map((x) => x.tipo)).toEqual(['numero', 'definicion'])
    expect(r[0]).toMatchObject({ aciertos: 0, fallos: 2, pendientes: 2 })
  })

  it('guarda lo que faltó solo si falló y recorta', () => {
    const reg = aplicarResultados({}, [res('x:sec:1:desarrollo', false, { tipo: 'desarrollo', faltaron: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }), res('y:sec:1:desarrollo', true, { tipo: 'desarrollo', faltaron: ['a'] })], 1)
    expect(reg['x:sec:1:desarrollo'].faltaron).toHaveLength(6)
    expect(reg['y:sec:1:desarrollo'].faltaron).toBeUndefined()
  })

  it('no pasa del tope y suelta primero lo que ya está bien', () => {
    let reg: Record<string, RegistroPrueba> = {}
    const lote: ResultadoPrueba[] = []
    for (let i = 0; i < MAX_REGISTROS; i++) lote.push(res(`o${i}:numero`, i === 0 ? false : true))
    reg = aplicarResultados(reg, lote, 1)
    reg = aplicarResultados(reg, [res('nuevo:numero', false)], 2)
    expect(Object.keys(reg)).toHaveLength(MAX_REGISTROS)
    expect(reg['o0:numero']).toBeDefined()
    expect(reg['nuevo:numero']).toBeDefined()
  })
})

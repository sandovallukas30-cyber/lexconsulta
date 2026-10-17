// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { validarRespaldo, VERSION_RESPALDO } from './respaldo'

const archivo = (datos: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ app: 'prima-lex', version: VERSION_RESPALDO, fecha: '2026-10-16', datos, ...extra })

describe('validarRespaldo', () => {
  it('rechaza lo que no es JSON', () => {
    expect(validarRespaldo('hola').ok).toBe(false)
  })
  it('rechaza JSON de otra app', () => {
    expect(validarRespaldo(JSON.stringify({ app: 'otra', version: 1, datos: {} })).ok).toBe(false)
  })
  it('rechaza una versión más nueva', () => {
    expect(validarRespaldo(archivo({}, { version: VERSION_RESPALDO + 1 })).ok).toBe(false)
  })
  it('acepta un respaldo viejo y rellena lo que falta (sin tareas ni enfoque)', () => {
    const r = validarRespaldo(archivo({ ramos: [] }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.respaldo.datos.tareasPlan).toEqual([])
      expect(r.respaldo.datos.sesionesFoco).toEqual([])
    }
  })
  it('tolera el BOM del inicio', () => {
    expect(validarRespaldo('﻿' + archivo({})).ok).toBe(true)
  })
  it('rechaza datos dañados sin importar nada', () => {
    const r = validarRespaldo(archivo({ ramos: [{ sinId: true }], tareasPlan: 'no' }))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toContain('ramos')
      expect(r.error).toContain('tareas')
    }
  })
  it('acepta tareas y sesiones válidas', () => {
    expect(validarRespaldo(archivo({ tareasPlan: [{ id: 't', titulo: 'x' }], sesionesFoco: [{ id: 's', minutos: 25 }] })).ok).toBe(true)
  })
})

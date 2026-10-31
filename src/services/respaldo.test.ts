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
      expect(r.error).toContain('asignaturas')
      expect(r.error).toContain('tareas')
    }
  })
  it('acepta tareas y sesiones válidas', () => {
    expect(validarRespaldo(archivo({ tareasPlan: [{ id: 't', titulo: 'x' }], sesionesFoco: [{ id: 's', minutos: 25 }] })).ok).toBe(true)
  })
})

describe('colecciones y mapas dañados en un respaldo', () => {
  const archivo = (datos: Record<string, unknown>) => JSON.stringify({ app: 'prima-lex', version: VERSION_RESPALDO, fecha: '2026-10-30', datos })

  const coleccionCompleta = {
    id: 'c1',
    titulo: 'Obligaciones',
    articulos: [
      { codigo: 'civ', articulo: 'Art. 1545', estado: 'dominado', nota: 'ley del contrato', funcion: 'regla_general', caja: 3, proximoRepaso: 1790000000000, posicion: { x: 10, y: 20 } },
      { codigo: 'civ', articulo: 'Art. 1546' },
    ],
    fechaCreacion: 1,
    fechaModificacion: 2,
    conexiones: [{ id: 'k1', desde: { codigo: 'civ', articulo: 'Art. 1545' }, hasta: { codigo: 'civ', articulo: 'Art. 1546' }, tipo: 'complementa' }],
    grupos: [{ id: 'g1', titulo: 'Efectos', articulos: [{ codigo: 'civ', articulo: 'Art. 1545' }] }],
    mapaMentalVinculado: 'm1',
    oficial: { origenId: 'o1', curso: 'Civil I', version: 2 },
  }
  const mapaCompleto = {
    id: 'm1',
    titulo: 'Contratos',
    nodos: [
      { id: 'n1', posicion: { x: 0, y: 0 }, texto: '*Raíz*', forma: 'ovalo', tamanoTexto: 'titulo', color: '#1d4ed8', ancho: 200, alto: 80, nota: 'ojo', articulo: 'Art. 19 · Constitución' },
      { id: 'n2', posicion: { x: 0, y: 100 }, texto: 'Hijo', forma: 'nube', tamanoTexto: 'texto' },
    ],
    conexiones: [{ id: 'e1', desde: 'n1', hasta: 'n2', desdeHandle: 'bottom', hastaHandle: 'top', etiqueta: 'causa' }],
    fechaCreacion: 1,
    fechaModificacion: 2,
    moduloId: 'civil',
  }

  it('con datos válidos no se pierde ningún campo', () => {
    const r = validarRespaldo(archivo({ colecciones: [coleccionCompleta], mapasMentales: [mapaCompleto] }))
    if (!r.ok) throw new Error(r.error)
    expect(r.respaldo.datos.colecciones).toEqual([coleccionCompleta])
    expect(r.respaldo.datos.mapasMentales).toEqual([mapaCompleto])
  })

  it('lo que rompía la sección se descarta y el resto se conserva', () => {
    const r = validarRespaldo(
      archivo({
        colecciones: [
          { ...coleccionCompleta, articulos: [null, { codigo: 'cpr', articulo: 'Art. 1' }, { codigo: 'civ', articulo: 'Art. 1545', estado: 'zzz' }], conexiones: 'x' },
          { titulo: 'sin id', articulos: [] },
        ],
        mapasMentales: [
          {
            ...mapaCompleto,
            nodos: [null, { id: 'a', texto: 'sin posición', forma: 'rectangulo', tamanoTexto: 'texto' }, { id: 'b', posicion: { x: 1, y: 1 }, texto: 5, forma: 'triangulo', tamanoTexto: 'gigante' }],
            conexiones: [{ id: 'e', desde: 'b', hasta: 'a' }],
          },
        ],
      })
    )
    if (!r.ok) throw new Error(r.error)
    const [c] = r.respaldo.datos.colecciones
    expect(r.respaldo.datos.colecciones).toHaveLength(1)
    expect(c.articulos).toEqual([{ codigo: 'civ', articulo: 'Art. 1545' }])
    expect(c.conexiones).toBeUndefined()
    expect(c.grupos).toEqual([{ id: 'g1', titulo: 'Efectos', articulos: [{ codigo: 'civ', articulo: 'Art. 1545' }] }])
    const [m] = r.respaldo.datos.mapasMentales
    expect(m.nodos).toEqual([{ id: 'b', posicion: { x: 1, y: 1 }, texto: '', forma: 'rectangulo', tamanoTexto: 'texto' }])
    expect(m.conexiones).toEqual([])
  })

  it('si colecciones o mapas no son una lista, el respaldo se rechaza como antes', () => {
    expect(validarRespaldo(archivo({ colecciones: 'x' })).ok).toBe(false)
    expect(validarRespaldo(archivo({ mapasMentales: {} })).ok).toBe(false)
  })
})

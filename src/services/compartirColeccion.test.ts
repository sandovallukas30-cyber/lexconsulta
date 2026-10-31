// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { Coleccion } from '../types'
import { codificarColeccion, coleccionDeOrigen, decodificarColeccion, fusionarOficial, generarArchivoColeccion, publicacionValida } from './compartirColeccion'

const col = (extra: Partial<Coleccion> = {}): Coleccion => ({
  id: 'c1',
  titulo: 'Obligaciones',
  articulos: [
    { codigo: 'civ', articulo: 'Art. 1545', estado: 'dominado', nota: 'ley del contrato' },
    { codigo: 'civ', articulo: 'Art. 1546' },
  ],
  fechaCreacion: 1,
  fechaModificacion: 1,
  ...extra,
})

const publicacion = { origenId: 'abc-123', curso: 'Derecho Civil I, sección 2', autor: 'Delegada', version: 2 }

describe('compartir una colección normal', () => {
  it('lleva el estado del autor y no lleva datos de curso', () => {
    const d = decodificarColeccion(codificarColeccion(col()))!
    expect(d.articulos[0].estado).toBe('dominado')
    expect(d.oficial).toBeUndefined()
  })
})

describe('colección del curso', () => {
  it('viaja con su publicación y SIN el estado de «dominado» del autor', () => {
    const d = decodificarColeccion(codificarColeccion(col({ oficial: publicacion })))!
    expect(d.oficial).toEqual(publicacion)
    expect(d.articulos.every((a) => a.estado === undefined)).toBe(true)
    expect(d.articulos[0].nota).toBe('ley del contrato')
    expect(JSON.parse(generarArchivoColeccion(col({ oficial: publicacion })).contenido).oficial.version).toBe(2)
  })
  it('una publicación mal formada se descarta y la colección se importa como normal', () => {
    const roto = JSON.stringify({ titulo: 'X', articulos: [{ codigo: 'civ', articulo: 'Art. 1' }], oficial: { origenId: '', curso: 'x', version: 1 } })
    const d = decodificarColeccion(roto)!
    expect(d.titulo).toBe('X')
    expect(d.oficial).toBeUndefined()
  })
  it('publicacionValida revisa cada campo', () => {
    expect(publicacionValida(publicacion)).toEqual(publicacion)
    expect(publicacionValida({ ...publicacion, version: 0 })).toBeNull()
    expect(publicacionValida({ ...publicacion, version: 1.5 })).toBeNull()
    expect(publicacionValida({ ...publicacion, version: 10000 })).toBeNull()
    expect(publicacionValida({ ...publicacion, curso: 'x'.repeat(81) })).toBeNull()
    expect(publicacionValida({ ...publicacion, origenId: 'x'.repeat(65) })).toBeNull()
    expect(publicacionValida({ ...publicacion, autor: 'y'.repeat(61) })).toEqual({ origenId: 'abc-123', curso: publicacion.curso, version: 2 })
    expect(publicacionValida(null)).toBeNull()
    expect(publicacionValida('texto')).toBeNull()
  })
  it('descarta campos desconocidos dentro de la publicación', () => {
    const d = decodificarColeccion(JSON.stringify({ titulo: 'X', articulos: [], oficial: { ...publicacion, extra: '<script>' } }))!
    expect(d.oficial).toEqual(publicacion)
  })
})

describe('coleccionDeOrigen', () => {
  it('encuentra la que ya tienes de la misma publicación', () => {
    const mia = col({ id: 'mia', oficial: { ...publicacion, version: 1 } })
    const otra = col({ id: 'otra' })
    const nueva = decodificarColeccion(codificarColeccion(col({ oficial: publicacion })))!
    expect(coleccionDeOrigen([otra, mia], nueva)?.id).toBe('mia')
  })
  it('no confunde una colección normal con una del curso', () => {
    expect(coleccionDeOrigen([col()], decodificarColeccion(codificarColeccion(col()))!)).toBeUndefined()
  })
})

describe('fusionarOficial', () => {
  const nueva = decodificarColeccion(
    JSON.stringify({
      titulo: 'Obligaciones (v2)',
      articulos: [
        { codigo: 'civ', articulo: 'Art. 1545', nota: 'nota oficial' },
        { codigo: 'civ', articulo: 'Art. 1546' },
        { codigo: 'civ', articulo: 'Art. 1547', nota: 'nuevo artículo' },
      ],
      oficial: { ...publicacion, version: 3 },
    })
  )!

  it('conserva tu progreso de repaso y trae lo nuevo del autor', () => {
    const mia = col({
      oficial: { ...publicacion, version: 2 },
      mapaMentalVinculado: 'mapa-1',
      articulos: [
        { codigo: 'civ', articulo: 'Art. 1545', estado: 'dominado', caja: 4, proximoRepaso: 999, nota: 'mi nota' },
        { codigo: 'civ', articulo: 'Art. 1546', nota: 'solo mía', caja: 2 },
        { codigo: 'civ', articulo: 'Art. 9999', nota: 'ya no está en la oficial' },
      ],
    })
    const r = fusionarOficial(mia, nueva, 50)
    expect(r.titulo).toBe('Obligaciones (v2)')
    expect(r.articulos.map((a) => a.articulo)).toEqual(['Art. 1545', 'Art. 1546', 'Art. 1547'])
    const a1 = r.articulos[0]
    expect(a1).toMatchObject({ estado: 'dominado', caja: 4, proximoRepaso: 999, nota: 'nota oficial' })
    expect(r.articulos[1]).toMatchObject({ nota: 'solo mía', caja: 2 })
    expect(r.articulos[2].nota).toBe('nuevo artículo')
    expect(r.oficial?.version).toBe(3)
    expect(r.mapaMentalVinculado).toBe('mapa-1')
    expect(r.id).toBe('c1')
    expect(r.fechaCreacion).toBe(1)
    expect(r.fechaModificacion).toBe(50)
  })
  it('no modifica la colección original', () => {
    const mia = col({ oficial: { ...publicacion, version: 2 } })
    fusionarOficial(mia, nueva)
    expect(mia.titulo).toBe('Obligaciones')
    expect(mia.articulos).toHaveLength(2)
  })
})

describe('links armados a mano o maliciosos', () => {
  const dec = (v: unknown) => decodificarColeccion(JSON.stringify(v))

  it('descarta artículos de códigos que no existen; sin artículos válidos no hay nada que importar', () => {
    expect(dec({ titulo: 'X', articulos: [{ codigo: 'cpr', articulo: 'Art. 19' }] })).toBeNull()
    const d = dec({ titulo: 'X', articulos: [{ codigo: 'cpr', articulo: 'Art. 1' }, { codigo: 'con', articulo: 'Art. 19' }] })!
    expect(d.articulos).toEqual([{ codigo: 'con', articulo: 'Art. 19' }])
  })

  it('un estado, una función o una nota con forma rara se descartan sin perder el artículo', () => {
    const d = dec({ titulo: 'X', articulos: [{ codigo: 'con', articulo: 'Art. 19', estado: 'zzz', funcion: 7, nota: { a: 1 } }] })!
    expect(d.articulos).toEqual([{ codigo: 'con', articulo: 'Art. 19' }])
  })

  it('conexiones y grupos que no son listas, o que apuntan fuera de la colección, se descartan', () => {
    const base = { codigo: 'con', articulo: 'Art. 19' }
    expect(dec({ titulo: 'X', articulos: [base], conexiones: 'x', grupos: 5 })).toEqual({ titulo: 'X', articulos: [base] })
    const d = dec({
      titulo: 'X',
      articulos: [base, { codigo: 'con', articulo: 'Art. 20' }],
      conexiones: [
        { id: 'k1', desde: base, hasta: { codigo: 'con', articulo: 'Art. 20' }, tipo: 'limita' },
        { id: 'k2', desde: base, hasta: { codigo: 'con', articulo: 'Art. 99' }, tipo: 'limita' },
        { id: 'k3', desde: base, hasta: { codigo: 'con', articulo: 'Art. 20' }, tipo: 'inventado' },
      ],
      grupos: [{ id: 'g1', titulo: 'G', articulos: [base, { codigo: 'con', articulo: 'Art. 99' }] }, { id: 'g2', titulo: 'Vacío', articulos: [] }],
    })!
    expect(d.conexiones?.map((c) => c.id)).toEqual(['k1'])
    expect(d.grupos).toEqual([{ id: 'g1', titulo: 'G', articulos: [base] }])
  })

  it('acota tamaños: título, nota, artículos repetidos y la cantidad de artículos', () => {
    const muchos = Array.from({ length: 800 }, (_, i) => ({ codigo: 'civ', articulo: `Art. ${i + 1}` }))
    const d = dec({ titulo: 'T'.repeat(500), articulos: [...muchos, { codigo: 'civ', articulo: 'Art. 1' }] })!
    expect(d.titulo.length).toBe(120)
    expect(d.articulos.length).toBe(500)
    const n = dec({ titulo: 'X', articulos: [{ codigo: 'civ', articulo: 'Art. 1', nota: 'n'.repeat(9000) }] })!
    expect(n.articulos[0].nota?.length).toBe(5000)
  })

  it('no deja pasar campos que la app maneja sola (repaso, posición)', () => {
    const d = dec({ titulo: 'X', articulos: [{ codigo: 'civ', articulo: 'Art. 1', caja: 'x', proximoRepaso: NaN, posicion: 3 }] })!
    expect(d.articulos[0]).toEqual({ codigo: 'civ', articulo: 'Art. 1' })
  })
})

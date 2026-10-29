import { describe, expect, it } from 'vitest'
import { claveNotaArticulo, MAX_NOTA_ARTICULO, notasArticuloValidas, unirNotasArticulo } from './notasArticulo'

describe('notasArticuloValidas', () => {
  it('conserva las notas buenas y descarta lo demás', () => {
    const r = notasArticuloValidas({
      'civil:1545': { texto: 'Ley del contrato', fecha: 5 },
      'civil:1546': { texto: '   ', fecha: 5 },
      'civil:1547': { texto: 'sin fecha' },
      'civil:1548': 'no es objeto',
      'civil:1549': { texto: 'fecha rara', fecha: Number.NaN },
    })
    expect(Object.keys(r)).toEqual(['civil:1545'])
  })
  it('recorta las notas exageradas', () => {
    const r = notasArticuloValidas({ a: { texto: 'x'.repeat(MAX_NOTA_ARTICULO + 500), fecha: 1 } })
    expect(r.a.texto).toHaveLength(MAX_NOTA_ARTICULO)
  })
  it('un valor que no es objeto da un conjunto vacío', () => {
    expect(notasArticuloValidas(null)).toEqual({})
    expect(notasArticuloValidas([1, 2])).toEqual({})
    expect(notasArticuloValidas('x')).toEqual({})
  })
})

describe('unirNotasArticulo', () => {
  it('gana la nota más reciente y se suman las que faltan', () => {
    const local = { a: { texto: 'vieja', fecha: 1 }, b: { texto: 'solo local', fecha: 9 } }
    const nube = { a: { texto: 'nueva', fecha: 2 }, c: { texto: 'solo nube', fecha: 3 }, b: { texto: 'más vieja', fecha: 1 } }
    expect(unirNotasArticulo(local, nube)).toEqual({ a: { texto: 'nueva', fecha: 2 }, b: { texto: 'solo local', fecha: 9 }, c: { texto: 'solo nube', fecha: 3 } })
  })
  it('no modifica los conjuntos de entrada', () => {
    const local = { a: { texto: 'x', fecha: 1 } }
    unirNotasArticulo(local, { a: { texto: 'y', fecha: 2 } })
    expect(local.a.texto).toBe('x')
  })
})

describe('claveNotaArticulo', () => {
  it('junta código y artículo', () => {
    expect(claveNotaArticulo('civil', '1545')).toBe('civil:1545')
  })
})

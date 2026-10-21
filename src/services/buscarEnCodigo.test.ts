import { describe, expect, it } from 'vitest'
import { buscarEnCodigo } from './buscarEnCodigo'
import type { Articulo } from '../types'

const art = (a: string, t: string) => ({ a, t }) as Articulo
const codigo = [art('Art. 18', 'Texto del dieciocho.'), art('Art. 19', 'Texto del diecinueve.'), art('Art. 20', 'Texto del veinte.')]

describe('buscar un artículo por su número', () => {
  it('«19» lleva al artículo 19', () => {
    expect(buscarEnCodigo(codigo, '19')[0].articulo.a).toBe('Art. 19')
  })
  it('«19 4» y «19 n°4» buscan el artículo 19 (el 4 es un numeral, no parte del número)', () => {
    expect(buscarEnCodigo(codigo, '19 4')[0].articulo.a).toBe('Art. 19')
    expect(buscarEnCodigo(codigo, '19 n°4')[0].articulo.a).toBe('Art. 19')
  })
})

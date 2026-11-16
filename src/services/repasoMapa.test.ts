import { describe, expect, it } from 'vitest'
import { avanceRepaso, iniciarRepaso, raicesDe, repetirFalladas } from './repasoMapa'

const ids = ['c', 'a', 'b', 'a1', 'suelto']
const con = [
  { source: 'c', target: 'a' },
  { source: 'c', target: 'b' },
  { source: 'a', target: 'a1' },
]

describe('repaso de mapa mental', () => {
  it('las ideas centrales (sin padre) quedan a la vista', () => {
    expect([...raicesDe(ids, con)].sort()).toEqual(['c', 'suelto'])
    expect([...iniciarRepaso(ids, con).revelados].sort()).toEqual(['c', 'suelto'])
  })

  it('cuenta el avance sin las ideas centrales', () => {
    const e = iniciarRepaso(ids, con)
    e.revelados.add('a').add('b')
    e.marcas.set('a', true).set('b', false)
    expect(avanceRepaso(e, ids, raicesDe(ids, con))).toEqual({ total: 3, revisados: 2, sabidas: 1, noSabidas: 1 })
  })

  it('la segunda vuelta vuelve a tapar solo lo que no sabías', () => {
    const e = iniciarRepaso(ids, con)
    e.revelados.add('a').add('b')
    e.marcas.set('a', true).set('b', false)
    const r = repetirFalladas(e)
    expect(r.revelados.has('a')).toBe(true)
    expect(r.revelados.has('b')).toBe(false)
    expect(r.marcas.get('a')).toBe(true)
    expect(r.marcas.has('b')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import type { MapaMental } from '../types'
import { mapaATarjetas } from './mapaTarjetas'
import { generarTarjetas } from './tarjetasApunte'

const nodo = (id: string, texto: string, y: number, extra: object = {}) => ({ id, texto, posicion: { x: 0, y }, forma: 'rectangulo', ...extra }) as unknown as MapaMental['nodos'][number]
const con = (desde: string, hasta: string) => ({ id: `${desde}-${hasta}`, desde, hasta }) as MapaMental['conexiones'][number]

const MAPA = {
  titulo: 'Régimen de Gobierno — 16 nov 2026',
  nodos: [
    nodo('c', 'Régimen de *Gobierno*', 0),
    nodo('p', 'Presidencial', 100),
    nodo('q', 'Parlamentario', 200),
    nodo('p1', 'Presidente jefe de Estado y de Gobierno', 110),
    nodo('p2', 'Sin voto de censura', 120),
    nodo('q1', 'Gabinete responde ante el Parlamento', 210, { nota: 'ej. Reino Unido' }),
  ],
  conexiones: [con('c', 'p'), con('c', 'q'), con('p', 'p1'), con('p', 'p2'), con('q', 'q1')],
}

describe('mapa → tarjetas', () => {
  it('cada nodo con ramas es una tarjeta, con su padre como contexto y en orden de lectura', () => {
    const r = mapaATarjetas(MAPA)
    expect(r.titulo).toBe('Régimen de Gobierno (tarjetas)')
    const lineas = r.contenido.split('\n').filter((l) => l.startsWith('- '))
    expect(lineas).toEqual([
      '- **Régimen de Gobierno:** Presidencial · Parlamentario',
      '- **Régimen de Gobierno › Presidencial:** Presidente jefe de Estado y de Gobierno · Sin voto de censura',
      '- **Régimen de Gobierno › Parlamentario:** Gabinete responde ante el Parlamento',
      '- **Parlamentario › Gabinete responde ante el Parlamento:** ej. Reino Unido',
    ])
    expect(r.cantidad).toBe(4)
  })

  it('el resultado lo entiende el repaso como tarjetas', () => {
    const r = mapaATarjetas(MAPA)
    const todas = generarTarjetas({ id: 'ap', contenido: r.contenido })
    // la cabecera no debe sumar una tarjeta de «idea clave»
    expect(todas.every((x) => x.tipo === 'termino')).toBe(true)
    const t = todas
    expect(t).toHaveLength(4)
    expect(t[1].frente).toBe('Régimen de Gobierno › Presidencial')
    expect(t[1].reverso).toBe('Presidente jefe de Estado y de Gobierno · Sin voto de censura')
  })

  it('un mapa sin ramas no da tarjetas', () => {
    expect(mapaATarjetas({ titulo: 'x', nodos: [nodo('a', 'Solo', 0)], conexiones: [] })).toMatchObject({ contenido: '', cantidad: 0 })
  })
})

import { describe, expect, it } from 'vitest'
import type { ArticuloColeccion } from '../types'
import { aplicarNota, esEstadoFSRS, estadoArticulo, intervalosArticulo, notaDe } from './repasoColeccion'

const DIA = 86_400_000
const AHORA = Date.UTC(2026, 10, 16, 15)
const art = (extra: Partial<ArticuloColeccion> = {}): ArticuloColeccion => ({ codigo: 'civ', articulo: 'Art. 1', ...extra })

describe('repaso de colecciones con FSRS', () => {
  it('un artículo nunca repasado parte como nuevo', () => {
    expect(estadoArticulo(art()).fase).toBe('nueva')
  })

  it('un artículo con caja de antes sigue desde ese intervalo', () => {
    const e = estadoArticulo(art({ caja: 4, proximoRepaso: AHORA }))
    expect(e.fase).toBe('repaso')
    expect(e.estabilidad).toBe(14)
    expect(e.ultima).toBe(AHORA - 14 * DIA)
  })

  it('«Otra vez» lo trae de vuelta en minutos y «Fácil» lo aleja más que «Bien»', () => {
    const base = art({ caja: 3, proximoRepaso: AHORA })
    const otra = aplicarNota(base, 1, AHORA)
    const bien = aplicarNota(base, 3, AHORA)
    const facil = aplicarNota(base, 4, AHORA)
    expect(otra.proximoRepaso! - AHORA).toBeLessThan(DIA)
    expect(facil.proximoRepaso!).toBeGreaterThan(bien.proximoRepaso!)
    expect(bien.fsrs?.ultima).toBe(AHORA)
    expect(bien.caja).toBeGreaterThanOrEqual(1)
  })

  it('conserva los demás datos del artículo', () => {
    const r = aplicarNota(art({ nota: 'mi nota', estado: 'repasando' }), 3, AHORA)
    expect(r.nota).toBe('mi nota')
    expect(r.estado).toBe('repasando')
  })

  it('da textos para los 4 botones', () => {
    const t = intervalosArticulo(art(), AHORA)
    expect(Object.keys(t)).toEqual(['1', '2', '3', '4'])
    expect(t[1]).toMatch(/min/)
  })

  it('traduce la respuesta de antes y valida estados guardados', () => {
    expect(notaDe('sabia')).toBe(3)
    expect(notaDe('no_sabia')).toBe(1)
    expect(notaDe(4)).toBe(4)
    expect(esEstadoFSRS({ fase: 'repaso', estabilidad: 3, dificultad: 5, ultima: 1, olvidos: 0 })).toBe(true)
    expect(esEstadoFSRS({ fase: 'x', estabilidad: 3 })).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import type { DatosAcademicosModulo } from '../types'
import { hoyTeToca, type DatosHoy } from './hoyTeToca'
import { tarjetasDe } from './tarjetasApunte'

const AHORA = Date.UTC(2026, 10, 16, 15)
const vacio: DatosAcademicosModulo = { clases: [], evaluaciones: [], textos: [], apuntes: [], cuadernos: [], briefs: [] }
const base = (extra: Partial<DatosHoy> = {}): DatosHoy => ({ academico: {}, colecciones: [], repasoApuntes: {}, erroresPrueba: {}, nombreRamo: (id) => id.toUpperCase(), hoy: '2026-11-16', ahora: AHORA, ...extra })

describe('Hoy te toca', () => {
  it('sin nada no propone nada', () => {
    expect(hoyTeToca(base())).toEqual([])
  })

  it('propone el simulacro de una evaluación cercana con lo que entra, y no las lejanas ni las ya rendidas', () => {
    const academico = {
      r1: { ...vacio, evaluaciones: [
        { id: 'e1', nombre: 'Solemne', fecha: '2026-11-20', ponderacion: 30, notaMaxima: 7, nota: null, unidadIds: ['u1'] },
        { id: 'e2', nombre: 'Examen', fecha: '2027-01-20', ponderacion: 40, notaMaxima: 7, nota: null },
        { id: 'e3', nombre: 'Control', fecha: '2026-11-17', ponderacion: 10, notaMaxima: 7, nota: 5 },
      ] },
    }
    const r = hoyTeToca(base({ academico }))
    expect(r).toHaveLength(1)
    expect(r[0].titulo).toBe('Simulacro: Solemne')
    expect(r[0].detalle).toBe('R1 · en 4 días · solo lo que entra')
    expect(r[0].accion).toEqual({ juego: 'simulacro', ramoId: 'r1', unidadIds: ['u1'] })
  })

  it('cuenta los errores pendientes y destaca los de plazos', () => {
    const erroresPrueba = {
      'a:numero': { tipo: 'numero' as const, etiqueta: 'a', origen: 'a', ramoId: 'r1', aciertos: 0, fallos: 1, ultimo: 1, ok: false },
      'b:definicion': { tipo: 'definicion' as const, etiqueta: 'b', origen: 'b', ramoId: 'r1', aciertos: 0, fallos: 1, ultimo: 1, ok: false },
      'c:numero': { tipo: 'numero' as const, etiqueta: 'c', origen: 'c', ramoId: 'r1', aciertos: 1, fallos: 0, ultimo: 1, ok: true },
    }
    const r = hoyTeToca(base({ erroresPrueba }))
    expect(r[0].titulo).toBe('Corregir 2 errores')
    expect(r[0].detalle).toBe('1 es de plazos o quórums')
    expect(r[0].accion).toEqual({ juego: 'simulacro', ramoId: 'r1', soloErrores: true })
  })

  it('solo cuenta como deuda las tarjetas ya estudiadas que vencieron', () => {
    const apunte = { id: 'ap', titulo: 'x', contenido: '- **Dolo:** intención de dañar\n- **Culpa:** falta de cuidado', fechaCreacion: 0, fechaModificacion: 0 }
    const [t1] = tarjetasDe(apunte)
    const repasoApuntes = { [t1.id]: { caja: 1, proximo: AHORA - 1000, aciertos: 0, fallos: 1, ultimo: 0 } }
    const r = hoyTeToca(base({ academico: { r1: { ...vacio, apuntes: [apunte] } }, repasoApuntes }))
    expect(r.map((x) => x.titulo)).toEqual(['Repasar 1 tarjeta'])
  })

  it('incluye los artículos de colecciones por repasar', () => {
    const colecciones = [{ id: 'c', titulo: 'C', articulos: [{ codigo: 'con' as const, articulo: 'Art. 1' }], conexiones: [], grupos: [], fechaCreacion: 0, fechaModificacion: 0 }]
    const r = hoyTeToca(base({ colecciones: colecciones as never }))
    expect(r[0]).toMatchObject({ titulo: 'Repasar 1 artículo', accion: { juego: 'repaso' } })
  })
})

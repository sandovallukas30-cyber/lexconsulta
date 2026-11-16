import { describe, expect, it } from 'vitest'
import type { ApunteModulo, EvaluacionModulo, UnidadRamo } from '../types'
import { agregarUnidades, apuntesDeUnidades, apuntesPorUnidad, evaluacionesConTemario, limpiarUnidadesBorradas, parsearTemario, SIN_UNIDAD } from './temario'

const ap = (id: string, unidadId?: string): ApunteModulo => ({ id, titulo: id, contenido: '', fechaCreacion: 0, fechaModificacion: 0, ...(unidadId ? { unidadId } : {}) })
const ev = (id: string, fecha: string, nota: number | null, unidadIds?: string[]): EvaluacionModulo => ({ id, nombre: id, fecha, ponderacion: 30, notaMaxima: 7, nota, ...(unidadIds ? { unidadIds } : {}) })

describe('temario', () => {
  it('parsea una lista pegada sin viñetas ni repetidos', () => {
    const t = '1. Los actos jurídicos\n- Los contratos\n• Las obligaciones\n  \n2) Los actos jurídicos\nUnidad 5: La prueba'
    expect(parsearTemario(t)).toEqual(['Los actos jurídicos', 'Los contratos', 'Las obligaciones', 'Unidad 5: La prueba'])
  })

  it('no confunde «2024 informe» con numeración', () => {
    expect(parsearTemario('2024 informe')).toEqual(['2024 informe'])
  })

  it('agrega unidades sin duplicar las existentes', () => {
    let n = 0
    const base: UnidadRamo[] = [{ id: 'a', nombre: 'Contratos' }]
    const r = agregarUnidades(base, ['contratos', 'Prueba'], () => `n${++n}`)
    expect(r).toEqual([{ id: 'a', nombre: 'Contratos' }, { id: 'n1', nombre: 'Prueba' }])
  })

  it('filtra apuntes por unidad, con «sin unidad» y lista vacía = todos', () => {
    const lista = [ap('1', 'u1'), ap('2', 'u2'), ap('3')]
    expect(apuntesDeUnidades(lista, []).length).toBe(3)
    expect(apuntesDeUnidades(lista, ['u1']).map((a) => a.id)).toEqual(['1'])
    expect(apuntesDeUnidades(lista, ['u2', SIN_UNIDAD]).map((a) => a.id)).toEqual(['2', '3'])
  })

  it('cuenta apuntes por unidad y manda a «sin unidad» los de unidades borradas', () => {
    const m = apuntesPorUnidad([ap('1', 'u1'), ap('2', 'u1'), ap('3', 'zzz'), ap('4')], [{ id: 'u1', nombre: 'U1' }])
    expect(m.get('u1')).toBe(2)
    expect(m.get(SIN_UNIDAD)).toBe(2)
  })

  it('al borrar una unidad la quita de evaluaciones y apuntes', () => {
    const r = limpiarUnidadesBorradas([{ id: 'u1', nombre: 'U1' }], [ev('e', '2026-12-01', null, ['u1', 'u2'])], [ap('a', 'u2'), ap('b', 'u1')])
    expect(r.evaluaciones[0].unidadIds).toEqual(['u1'])
    expect(r.apuntes[0].unidadId).toBeUndefined()
    expect(r.apuntes[1].unidadId).toBe('u1')
  })

  it('las evaluaciones con temario son las pendientes con unidades, por fecha', () => {
    const r = evaluacionesConTemario([ev('b', '2026-12-10', null, ['u1']), ev('a', '2026-12-01', null, ['u1']), ev('c', '2026-11-01', 5, ['u1']), ev('d', '2026-12-02', null)])
    expect(r.map((e) => e.id)).toEqual(['a', 'b'])
  })
})

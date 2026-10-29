import { describe, expect, it } from 'vitest'
import type { DatosAcademicosModulo, TareaPlan } from '../types'
import type { EstadoCalendario } from './calendario'
import { etiquetaSemana, lunesDe, resumenSemana } from './miSemana'

// semana del lunes 2 al domingo 8 de noviembre de 2026
const datos = (p: Partial<DatosAcademicosModulo>): DatosAcademicosModulo => ({ clases: [], evaluaciones: [], casos: [], textos: [], apuntes: [], ...p }) as DatosAcademicosModulo
const tarea = (id: string, fecha: string | null, hecha = false): TareaPlan =>
  ({ id, titulo: id, ramoId: null, fecha, prioridad: 'media', hecha, hechaEn: null, subtareas: [], creada: 0, actualizada: 0 }) as TareaPlan

const estado: EstadoCalendario = {
  ramos: [],
  academicoModulos: {
    civil: datos({
      clases: [
        { id: 'c1', fecha: '2026-11-03', tema: 'Obligaciones', completada: false },
        { id: 'c2', fecha: '2026-11-03', tema: 'Contratos', completada: false },
        { id: 'c3', fecha: '2026-11-10', tema: 'Fuera de semana', completada: false },
      ],
      evaluaciones: [
        { id: 'e1', nombre: 'Solemne 1', fecha: '2026-11-05', ponderacion: 30, notaMaxima: 7, nota: null },
        { id: 'e2', nombre: 'Control', fecha: '2026-11-04', ponderacion: 10, notaMaxima: 7, nota: 6 },
      ],
    } as Partial<DatosAcademicosModulo>),
  },
  tareasPlan: [tarea('t1', '2026-11-03'), tarea('t2', '2026-11-03', true), tarea('t3', '2026-11-08'), tarea('t4', null)],
}

describe('resumenSemana', () => {
  const sem = resumenSemana(estado, '2026-11-05')
  it('devuelve siete días de lunes a domingo, sin importar qué día de la semana se pase', () => {
    expect(sem.map((d) => d.fecha)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'])
    expect(resumenSemana(estado, '2026-11-08')[0].fecha).toBe('2026-11-02')
  })
  it('cuenta las clases del día y deja fuera las de otra semana', () => {
    expect(sem[1].clases).toBe(2)
    expect(sem.reduce((n, d) => n + d.clases, 0)).toBe(2)
  })
  it('lista solo las evaluaciones sin nota', () => {
    expect(sem[3].evaluaciones).toEqual(['Solemne 1'])
    expect(sem[2].evaluaciones).toEqual([])
  })
  it('cuenta solo las tareas pendientes con fecha', () => {
    expect(sem[1].tareas).toBe(1)
    expect(sem[6].tareas).toBe(1)
    expect(sem.reduce((n, d) => n + d.tareas, 0)).toBe(2)
  })
})

describe('etiquetaSemana', () => {
  const hoy = '2026-11-04'
  it('nombra la semana actual, la anterior y la siguiente', () => {
    expect(etiquetaSemana('2026-11-06', hoy)).toBe('Esta semana')
    expect(etiquetaSemana('2026-11-11', hoy)).toBe('Próxima semana')
    expect(etiquetaSemana('2026-10-28', hoy)).toBe('Semana pasada')
  })
  it('para otras semanas da el rango, y nombra los dos meses si la semana los cruza', () => {
    expect(etiquetaSemana('2026-11-18', hoy)).toMatch(/^Del 16 al 22 de noviembre$/)
    expect(etiquetaSemana('2026-12-01', hoy)).toMatch(/^Del 30 de noviembre al 6 de diciembre$/)
  })
  it('lunesDe devuelve el lunes de la semana', () => {
    expect(lunesDe('2026-11-08')).toBe('2026-11-02')
  })
})

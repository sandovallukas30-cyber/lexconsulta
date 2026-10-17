import { describe, expect, it } from 'vitest'
import type { DatosAcademicosModulo } from '../types'
import { celdasMes, diasDeSemana, itemsPorFecha, type EstadoCalendario, type TipoItem } from './calendario'
import { crearICS } from './ics'

const TODOS = new Set<TipoItem>(['clase', 'evaluacion', 'tarea'])

const datos = (p: Partial<DatosAcademicosModulo>): DatosAcademicosModulo => ({
  clases: [], evaluaciones: [], textos: [], apuntes: [], cuadernos: [], briefs: [], ...p,
})

const estado: EstadoCalendario = {
  ramos: [{ id: 'r1', nombre: 'Derecho Civil', color: '#2563EB', modulosVinculados: [], bloques: [{ dia: 0, inicio: '08:30', fin: '09:50' }] } as never],
  academicoModulos: {
    r1: datos({
      clases: [
        { id: 'c1', fecha: '2026-10-12', hora: '08:30', tema: 'Acto jurídico', completada: false },
        { id: 'c2', fecha: '2026-10-19', tema: 'Sin hora', completada: true },
      ],
      evaluaciones: [{ id: 'e1', nombre: 'Solemne 1', fecha: '2026-10-12', ponderacion: 30, notaMaxima: 7, nota: null }],
    }),
  },
  tareasPlan: [{ id: 't1', titulo: 'Leer, resumir; entregar', ramoId: 'r1', fecha: '2026-10-12', prioridad: 'alta', hecha: false, hechaEn: null, subtareas: [], creada: 1, actualizada: 1 }],
}

describe('itemsPorFecha', () => {
  it('agrupa por día y ordena: hora, luego evaluación > clase > tarea', () => {
    const m = itemsPorFecha(estado, '2026-10-12', '2026-10-18', TODOS)
    expect(m.get('2026-10-12')?.map((i) => i.tipo)).toEqual(['clase', 'evaluacion', 'tarea'])
  })
  it('respeta el rango (ambos extremos incluidos) y los tipos', () => {
    expect(itemsPorFecha(estado, '2026-10-13', '2026-10-18', TODOS).size).toBe(0)
    expect(itemsPorFecha(estado, '2026-10-12', '2026-10-19', new Set<TipoItem>(['clase'])).size).toBe(2)
  })
})

describe('celdasMes / diasDeSemana', () => {
  it('42 celdas, lunes primero (oct-2026 empieza jueves)', () => {
    const c = celdasMes(2026, 9)
    expect(c).toHaveLength(42)
    expect(c[0]).toBe('2026-09-28')
    expect(c[3]).toBe('2026-10-01')
  })
  it('la semana va de lunes a domingo', () => {
    expect(diasDeSemana('2026-10-16')).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'])
    expect(diasDeSemana('2026-10-18')[0]).toBe('2026-10-12')
  })
})

describe('crearICS', () => {
  const ahora = new Date('2026-10-16T12:00:00Z')
  const { texto, cantidad } = crearICS(estado, '2026-10-01', '2026-10-31', ahora)
  const lineas = texto.split('\r\n')

  it('es un calendario válido con un VEVENT por ítem', () => {
    expect(lineas[0]).toBe('BEGIN:VCALENDAR')
    expect(lineas[lineas.length - 2]).toBe('END:VCALENDAR')
    expect(cantidad).toBe(4)
    expect(lineas.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(4)
    expect(lineas.filter((l) => l === 'END:VEVENT')).toHaveLength(4)
  })
  it('la clase con hora usa el fin del bloque del horario', () => {
    expect(texto).toContain('DTSTART:20261012T083000')
    expect(texto).toContain('DTEND:20261012T095000')
  })
  it('lo que no tiene hora va como día completo', () => {
    expect(texto).toContain('DTSTART;VALUE=DATE:20261019')
    expect(texto).toContain('DTEND;VALUE=DATE:20261020')
  })
  it('escapa comas y punto y coma', () => {
    expect(texto).toContain('Leer\\, resumir\\; entregar')
  })
  it('las evaluaciones traen alarma un día antes', () => {
    expect(texto).toContain('TRIGGER:-P1D')
  })
  it('ninguna línea pasa de 75 octetos', () => {
    const largo = crearICS({ ...estado, tareasPlan: [{ ...estado.tareasPlan[0], titulo: 'ñ'.repeat(120) }] }, '2026-10-01', '2026-10-31', ahora).texto
    for (const l of largo.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
  })
})

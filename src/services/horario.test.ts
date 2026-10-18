import { describe, expect, it } from 'vitest'
import { diaSemanaISO, feriadosChile, formatearHorario, generarFechasClases } from './horario'

describe('diaSemanaISO', () => {
  it('0 = lunes … 6 = domingo', () => {
    expect(diaSemanaISO('2026-10-12')).toBe(0) // lunes
    expect(diaSemanaISO('2026-10-16')).toBe(4) // viernes
    expect(diaSemanaISO('2026-10-18')).toBe(6) // domingo
  })
})

describe('formatearHorario', () => {
  it('ordena por día y hora', () => {
    expect(formatearHorario([{ dia: 2, inicio: '10:00' }, { dia: 0, inicio: '08:30', fin: '09:50' }])).toBe('Lun 08:30–09:50 · Mié 10:00')
  })
  it('sin bloques queda vacío', () => {
    expect(formatearHorario([])).toBe('')
  })
})

describe('feriadosChile', () => {
  it('incluye los de fecha fija', () => {
    const f = feriadosChile(2026)
    for (const d of ['2026-01-01', '2026-05-01', '2026-05-21', '2026-09-18', '2026-09-19', '2026-12-25']) expect(f.has(d)).toBe(true)
  })
  it('calcula Viernes y Sábado Santo (Pascua 2026 = 5 de abril, 2025 = 20 de abril)', () => {
    expect(feriadosChile(2026).has('2026-04-03')).toBe(true)
    expect(feriadosChile(2026).has('2026-04-04')).toBe(true)
    expect(feriadosChile(2025).has('2025-04-18')).toBe(true)
    expect(feriadosChile(2025).has('2025-04-19')).toBe(true)
  })
})

describe('generarFechasClases', () => {
  const bloques = [{ dia: 0, inicio: '08:30' }, { dia: 2, inicio: '10:00' }]

  it('una clase por bloque y semana, con su hora', () => {
    const r = generarFechasClases({ desde: '2026-10-12', hasta: '2026-10-25', bloques, omitirFeriados: false, fechasExistentes: new Set() })
    expect(r).toEqual([
      { fecha: '2026-10-12', hora: '08:30' },
      { fecha: '2026-10-14', hora: '10:00' },
      { fecha: '2026-10-19', hora: '08:30' },
      { fecha: '2026-10-21', hora: '10:00' },
    ])
  })

  it('incluye el primer y el último día del rango', () => {
    const r = generarFechasClases({ desde: '2026-10-12', hasta: '2026-10-14', bloques, omitirFeriados: false, fechasExistentes: new Set() })
    expect(r.map((x) => x.fecha)).toEqual(['2026-10-12', '2026-10-14'])
  })

  it('salta feriados cuando se pide (lunes 1 de mayo de 2028)', () => {
    const con = generarFechasClases({ desde: '2028-05-01', hasta: '2028-05-01', bloques, omitirFeriados: false, fechasExistentes: new Set() })
    const sin = generarFechasClases({ desde: '2028-05-01', hasta: '2028-05-01', bloques, omitirFeriados: true, fechasExistentes: new Set() })
    expect(con).toHaveLength(1)
    expect(sin).toHaveLength(0)
  })

  it('cada clase lleva la sala de su bloque', () => {
    const conSala = [{ dia: 0, inicio: '08:30', sala: 'Auditorio 4' }, { dia: 2, inicio: '10:00', sala: 'Sala 206' }]
    const r = generarFechasClases({ desde: '2026-10-12', hasta: '2026-10-14', bloques: conSala, omitirFeriados: false, fechasExistentes: new Set() })
    expect(r.map((x) => x.sala)).toEqual(['Auditorio 4', 'Sala 206'])
  })

  it('no repite fechas que ya tienen clase', () => {
    const r = generarFechasClases({ desde: '2026-10-12', hasta: '2026-10-19', bloques, omitirFeriados: false, fechasExistentes: new Set(['2026-10-12']) })
    expect(r.map((x) => x.fecha)).not.toContain('2026-10-12')
    expect(r.map((x) => x.fecha)).toContain('2026-10-19')
  })

  it('sin bloques o con el rango al revés no genera nada', () => {
    expect(generarFechasClases({ desde: '2026-10-12', hasta: '2026-10-30', bloques: [], omitirFeriados: true, fechasExistentes: new Set() })).toEqual([])
    expect(generarFechasClases({ desde: '2026-10-30', hasta: '2026-10-12', bloques, omitirFeriados: true, fechasExistentes: new Set() })).toEqual([])
  })

  it('un semestre de dos bloques semanales da unas 32 clases', () => {
    const r = generarFechasClases({ desde: '2026-03-09', hasta: '2026-06-26', bloques, omitirFeriados: true, fechasExistentes: new Set() })
    expect(r.length).toBeGreaterThanOrEqual(30)
    expect(r.length).toBeLessThanOrEqual(34)
  })
})

import { describe, expect, it } from 'vitest'
import { leerICS, nombreEvaluacion, sugerirRamo, yaExiste } from './icsImportar'
import type { Ramo } from '../types'

const ramo = (id: string, nombre: string, extra: Partial<Ramo> = {}): Ramo => ({ id, nombre, modulosVinculados: [], ...extra }) as Ramo

const ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20261123',
  'DTEND;VALUE=DATE:20261125',
  'SUMMARY:E1 DCO',
  String.raw`DESCRIPTION:Primera convocatoria\, 23 o 24`,
  'BEGIN:VALARM',
  'DESCRIPTION:otra cosa',
  'TRIGGER:-PT15H',
  'END:VALARM',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART:20261116T090000',
  'DTEND:20261116T110000',
  'SUMMARY:Sustitutiva Derecho Procesal Cons',
  ' titucional',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

describe('leerICS', () => {
  it('lee título, fecha, rango de días y descripción (con líneas dobladas y alarmas)', () => {
    const evs = leerICS(ICS)
    expect(evs).toEqual([
      { titulo: 'Sustitutiva Derecho Procesal Constitucional', fecha: '2026-11-16' },
      { titulo: 'E1 DCO', fecha: '2026-11-23', fechaFin: '2026-11-24', descripcion: 'Primera convocatoria, 23 o 24' },
    ])
    expect(nombreEvaluacion(evs[1])).toBe('E1 DCO (23 o 24)')
  })
})

describe('sugerirRamo', () => {
  const ramos = [
    ramo('dco', 'Derecho Constitucional Orgánico'),
    ramo('dpc', 'Derecho Procesal Constitucional'),
    ramo('hist', 'Historia del Derecho'),
    ramo('ipj', 'Introducción a la Profesión Jurídica'),
    ramo('cfdp', 'Fundamentos', { codigoCurso: 'CFDP' }),
  ]
  it('por sigla, código del curso o palabras', () => {
    expect(sugerirRamo('E1 DCO', ramos)).toBe('dco')
    expect(sugerirRamo('Sustitutiva IPJ', ramos)).toBe('ipj')
    expect(sugerirRamo('E2 CFDP', ramos)).toBe('cfdp')
    expect(sugerirRamo('E1 Historia', ramos)).toBe('hist')
    expect(sugerirRamo('E2 Derecho Procesal Constitucional', ramos)).toBe('dpc')
  })
  it('sin coincidencia clara no adivina', () => {
    expect(sugerirRamo('E1 RAZO', ramos)).toBeNull()
    expect(sugerirRamo('Examen', ramos)).toBeNull()
    expect(sugerirRamo('Derecho', ramos)).toBeNull() // empate entre varios
  })
})

it('yaExiste compara nombre sin tildes ni mayúsculas y la fecha', () => {
  const evs = [{ id: '1', nombre: 'E1 Histórica', fecha: '2026-12-03', ponderacion: 0, notaMaxima: 7, nota: null }]
  expect(yaExiste(evs, 'e1 historica', '2026-12-03')).toBe(true)
  expect(yaExiste(evs, 'e1 historica', '2026-12-04')).toBe(false)
})

import { describe, expect, it } from 'vitest'
import { compararRecitado } from './recitar'

const ORIGINAL = 'El Presidente tiene treinta días para formular observaciones al proyecto, que se aprueban por dos tercios de los miembros presentes.'

describe('compararRecitado', () => {
  it('un recitado completo recuerda todo, con otro orden y mayúsculas distintas', () => {
    const r = compararRecitado(ORIGINAL, 'observaciones al proyecto: el PRESIDENTE tiene 30 días para formular; se aprueban por 2/3 de los miembros presentes')
    expect(r.faltaron).toEqual([])
    expect(r.porcentaje).toBe(1)
  })

  it('marca lo que faltó y lo lista una sola vez', () => {
    const r = compararRecitado('El plazo es de treinta días. Pasados treinta días, vence.', 'el plazo vence')
    expect(r.faltaron).toEqual(['treinta', 'días', 'Pasados'])
    expect(r.recordadas).toBeLessThan(r.total)
  })

  it('un número distinto no cuenta como recordado', () => {
    const r = compararRecitado('dentro de tres meses', 'dentro de seis meses')
    expect(r.trozos.find((t) => t.texto === 'tres')?.estado).toBe('falta')
    expect(r.trozos.find((t) => t.texto === 'meses')?.estado).toBe('ok')
  })

  it('las palabras de enlace no cuentan y se conservan para mostrar el texto', () => {
    const r = compararRecitado('de la ley orgánica', '')
    expect(r.total).toBe(1)
    expect(r.trozos.map((t) => t.texto).join('')).toBe('de la ley orgánica')
  })

  it('texto vacío recitado no recuerda nada', () => {
    expect(compararRecitado(ORIGINAL, '').porcentaje).toBe(0)
  })
})

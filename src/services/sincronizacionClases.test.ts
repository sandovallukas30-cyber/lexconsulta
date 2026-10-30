import { describe, it, expect } from 'vitest'
import { combinarAcademicos } from './respaldo'
import { sellarCambios } from './sellarCambios'
import type { DatosAcademicosModulo, SesionClase } from '../types'

const modulo = (clases: SesionClase[]): Record<string, DatosAcademicosModulo> => ({
  m1: { clases, evaluaciones: [], textos: [], apuntes: [], cuadernos: [], briefs: [] },
})
const clase = (extra: Partial<SesionClase> = {}): SesionClase => ({ id: 'c1', fecha: '2026-10-29', tema: 'Clase 1', completada: false, ...extra })

describe('sincronización de la asistencia entre dispositivos', () => {
  it('la asistencia marcada en otro dispositivo llega aunque la clase ya exista aquí', () => {
    const aqui = modulo([clase({ actualizada: 100 })])
    const nube = modulo([clase({ asistio: true, completada: true, actualizada: 200 })])
    expect(combinarAcademicos(aqui, nube, true).m1.clases[0]).toMatchObject({ asistio: true, completada: true })
  })

  it('lo que cambiaste aquí después no lo pisa una copia más vieja de la nube', () => {
    const aqui = modulo([clase({ asistio: false, actualizada: 300 })])
    const nube = modulo([clase({ asistio: true, actualizada: 200 })])
    expect(combinarAcademicos(aqui, nube, true).m1.clases[0].asistio).toBe(false)
  })

  it('datos de antes (sin fecha en ninguna copia): se conserva la que tiene la asistencia marcada', () => {
    const aqui = modulo([clase()])
    const nube = modulo([clase({ asistio: true, completada: true })])
    expect(combinarAcademicos(aqui, nube, true).m1.clases[0].asistio).toBe(true)
  })

  it('al importar un archivo (sin nube) sigue ganando lo local', () => {
    const aqui = modulo([clase({ actualizada: 100 })])
    const archivo = modulo([clase({ asistio: true, actualizada: 200 })])
    expect(combinarAcademicos(aqui, archivo).m1.clases[0].asistio).toBeUndefined()
  })
})

describe('sellarCambios', () => {
  it('solo marca lo que cambió', () => {
    const igual = clase({ id: 'a' })
    const cambia = clase({ id: 'b' })
    const sellada = sellarCambios([igual, cambia], [igual, { ...cambia, asistio: true }, clase({ id: 'c' })], 999)
    expect(sellada[0]).toBe(igual)
    expect(sellada[1]).toMatchObject({ asistio: true, actualizada: 999 })
    expect(sellada[2].actualizada).toBe(999)
  })
})

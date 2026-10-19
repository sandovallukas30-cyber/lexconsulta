import { describe, expect, it } from 'vitest'
import { DISENOS, disenoDe, profesoresDe, resumenProfesores, textoSobre } from './disenoRamo'

describe('profesoresDe', () => {
  it('usa la lista nueva si existe', () => {
    expect(profesoresDe({ profesor: 'Juan Vio', profesores: ['Juan Vio', 'Ana Soto'] })).toEqual(['Juan Vio', 'Ana Soto'])
  })
  it('en ramos antiguos vale el único profesor', () => {
    expect(profesoresDe({ profesor: 'Juan Vio' })).toEqual(['Juan Vio'])
    expect(profesoresDe({})).toEqual([])
  })
  it('limpia espacios, vacíos y repetidos', () => {
    expect(profesoresDe({ profesores: ['  Ana   Soto ', '', 'ana soto', 'Luis Paz'] })).toEqual(['Ana Soto', 'Luis Paz'])
  })
})

describe('resumenProfesores', () => {
  it('une según la cantidad', () => {
    expect(resumenProfesores([])).toBe('')
    expect(resumenProfesores(['A'])).toBe('A')
    expect(resumenProfesores(['A', 'B'])).toBe('A y B')
    expect(resumenProfesores(['A', 'B', 'C', 'D'])).toBe('A, B y 2 más')
    expect(resumenProfesores(['A', 'B', 'C'], 3)).toBe('A, B y C')
  })
})

describe('disenoDe', () => {
  it('respeta el elegido', () => {
    expect(disenoDe({ id: 'x', diseno: 'arcos' })).toBe('arcos')
  })
  it('sin elegir, es estable para un mismo ramo y siempre válido', () => {
    const a = disenoDe({ id: 'ramo-1' })
    expect(disenoDe({ id: 'ramo-1' })).toBe(a)
    expect(DISENOS.map((d) => d.id)).toContain(a)
  })
  it('reparte los ramos entre varios diseños', () => {
    const usados = new Set(Array.from({ length: 40 }, (_, i) => disenoDe({ id: `r-${i}` })))
    expect(usados.size).toBeGreaterThanOrEqual(3)
  })
})

describe('textoSobre', () => {
  it('blanco sobre colores oscuros y tinta sobre claros', () => {
    expect(textoSobre('#5457e0')).toBe('#ffffff')
    expect(textoSobre('#0e8aa8')).toBe('#ffffff')
    expect(textoSobre('#f2d16b')).toBe('#1f2344')
  })
  it('con una variable CSS asume fondo oscuro', () => {
    expect(textoSobre('var(--accent-base)')).toBe('#ffffff')
  })
})

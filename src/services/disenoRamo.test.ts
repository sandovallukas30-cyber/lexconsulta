import { describe, expect, it } from 'vitest'
import { DISENOS, colorTenue, disenoDe, profesoresDe, resumenProfesores, textoSobre } from './disenoRamo'

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

describe('colorTenue', () => {
  const colores = ['#5457e0', '#dc2626', '#9333ea', '#0891b2', '#ea580c', '#7c3aed', '#0284c7', '#059669', '#d97706', '#f2d16b', '#ffffff', '#000000', '#888888']
  const luz = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  it('siempre deja leer texto blanco encima (contraste AA)', () => {
    for (const c of colores) expect(1.05 / (luz(colorTenue(c)) + 0.05), c).toBeGreaterThanOrEqual(4.5)
  })
  it('es menos vibrante que el color original', () => {
    const sat = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      return Math.max(r, g, b) - Math.min(r, g, b)
    }
    expect(sat(colorTenue('#dc2626'))).toBeLessThan(sat('#dc2626'))
    expect(sat(colorTenue('#0891b2'))).toBeLessThan(sat('#0891b2'))
  })
  it('con una variable CSS la mezcla con tinta oscura', () => {
    expect(colorTenue('var(--accent-base)')).toContain('color-mix')
  })
})

import { describe, expect, it } from 'vitest'
import { detectarPlazos } from './plazos'

const marcados = (t: string) => detectarPlazos(t).map((r) => t.slice(r.inicio, r.fin))

describe('detectarPlazos', () => {
  it('plazos en número, en palabras y ordinales', () => {
    expect(marcados('Podrá apelarse dentro de tercero día.')).toEqual(['dentro de tercero día'])
    expect(marcados('El plazo será de treinta días hábiles contado desde la notificación.')).toEqual(['treinta días hábiles'])
    expect(marcados('La acción prescribe en cuatro años y la otra en 90 días.')).toEqual(['cuatro años', '90 días'])
    expect(marcados('dentro del plazo de seis meses')).toEqual(['dentro del plazo de seis meses'])
    expect(marcados('el plazo para apelar será de cinco días fatales')).toEqual(['cinco días fatales'])
  })

  it('cuantías y penas', () => {
    expect(marcados('multa de cinco a veinte unidades tributarias mensuales')).toEqual(['cinco a veinte unidades tributarias mensuales'])
    expect(marcados('multa de 10 UTM')).toEqual(['10 UTM'])
    expect(marcados('será castigado con presidio menor en su grado medio')).toEqual(['presidio menor en su grado medio'])
    expect(marcados('reclusión mayor en sus grados mínimo a medio')).toEqual(['reclusión mayor en sus grados mínimo a medio'])
  })

  it('no marca números sueltos, artículos ni palabras que solo se parecen', () => {
    expect(marcados('Según el artículo 1698, los días festivos y el año civil.')).toEqual([])
    expect(marcados('Los ultimos 3 incisos')).toEqual([])
    expect(marcados('una UFRO')).toEqual([])
  })
})

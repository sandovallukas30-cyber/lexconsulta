import { describe, expect, it } from 'vitest'
import { sumarTamanoCodigo, TAMANO_CODIGO_DEFECTO, TAMANO_CODIGO_MAX, TAMANO_CODIGO_MIN } from './useAjustes'

describe('sumarTamanoCodigo', () => {
  it('sube y baja de 2 en 2 desde el tamaño de siempre', () => {
    expect(sumarTamanoCodigo(TAMANO_CODIGO_DEFECTO, 1)).toBe(19)
    expect(sumarTamanoCodigo(TAMANO_CODIGO_DEFECTO, -1)).toBe(15)
  })
  it('no pasa de los topes', () => {
    expect(sumarTamanoCodigo(TAMANO_CODIGO_MAX, 1)).toBe(TAMANO_CODIGO_MAX)
    expect(sumarTamanoCodigo(TAMANO_CODIGO_MIN, -1)).toBe(TAMANO_CODIGO_MIN)
  })
  it('un valor guardado raro vuelve a quedar dentro del rango', () => {
    expect(sumarTamanoCodigo(999, -1)).toBe(TAMANO_CODIGO_MAX)
    expect(sumarTamanoCodigo(3, 1)).toBe(TAMANO_CODIGO_MIN)
  })
})

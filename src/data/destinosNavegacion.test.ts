import { describe, expect, it } from 'vitest'
import { BARRA_INFERIOR_DEFECTO, barraInferiorValida } from './destinosNavegacion'

describe('barraInferiorValida', () => {
  it('deja pasar una elección válida y conserva el orden', () => {
    expect(barraInferiorValida(['practica', 'hoy'])).toEqual(['practica', 'hoy'])
  })
  it('descarta repetidos, desconocidos y lo que pase de 4', () => {
    expect(barraInferiorValida(['hoy', 'hoy', 'nada', 'tareas', 'enfoque', 'explorador', 'practica'])).toEqual(['hoy', 'tareas', 'enfoque', 'explorador'])
  })
  it('un valor dañado o vacío vuelve a la barra por defecto', () => {
    expect(barraInferiorValida(null)).toEqual(BARRA_INFERIOR_DEFECTO)
    expect(barraInferiorValida([])).toEqual(BARRA_INFERIOR_DEFECTO)
    expect(barraInferiorValida(['nada'])).toEqual(BARRA_INFERIOR_DEFECTO)
  })
})

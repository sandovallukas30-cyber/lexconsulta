import { describe, expect, it } from 'vitest'
import { RUTAS, rutaConocida, tituloDeVista, vistaDeRuta } from './rutas'

describe('rutas de las secciones', () => {
  it('cada sección tiene su dirección y se reconoce de vuelta', () => {
    for (const [vista, ruta] of Object.entries(RUTAS)) expect(vistaDeRuta(ruta)).toBe(vista)
  })
  it('ignora barra final y mayúsculas', () => {
    expect(vistaDeRuta('/Tareas/')).toBe('tareas')
    expect(vistaDeRuta('/mapas-mentales')).toBe('mapasmentales')
  })
  it('«/» es conocida pero no es una sección; lo demás no existe', () => {
    expect(rutaConocida('/')).toBe(true)
    expect(vistaDeRuta('/')).toBeNull()
    expect(rutaConocida('/ruta-que-no-existe')).toBe(false)
  })
  it('el título lleva el nombre de la sección', () => {
    expect(tituloDeVista('tareas')).toBe('Tareas · Prima Lex')
  })
})

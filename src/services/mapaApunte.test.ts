import { describe, expect, it } from 'vitest'
import type { MapaMental } from '../types'
import { apunteAEsquema, MAX_NODOS_MAPA } from './apunteMapa'
import { mapaAApunte, tituloSinFecha } from './mapaApunte'
import { generarTarjetas } from './tarjetasApunte'

type N = MapaMental['nodos'][number]
const nodo = (id: string, texto: string, x: number, y: number, extra: Partial<N> = {}): N => ({ id, texto, posicion: { x, y }, forma: 'rectangulo', tamanoTexto: 'texto', ...extra })
const con = (desde: string, hasta: string, etiqueta?: string) => ({ id: `${desde}-${hasta}`, desde, hasta, ...(etiqueta ? { etiqueta } : {}) })

describe('tituloSinFecha', () => {
  it('quita la fecha que se pega al crear el mapa', () => {
    expect(tituloSinFecha('Obligaciones — 28 oct 2026')).toBe('Obligaciones')
    expect(tituloSinFecha('Obligaciones — 3 sept. 2026')).toBe('Obligaciones')
    expect(tituloSinFecha('Sin fecha')).toBe('Sin fecha')
  })
})

describe('mapaAApunte', () => {
  const mapa: Pick<MapaMental, 'titulo' | 'nodos' | 'conexiones'> = {
    titulo: 'Obligaciones — 28 oct 2026',
    nodos: [
      nodo('r', 'Obligaciones', 0, 100),
      nodo('f', 'Fuentes', 240, 0),
      nodo('c', 'Contrato', 480, 0),
      nodo('l', 'Ley', 480, 140, { nota: 'Art. 1437 CC' }),
      nodo('e', 'Efectos', 240, 300),
      nodo('d', 'Dolo: intención de dañar', 480, 300),
      nodo('s', 'Suelta', 480, 440),
    ],
    conexiones: [con('r', 'f'), con('f', 'c'), con('f', 'l', 'requisito'), con('r', 'e'), con('e', 'd'), con('e', 's')],
  }
  const { titulo, contenido } = mapaAApunte(mapa)

  it('usa el título del mapa sin fecha y no repite la raíz como sección', () => {
    expect(titulo).toBe('Obligaciones')
    expect(contenido).not.toMatch(/^##? Obligaciones/m)
  })
  it('cada rama es una sección, en el orden en que se leen en pantalla', () => {
    const heads = contenido.split('\n').filter((l) => l.startsWith('#'))
    expect(heads).toEqual(['## Fuentes', '## Efectos'])
  })
  it('las hojas son viñetas; con nota, tarjeta; «Término: definición», tarjeta', () => {
    expect(contenido).toContain('- Contrato')
    expect(contenido).toContain('- **Ley:** Art. 1437 CC')
    expect(contenido).toContain('- **Dolo:** intención de dañar')
    expect(contenido).toContain('- Suelta')
  })
  it('lo que sale se convierte en tarjetas de repaso', () => {
    const t = generarTarjetas({ id: 'x', contenido })
    expect(t.map((x) => x.frente).sort()).toEqual(['Dolo', 'Ley'])
  })
  it('la etiqueta de una conexión se escribe como cursiva antes del texto', () => {
    const m = mapaAApunte({ titulo: 'T', nodos: [nodo('r', 'Raíz', 0, 0), nodo('a', 'Capacidad', 200, 0)], conexiones: [con('r', 'a', 'requisito')] })
    expect(m.contenido).toContain('- ~requisito~ Capacidad')
  })
  it('una raíz distinta del título va como sección, y una nota de sección como recuadro', () => {
    const m = mapaAApunte({ titulo: 'Otro título', nodos: [nodo('r', 'Raíz', 0, 0, { nota: 'ojo' }), nodo('a', 'Hijo', 200, 0)], conexiones: [con('r', 'a')] })
    expect(m.contenido.split('\n').slice(0, 3)).toEqual(['## Raíz', '> 📝 ojo', '- Hijo'])
  })
  it('más adentro de «###» todo son viñetas con sangría', () => {
    const m = mapaAApunte({
      titulo: 'T',
      nodos: [nodo('r', 'T', 0, 0), nodo('a', 'A', 1, 0), nodo('b', 'B', 2, 0), nodo('c', 'C', 3, 0), nodo('d', 'D', 4, 0)],
      conexiones: [con('r', 'a'), con('a', 'b'), con('b', 'c'), con('c', 'd')],
    })
    expect(m.contenido).toBe('## A\n\n### B\n- C\n\t- D')
  })
  it('un ciclo no se repite sin fin y no pierde nodos', () => {
    const m = mapaAApunte({ titulo: 'Ciclo', nodos: [nodo('a', 'A', 0, 0), nodo('b', 'B', 1, 0)], conexiones: [con('a', 'b'), con('b', 'a')] })
    expect(m.contenido).toContain('A')
    expect(m.contenido).toContain('B')
    expect(m.contenido.match(/B/g)).toHaveLength(1)
  })
  it('los nodos sin conexión van a «Otras ideas»; un mapa vacío da un apunte vacío', () => {
    const m = mapaAApunte({ titulo: 'T', nodos: [nodo('a', 'A', 0, 0), nodo('b', 'B', 1, 0), nodo('x', 'X', 2, 0), nodo('y', 'Y', 3, 0)], conexiones: [con('a', 'b')] })
    expect(m.contenido).toContain('## Otras ideas')
    expect(mapaAApunte({ titulo: 'Vacío', nodos: [], conexiones: [] }).contenido).toBe('')
  })
})

describe('apunteAEsquema', () => {
  const contenido = [
    '## Fuentes',
    '- **Contrato:** acuerdo de voluntades',
    '- Ley',
    '\t- Constitución',
    '## Efectos',
    '### Cumplimiento',
    '- Pago',
    '> 🎯 Lo que más cae',
    'Un párrafo largo que no debería ir al mapa.',
  ].join('\n')
  const e = apunteAEsquema({ titulo: 'Obligaciones', contenido })
  const texto = (id: string) => e.nodos.find((n) => n.id === id)!
  const hijosDe = (id: string) => e.conexiones.filter((c) => c.desde === id).map((c) => texto(c.hasta).texto)

  it('la raíz es el título del apunte', () => {
    expect(e.nodos[0]).toMatchObject({ texto: 'Obligaciones', tamanoTexto: 'titulo' })
  })
  it('los títulos arman las ramas y las viñetas las hojas con su sangría', () => {
    expect(hijosDe('n1')).toEqual(['Fuentes', 'Efectos'])
    const fuentes = e.nodos.find((n) => n.texto === 'Fuentes')!.id
    expect(hijosDe(fuentes)).toEqual(['Contrato', 'Ley'])
    const ley = e.nodos.find((n) => n.texto === 'Ley')!.id
    expect(hijosDe(ley)).toEqual(['Constitución'])
    const cumplimiento = e.nodos.find((n) => n.texto === 'Cumplimiento')!.id
    expect(hijosDe(cumplimiento)).toEqual(['Pago', '🎯 Lo que más cae'])
  })
  it('«Término: definición» queda como nodo con la definición de nota al margen', () => {
    expect(e.nodos.find((n) => n.texto === 'Contrato')).toMatchObject({ nota: 'acuerdo de voluntades' })
  })
  it('los párrafos largos no entran al mapa', () => {
    expect(e.nodos.some((n) => n.texto.includes('párrafo'))).toBe(false)
  })
  it('respeta el tope de nodos y dice cuántos dejó fuera', () => {
    const muchos = Array.from({ length: 100 }, (_, i) => `- Punto ${i}`).join('\n')
    const g = apunteAEsquema({ titulo: 'Grande', contenido: muchos })
    expect(g.nodos).toHaveLength(MAX_NODOS_MAPA)
    expect(g.omitidos).toBe(100 - (MAX_NODOS_MAPA - 1))
  })
  it('un apunte vacío da solo la raíz', () => {
    const v = apunteAEsquema({ titulo: 'Vacío', contenido: '' })
    expect(v.nodos).toHaveLength(1)
    expect(v.conexiones).toEqual([])
  })
})

describe('ida y vuelta apunte → mapa → apunte', () => {
  it('conserva las secciones, las viñetas y las tarjetas', () => {
    const original = ['## Fuentes', '- **Contrato:** acuerdo de voluntades', '- Ley', '## Efectos', '- Pago'].join('\n')
    const e = apunteAEsquema({ titulo: 'Obligaciones', contenido: original })
    const nodos = e.nodos.map((n, i) => ({ id: n.id, texto: n.texto, posicion: { x: i * 10, y: i * 10 }, forma: n.forma, tamanoTexto: n.tamanoTexto, nota: n.nota }) as N)
    const conexiones = e.conexiones.map((c) => ({ id: `${c.desde}-${c.hasta}`, ...c }))
    const vuelta = mapaAApunte({ titulo: 'Obligaciones', nodos, conexiones })
    expect(vuelta.contenido).toBe('## Fuentes\n- **Contrato:** acuerdo de voluntades\n- Ley\n\n## Efectos\n- Pago')
  })
})

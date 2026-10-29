import { describe, expect, it } from 'vitest'
import type { TarjetaRepaso } from './tarjetasApunte'
import { generarSimulacro, palabraParaHueco, recortar, tarjetasParaSimulacro } from './simulacro'

function azarFijo(semilla: number) {
  let s = semilla
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const par = (n: number): TarjetaRepaso => ({
  id: `a:termino:${n}`,
  tipo: 'termino',
  frente: `Concepto ${n}`,
  reverso: `Definición extensa del concepto número ${n} con palabras suficientemente largas`,
})
const mazo = (cuantas: number) => Array.from({ length: cuantas }, (_, i) => par(i + 1))

describe('tarjetasParaSimulacro', () => {
  it('deja solo las de término y definición, sin repetidas', () => {
    const t = [...mazo(3), par(1), { id: 'x', tipo: 'idea', frente: 'Idea clave', reverso: 'algo' } as TarjetaRepaso]
    expect(tarjetasParaSimulacro(t)).toHaveLength(3)
  })
})

describe('generarSimulacro', () => {
  it('con menos de 4 tarjetas no arma nada y dice cuántas hay', () => {
    expect(generarSimulacro(mazo(3), 5)).toEqual({ preguntas: [], material: 3 })
  })
  it('arma preguntas con 4 opciones y la correcta en su lugar', () => {
    const { preguntas } = generarSimulacro(mazo(12), 8, azarFijo(7))
    expect(preguntas).toHaveLength(8)
    for (const p of preguntas) {
      expect(p.opciones).toHaveLength(4)
      expect(new Set(p.opciones).size).toBe(4)
      expect(p.correcta).toBeGreaterThanOrEqual(0)
      expect(p.correcta).toBeLessThan(4)
      if (p.tipo === 'definicion') expect(p.opciones[p.correcta]).toBe(recortar(p.reverso))
      if (p.tipo === 'termino') expect(p.opciones[p.correcta]).toBe(p.frente)
    }
  })
  it('usa cada tarjeta una sola vez y no pasa del material', () => {
    const { preguntas } = generarSimulacro(mazo(5), 20, azarFijo(3))
    expect(preguntas).toHaveLength(5)
    expect(new Set(preguntas.map((p) => p.tarjetaId)).size).toBe(5)
  })
  it('las falsas nunca repiten la respuesta correcta', () => {
    for (let semilla = 1; semilla <= 20; semilla++) {
      for (const p of generarSimulacro(mazo(10), 10, azarFijo(semilla)).preguntas) {
        const buenas = p.opciones.filter((o) => o.toLowerCase() === p.opciones[p.correcta].toLowerCase())
        expect(buenas).toHaveLength(1)
      }
    }
  })
  it('en las de hueco la palabra falta del enunciado y es la opción correcta', () => {
    const huecos = Array.from({ length: 30 }, (_, i) => generarSimulacro(mazo(12), 12, azarFijo(i + 1)).preguntas)
      .flat()
      .filter((p) => p.tipo === 'hueco')
    expect(huecos.length).toBeGreaterThan(0)
    for (const p of huecos) {
      expect(p.enunciado).toContain('_____')
      expect(p.reverso.toLowerCase()).toContain(p.opciones[p.correcta].toLowerCase())
      expect(p.enunciado.toLowerCase()).not.toContain(` ${p.opciones[p.correcta].toLowerCase()} `)
    }
  })
  it('con el mismo azar da el mismo simulacro', () => {
    expect(generarSimulacro(mazo(9), 6, azarFijo(11))).toEqual(generarSimulacro(mazo(9), 6, azarFijo(11)))
  })
})

describe('palabraParaHueco', () => {
  it('elige la palabra más larga que no sea un conector ni un número', () => {
    expect(palabraParaHueco('es el plazo de prescripción de cuatro años')).toBe('prescripción')
    expect(palabraParaHueco('es de 12345678 y de año')).toBeNull()
  })
})

describe('recortar', () => {
  it('no corta palabras y agrega puntos suspensivos solo si recorta', () => {
    expect(recortar('corto')).toBe('corto')
    const largo = 'palabra '.repeat(40)
    const r = recortar(largo, 50)
    expect(r.length).toBeLessThanOrEqual(50)
    expect(r.endsWith('…')).toBe(true)
    expect(r).not.toMatch(/palabr…/)
  })
})

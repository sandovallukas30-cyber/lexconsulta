import { describe, expect, it } from 'vitest'
import { animoDe, COLORES_MASCOTA, fraseMascota, mascotaSvg, situacionDe, type SituacionMascota, type TipoMascota } from './mascota'

const base: SituacionMascota = {
  hora: 15, enfocando: false, enClase: false, minutosHoy: 0, metaMin: 120, tareasHechasHoy: 0, tareasPendientesHoy: 2, tareasVencidas: 0, diasSolemne: null, rachaDias: 0,
}
const con = (p: Partial<SituacionMascota>): SituacionMascota => ({ ...base, ...p })

describe('situacionDe: qué le pasa a la mascota', () => {
  it('normal por defecto', () => expect(situacionDe(base)).toBe('normal'))
  it('duerme de noche, aunque estés enfocando', () => {
    expect(situacionDe(con({ hora: 23 }))).toBe('duerme')
    expect(situacionDe(con({ hora: 3, enfocando: true }))).toBe('duerme')
  })
  it('prioridades: enfoque > clase > solemne > vencidas > meta > todo hecho', () => {
    expect(situacionDe(con({ enfocando: true, enClase: true }))).toBe('enfoque')
    expect(situacionDe(con({ enClase: true, diasSolemne: 0 }))).toBe('clase')
    expect(situacionDe(con({ diasSolemne: 1, tareasVencidas: 3 }))).toBe('solemne')
    expect(situacionDe(con({ tareasVencidas: 1, minutosHoy: 200 }))).toBe('vencidas')
    expect(situacionDe(con({ minutosHoy: 120 }))).toBe('meta')
    expect(situacionDe(con({ tareasHechasHoy: 2, tareasPendientesHoy: 0 }))).toBe('todoHecho')
  })
  it('una solemne lejana no la inquieta', () => {
    expect(situacionDe(con({ diasSolemne: 5 }))).toBe('normal')
  })
})

describe('ánimo y frases', () => {
  it('cada situación tiene su ánimo', () => {
    expect(animoDe('duerme')).toBe('dormida')
    expect(animoDe('meta')).toBe('feliz')
    expect(animoDe('vencidas')).toBe('preocupada')
  })
  it('las frases son estables con la misma semilla y nunca vacías', () => {
    for (const s of ['duerme', 'enfoque', 'clase', 'solemne', 'vencidas', 'meta', 'todoHecho', 'normal'] as const) {
      const f = fraseMascota(s, con({ tareasVencidas: 2, diasSolemne: 1, rachaDias: 4 }), 'Lex', 'semilla')
      expect(f.length).toBeGreaterThan(5)
      expect(f).toBe(fraseMascota(s, con({ tareasVencidas: 2, diasSolemne: 1, rachaDias: 4 }), 'Lex', 'semilla'))
    }
  })
  it('cuenta las tareas atrasadas y la racha', () => {
    expect(fraseMascota('vencidas', con({ tareasVencidas: 4 }), 'Lex', 'x')).toContain('4')
    expect(fraseMascota('normal', con({ rachaDias: 6 }), 'Lex', 'x')).toContain('6')
  })
  it('no usa formas de género fijo con barra', () => {
    for (const s of ['duerme', 'enfoque', 'clase', 'solemne', 'vencidas', 'meta', 'todoHecho', 'normal'] as const) {
      expect(fraseMascota(s, con({ tareasVencidas: 2, diasSolemne: 0, rachaDias: 4 }), 'Lex', 'a')).not.toMatch(/[a-z]\/[ao]\b/)
    }
  })
})

describe('mascotaSvg', () => {
  it('genera un SVG válido para cada tipo, color y ánimo', () => {
    for (const tipo of ['lechuza', 'perro', 'gato'] as TipoMascota[]) {
      for (const color of Object.keys(COLORES_MASCOTA) as (keyof typeof COLORES_MASCOTA)[]) {
        for (const animo of ['normal', 'feliz', 'dormida', 'preocupada', 'concentrada'] as const) {
          const s = mascotaSvg({ tipo, color, accesorio: 'birrete', animo })
          expect(s.startsWith('<svg')).toBe(true)
          expect(s.endsWith('</svg>')).toBe(true)
          expect(s).not.toContain('undefined')
          expect(s).not.toContain('NaN')
        }
      }
    }
  })
})

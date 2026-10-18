import { describe, expect, it } from 'vitest'
import type { DatosAcademicosModulo, Ramo } from '../types'
import { claseEnCurso, duracionLarga, textoEnClase, textoSiguiente, variante, type EntradaSiguiente } from './loQueSigue'

const HOY = '2026-10-19' // lunes
const a = (h: number, m = 0) => new Date(2026, 9, 19, h, m)

const academico: Record<string, DatosAcademicosModulo> = {
  r1: { clases: [{ id: 'c1', fecha: HOY, hora: '14:10', sala: 'Pabellón Docente, sala 12', tema: '', completada: false }], evaluaciones: [], textos: [], apuntes: [], cuadernos: [], briefs: [] },
}
const ramos = [{ id: 'r1', nombre: 'Derecho Orgánico', modulosVinculados: [], bloques: [{ dia: 0, inicio: '14:10', fin: '15:40' }] }] as unknown as Ramo[]

describe('duracionLarga', () => {
  it('minutos y horas', () => {
    expect(duracionLarga(45)).toBe('45 min')
    expect(duracionLarga(60)).toBe('1 h')
    expect(duracionLarga(200)).toBe('3 h 20 min')
  })
})

describe('variante', () => {
  it('es estable para la misma semilla y siempre devuelve algo de la lista', () => {
    const l = ['a', 'b', 'c']
    expect(variante(l, '2026-10-19')).toBe(variante(l, '2026-10-19'))
    expect(l).toContain(variante(l, 'otra'))
  })
})

describe('claseEnCurso', () => {
  it('nula antes de llegar y después de terminar', () => {
    expect(claseEnCurso(academico, ramos, HOY, a(13, 0))).toBeNull()
    expect(claseEnCurso(academico, ramos, HOY, a(15, 40))).toBeNull()
  })
  it('avisa desde 5 minutos antes y hasta el fin del bloque', () => {
    expect(claseEnCurso(academico, ramos, HOY, a(14, 5))?.claseId).toBe('c1')
    const c = claseEnCurso(academico, ramos, HOY, a(14, 55))
    expect(c?.minutosRestantes).toBe(45)
    expect(c?.fin).toBe('15:40')
    expect(c?.sala).toContain('sala 12')
  })
  it('sin bloque en el ramo asume 80 minutos', () => {
    const sin = [{ id: 'r1', nombre: 'X', modulosVinculados: [] }] as unknown as Ramo[]
    expect(claseEnCurso(academico, sin, HOY, a(15, 29))?.fin).toBe('15:30')
    expect(claseEnCurso(academico, sin, HOY, a(15, 31))).toBeNull()
  })
  it('otro día no cuenta', () => {
    expect(claseEnCurso(academico, ramos, '2026-10-20', a(14, 30))).toBeNull()
  })
})

describe('textoSiguiente', () => {
  const clase = (dias: number, hora = '14:10'): EntradaSiguiente => ({ tipo: 'clase', ramo: 'Derecho Orgánico', titulo: '', fecha: HOY, hora, sala: 'Sala 12', dias })

  it('clase de hoy con tiempo: cuenta regresiva y lugar', () => {
    const t = textoSiguiente(clase(0), a(10, 50), 's')
    expect(t.titulo).toBe('Derecho Orgánico en 3 h 20 min')
    expect(t.detalle).toBe('14:10 · Sala 12')
  })
  it('a menos de 30 minutos: ya casi', () => {
    expect(textoSiguiente(clase(0), a(13, 50), 's').titulo).toBe('Derecho Orgánico empieza en 20 min')
  })
  it('mañana y más adelante', () => {
    expect(textoSiguiente(clase(1), a(10, 0), 's').titulo).toBe('Mañana: Derecho Orgánico')
    expect(textoSiguiente(clase(4), a(10, 0), 's').titulo).toBe('Derecho Orgánico en 4 días')
  })
  it('evaluaciones: el tono sube al acercarse', () => {
    const ex = (dias: number): EntradaSiguiente => ({ tipo: 'examen', ramo: 'Orgánico', titulo: 'Solemne 1', fecha: HOY, dias })
    expect(textoSiguiente(ex(0), a(8), 's').titulo).toBe('Hoy es Solemne 1')
    expect(textoSiguiente(ex(1), a(8), 's').titulo).toBe('Mañana es Solemne 1')
    expect(textoSiguiente(ex(2), a(8), 's').titulo).toBe('Solemne 1 en 2 días')
    expect(textoSiguiente(ex(9), a(8), 's').animo.length).toBeGreaterThan(5)
  })
})

describe('textoEnClase', () => {
  it('nombra el ramo, la sala y cuánto falta', () => {
    const t = textoEnClase({ ramo: 'Historia', minutosRestantes: 45, sala: 'Auditorio 4' }, 's')
    expect(t.titulo).toBe('Estás en clase de Historia')
    expect(t.detalle).toBe('Auditorio 4 · termina en 45 min')
  })
})

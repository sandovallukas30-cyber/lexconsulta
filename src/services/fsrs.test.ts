import { describe, expect, it } from 'vitest'
import { formatoIntervalo, MIN_APRENDIENDO, probabilidadRecordar, resultados, TARJETA_NUEVA, textosIntervalo, type EstadoFSRS } from './fsrs'
import { aEstadoFSRS, estaPendiente, generarTarjetas, siguienteEstado } from './tarjetasApunte'

const DIA = 86_400_000
const AHORA = new Date(2026, 9, 16, 15, 30).getTime()

describe('FSRS: tarjeta nueva', () => {
  const r = resultados(TARJETA_NUEVA, AHORA)

  it('Otra vez vuelve en 10 minutos y queda aprendiendo', () => {
    expect(r[1].estado.fase).toBe('aprendiendo')
    expect(r[1].dias).toBeNull()
    expect(r[1].vence).toBe(AHORA + MIN_APRENDIENDO)
  })
  it('Difícil, Bien y Fácil pasan a repaso con intervalos crecientes', () => {
    expect(r[2].estado.fase).toBe('repaso')
    const d = [r[2].dias!, r[3].dias!, r[4].dias!]
    expect(d[0]).toBeGreaterThanOrEqual(1)
    expect(d[1]).toBeGreaterThanOrEqual(d[0])
    expect(d[2]).toBeGreaterThan(d[1])
  })
  it('el próximo repaso en días cae a primera hora del día', () => {
    const v = new Date(r[3].vence)
    expect([v.getHours(), v.getMinutes()]).toEqual([0, 0])
  })
  it('los textos de los botones', () => {
    const t = textosIntervalo(TARJETA_NUEVA, AHORA)
    expect(t[1]).toBe('10 min')
    expect(t[3]).toMatch(/^\d+ d$/)
  })
})

describe('FSRS: tarjeta en repaso', () => {
  const base: EstadoFSRS = { fase: 'repaso', estabilidad: 10, dificultad: 5, ultima: AHORA - 10 * DIA, olvidos: 0 }

  it('acertar alarga la estabilidad; fallar la achica y cuenta un olvido', () => {
    const r = resultados(base, AHORA)
    expect(r[3].estado.estabilidad).toBeGreaterThan(base.estabilidad)
    expect(r[1].estado.estabilidad).toBeLessThan(base.estabilidad)
    expect(r[1].estado.olvidos).toBe(1)
    expect(r[1].estado.fase).toBe('aprendiendo')
  })
  it('Fácil crece más que Bien y Bien más que Difícil', () => {
    const r = resultados(base, AHORA)
    expect(r[4].estado.estabilidad).toBeGreaterThan(r[3].estado.estabilidad)
    expect(r[3].estado.estabilidad).toBeGreaterThan(r[2].estado.estabilidad)
  })
  it('no hay intervalos de más de un año', () => {
    const r = resultados({ ...base, estabilidad: 5000 }, AHORA)
    expect(r[4].dias).toBeLessThanOrEqual(365)
  })
  it('la dificultad queda entre 1 y 10', () => {
    for (const g of [1, 2, 3, 4] as const) {
      const d = resultados(base, AHORA)[g].estado.dificultad
      expect(d).toBeGreaterThanOrEqual(1)
      expect(d).toBeLessThanOrEqual(10)
    }
  })
})

describe('probabilidadRecordar', () => {
  it('baja con el tiempo', () => {
    const t: EstadoFSRS = { fase: 'repaso', estabilidad: 5, dificultad: 5, ultima: AHORA, olvidos: 0 }
    const hoy = probabilidadRecordar(t, AHORA)!
    const luego = probabilidadRecordar(t, AHORA + 30 * DIA)!
    expect(hoy).toBeCloseTo(1)
    expect(luego).toBeLessThan(hoy)
  })
  it('sin historia no hay probabilidad', () => {
    expect(probabilidadRecordar(TARJETA_NUEVA, AHORA)).toBeNull()
  })
})

describe('formatoIntervalo', () => {
  it('minutos, horas, días, meses y años', () => {
    expect(formatoIntervalo(10 * 60_000)).toBe('10 min')
    expect(formatoIntervalo(3 * 3_600_000)).toBe('3 h')
    expect(formatoIntervalo(4 * DIA)).toBe('4 d')
    expect(formatoIntervalo(60 * DIA)).toBe('2 meses')
    expect(formatoIntervalo(730 * DIA)).toBe('2 años')
  })
})

describe('tarjetas de apuntes con FSRS', () => {
  it('una tarjeta nunca vista está pendiente', () => {
    expect(estaPendiente(undefined, AHORA)).toBe(true)
  })

  it('registrar una respuesta guarda estado FSRS y conserva los contadores', () => {
    const e1 = siguienteEstado(undefined, 3, AHORA)
    expect(e1.fase).toBe('repaso')
    expect(e1.aciertos).toBe(1)
    expect(e1.proximo).toBeGreaterThan(AHORA)
    expect(estaPendiente(e1, AHORA)).toBe(false)
    const e2 = siguienteEstado(e1, 1, e1.proximo)
    expect(e2.fallos).toBe(1)
    expect(e2.fase).toBe('aprendiendo')
    expect(e2.proximo).toBe(e1.proximo + MIN_APRENDIENDO)
  })

  it('una tarjeta guardada con el repaso anterior (cajas) continúa desde su caja', () => {
    const legado = { caja: 3, proximo: AHORA - 1, aciertos: 4, fallos: 1, ultimo: AHORA - 7 * DIA }
    const f = aEstadoFSRS(legado)
    expect(f.fase).toBe('repaso')
    expect(f.estabilidad).toBe(7)
    const e = siguienteEstado(legado, 3, AHORA)
    expect(e.aciertos).toBe(5)
    expect(e.estabilidad).toBeGreaterThan(7)
  })

  it('generarTarjetas: términos en negrita e ideas clave', () => {
    const t = generarTarjetas({
      id: 'a1',
      contenido: '## Obligaciones\n- **Obligación:** vínculo jurídico entre personas\n> 🎯 El contrato es ley para las partes',
    })
    expect(t.map((x) => x.tipo)).toEqual(['termino', 'idea'])
    expect(t[0].frente).toBe('Obligación')
    expect(t[0].reverso).toBe('vínculo jurídico entre personas')
    expect(t[1].frente).toBe('Idea clave: Obligaciones')
  })

  it('el id de la tarjeta no depende de su posición en el apunte', () => {
    const a = generarTarjetas({ id: 'a1', contenido: '- **Dolo:** engaño' })[0].id
    const b = generarTarjetas({ id: 'a1', contenido: 'texto nuevo antes\n\n- **Dolo:** engaño' })[0].id
    expect(a).toBe(b)
  })
})

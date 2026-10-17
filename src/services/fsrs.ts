/** Repetición espaciada basada en FSRS-5 (Free Spaced Repetition Scheduler).
 *  Cada tarjeta lleva estabilidad (cuánto dura el recuerdo), dificultad y la
 *  probabilidad de recordarla se calcula con el tiempo que pasó. Implementación
 *  propia con los parámetros por defecto del algoritmo (portada del repaso de
 *  Orbis); lógica pura, sin dependencias. */

const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
  2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
]
const F = 19 / 81
const C = -0.5
/** Se busca recordar el 90 % de las veces. */
const RETENCION = 0.9
const DIA = 86_400_000
/** "Otra vez": la tarjeta vuelve en 10 minutos. */
export const MIN_APRENDIENDO = 10 * 60_000
/** Tope de un año: para estudiar con fechas de pruebas no tiene sentido esperar más. */
const MAX_DIAS = 365

/** 1 = Otra vez, 2 = Difícil, 3 = Bien, 4 = Fácil. */
export type NotaRepaso = 1 | 2 | 3 | 4
export const NOTAS_REPASO: NotaRepaso[] = [1, 2, 3, 4]

export type FaseTarjeta = 'nueva' | 'aprendiendo' | 'repaso'

export interface EstadoFSRS {
  fase: FaseTarjeta
  estabilidad: number
  dificultad: number
  /** epoch ms del último repaso (null si nunca se repasó). */
  ultima: number | null
  olvidos: number
}

export const TARJETA_NUEVA: EstadoFSRS = { fase: 'nueva', estabilidad: 0, dificultad: 0, ultima: null, olvidos: 0 }

const limitar = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
const dificultadInicial = (g: number) => limitar(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10)
const recordable = (dias: number, s: number) => Math.pow(1 + (F * dias) / s, C)
const diasParaRepasar = (s: number) => limitar(Math.round((s / F) * (Math.pow(RETENCION, 1 / C) - 1)), 1, MAX_DIAS)

export function inicioDelDia(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Suma días calendario (no 24 h fijas: el cambio de hora no corre la fecha). */
function enDias(ahora: number, dias: number): number {
  const d = new Date(inicioDelDia(ahora))
  d.setDate(d.getDate() + dias)
  return d.getTime()
}

interface Paso {
  estabilidad: number
  dificultad: number
  fase: FaseTarjeta
  /** Días hasta el próximo repaso; null si vuelve en minutos (aprendiendo). */
  dias: number | null
  olvido: boolean
}

function paso(t: EstadoFSRS, g: NotaRepaso, ahora: number): Paso {
  if (t.fase === 'nueva') {
    const s = W[g - 1]
    return g === 1
      ? { estabilidad: s, dificultad: dificultadInicial(g), fase: 'aprendiendo', dias: null, olvido: false }
      : { estabilidad: s, dificultad: dificultadInicial(g), fase: 'repaso', dias: diasParaRepasar(s), olvido: false }
  }

  const d = t.dificultad
  const dias = Math.max(0, (ahora - (t.ultima ?? ahora)) / DIA)
  const r = recordable(dias, Math.max(t.estabilidad, 0.01))
  // la dificultad se mueve según la nota y tiende a volver al valor inicial
  const dNueva = limitar(W[7] * dificultadInicial(4) + (1 - W[7]) * (d + -W[6] * (g - 3) * ((10 - d) / 9)), 1, 10)

  if (g === 1) {
    const olvidada = W[11] * Math.pow(d, -W[12]) * (Math.pow(t.estabilidad + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r))
    return {
      estabilidad: Math.max(0.01, Math.min(olvidada, t.estabilidad)),
      dificultad: dNueva,
      fase: 'aprendiendo',
      dias: null,
      olvido: t.fase === 'repaso',
    }
  }

  if (t.fase === 'aprendiendo') {
    // sale del aprendizaje: una tarjeta nueva toma la estabilidad inicial de su nota; una olvidada conserva la suya
    const s = t.olvidos > 0 ? Math.max(t.estabilidad, 0.01) : W[g - 1]
    return { estabilidad: s, dificultad: dNueva, fase: 'repaso', dias: diasParaRepasar(s), olvido: false }
  }

  const dificil = g === 2 ? W[15] : 1
  const facil = g === 4 ? W[16] : 1
  const crecimiento = 1 + Math.exp(W[8]) * (11 - d) * Math.pow(t.estabilidad, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * dificil * facil
  const s = Math.max(0.01, t.estabilidad * crecimiento)
  return { estabilidad: s, dificultad: dNueva, fase: 'repaso', dias: diasParaRepasar(s), olvido: false }
}

export interface ResultadoRepaso {
  estado: EstadoFSRS
  /** epoch ms desde el que la tarjeta vuelve a estar pendiente. */
  vence: number
  /** Días hasta el próximo repaso; null si vuelve en minutos. */
  dias: number | null
}

/** Qué pasa con la tarjeta con cada una de las 4 notas. Los intervalos
 *  siempre crecen: Difícil ≤ Bien < Fácil. */
export function resultados(t: EstadoFSRS, ahora: number = Date.now()): Record<NotaRepaso, ResultadoRepaso> {
  const pasos = Object.fromEntries(NOTAS_REPASO.map((g) => [g, paso(t, g, ahora)])) as Record<NotaRepaso, Paso>

  const dias: Record<2 | 3 | 4, number | null> = { 2: pasos[2].dias, 3: pasos[3].dias, 4: pasos[4].dias }
  if (dias[2] !== null && dias[3] !== null) dias[3] = Math.max(dias[3], dias[2])
  if (dias[3] !== null && dias[4] !== null) dias[4] = Math.min(MAX_DIAS, Math.max(dias[4], dias[3] + 1))

  return Object.fromEntries(
    NOTAS_REPASO.map((g) => {
      const p = pasos[g]
      const d = g === 1 ? null : dias[g]
      const estado: EstadoFSRS = {
        fase: p.fase,
        estabilidad: p.estabilidad,
        dificultad: p.dificultad,
        ultima: ahora,
        olvidos: t.olvidos + (p.olvido ? 1 : 0),
      }
      return [g, { estado, vence: d === null ? ahora + MIN_APRENDIENDO : enDias(ahora, d), dias: d }]
    })
  ) as Record<NotaRepaso, ResultadoRepaso>
}

export function formatoIntervalo(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${Math.max(1, min)} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.round(ms / DIA)
  if (d < 30) return `${d} d`
  if (d < 365) {
    const m = Math.round(d / 30)
    return `${m} ${m === 1 ? 'mes' : 'meses'}`
  }
  const a = Math.round((d / 365) * 10) / 10
  return `${String(a).replace('.', ',')} años`
}

/** Texto del intervalo de cada botón ("10 min", "1 d", "4 d"…). */
export function textosIntervalo(t: EstadoFSRS, ahora: number = Date.now()): Record<NotaRepaso, string> {
  const r = resultados(t, ahora)
  return Object.fromEntries(NOTAS_REPASO.map((g) => [g, r[g].dias === null ? formatoIntervalo(MIN_APRENDIENDO) : formatoIntervalo(r[g].dias * DIA)])) as Record<NotaRepaso, string>
}

/** Probabilidad (0-1) de recordar la tarjeta ahora, o null si no tiene historia. */
export function probabilidadRecordar(t: EstadoFSRS, ahora: number = Date.now()): number | null {
  if (t.fase === 'nueva' || t.ultima === null || t.estabilidad <= 0) return null
  return recordable(Math.max(0, (ahora - t.ultima) / DIA), t.estabilidad)
}

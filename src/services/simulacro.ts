import type { TarjetaRepaso } from './tarjetasApunte'

/** Simulacro de examen: preguntas de opción múltiple armadas POR REGLAS con los
 *  «término: definición» de los apuntes (los mismos que el repaso usa como
 *  tarjetas). Sin IA: los distractores salen de otras tarjetas del material.
 *
 *  Cuatro tipos: elegir la definición de un término, elegir el término de una
 *  definición, completar una palabra que falta en la definición y completar la
 *  CANTIDAD (plazo, fracción de quórum) que falta: la trampa clásica de las
 *  pruebas de Derecho (1/3 vs 2/5, 30 vs 15 días). */

export type TipoPregunta = 'definicion' | 'termino' | 'hueco' | 'numero'

export interface PreguntaSimulacro {
  id: string
  tarjetaId: string
  tipo: TipoPregunta
  enunciado: string
  opciones: string[]
  /** Posición de la opción correcta en `opciones`. */
  correcta: number
  /** Término y definición completos, para mostrar al corregir. */
  frente: string
  reverso: string
}

export const MIN_TARJETAS_SIMULACRO = 4
export const MAX_OPCION = 150
const HUECO = '_____'

const PALABRAS_VACIAS = new Set(['también', 'siempre', 'aunque', 'porque', 'cuando', 'donde', 'mientras', 'durante', 'entre', 'sobre', 'según', 'además', 'cualquier', 'quienes', 'cuales', 'cuáles', 'ninguna', 'ninguno', 'mismo', 'misma', 'cierto', 'cierta', 'otros', 'otras'])

const termino = (t: TarjetaRepaso) => t.tipo === 'termino'

/** Tarjetas de «término: definición» que sirven para armar preguntas. */
export function tarjetasParaSimulacro(tarjetas: TarjetaRepaso[]): TarjetaRepaso[] {
  const vistos = new Set<string>()
  return tarjetas.filter((t) => {
    if (!termino(t)) return false
    const clave = `${t.frente.toLowerCase()}|${t.reverso.toLowerCase()}`
    if (vistos.has(clave)) return false
    vistos.add(clave)
    return t.frente.trim().length > 0 && t.reverso.trim().length > 0
  })
}

function mezclar<T>(lista: T[], azar: () => number): T[] {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Recorta sin cortar palabras (la correcta y las falsas pasan por lo mismo, para que el largo no delate). */
export function recortar(texto: string, max: number = MAX_OPCION): string {
  const t = texto.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const corte = t.lastIndexOf(' ', max - 1)
  return `${t.slice(0, corte > max / 2 ? corte : max - 1)}…`
}

/** `n` elementos de `candidatos` con el largo más parecido a `referencia`, sin repetir textos. */
function parecidos(candidatos: string[], referencia: string, n: number, azar: () => number): string[] {
  const unicos = Array.from(new Set(candidatos.map((c) => c.trim()).filter((c) => c && c.toLowerCase() !== referencia.toLowerCase())))
  unicos.sort((a, b) => Math.abs(a.length - referencia.length) - Math.abs(b.length - referencia.length))
  return mezclar(unicos.slice(0, Math.max(n, 8)), azar).slice(0, n)
}

const limpiarPalabra = (p: string) => p.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

/** La palabra a ocultar: la más larga de la definición que no sea un conector, si tiene al menos 6 letras. */
export function palabraParaHueco(reverso: string): string | null {
  const palabras = reverso.split(/\s+/).map(limpiarPalabra).filter((p) => p.length >= 6 && !PALABRAS_VACIAS.has(p.toLowerCase()) && !/\d/.test(p))
  if (palabras.length === 0) return null
  return palabras.reduce((mejor, p) => (p.length > mejor.length ? p : mejor))
}

// ——— Cantidades (plazos y fracciones) ———
const NUM_PAL: Record<number, string> = { 1: 'un', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 12: 'doce', 15: 'quince', 20: 'veinte', 30: 'treinta', 45: 'cuarenta y cinco', 60: 'sesenta', 90: 'noventa', 120: 'ciento veinte', 180: 'ciento ochenta' }
const PAL_NUM = new Map(Object.entries(NUM_PAL).map(([n, p]) => [p, Number(n)]))
const PLAZOS_USUALES = [1, 2, 3, 4, 5, 6, 7, 10, 15, 20, 30, 45, 60, 90, 120, 180]
const FRACCIONES_NUM = ['1/3', '2/5', '1/2', '3/5', '2/3', '4/7', '3/4', '1/4', '3/7', '1/5']
const FRACCIONES_PAL = ['un tercio', 'dos tercios', 'un cuarto', 'tres cuartos', 'dos quintos', 'tres quintos', 'cuatro quintos', 'cuatro séptimos', 'tres séptimos', 'un quinto']
const PALABRA_NUMERO = Object.values(NUM_PAL).sort((a, b) => b.length - a.length).join('|')
const RE_TIEMPO = new RegExp(String.raw`\b(\d{1,3}|${PALABRA_NUMERO})\s+(días|meses|años|horas|semanas)(\s+(?:hábiles|corridos))?`, 'iu')
const RE_FRACCION_NUM = /\b\d{1,2}\/\d{1,2}\b/
const RE_FRACCION_PAL = /\b(?:un|dos|tres|cuatro|cinco|seis|siete)\s+(?:tercios?|cuartos?|quintos?|sextos?|séptimos?)\b/iu

export interface CantidadOculta {
  /** El texto exacto que se oculta en la definición. */
  texto: string
  /** Respuestas falsas con el mismo formato. */
  falsas: string[]
}

/** Primera cantidad (plazo o fracción) de la definición, con sus respuestas falsas del mismo estilo. */
export function cantidadParaHueco(reverso: string, azar: () => number = Math.random): CantidadOculta | null {
  const tiempo = RE_TIEMPO.exec(reverso)
  if (tiempo) {
    const [completo, cant, unidad, calif = ''] = tiempo
    const esDigito = /^\d/.test(cant)
    const valor = esDigito ? Number(cant) : PAL_NUM.get(cant.toLowerCase())
    if (valor === undefined) return null
    const lejos = PLAZOS_USUALES.filter((n) => n !== valor).sort((a, b) => Math.abs(Math.log(a / valor)) - Math.abs(Math.log(b / valor)))
    const candidatos = mezclar(lejos.slice(0, 6), azar).slice(0, 3)
    // «1 mes», no «1 meses»
    const SINGULAR: Record<string, string> = { días: 'día', meses: 'mes', años: 'año', horas: 'hora', semanas: 'semana' }
    const poner = (n: number) => `${esDigito ? n : (NUM_PAL[n] ?? String(n))} ${n === 1 ? (SINGULAR[unidad.toLowerCase()] ?? unidad) : unidad}${calif}`
    return { texto: completo, falsas: candidatos.map(poner) }
  }
  const num = RE_FRACCION_NUM.exec(reverso)
  if (num) return { texto: num[0], falsas: mezclar(FRACCIONES_NUM.filter((f) => f !== num[0]), azar).slice(0, 3) }
  const pal = RE_FRACCION_PAL.exec(reverso)
  if (pal) {
    const base = pal[0].toLowerCase()
    return { texto: pal[0], falsas: mezclar(FRACCIONES_PAL.filter((f) => f !== base), azar).slice(0, 3) }
  }
  return null
}

function preguntaNumero(t: TarjetaRepaso, azar: () => number): PreguntaSimulacro | null {
  const c = cantidadParaHueco(t.reverso, azar)
  if (!c || c.falsas.length < 3) return null
  const opciones = mezclar([c.texto, ...c.falsas], azar)
  const enunciado = `${t.frente}: ${t.reverso.replace(c.texto, HUECO)}`
  return { id: `${t.id}:numero`, tarjetaId: t.id, tipo: 'numero', enunciado: recortar(enunciado, 260), opciones, correcta: opciones.indexOf(c.texto), frente: t.frente, reverso: t.reverso }
}

function preguntaHueco(t: TarjetaRepaso, otras: TarjetaRepaso[], azar: () => number): PreguntaSimulacro | null {
  const oculta = palabraParaHueco(t.reverso)
  if (!oculta) return null
  const todas = otras.flatMap((o) => o.reverso.split(/\s+/).map(limpiarPalabra)).filter((p) => p.length >= 5 && !/\d/.test(p) && !PALABRAS_VACIAS.has(p.toLowerCase()))
  const falsas = parecidos(todas, oculta, 3, azar)
  if (falsas.length < 3) return null
  const opciones = mezclar([oculta, ...falsas], azar)
  const enunciado = `${t.frente}: ${t.reverso.replace(new RegExp(oculta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), HUECO)}`
  return { id: `${t.id}:hueco`, tarjetaId: t.id, tipo: 'hueco', enunciado: recortar(enunciado, 260), opciones, correcta: opciones.indexOf(oculta), frente: t.frente, reverso: t.reverso }
}

function preguntaDe(t: TarjetaRepaso, tipo: TipoPregunta, otras: TarjetaRepaso[], azar: () => number): PreguntaSimulacro | null {
  if (tipo === 'numero') return preguntaNumero(t, azar)
  if (tipo === 'hueco') return preguntaHueco(t, otras, azar)
  if (tipo === 'definicion') {
    const correcta = recortar(t.reverso)
    const falsas = parecidos(otras.map((o) => recortar(o.reverso)), correcta, 3, azar)
    if (falsas.length < 3) return null
    const opciones = mezclar([correcta, ...falsas], azar)
    return { id: `${t.id}:definicion`, tarjetaId: t.id, tipo, enunciado: `¿Cuál es la definición de «${t.frente}»?`, opciones, correcta: opciones.indexOf(correcta), frente: t.frente, reverso: t.reverso }
  }
  const correcta = recortar(t.frente, 90)
  const falsas = parecidos(otras.map((o) => recortar(o.frente, 90)), correcta, 3, azar)
  if (falsas.length < 3) return null
  const opciones = mezclar([correcta, ...falsas], azar)
  return { id: `${t.id}:termino`, tarjetaId: t.id, tipo, enunciado: `¿A qué concepto corresponde esto? ${recortar(t.reverso, 230)}`, opciones, correcta: opciones.indexOf(correcta), frente: t.frente, reverso: t.reverso }
}

/** Hasta `cantidad` preguntas, una por tarjeta. Con menos de 4 tarjetas no se puede armar (faltan opciones falsas). */
export function generarSimulacro(tarjetas: TarjetaRepaso[], cantidad: number, azar: () => number = Math.random, prioridad?: Map<string, TipoPregunta>): { preguntas: PreguntaSimulacro[]; material: number } {
  const base = tarjetasParaSimulacro(tarjetas)
  if (base.length < MIN_TARJETAS_SIMULACRO) return { preguntas: [], material: base.length }
  const TIPOS: TipoPregunta[] = ['definicion', 'termino', 'hueco']
  const preguntas: PreguntaSimulacro[] = []
  // con `prioridad` (tarjeta → tipo que fallaste) solo se pregunta eso, y de ese tipo; el resto del material sirve de opciones falsas
  const aPreguntar = prioridad ? base.filter((t) => prioridad.has(t.id)) : base
  for (const t of mezclar(aPreguntar, azar)) {
    if (preguntas.length >= cantidad) break
    const otras = base.filter((o) => o.id !== t.id)
    // si la definición trae un plazo o un quórum, casi siempre se pregunta eso: es lo que más se confunde
    const primero: TipoPregunta = prioridad?.get(t.id) ?? (cantidadParaHueco(t.reverso, azar) && azar() < 0.7 ? 'numero' : TIPOS[Math.floor(azar() * TIPOS.length)])
    const orden = [primero, ...TIPOS.filter((x) => x !== primero), 'numero' as const].filter((x, i, a) => a.indexOf(x) === i)
    for (const tipo of orden) {
      const p = preguntaDe(t, tipo, otras, azar)
      if (p) {
        preguntas.push(p)
        break
      }
    }
  }
  return { preguntas, material: base.length }
}

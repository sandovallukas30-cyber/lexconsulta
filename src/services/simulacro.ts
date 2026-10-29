import type { TarjetaRepaso } from './tarjetasApunte'

/** Simulacro de examen: preguntas de opción múltiple armadas POR REGLAS con los
 *  «término: definición» de los apuntes (los mismos que el repaso usa como
 *  tarjetas). Sin IA: los distractores salen de otras tarjetas del material.
 *
 *  Tres tipos: elegir la definición de un término, elegir el término de una
 *  definición y completar una palabra que falta en la definición. */

export type TipoPregunta = 'definicion' | 'termino' | 'hueco'

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
export function generarSimulacro(tarjetas: TarjetaRepaso[], cantidad: number, azar: () => number = Math.random): { preguntas: PreguntaSimulacro[]; material: number } {
  const base = tarjetasParaSimulacro(tarjetas)
  if (base.length < MIN_TARJETAS_SIMULACRO) return { preguntas: [], material: base.length }
  const TIPOS: TipoPregunta[] = ['definicion', 'termino', 'hueco']
  const preguntas: PreguntaSimulacro[] = []
  for (const t of mezclar(base, azar)) {
    if (preguntas.length >= cantidad) break
    const otras = base.filter((o) => o.id !== t.id)
    const primero = TIPOS[Math.floor(azar() * TIPOS.length)]
    const orden = [primero, ...TIPOS.filter((x) => x !== primero)]
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

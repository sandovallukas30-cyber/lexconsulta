import type { ApunteModulo } from '../types'
import { normalizarTexto, quitarMarcas } from './apunteFormato'
import { detectarPlazos } from './plazos'

/** Preguntas de desarrollo armadas POR REGLAS con las secciones de tus apuntes, sin IA:
 *  «Desarrolle: <título de la sección>». La pauta es la propia sección y los puntos clave son sus **negritas** y sus
 *  plazos, cuantías y fracciones. Al responder, la app marca cuáles de esos puntos aparecieron en tu texto (aceptando
 *  «treinta» por «30» o «un tercio» por «1/3»); tú corriges lo que la app no pudo entender. */

export interface PuntoClave {
  texto: string
  tipo: 'concepto' | 'cantidad'
}

export interface PreguntaDesarrollo {
  /** `<apunte>:sec:<hash del título>:desarrollo` */
  id: string
  apunteId: string
  titulo: string
  enunciado: string
  puntos: PuntoClave[]
  /** Texto de la sección, sin marcas, para comparar al terminar. */
  pauta: string
}

export const MIN_PUNTOS = 3
export const MAX_PUNTOS = 10
export const MIN_LARGO_SECCION = 120
const MAX_PAUTA = 1800

function hash(texto: string): string {
  let h = 5381
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

const NUMEROS: [string, number][] = [
  ['ciento ochenta', 180], ['ciento veinte', 120], ['cuarenta y cinco', 45],
  ['noventa', 90], ['sesenta', 60], ['treinta', 30], ['veinte', 20], ['quince', 15], ['doce', 12], ['diez', 10],
  ['nueve', 9], ['ocho', 8], ['siete', 7], ['seis', 6], ['cinco', 5], ['cuatro', 4], ['tres', 3], ['dos', 2], ['una', 1], ['uno', 1], ['un', 1],
]
const MAPA_NUMEROS = new Map(NUMEROS)
const RE_NUMEROS = new RegExp(String.raw`\b(${NUMEROS.map(([p]) => p).join('|')})\b`, 'g')
const DENOMINADORES: Record<string, number> = { tercio: 3, tercios: 3, cuarto: 4, cuartos: 4, quinto: 5, quintos: 5, sexto: 6, sextos: 6, septimo: 7, septimos: 7 }
const RE_FRACCION_PALABRAS = new RegExp(String.raw`\b(un|una|dos|tres|cuatro|cinco|seis|siete)\s+(tercios?|cuartos?|quintos?|sextos?|septimos?)\b`, 'g')

/** Texto comparable: sin mayúsculas, tildes ni signos; números y fracciones en palabras pasan a cifras. */
export function canonico(texto: string): string {
  let s = sinTildes(texto.toLowerCase())
  s = s.replace(RE_FRACCION_PALABRAS, (_m, n: string, d: string) => `${MAPA_NUMEROS.get(n)}/${DENOMINADORES[d]}`)
  s = s.replace(RE_NUMEROS, (w) => String(MAPA_NUMEROS.get(w)))
  return s.replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

const VACIAS = new Set(['para', 'como', 'desde', 'entre', 'sobre', 'hasta', 'cuando', 'donde', 'esta', 'este', 'estos', 'estas', 'solo', 'sino', 'pero', 'cada', 'otra', 'otro', 'otros', 'otras', 'tiene', 'tienen', 'puede', 'pueden', 'sera', 'seran', 'quien', 'quienes', 'cual', 'cuales', 'ellos', 'ellas', 'tambien', 'segun', 'ante', 'bajo', 'tras', 'mediante', 'durante'])

function palabrasClave(canon: string): string[] {
  return canon.split(' ').filter((w) => w.length >= 4 && !VACIAS.has(w) && !/^\d+\/\d+$/.test(w))
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Núcleo de una cantidad para compararla: sin «dentro del plazo de» ni calificativos («hábiles», «corridos»). */
function nucleoCantidad(canon: string): string {
  return canon
    .replace(/^(?:dentro del plazo de|dentro del|dentro de|en el plazo de|el plazo de|plazo de)\s+/, '')
    .replace(/\s+(?:habiles|corridos|completos|cabales|continuos|seguidos|fatales)$/, '')
    .trim()
}

function cubre(puntoCanon: string, tipo: PuntoClave['tipo'], respuesta: string, tokens: string[]): boolean {
  if (!puntoCanon) return false
  if (tipo === 'cantidad') {
    const n = nucleoCantidad(puntoCanon)
    return n.length > 0 && new RegExp(String.raw`(?:^| )${escapar(n)}(?: |$)`).test(respuesta)
  }
  const palabras = palabrasClave(puntoCanon)
  if (palabras.length === 0) return new RegExp(String.raw`(?:^| )${escapar(puntoCanon)}(?: |$)`).test(respuesta)
  const presentes = palabras.filter((w) => {
    const raiz = w.slice(0, Math.min(5, w.length))
    return tokens.some((t) => t.startsWith(raiz))
  })
  return presentes.length >= Math.ceil(palabras.length * 0.7)
}

export interface EvaluacionDesarrollo {
  cubiertos: boolean[]
  /** 0 a 1 */
  porcentaje: number
}

/** Marca qué puntos clave aparecen en la respuesta. Es una ayuda: la persona puede corregir cada marca. */
export function evaluarRespuesta(respuesta: string, puntos: PuntoClave[]): EvaluacionDesarrollo {
  const canon = canonico(respuesta)
  const tokens = canon.split(' ').filter(Boolean)
  const cubiertos = puntos.map((p) => cubre(canonico(p.texto), p.tipo, canon, tokens))
  return { cubiertos, porcentaje: puntos.length === 0 ? 0 : cubiertos.filter(Boolean).length / puntos.length }
}

/** Con este porcentaje de puntos cubiertos, el tema se da por logrado. */
export const UMBRAL_LOGRADO = 0.7

interface Seccion {
  titulo: string
  cuerpo: string[]
}

/** Secciones de un apunte: cada título con las líneas hasta el siguiente título (de cualquier nivel). */
export function seccionesDe(contenido: string): Seccion[] {
  const secciones: Seccion[] = []
  let actual: Seccion | null = null
  for (const linea of normalizarTexto(contenido).split('\n')) {
    const h = /^\s*#{1,3}\s+(.+)$/.exec(linea)
    if (h) {
      actual = { titulo: quitarMarcas(h[1]).replace(/\s+/g, ' ').trim(), cuerpo: [] }
      secciones.push(actual)
    } else if (actual) actual.cuerpo.push(linea)
  }
  return secciones
}

const RE_FRACCION = /\b\d{1,2}\/\d{1,2}\b/g
const RE_FRACCION_PALABRA = /\b(?:un|una|dos|tres|cuatro|cinco|seis|siete)\s+(?:tercios?|cuartos?|quintos?|sextos?|séptimos?)\b/giu

function puntosDe(cuerpo: string[], titulo: string): PuntoClave[] {
  const crudo = cuerpo.join('\n')
  const plano = quitarMarcas(crudo)
  const vistos = new Set<string>()
  const cantidades: PuntoClave[] = []
  const conceptos: PuntoClave[] = []
  const tituloCanon = canonico(titulo)
  const agregar = (lista: PuntoClave[], texto: string, tipo: PuntoClave['tipo']) => {
    const limpio = texto.replace(/\s+/g, ' ').replace(/[:;,.\s]+$/, '').trim()
    const c = canonico(limpio)
    // «dentro de tres meses» y «tres meses» son el mismo punto
    const clave = tipo === 'cantidad' ? nucleoCantidad(c) : c
    if (!c || vistos.has(clave) || c === tituloCanon || (tipo === 'concepto' && limpio.length < 3)) return
    vistos.add(clave)
    lista.push({ texto: limpio, tipo })
  }
  for (const r of detectarPlazos(plano)) agregar(cantidades, plano.slice(r.inicio, r.fin), 'cantidad')
  for (const m of plano.matchAll(RE_FRACCION)) agregar(cantidades, m[0], 'cantidad')
  for (const m of plano.matchAll(RE_FRACCION_PALABRA)) agregar(cantidades, m[0], 'cantidad')
  for (const m of crudo.matchAll(/\*\*([^*\n]+?)\*\*/g)) {
    const t = quitarMarcas(m[1])
    if (t.length <= 60 && !/^\d+$/.test(t.trim())) agregar(conceptos, t, 'concepto')
  }
  return [...cantidades.slice(0, 4), ...conceptos].slice(0, MAX_PUNTOS)
}

/** Todas las preguntas de desarrollo que se pueden armar con un apunte (secciones con contenido y al menos `MIN_PUNTOS` puntos clave). */
export function preguntasDeApunte(apunte: Pick<ApunteModulo, 'id' | 'contenido'>): PreguntaDesarrollo[] {
  const salida: PreguntaDesarrollo[] = []
  const usados = new Set<string>()
  for (const s of seccionesDe(apunte.contenido)) {
    const pauta = quitarMarcas(s.cuerpo.join('\n')).replace(/\n{3,}/g, '\n\n').trim()
    if (pauta.length < MIN_LARGO_SECCION || !s.titulo) continue
    const puntos = puntosDe(s.cuerpo, s.titulo)
    if (puntos.length < MIN_PUNTOS) continue
    let id = `${apunte.id}:sec:${hash(s.titulo.toLowerCase())}:desarrollo`
    if (usados.has(id)) id = `${id}-${hash(pauta)}`
    usados.add(id)
    const tabla = s.cuerpo.some((l) => /^\s*\|/.test(l))
    salida.push({
      id,
      apunteId: apunte.id,
      titulo: s.titulo,
      enunciado: `${tabla ? 'Compare y distinga' : 'Desarrolle'}: ${s.titulo}`,
      puntos,
      pauta: pauta.length > MAX_PAUTA ? `${pauta.slice(0, MAX_PAUTA).replace(/\s+\S*$/, '')}…` : pauta,
    })
  }
  return salida
}

function mezclar<T>(lista: T[], azar: () => number): T[] {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Hasta `cantidad` preguntas de desarrollo con los apuntes dados. Las de `prioridad` (las que fallaste) van primero. */
export function generarDesarrollo(apuntes: Pick<ApunteModulo, 'id' | 'contenido'>[], cantidad: number, azar: () => number = Math.random, prioridad?: Set<string>): PreguntaDesarrollo[] {
  const todas = apuntes.flatMap((a) => preguntasDeApunte(a))
  const primeras = prioridad ? mezclar(todas.filter((p) => prioridad.has(p.id)), azar) : []
  const resto = mezclar(todas.filter((p) => !prioridad?.has(p.id)), azar)
  return [...primeras, ...resto].slice(0, cantidad)
}

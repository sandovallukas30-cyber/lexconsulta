import { obtenerCodigo } from './codigos'
import type { Articulo, CodigoTipo } from '../types'

const STOPWORDS = new Set([
  'a', 'al', 'algun', 'alguna', 'algunas', 'alguno', 'algunos', 'ambos', 'ante', 'antes',
  'aquel', 'aquella', 'aquellas', 'aquellos', 'aqui', 'asi', 'aun', 'aunque',
  'bajo', 'bien', 'cada', 'casi', 'como', 'con', 'conmigo', 'contra', 'cual', 'cuales',
  'cuando', 'cuanto', 'cuantos', 'de', 'del', 'demas', 'desde', 'donde', 'dos',
  'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'eran', 'eras', 'eres', 'es',
  'esa', 'esas', 'ese', 'esos', 'esta', 'estas', 'este', 'estos', 'fue', 'fueron',
  'fui', 'fuimos', 'ha', 'habia', 'han', 'hasta', 'hay', 'la', 'las', 'le', 'les',
  'lo', 'los', 'mas', 'me', 'mi', 'mis', 'mucho', 'muchos', 'muy', 'nada', 'ni',
  'no', 'nos', 'nosotros', 'nuestro', 'o', 'otra', 'otras', 'otro', 'otros',
  'para', 'pero', 'poco', 'por', 'porque', 'que', 'quien', 'quienes', 'se', 'sea',
  'segun', 'ser', 'si', 'sin', 'sobre', 'solo', 'son', 'su', 'sus', 'tal', 'tales',
  'tambien', 'tan', 'tanto', 'te', 'tener', 'ti', 'tiene', 'todo', 'todos', 'tras',
  'tu', 'tus', 'un', 'una', 'unas', 'uno', 'unos', 'y', 'ya', 'yo', 'art', 'articulo',
  'codigo', 'ley', 'norma', 'decreto', 'inciso', 'numero', 'siguiente', 'anterior',
  'mismo', 'misma', 'cuyos', 'cuyas', 'cuya', 'cuyo',
])

// Sinónimos / expansión de términos legales chilenos frecuentes.
// Mapa unidireccional: si el usuario menciona la clave, también buscamos los valores.
const SINONIMOS: Record<string, string[]> = {
  despido: ['terminacion', 'desafuero', 'desvinculacion'],
  despedir: ['terminar', 'desvincular'],
  finiquito: ['terminacion'],
  renuncia: ['terminacion'],
  sueldo: ['remuneracion', 'salario', 'estipendio'],
  remuneracion: ['sueldo', 'salario'],
  arriendo: ['arrendamiento', 'locacion'],
  arrendamiento: ['arriendo'],
  herencia: ['sucesion', 'asignacion'],
  testamento: ['sucesion', 'asignacion'],
  divorcio: ['matrimonio', 'cese', 'conyugal'],
  alimentos: ['pension', 'manutencion'],
  contrato: ['convencion', 'pacto', 'estipulacion'],
  multa: ['sancion', 'pena pecuniaria'],
  fiscalizacion: ['auditoria', 'requerimiento'],
  delito: ['crimen', 'simple delito', 'falta'],
  victima: ['ofendido', 'querellante'],
  imputado: ['acusado', 'inculpado'],
  detencion: ['privacion de libertad', 'aprehension'],
  prescripcion: ['extincion'],
  nulidad: ['ineficacia', 'invalidez'],
  indemnizacion: ['reparacion', 'resarcimiento'],
  demanda: ['accion'],
  apelacion: ['recurso'],
  vacaciones: ['feriado'],
  acoso: ['hostigamiento', 'mobbing'],
  embarazo: ['gravidez', 'maternidad'],
  hijo: ['descendiente', 'menor'],
  conyuge: ['marido', 'esposa', 'matrimonio'],
  propiedad: ['dominio'],
  posesion: ['tenencia'],
  pago: ['solucion', 'cumplimiento'],
  deuda: ['obligacion', 'credito'],
  fiador: ['avalista', 'codeudor'],
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function tokenize(s: string): string[] {
  return normalizar(s)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

function expandirTokens(tokens: string[]): string[] {
  const set = new Set(tokens)
  for (const t of tokens) {
    const expansiones = SINONIMOS[t]
    if (expansiones) {
      for (const e of expansiones) {
        // expandir respetando tokenización (sin stopwords cortas)
        for (const sub of e.split(/\s+/)) {
          if (sub.length > 2 && !STOPWORDS.has(sub)) set.add(sub)
        }
      }
    }
  }
  return [...set]
}

function extraerNumeros(s: string): string[] {
  return (s.match(/\b\d+\b/g) ?? [])
}

export interface ResultadoBusqueda {
  articulo: Articulo
  codigo: CodigoTipo
  nombreCodigo: string
  score: number
  matches: string[] // palabras clave (no incluye números)
  numeroDirecto: boolean // true si la pregunta apuntó al número de este artículo
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ============ BM25 + boosts ============

interface IndiceCodigo {
  idf: Map<string, number>
  avgLen: number
  // Para cada artículo: tokens del texto en forma normalizada + frecuencias
  porArt: Map<string, { tokens: Map<string, number>; len: number; etiquetaTokens: Set<string> }>
}

const indiceCache = new Map<CodigoTipo, IndiceCodigo>()

function construirIndice(tipo: CodigoTipo): IndiceCodigo | null {
  const codigo = obtenerCodigo(tipo)
  if (!codigo) return null
  if (indiceCache.has(tipo)) return indiceCache.get(tipo)!

  const porArt = new Map<string, { tokens: Map<string, number>; len: number; etiquetaTokens: Set<string> }>()
  const df = new Map<string, number>()
  let totalLen = 0

  for (const art of codigo.articulos) {
    const toks = tokenize(art.t)
    const freq = new Map<string, number>()
    for (const t of toks) freq.set(t, (freq.get(t) ?? 0) + 1)
    const etiquetaTokens = new Set(tokenize([art.libro, art.titulo, art.capitulo, art.parrafo].filter(Boolean).join(' ')))

    porArt.set(art.a, { tokens: freq, len: toks.length, etiquetaTokens })
    totalLen += toks.length
    for (const t of freq.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  }

  const N = codigo.articulos.length
  const idf = new Map<string, number>()
  for (const [t, c] of df) {
    // IDF clásico de BM25 con suavizado
    idf.set(t, Math.log(1 + (N - c + 0.5) / (c + 0.5)))
  }
  const indice: IndiceCodigo = { idf, avgLen: totalLen / Math.max(N, 1), porArt }
  indiceCache.set(tipo, indice)
  return indice
}

// Detecta si un artículo pertenece a una sección "fundamental" del código
function esFundamentalEnSeccion(art: Articulo): number {
  const ctx = [art.libro, art.titulo, art.capitulo, art.parrafo].filter(Boolean).join(' ').toLowerCase()
  if (!ctx) return 0
  if (/preliminar|disposiciones\s+generales|principios|reglas\s+generales|definiciones/.test(ctx)) return 0.35
  if (/libro\s+i\b|t[íi]tulo\s+i\b/.test(ctx)) return 0.1
  return 0
}

// Boost por estar dentro de los primeros artículos del código
function boostPosicion(art: Articulo): number {
  const n = parseInt((art.a.match(/\d+/) ?? ['0'])[0], 10)
  if (n === 0) return 0
  if (n <= 5) return 0.3
  if (n <= 15) return 0.18
  if (n <= 30) return 0.08
  return 0
}

// Penalty leve por artículos extremadamente largos (suelen ser regulaciones detalladas)
function ajustePorLongitud(len: number): number {
  if (len > 400) return -0.12
  if (len > 250) return -0.06
  return 0
}

const K1 = 1.5
const B = 0.75

export function buscar(
  query: string,
  codigosActivos: CodigoTipo[],
  limit = 12
): ResultadoBusqueda[] {
  const tokensBase = tokenize(query)
  const tokens = expandirTokens(tokensBase)
  const numeros = extraerNumeros(query)
  if (tokens.length === 0 && numeros.length === 0) return []

  const resultados: ResultadoBusqueda[] = []

  for (const tipo of codigosActivos) {
    const codigo = obtenerCodigo(tipo)
    if (!codigo) continue
    const indice = construirIndice(tipo)
    if (!indice) continue

    for (const art of codigo.articulos) {
      const datos = indice.porArt.get(art.a)
      if (!datos) continue

      let scoreBM25 = 0
      const matches = new Set<string>()

      // Coincidencia por número del artículo
      let numeroDirecto = false
      for (const n of numeros) {
        const labelNum = (art.a.match(/\d+/g) ?? [])[0]
        if (labelNum === n) {
          scoreBM25 += 20
          numeroDirecto = true
        }
      }

      // BM25 por cada token
      for (const tok of tokens) {
        const tf = datos.tokens.get(tok) ?? 0
        const idf = indice.idf.get(tok) ?? 0
        if (tf > 0 && idf > 0) {
          const denom = tf + K1 * (1 - B + B * (datos.len / Math.max(indice.avgLen, 1)))
          scoreBM25 += idf * ((tf * (K1 + 1)) / denom)
          matches.add(tok)
        }
        // Coincidencia en la etiqueta jerárquica (Libro/Título/Capítulo) vale extra
        if (datos.etiquetaTokens.has(tok)) {
          scoreBM25 += 1.2
          matches.add(tok)
        }
      }

      if (scoreBM25 <= 0) continue

      // Bonus de cobertura: cuántos tokens distintos del query aparecen
      let cobertura = 0
      if (tokensBase.length > 0) {
        const matchedBase = tokensBase.filter((t) => matches.has(t)).length
        cobertura = matchedBase / tokensBase.length
      }

      // Score final con boosts multiplicativos
      const boostSeccion = esFundamentalEnSeccion(art)
      const boostPos = boostPosicion(art)
      const ajusteLong = ajustePorLongitud(datos.len)
      const boostCobertura = cobertura >= 0.6 ? 0.25 : cobertura >= 0.4 ? 0.1 : 0

      const score = scoreBM25 * (1 + boostSeccion + boostPos + boostCobertura + ajusteLong)

      resultados.push({
        articulo: art,
        codigo: tipo,
        nombreCodigo: codigo.codigo,
        score,
        matches: [...matches],
        numeroDirecto,
      })
    }
  }

  // Sin restricciones, los resultados pueden sesgar a un solo código. Garantizamos
  // diversidad: al menos los 2 mejores de cada código que tenga ≥1 hit razonable.
  const ordenados = resultados.sort((a, b) => b.score - a.score)
  const finales: ResultadoBusqueda[] = []
  const conteoPorCodigo = new Map<CodigoTipo, number>()
  const umbralRelevante = (ordenados[0]?.score ?? 0) * 0.15

  // Primera pasada: top global hasta llenar
  for (const r of ordenados) {
    if (finales.length >= limit) break
    finales.push(r)
    conteoPorCodigo.set(r.codigo, (conteoPorCodigo.get(r.codigo) ?? 0) + 1)
  }

  // Segunda pasada: si algún código relevante quedó subrepresentado, insertarlo
  for (const r of ordenados) {
    if (finales.includes(r)) continue
    if (r.score < umbralRelevante) continue
    const c = conteoPorCodigo.get(r.codigo) ?? 0
    if (c === 0) {
      // bumpear el último para hacerle espacio
      finales.pop()
      finales.push(r)
      conteoPorCodigo.set(r.codigo, 1)
    }
  }

  // Re-ordenar por score
  return finales.sort((a, b) => b.score - a.score)
}

// Test helper / debug
export function limpiarCacheIndice(): void {
  indiceCache.clear()
}

// Mantenida por compatibilidad con código que pueda importarla
export { escaparRegex }

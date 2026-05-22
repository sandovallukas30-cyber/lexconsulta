import { CODIGOS_DATA } from './codigos'
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

export function buscar(
  query: string,
  codigosActivos: CodigoTipo[],
  limit = 8
): ResultadoBusqueda[] {
  const tokens = tokenize(query)
  const numeros = extraerNumeros(query)
  if (tokens.length === 0 && numeros.length === 0) return []

  const resultados: ResultadoBusqueda[] = []

  for (const tipo of codigosActivos) {
    const codigo = CODIGOS_DATA[tipo]
    if (!codigo) continue

    for (const art of codigo.articulos) {
      const textoNorm = normalizar(art.t)
      const labelNorm = normalizar(art.a)
      let score = 0
      let numeroDirecto = false
      const matches = new Set<string>()

      // Number match against the article's own number (Art. N)
      for (const n of numeros) {
        const labelNum = (art.a.match(/\d+/g) ?? [])[0]
        if (labelNum === n) {
          score += 15
          numeroDirecto = true
        }
      }

      for (const tok of tokens) {
        if (labelNorm.includes(tok)) {
          score += 3
          matches.add(tok)
        }
        const re = new RegExp(`\\b${escaparRegex(tok)}\\b`, 'g')
        const ocurrencias = (textoNorm.match(re) ?? []).length
        if (ocurrencias > 0) {
          score += ocurrencias
          matches.add(tok)
        }
      }

      if (score > 0) {
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
  }

  return resultados.sort((a, b) => b.score - a.score).slice(0, limit)
}

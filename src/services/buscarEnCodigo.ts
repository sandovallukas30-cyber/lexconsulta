import type { Articulo } from '../types'
import { fragmentoEn, normalizarConsulta, type FragmentoCoincidencia } from './buscarApuntes'

/** Buscador dentro de un código (C7): "Ir al artículo N" tolerante y
 *  búsqueda de texto sin tildes con la coincidencia resaltada.
 *
 *  Ids en los JSON: "Art. 183", "Art. 183 A", "Art. 183-A", "Art. 4 bis",
 *  "Art. 4 bis A", "Art. 3 transitorio", "Art. 12 (L.IV)" (el paréntesis
 *  desambigua libros que reinician la numeración). El usuario escribe
 *  "183a", "183-A", "art 183 a", "artículo 4° bis", "4bis", "3 transitorio". */

const SUFIJOS = 'bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies|undecies|duodecies'
const RE_CLAVE_ID = new RegExp(`^\\d+(?: (?:[a-z]{1,2}|${SUFIJOS}))*(?: transitorio)?$`)

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Forma canónica de un id de artículo: "Art. 183-A" → "183 a",
 *  "Artículo 4° bis" → "4 bis", "Art. 12 (L.IV)" → "12". */
export function claveArticulo(id: string): string {
  return sinTildes(id)
    .replace(/\(.*?\)/g, ' ')
    .replace(/^\s*(?:art(?:iculo)?s?\.?|n[°º.])\s*/, '')
    .replace(/[°º]/g, ' ')
    .replace(/(\d)\s*-\s*([a-z])/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/[.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Si la consulta es un id de artículo ("183a", "art. 4 bis"), su clave;
 *  si es texto libre, null. */
export function consultaComoId(q: string): string | null {
  // "1o" = 1° (ordinal escrito con o)
  const clave = claveArticulo(q.replace(/^(\s*(?:art\w*\.?\s*)?\d+)o\b/i, '$1'))
  return RE_CLAVE_ID.test(clave) ? clave : null
}

export interface ResultadoCodigo {
  articulo: Articulo
  /** Solo en búsquedas de texto: dónde aparece, para resaltarlo. */
  fragmento: FragmentoCoincidencia | null
  /** El id coincide exactamente con lo escrito ("Ir al artículo"). */
  exacto: boolean
}

// texto normalizado de cada artículo: se calcula una vez por artículo, no
// en cada tecla (el Código Civil tiene 2.566 artículos)
const normCache = new WeakMap<Articulo, string>()
function normDe(a: Articulo): string {
  let n = normCache.get(a)
  if (n === undefined) {
    n = sinTildes(a.t)
    normCache.set(a, n)
  }
  return n
}
const claveCache = new WeakMap<Articulo, string>()
function claveDe(a: Articulo): string {
  let c = claveCache.get(a)
  if (c === undefined) {
    c = claveArticulo(a.a)
    claveCache.set(a, c)
  }
  return c
}

export function buscarEnCodigo(arts: Articulo[], consulta: string, limite = 50): ResultadoCodigo[] {
  const q = consulta.trim()
  if (!q) return arts.slice(0, limite).map((articulo) => ({ articulo, fragmento: null, exacto: false }))

  const qId = consultaComoId(q)
  const palabras = normalizarConsulta(q)
  const frase = palabras.join(' ')
  const qNum = qId ? qId.split(' ')[0] : null
  const reNum = qNum ? new RegExp(`\\b${qNum}\\b`) : null

  const puntuados: { a: Articulo; score: number; exacto: boolean }[] = []
  for (const a of arts) {
    let score = 0
    let exacto = false
    if (qId && qNum) {
      const clave = claveDe(a)
      const num = clave.split(' ')[0]
      if (clave === qId) {
        score += 10000
        exacto = true
      } else if (clave.startsWith(qId + ' ')) score += 5000 - (clave.length - qId.length)
      else if (num === qNum) score += 3000
      else if (/^\d+$/.test(qId) && num.startsWith(qNum)) score += 1000 - (num.length - qNum.length)
      // menciones del número dentro del texto de OTROS artículos, abajo (y
      // sin desordenar los que ya coinciden por id: 183, 183 A, 183 B…)
      if (score === 0 && reNum?.test(normDe(a))) score += 5
    } else {
      const norm = normDe(a)
      const clave = claveDe(a)
      if (clave.includes(frase)) score += 500
      if (palabras.length > 1 && norm.includes(frase)) score += 100
      let presentes = 0
      for (const w of palabras) {
        if (norm.includes(w)) {
          presentes++
          score += w.length > 2 ? 10 : 2
        }
      }
      if (presentes === palabras.length && palabras.length > 0) score += 50
      // una sola palabra corta que no aparece como tal no suma nada
      if (palabras.length === 1 && norm.includes(frase)) score += 100
    }
    if (score > 0) puntuados.push({ a, score, exacto })
  }

  // Deduplicar por id + primeros 80 chars del texto (el JSON puede traer el
  // mismo artículo duplicado cuando varios libros reinician numeración).
  const vistos = new Set<string>()
  return puntuados
    .sort((x, y) => y.score - x.score)
    .filter((p) => {
      const clave = `${p.a.a}::${p.a.t.slice(0, 80)}`
      if (vistos.has(clave)) return false
      vistos.add(clave)
      return true
    })
    .slice(0, limite)
    .map(({ a, exacto }) => {
      if (qId) return { articulo: a, fragmento: null, exacto }
      const presentes = palabras.filter((w) => normDe(a).includes(w))
      return { articulo: a, fragmento: presentes.length ? fragmentoEn(a.t, presentes)?.fragmento ?? null : null, exacto }
    })
}

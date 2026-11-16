import { canonico } from './desarrollo'

/** Recitar de memoria: escribes un texto (un artículo, una definición, un apunte) sin mirarlo y la app lo compara con el
 *  original palabra clave por palabra clave, sin IA. No exige el mismo orden ni las mismas palabras de enlace:
 *  busca las ideas (palabras de 4 letras o más, números y fracciones) y te muestra cuáles faltaron. */

export type EstadoTrozo = 'ok' | 'falta' | 'neutro'

export interface TrozoRecitado {
  texto: string
  estado: EstadoTrozo
}

export interface ComparacionRecitado {
  trozos: TrozoRecitado[]
  /** Palabras clave del original. */
  total: number
  recordadas: number
  /** 0 a 1 */
  porcentaje: number
  /** Palabras clave que faltaron, sin repetir, en el orden del original. */
  faltaron: string[]
}

const VACIAS = new Set(['para', 'como', 'desde', 'entre', 'sobre', 'hasta', 'cuando', 'donde', 'esta', 'este', 'estos', 'estas', 'solo', 'sino', 'pero', 'cada', 'otra', 'otro', 'otros', 'otras', 'tiene', 'tienen', 'puede', 'pueden', 'sera', 'seran', 'quien', 'quienes', 'cual', 'cuales', 'ellos', 'ellas', 'tambien', 'segun', 'ante', 'bajo', 'tras', 'mediante', 'durante', 'dicho', 'dicha', 'dichos', 'dichas', 'haya', 'hayan', 'sido', 'sean', 'seria', 'esos', 'esas', 'aquel', 'aquella', 'cuyo', 'cuya', 'asi', 'mismo', 'misma', 'todo', 'toda', 'todos', 'todas', 'ser', 'estar'])
const RAIZ_DENOMINADOR: Record<string, string> = { '3': 'terci', '4': 'cuart', '5': 'quint', '6': 'sexto', '7': 'septi' }

const raiz = (w: string) => w.slice(0, Math.min(5, w.length))

/** Palabra clave: número, fracción o palabra de 4+ letras que no sea de enlace. */
function esClave(canonToken: string): boolean {
  if (/^\d+(?:\/\d+)?$/.test(canonToken)) return true
  return canonToken.length >= 4 && !VACIAS.has(canonToken)
}

/** Compara lo recitado con el original. */
export function compararRecitado(original: string, recitado: string): ComparacionRecitado {
  // lo recitado: conjunto de raíces y de números; una fracción «2/3» también cubre «tercios»
  const recordado = new Set<string>()
  const numeros = new Set<string>()
  for (const t of canonico(recitado).split(' ').filter(Boolean)) {
    recordado.add(raiz(t))
    numeros.add(t)
    const f = /^(\d+)\/(\d+)$/.exec(t)
    if (f) {
      numeros.add(f[1]) // «dos tercios» cuenta el «2» de «2/3»
      if (RAIZ_DENOMINADOR[f[2]]) recordado.add(RAIZ_DENOMINADOR[f[2]])
    }
  }

  const trozos: TrozoRecitado[] = []
  const faltaron: string[] = []
  const yaFalto = new Set<string>()
  let total = 0
  let recordadas = 0
  // el original se parte en palabras (letras, cifras y «/») y todo lo demás (espacios, signos) queda tal cual
  for (const parte of original.split(/([\p{L}\p{N}/]+)/u)) {
    if (!parte) continue
    if (!/^[\p{L}\p{N}/]+$/u.test(parte)) {
      trozos.push({ texto: parte, estado: 'neutro' })
      continue
    }
    const c = canonico(parte)
    if (!c || !esClave(c)) {
      trozos.push({ texto: parte, estado: 'neutro' })
      continue
    }
    total++
    const bien = /\d/.test(c) ? numeros.has(c) : recordado.has(raiz(c))
    if (bien) recordadas++
    else if (!yaFalto.has(c)) {
      yaFalto.add(c)
      faltaron.push(parte)
    }
    trozos.push({ texto: parte, estado: bien ? 'ok' : 'falta' })
  }
  return { trozos, total, recordadas, porcentaje: total === 0 ? 0 : recordadas / total, faltaron }
}

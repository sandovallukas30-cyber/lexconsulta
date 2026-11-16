import { canonico } from './desarrollo'

/** Comparar dos artículos lado a lado: marca en cada uno las palabras clave (y las cifras) que el otro NO tiene, para
 *  ver de un vistazo en qué se distinguen (plazos, quórums, quién decide…). Sin IA: compara raíces de palabras. */

export interface TrozoComparado {
  texto: string
  /** true = palabra clave que solo está en este artículo. */
  propio: boolean
}

const VACIAS = new Set(['para', 'como', 'desde', 'entre', 'sobre', 'hasta', 'cuando', 'donde', 'esta', 'este', 'estos', 'estas', 'solo', 'sino', 'pero', 'cada', 'otra', 'otro', 'otros', 'otras', 'tiene', 'tienen', 'puede', 'pueden', 'sera', 'seran', 'quien', 'quienes', 'cual', 'cuales', 'tambien', 'segun', 'ante', 'bajo', 'tras', 'dicho', 'dicha', 'dichos', 'dichas', 'haya', 'hayan', 'sido', 'sean', 'mismo', 'misma', 'todo', 'toda', 'todos', 'todas', 'articulo', 'inciso', 'presente'])

// raíz de 5 letras; una palabra de 4 («esté») guarda su raíz de 4 y cubre «estén»
const raiz = (w: string) => w.slice(0, Math.min(5, w.length))
const esNumero = (w: string) => /^\d+(?:\/\d+)?$/.test(w)
const esClave = (w: string) => esNumero(w) || (w.length >= 4 && !VACIAS.has(w))

/** Raíces y cifras de un texto. */
function huella(texto: string): { raices: Set<string>; numeros: Set<string> } {
  const raices = new Set<string>()
  const numeros = new Set<string>()
  for (const w of canonico(texto).split(' ')) {
    if (!w) continue
    if (esNumero(w)) numeros.add(w)
    else raices.add(raiz(w))
  }
  return { raices, numeros }
}

/** El texto partido en trozos, con las palabras clave que el `otro` no tiene marcadas como propias. */
export function marcarDiferencias(texto: string, otro: string): TrozoComparado[] {
  const h = huella(otro)
  const trozos: TrozoComparado[] = []
  for (const parte of texto.split(/([\p{L}\p{N}/]+)/u)) {
    if (!parte) continue
    if (!/^[\p{L}\p{N}/]+$/u.test(parte)) {
      trozos.push({ texto: parte, propio: false })
      continue
    }
    const c = canonico(parte)
    const propio = !!c && esClave(c) && (esNumero(c) ? !h.numeros.has(c) : !(h.raices.has(raiz(c)) || h.raices.has(c.slice(0, 4))))
    trozos.push({ texto: parte, propio })
  }
  return trozos
}

/** Cuántas palabras clave distintas tiene cada lado que el otro no (para el resumen). */
export function contarPropias(trozos: TrozoComparado[]): number {
  return new Set(trozos.filter((t) => t.propio).map((t) => canonico(t.texto))).size
}

/** «53», «art 53», «Art. 53 bis» → la forma con que se guardan los artículos («Art. 53», «Art. 53 bis»). */
export function normalizarNumeroArticulo(entrada: string): string | null {
  const m = /^\s*(?:art(?:[íi]culo)?\.?\s*)?(\d+)\s*(bis|ter|qu[áa]ter|quinquies)?\s*$/i.exec(entrada)
  if (!m) return null
  return `Art. ${m[1]}${m[2] ? ` ${m[2].toLowerCase().replace('á', 'a')}` : ''}`
}

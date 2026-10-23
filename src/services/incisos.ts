/** Numeración de incisos de un artículo (ajuste «Mostrar el número de cada inciso»).
 *
 *  Reglas (comprobadas con jurisprudencia citada en docs/numeracion-incisos.md):
 *  1. Inciso = cada párrafo del artículo (lo que termina en punto aparte). Se cuentan 1, 2, 3… de corrido.
 *  2. Los ítems de una enumeración («1º.», «2º.-», «1)», «a)», «i)») pertenecen al inciso que los introduce: ni se
 *     cuentan ni llevan número. Se citan por su número o letra («art. 65, inciso 4.º, N.º 6»).
 *  3. Si los numerales traen incisos propios (art. 19 de la Constitución: «1º.-» con párrafos debajo, y también el
 *     siguiente numeral con párrafos), cada numeral es el inciso 1.º de su número y la cuenta se reinicia en cada uno
 *     («art. 19 N.º 3, inciso 6.º»).
 *  4. Los encabezados de sección que el texto trae pegados al final del artículo («§ 2. Promulgación de la ley»,
 *     «TÍTULO II») no son incisos.
 *  Es una regla sobre el formato del texto: para citar formalmente conviene contrastar con el texto vigente en leychile.cl. */

/** «1º.», «1º.-», «1.-», «1)», «a)», «ii)»: ítem de una enumeración. */
const NUMERAL = /^\s*(?:\d{1,2}\s*(?:[º°ª.)]|\.-)|[a-zñ]\)|[ivx]{1,4}\))/i
/** «1º.-», «2º.-»: numeral al estilo de la Constitución (art. 19, 32…). */
const NUMERAL_CON_GUION = /^\s*\d{1,2}\s*[º°]\s*\.?\s*-/
/** Títulos de sección que quedan pegados al texto del artículo anterior: «§ 2. …», «Párrafo 2º», «TÍTULO II», «CAPÍTULO III». */
const ENCABEZADO = /^\s*(?:§|(?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|P[AÁ]RRAFO)\b)/i

export const esNumeral = (parrafo: string): boolean => NUMERAL.test(parrafo)
export const esEncabezado = (parrafo: string): boolean => parrafo.length < 110 && ENCABEZADO.test(parrafo)

/** ¿Los numerales «1º.-» traen incisos propios (art. 19) o son los ítems de una lista (art. 17)? En el primer caso hay
 *  numerales seguidos que llevan párrafos debajo; en una lista, solo el último ítem puede tener un párrafo de cierre. */
export function numeralesConIncisos(parrafos: string[]): boolean {
  let anteriorConCuerpo = false
  for (let i = 0; i < parrafos.length; i++) {
    if (!NUMERAL_CON_GUION.test(parrafos[i])) continue
    const siguiente = parrafos[i + 1]
    const conCuerpo = siguiente !== undefined && !esNumeral(siguiente) && !esEncabezado(siguiente)
    if (conCuerpo && anteriorConCuerpo) return true
    anteriorConCuerpo = conCuerpo
  }
  return false
}

export type ClaseInciso = '' | 'es-numeral' | 'reinicia-inciso'

/** Clase del párrafo `i`:
 *  - `''`: inciso corriente (cuenta y lleva número);
 *  - `es-numeral`: ítem o encabezado: no cuenta ni lleva número;
 *  - `reinicia-inciso`: numeral con incisos propios: es el inciso 1.º y la cuenta empieza de nuevo. */
export function claseInciso(parrafos: string[], i: number, conIncisosPropios: boolean): ClaseInciso {
  const p = parrafos[i]
  if (esEncabezado(p)) return 'es-numeral'
  if (!esNumeral(p)) return ''
  return conIncisosPropios && NUMERAL_CON_GUION.test(p) ? 'reinicia-inciso' : 'es-numeral'
}

/** Número de cada párrafo (o null si no lleva). Es lo mismo que calculan los contadores CSS de la pantalla. */
export function numerosDeIncisos(parrafos: string[]): (number | null)[] {
  const propios = numeralesConIncisos(parrafos)
  let n = 0
  return parrafos.map((_, i) => {
    const c = claseInciso(parrafos, i, propios)
    if (c === 'es-numeral') return null
    n = c === 'reinicia-inciso' ? 1 : n + 1
    return n
  })
}

/** Dónde está un párrafo dentro del artículo, para citarlo: inciso, número (numeral) y letra. */
export interface UbicacionCita {
  inciso: number | null
  numero: string | null
  letra: string | null
  /** El número trae incisos propios (art. 19): el inciso se cuenta dentro del número y se cita después de él. */
  propio: boolean
}

/** «3º.- La igual…» → «3»; «1) Las que…» → «1». */
function numeroDeItem(parrafo: string): string | null {
  return /^\s*(\d{1,2})\s*(?:[º°ª.)]|\.-)/.exec(parrafo)?.[1] ?? null
}
/** «a) …» → «a»; «ii) …» → «ii». */
function letraDeItem(parrafo: string): string | null {
  return /^\s*([a-zñ]|[ivx]{2,4})\)/i.exec(parrafo)?.[1].toLowerCase() ?? null
}

/** Ubicación citable del párrafo `i` (o null si es un encabezado). El inciso se omite cuando es el único del artículo, o
 *  el 1.º de una lista de ítems o de un número («art. 17 N.º 2», «art. 19 N.º 3»). */
export function ubicacionDeParrafo(parrafos: string[], i: number): UbicacionCita | null {
  if (!parrafos[i] || esEncabezado(parrafos[i])) return null
  const propios = numeralesConIncisos(parrafos)
  const incisosTotales = parrafos.filter((_, k) => claseInciso(parrafos, k, propios) !== 'es-numeral').length
  let n = 0
  let numeroPropio: string | null = null
  for (let k = 0; k < i; k++) {
    const c = claseInciso(parrafos, k, propios)
    if (c === 'es-numeral') continue
    if (c === 'reinicia-inciso') {
      n = 1
      numeroPropio = numeroDeItem(parrafos[k])
    } else n += 1
  }
  const c = claseInciso(parrafos, i, propios)
  if (c === 'reinicia-inciso') return { inciso: null, numero: numeroDeItem(parrafos[i]), letra: null, propio: true }
  if (c === 'es-numeral') {
    const letra = letraDeItem(parrafos[i])
    const numero = letra ? numeroPropio : numeroDeItem(parrafos[i])
    return { inciso: n > 1 ? n : null, numero, letra, propio: !!numeroPropio && !!letra }
  }
  n += 1
  if (numeroPropio) return { inciso: n > 1 ? n : null, numero: numeroPropio, letra: null, propio: true }
  return { inciso: incisosTotales > 1 ? n : null, numero: null, letra: null, propio: false }
}

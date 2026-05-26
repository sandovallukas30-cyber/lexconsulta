// Utilidades para la presentación de artículos jurídicos chilenos.
//
// Modelo correcto de la técnica legislativa chilena (Constitución, códigos,
// leyes): la jerarquía es DEPENDIENTE, no continua.
//
//   Artículo
//     ├── (incisos del cuerpo del artículo, antes del primer numeral, si los hay)
//     │     contador local: 1°, 2°, 3°...
//     ├── Numeral 1°
//     │     ├── Inciso 1° (es el propio párrafo que abre el numeral)
//     │     ├── Inciso 2°
//     │     └── letras a), b), c)... cada una con sus propios incisos
//     ├── Numeral 2°
//     │     └── contador REINICIA: Inciso 1°, 2°, 3°...
//     └── Numeral 3°
//           └── contador REINICIA
//
// En la práctica jurisprudencial chilena, "Art. 19 N° 3 inciso quinto" se
// refiere al quinto párrafo CONTENIDO en el numeral 3 del artículo 19, NO al
// quinto párrafo acumulado del artículo completo.
//
// Una cita como "Art. 19 inciso 248" es jurídicamente incoherente: los incisos
// no tienen numeración continua a nivel de artículo cuando éste contiene
// numerales.

const ORDINALES = [
  '1°', '2°', '3°', '4°', '5°',
  '6°', '7°', '8°', '9°', '10°',
  '11°', '12°', '13°', '14°', '15°',
  '16°', '17°', '18°', '19°', '20°',
]

/** Etiqueta ordinal para el inciso `i` (0 → "1°"). */
export function etiquetaInciso(i: number): string {
  return ORDINALES[i] ?? `${i + 1}°`
}

// Cuando el extractor de PDF une el final de un numeral con el inicio del siguiente
// dentro del mismo párrafo (ej. "...descrita en ella; 4º.- El respeto..."), este
// regex localiza el corte. Requiere un terminador (";" o ".") seguido de espacio y
// luego un marcador inequívoco de numeral al estilo chileno (dígito + ° o º + .- o )).
const RE_NUMERAL_INTERNO = /(?<=[;.])\s+(?=\d{1,3}[°ºo][.\-)])/g

/** Divide el texto de un artículo en párrafos. Aplica también una limpieza
 * adicional cuando el PDF dejó pegados dos numerales en una misma línea. */
export function dividirIncisos(texto: string): string[] {
  if (!texto || !texto.trim()) return []
  return texto
    .split(/\n{2,}/)
    .flatMap((p) => p.split(RE_NUMERAL_INTERNO))
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

export type TipoParrafo = 'inciso' | 'numeral' | 'letra'

// Marcadores de NUMERAL típicos en códigos chilenos:
//   "1°", "1°.-", "1°)", "1.-", "1)", "(1)", "N° 3", "Nº 5"
const RE_NUMERAL =
  /^(?:N[°ºo]\s*)?\d{1,3}[°ºo](?:\s*[.\-)])?\s+|^\d{1,3}[.\-)]\s+|^[\(]\d{1,3}[\)]\s+/i

// Marcadores de LETRA: "a)", "a.-", "(a)", "A)"
const RE_LETRA = /^[\(]?[a-zñ][\)](?:\s*[.\-])?\s+|^[a-zñ][.\-]\s+/i

function extraerLabelNumeral(p: string): string {
  const m = p.match(/^(?:N[°ºo]\s*)?(\d{1,3})/i)
  return m ? `N° ${m[1]}` : '?'
}

function extraerLabelLetra(p: string): string {
  const m = p.match(/^[\(]?([a-zñ])/i)
  return m ? `letra ${m[1].toLowerCase()})` : '?'
}

export interface ParrafoAnalizado {
  texto: string
  tipo: TipoParrafo
  /** "N° 3" si el párrafo está dentro de un numeral; null si está al cuerpo del artículo. */
  contextoNumeral: string | null
  /** "letra b)" si el párrafo está dentro de una letra; null si no. */
  contextoLetra: string | null
  /** Posición del párrafo dentro de su contexto INMEDIATO (numeral, letra o artículo). 0-based.
   * El párrafo que abre un numeral o una letra recibe indiceInciso=0 (es el inciso primero
   * de su propio contexto). */
  indiceInciso: number
}

/**
 * Analiza el texto de un artículo y devuelve párrafos con su contexto y
 * numeración LOCAL de incisos. Reinicia el contador cuando entra a un nuevo
 * numeral o letra, conforme a la técnica legislativa chilena.
 */
export function analizarParrafos(texto: string): ParrafoAnalizado[] {
  const parrafos = dividirIncisos(texto)
  const resultado: ParrafoAnalizado[] = []
  let numeralActual: string | null = null
  let letraActual: string | null = null
  let contador = 0
  for (const p of parrafos) {
    if (RE_NUMERAL.test(p)) {
      numeralActual = extraerLabelNumeral(p)
      letraActual = null
      resultado.push({
        texto: p,
        tipo: 'numeral',
        contextoNumeral: numeralActual,
        contextoLetra: null,
        indiceInciso: 0,
      })
      contador = 1 // próximo párrafo de este numeral será inciso 2°
    } else if (RE_LETRA.test(p)) {
      letraActual = extraerLabelLetra(p)
      resultado.push({
        texto: p,
        tipo: 'letra',
        contextoNumeral: numeralActual,
        contextoLetra: letraActual,
        indiceInciso: 0,
      })
      contador = 1
    } else {
      resultado.push({
        texto: p,
        tipo: 'inciso',
        contextoNumeral: numeralActual,
        contextoLetra: letraActual,
        indiceInciso: contador,
      })
      contador++
    }
  }
  return resultado
}

/** Profundidad visual del párrafo (0 = cuerpo del artículo, 1 = numeral, 2 = letra). */
export function nivelIndentacion(p: ParrafoAnalizado): number {
  if (p.contextoLetra) return 2
  if (p.contextoNumeral) return 1
  return 0
}

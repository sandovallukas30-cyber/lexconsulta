// Utilidades para la presentación de artículos jurídicos chilenos.
//
// Modelo de la técnica legislativa:
//   Artículo
//     ├── Incisos       (cada párrafo separado por punto y aparte)
//     │     ├── Numerales (1°, 1., 1) — listas dentro de un inciso)
//     │     │     └── Letras (a), b), c) — sub-listas dentro de un numeral)
//
// Convenciones de cita:
//   "Art. 161 inciso 2°"
//   "Art. 161 inciso 2°, N° 3"
//   "Art. 19 N° 12 letra b)"

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

/** Divide el texto de un artículo en párrafos. */
export function dividirIncisos(texto: string): string[] {
  if (!texto || !texto.trim()) return []
  return texto.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0)
}

/** Tipos de párrafo dentro de un artículo. */
export type TipoParrafo = 'inciso' | 'numeral' | 'letra'

// Detecta si un párrafo empieza con un marcador de NUMERAL: "1°", "1.-", "1)", "N° 3", etc.
// Cubre las variaciones más comunes en los códigos chilenos.
const RE_NUMERAL =
  /^(?:N[°ºo]\s*)?\d{1,3}[°ºo](?:\s*[.\-)])?\s+|^\d{1,3}[.\-)]\s+|^[\(]\d{1,3}[\)]\s+/i

// Detecta si un párrafo empieza con un marcador de LETRA: "a)", "a.-", "(a)", "A)"
const RE_LETRA = /^[\(]?[a-zñ][\)](?:\s*[.\-])?\s+|^[a-zñ][.\-]\s+/i

export interface ParrafoAnalizado {
  texto: string
  tipo: TipoParrafo
  /** Solo presente si tipo === 'inciso'. Índice del inciso dentro del artículo (0-based). */
  indiceInciso?: number
}

/**
 * Analiza el texto de un artículo y devuelve un arreglo de párrafos clasificados.
 * Los numerales y letras NO incrementan el contador de incisos, porque jurídicamente
 * son sub-elementos del inciso al que pertenecen.
 *
 * Ejemplo:
 *   "Para los efectos de este Código, se entenderá:
 *
 *   1°.- Por 'Director', ...
 *   2°.- Por 'Dirección', ...
 *
 *   En los casos del numeral 2°, ..."
 *
 *   Genera:
 *   - { tipo: 'inciso', indiceInciso: 0, texto: 'Para los efectos...' }
 *   - { tipo: 'numeral', texto: '1°.- Por "Director", ...' }
 *   - { tipo: 'numeral', texto: '2°.- Por "Dirección", ...' }
 *   - { tipo: 'inciso', indiceInciso: 1, texto: 'En los casos del numeral 2°, ...' }
 */
export function analizarParrafos(texto: string): ParrafoAnalizado[] {
  const parrafos = dividirIncisos(texto)
  const resultado: ParrafoAnalizado[] = []
  let contadorInciso = 0
  for (const p of parrafos) {
    if (RE_NUMERAL.test(p)) {
      resultado.push({ texto: p, tipo: 'numeral' })
    } else if (RE_LETRA.test(p)) {
      resultado.push({ texto: p, tipo: 'letra' })
    } else {
      resultado.push({ texto: p, tipo: 'inciso', indiceInciso: contadorInciso })
      contadorInciso++
    }
  }
  return resultado
}

/** Cuenta cuántos incisos reales tiene un artículo (descartando numerales y letras). */
export function totalIncisos(texto: string): number {
  return analizarParrafos(texto).filter((p) => p.tipo === 'inciso').length
}

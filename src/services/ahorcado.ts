// "El Acusado" — ahorcado jurídico. Genera una palabra o expresión del vocabulario
// legal chileno para adivinar letra por letra, con Claude Haiku.

import { callMessages } from './aiClient'
import { AREA_DESCRIPCION, TIPOS_VALIDOS, normalizar } from './pasapalabra'
import type { AreaPractica, CodigoTipo } from '../types'

const MODELO = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 500
export const ERRORES_MAXIMOS = 6

function systemPrompt(area: AreaPractica, evitar: string[]): string {
  return `Eres Prima Lex, asistente jurídico chileno. Genera UNA palabra o expresión corta del vocabulario jurídico chileno para jugar "El Acusado" (ahorcado jurídico) con estudiantes de Derecho.

Área: ${AREA_DESCRIPCION[area]}.

Reglas estrictas:
1. La palabra o expresión debe tener entre 4 y 22 letras (sin contar espacios), 1 a 3 palabras. Solo derecho chileno, sin tecnicismos extranjeros.
2. Usa SOLO letras (incluida Ñ) y espacios. Nada de números, guiones, siglas con puntos ni símbolos.
3. La definición NO debe contener la palabra-respuesta ni sus declinaciones obvias. 1 frase, máximo 25 palabras, redacción pulida con artículos definidos.
4. Incluye "codigoOrigen" cuando sea posible: uno de con, tra, civ, pen, lab, tri, com, agu, san, min, pci, ppe, pad, mil, cot, acc, dro, kar. Y un "articulo" tipo "Art. 161".
5. No repitas ninguna de estas palabras ya usadas en esta sesión: ${evitar.length ? evitar.join(', ') : 'ninguna'}.
6. Devuelve ÚNICAMENTE un objeto JSON, sin texto adicional, sin markdown, sin backticks.

Esquema:
{
  "palabra": "formalizacion",
  "definicion": "Comunicación que el fiscal efectúa al imputado, en presencia del juez de garantía, de que se desarrolla una investigación en su contra por uno o más delitos determinados.",
  "codigoOrigen": "ppe",
  "articulo": "Art. 229"
}`
}

export interface PalabraAhorcado {
  palabra: string
  palabraVisible: string
  definicion: string
  codigoOrigen?: CodigoTipo
  articulo?: string
}

interface ObjetoCrudo {
  palabra?: string
  definicion?: string
  codigoOrigen?: string
  articulo?: string
}

function extraerJSONObjeto(texto: string): unknown {
  const limpio = texto
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  const start = limpio.indexOf('{')
  const end = limpio.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('La respuesta de la IA no contiene un objeto JSON válido')
  }
  return JSON.parse(limpio.slice(start, end + 1))
}

export async function generarPalabraAhorcado(
  area: AreaPractica,
  evitar: string[] = []
): Promise<PalabraAhorcado> {
  const res = await callMessages({
    model: MODELO,
    max_tokens: MAX_TOKENS,
    system: systemPrompt(area, evitar),
    messages: [
      {
        role: 'user',
        content: `Genera una palabra para el área: ${area}. Variación ${Math.floor(Math.random() * 9999)}: elige un término distinto a los más obvios.`,
      },
    ],
  })

  const texto = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')

  const crudo = extraerJSONObjeto(texto) as ObjetoCrudo
  if (!crudo.palabra || !crudo.definicion) {
    throw new Error('La IA no devolvió una palabra válida')
  }

  const palabraNormalizada = normalizar(crudo.palabra).toUpperCase()
  if (!/^[A-ZÑ ]+$/.test(palabraNormalizada)) {
    throw new Error('La palabra generada contiene caracteres no permitidos')
  }

  return {
    palabra: palabraNormalizada,
    palabraVisible: crudo.palabra,
    definicion: crudo.definicion,
    codigoOrigen: TIPOS_VALIDOS.includes(crudo.codigoOrigen as CodigoTipo)
      ? (crudo.codigoOrigen as CodigoTipo)
      : undefined,
    articulo: crudo.articulo,
  }
}

/** Letras únicas (sin espacios) que deben adivinarse para ganar la partida. */
export function letrasDeLaPalabra(palabra: string): string[] {
  return Array.from(new Set(palabra.replace(/[^A-ZÑ]/g, '').split('')))
}

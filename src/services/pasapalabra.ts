// Generación de roscos de Pasapalabra con vocabulario jurídico chileno.
// Usa Claude Haiku para generar 27 entradas (A-Z + Ñ) en pocos segundos.

import { callMessages } from './aiClient'
import type { AreaPractica, EntradaRosco, ModoLetra, CodigoTipo } from '../types'

const MODELO = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 3500

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

const AREA_DESCRIPCION: Record<AreaPractica, string> = {
  general: 'cualquier rama del derecho chileno (mezcla equilibrada)',
  civil: 'derecho civil chileno (contratos, familia, sucesiones, propiedad, obligaciones)',
  penal: 'derecho penal chileno (delitos, penas, procedimiento penal, leyes especiales como Ley 20.000)',
  laboral: 'derecho del trabajo chileno (Código del Trabajo, Ley 16.744, Ley 21.643 Karin)',
  procesal: 'derecho procesal chileno (Procedimiento Civil, Procesal Penal, Orgánico de Tribunales)',
  constitucional: 'derecho constitucional chileno (Constitución Política, derechos fundamentales)',
}

function systemPrompt(area: AreaPractica): string {
  return `Eres Prima Lex, asistente jurídico chileno. Tu tarea es generar un rosco de "Pasapalabra" para estudiantes de Derecho de Chile, con vocabulario auténticamente chileno.

Área del rosco: ${AREA_DESCRIPCION[area]}.

Debes generar exactamente 27 entradas, una por cada letra del alfabeto español (A B C D E F G H I J K L M N Ñ O P Q R S T U V W X Y Z), en ese orden estricto.

Para cada letra elige:
- Una palabra o expresión corta (1-2 palabras) del vocabulario jurídico chileno cuya inicial sea esa letra (modo "empieza"), O
- Una palabra cuyo cuerpo contenga esa letra de manera relevante (modo "contiene"), cuando no exista un término jurídico chileno que empiece por ella (típicamente K, Ñ, W, X, Y).

Reglas estrictas:
1. Sin tecnicismos extranjeros ni términos de otros sistemas (CC español, common law). Solo derecho chileno.
2. La definición NO debe contener la palabra-respuesta ni sus declinaciones obvias.
3. Cada definición: 1 frase, máximo 25 palabras. Clara, técnica, sin rodeos.
4. Cada entrada DEBE incluir el código u norma chilena de respaldo cuando sea posible: una de las siguientes siglas en "codigoOrigen": con, civ, pen, lab, tri, com, pci, ppe, cot, min, agu, san, mil, pad, acc, dro, kar. Y un "articulo" como "Art. 161" o "Art. 19 N° 3".
5. Si la palabra no se puede vincular a un artículo específico (concepto doctrinario general), omite codigoOrigen y articulo, pero sé conservador.
6. Para K, Ñ, W, X, Y usa "contiene" con palabras conocidas (ej. K → "Karin" si aplica al área laboral; Ñ → "compañía" o "señalamiento"; X → "exhorto" en procesal; Y → "ayuda" o "leyes"; W → "Warrant").
7. Devuelve ÚNICAMENTE un arreglo JSON, sin texto adicional, sin markdown, sin backticks.

Esquema de cada entrada:
{
  "letra": "A",
  "modo": "empieza" | "contiene",
  "palabra": "acoso",
  "definicion": "Toda conducta que constituye agresión u hostigamiento reiterado contra un trabajador o trabajadora.",
  "codigoOrigen": "lab",
  "articulo": "Art. 2"
}

Devuelve el arreglo JSON con las 27 entradas en orden A → Z (incluyendo Ñ entre N y O).`
}

const TIPOS_VALIDOS: CodigoTipo[] = [
  'con', 'tra', 'civ', 'pen', 'lab', 'tri', 'com', 'agu', 'san', 'min',
  'pci', 'ppe', 'pad', 'mil', 'cot', 'acc' as CodigoTipo, 'dro' as CodigoTipo, 'kar' as CodigoTipo,
]

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zñ ]/g, '')
    .trim()
}

function extraerJSON(texto: string): unknown {
  // La IA a veces envuelve en ```json ... ``` aunque le pidamos que no
  const limpio = texto
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  // Buscar primer '[' y último ']' por si quedó texto introductorio
  const start = limpio.indexOf('[')
  const end = limpio.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('La respuesta de la IA no contiene un arreglo JSON válido')
  }
  return JSON.parse(limpio.slice(start, end + 1))
}

interface EntradaCruda {
  letra?: string
  modo?: string
  palabra?: string
  definicion?: string
  codigoOrigen?: string
  articulo?: string
}

export async function generarRosco(area: AreaPractica): Promise<EntradaRosco[]> {
  const res = await callMessages({
    model: MODELO,
    max_tokens: MAX_TOKENS,
    system: systemPrompt(area),
    messages: [{ role: 'user', content: `Genera el rosco para el área: ${area}.` }],
  })

  const texto = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')

  const crudo = extraerJSON(texto) as unknown[]
  if (!Array.isArray(crudo)) throw new Error('La respuesta no es un arreglo')

  // Indexar por letra para garantizar que tengamos las 27 en orden
  const porLetra = new Map<string, EntradaCruda>()
  for (const e of crudo as EntradaCruda[]) {
    if (typeof e?.letra === 'string') {
      porLetra.set(e.letra.toUpperCase(), e)
    }
  }

  const rosco: EntradaRosco[] = []
  for (const letra of LETRAS) {
    const e = porLetra.get(letra)
    if (!e || !e.palabra || !e.definicion) {
      // Fallback genérico para que el rosco no quede incompleto
      rosco.push({
        letra,
        modo: 'contiene',
        palabra: 'pendiente',
        palabraVisible: '—',
        definicion: '(No se pudo generar una entrada para esta letra. Usa "Pasapalabra".)',
        estado: 'pendiente',
      })
      continue
    }
    const modo: ModoLetra = e.modo === 'contiene' ? 'contiene' : 'empieza'
    const palabraNormalizada = normalizar(e.palabra)
    rosco.push({
      letra,
      modo,
      palabra: palabraNormalizada,
      palabraVisible: e.palabra,
      definicion: e.definicion,
      codigoOrigen: TIPOS_VALIDOS.includes(e.codigoOrigen as CodigoTipo)
        ? (e.codigoOrigen as CodigoTipo)
        : undefined,
      articulo: e.articulo,
      estado: 'pendiente',
    })
  }
  return rosco
}

/** Compara la respuesta del usuario con la palabra correcta de forma indulgente. */
export function esRespuestaCorrecta(respuesta: string, esperada: string): boolean {
  const r = normalizar(respuesta)
  const e = normalizar(esperada)
  if (!r || !e) return false
  if (r === e) return true
  // Tolerancia: si el usuario escribe la palabra con un caracter de diferencia
  // (typo simple), la damos por buena solo si la palabra esperada es ≥ 5 letras.
  if (e.length >= 5 && distanciaLevenshtein(r, e) <= 1) return true
  return false
}

function distanciaLevenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const matriz: number[][] = []
  for (let i = 0; i <= b.length; i++) matriz[i] = [i]
  for (let j = 0; j <= a.length; j++) matriz[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) matriz[i][j] = matriz[i - 1][j - 1]
      else
        matriz[i][j] = Math.min(
          matriz[i - 1][j - 1] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j] + 1
        )
    }
  }
  return matriz[b.length][a.length]
}

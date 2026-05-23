import { callMessages } from './aiClient'
import type { ArticuloRelevante } from '../types'

const MODELO = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1000
const CACHE_KEY = 'prima-lex-canvas-cache-v1'

export interface ResultadoConcepto {
  concepto: string
  definicion: string
  articulos: ArticuloRelevante[]
  caso: string
}

interface EntradaCache {
  resultado: ResultadoConcepto
  fecha: string
}

type CacheCompleto = Record<string, EntradaCache>

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function obtenerCache(concepto: string): ResultadoConcepto | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw) as CacheCompleto
    return cache[normalizar(concepto)]?.resultado ?? null
  } catch {
    return null
  }
}

function guardarCache(concepto: string, resultado: ResultadoConcepto) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const cache: CacheCompleto = raw ? JSON.parse(raw) : {}
    cache[normalizar(concepto)] = { resultado, fecha: new Date().toISOString() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Si localStorage está lleno, ignorar silenciosamente
  }
}

function extraerJSON(texto: string): string {
  // Try direct
  const trimmed = texto.trim()
  if (trimmed.startsWith('{')) return trimmed
  // Strip ```json fences
  const fenced = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenced) return fenced[1].trim()
  // Find first { ... last }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1) return trimmed.slice(start, end + 1)
  return trimmed
}

const SYSTEM_PROMPT = `Eres un asistente educativo de derecho chileno. Genera contenido didáctico breve y preciso sobre conceptos jurídicos del ordenamiento chileno.

Reglas:
- Responde SOLO con un objeto JSON válido, sin texto extra, sin bloques de código markdown.
- Si el concepto no pertenece al derecho chileno, marca "definicion" como "Concepto fuera del ámbito del derecho chileno." y deja "articulos" como [] y "caso" vacío.
- Identifica el cuerpo legal MÁS PERTINENTE al concepto entre estos disponibles:
  - "Constitución Política" → derechos fundamentales, organización del Estado, garantías
  - "Código Civil" → contratos, familia, propiedad, sucesiones, obligaciones
  - "Código Penal" → delitos, penas, responsabilidad penal
  - "Código del Trabajo" → relación laboral, contratos de trabajo, sindicatos, despido
  - "Código Tributario" → impuestos, fiscalización, infracciones tributarias
  - "Código de Comercio" → actos de comercio, sociedades, contratos mercantiles
  - "Código de Procedimiento Civil" → procesos judiciales civiles
- Cita 3-5 artículos REALES del código pertinente (no inventes números).
- Si el concepto cruza varios códigos, puedes mezclar artículos de distintos códigos.
- En cada artículo indica de qué código es.
- Definición: 2 oraciones máximo, claras.
- Caso: 1 párrafo corto con ejemplo cotidiano que ilustre el concepto.

Estructura JSON:
{
  "definicion": "string",
  "articulos": [
    { "numero": "Art. N", "codigo": "Código del Trabajo", "relevancia": "breve explicación" }
  ],
  "caso": "string"
}`

export async function generarConcepto(concepto: string): Promise<ResultadoConcepto> {
  const cacheado = obtenerCache(concepto)
  if (cacheado) return cacheado

  const res = await callMessages({
    model: MODELO,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Concepto: "${concepto}"` }],
  })

  const texto = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('')

  const jsonStr = extraerJSON(texto)
  let parsed: Omit<ResultadoConcepto, 'concepto'>
  try {
    parsed = JSON.parse(jsonStr)
  } catch (e) {
    throw new Error('La IA devolvió una respuesta no parseable. Intenta de nuevo.')
  }

  const resultado: ResultadoConcepto = {
    concepto,
    definicion: parsed.definicion ?? '',
    articulos: Array.isArray(parsed.articulos) ? parsed.articulos : [],
    caso: parsed.caso ?? '',
  }

  guardarCache(concepto, resultado)
  return resultado
}

export function tieneCache(concepto: string): boolean {
  return obtenerCache(concepto) !== null
}

export async function generarRelacion(a: string, b: string): Promise<string> {
  const res = await callMessages({
    model: MODELO,
    max_tokens: 60,
    messages: [
      {
        role: 'user',
        content: `En derecho chileno, ¿cómo se relacionan estos dos conceptos: "${a}" y "${b}"?

Responde con UNA frase MUY corta (máximo 4 palabras) que describa la relación. Ejemplos:
- "complementa"
- "modifica"
- "es excepción de"
- "se aplica junto a"
- "contradice"

Solo la frase, sin comillas ni explicación adicional.`,
      },
    ],
  })
  const texto = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('')
  return texto.trim().replace(/^["']|["']$/g, '').replace(/\.$/, '').slice(0, 60)
}

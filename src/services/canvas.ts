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

// ============ PROFUNDIZAR NODO ============

export type ModoProfundizacion = 'detalle' | 'distinciones' | 'ejemplos' | 'articulos'

export interface ParametrosProfundizar {
  tipoNodo: 'definicion' | 'articulos' | 'caso' | 'libre' | 'concepto'
  titulo: string
  contenidoActual: string
  articulosActuales?: ArticuloRelevante[]
  modo: ModoProfundizacion
}

export interface ResultadoProfundizar {
  contenidoNuevo: string // texto a APPENDEAR (no reemplaza el existente)
  articulosNuevos?: ArticuloRelevante[] // solo si modo === 'articulos'
  etiquetaSeccion: string // título corto para separar visualmente, ej. "Casos prácticos"
}

const ETIQUETA_MODO: Record<ModoProfundizacion, string> = {
  detalle: 'Más detalle',
  distinciones: 'Distinciones doctrinales',
  ejemplos: 'Casos prácticos',
  articulos: 'Más artículos',
}

function instruccionParaModo(modo: ModoProfundizacion, tipoNodo: ParametrosProfundizar['tipoNodo']): string {
  switch (modo) {
    case 'detalle':
      return 'Agrega información ADICIONAL y más profunda sobre el concepto, sin repetir lo ya dicho. Por ejemplo: origen histórico, fundamento doctrinal, evolución legislativa o teorías chilenas relevantes. 2-4 oraciones, claras y técnicas.'
    case 'distinciones':
      return 'Compara este concepto con figuras jurídicas similares de fácil confusión. Indica qué los une y, sobre todo, qué los diferencia. 2-4 oraciones, formato "a diferencia de X, este concepto Y".'
    case 'ejemplos':
      return 'Aporta uno o dos casos prácticos breves, distintos de cualquier ejemplo previo, que ilustren cómo opera el concepto en una situación cotidiana chilena. 2-4 oraciones por caso.'
    case 'articulos':
      if (tipoNodo === 'articulos') {
        return 'Identifica artículos ADICIONALES de leyes especiales o de otros códigos chilenos que complementen los ya listados. Devuelve nuevos artículos en el campo "articulosNuevos" del JSON, además de una explicación breve en "contenidoNuevo" sobre cómo amplían el cuadro.'
      }
      return 'Identifica artículos de la legislación chilena (códigos o leyes especiales) que regulen aspectos relacionados con el concepto y que aún no estén citados. Devuelve esos artículos en "articulosNuevos" además de explicar brevemente la conexión en "contenidoNuevo".'
  }
}

export async function profundizarNodo(p: ParametrosProfundizar): Promise<ResultadoProfundizar> {
  const articulosTexto = p.articulosActuales && p.articulosActuales.length > 0
    ? p.articulosActuales.map((a) => `- ${a.numero}${a.codigo ? ` (${a.codigo})` : ''}`).join('\n')
    : '(ninguno aún)'

  const system = `Eres un asistente educativo de derecho chileno. Se te pedirá profundizar un nodo de un mapa conceptual jurídico. Devuelve estrictamente un objeto JSON sin texto extra ni markdown.

Esquema:
{
  "contenidoNuevo": "string (texto a APPENDEAR al nodo, no debe repetir lo ya dicho)",
  "articulosNuevos": [
    { "numero": "Art. N", "codigo": "Código del Trabajo", "relevancia": "breve explicación" }
  ]
}

- Solo derecho chileno (Constitución, códigos chilenos, leyes especiales chilenas).
- No inventes artículos: usa números reales del cuerpo legal mencionado.
- Si no aplica añadir artículos para este modo, devuelve "articulosNuevos": [].
- Usa los artículos definidos del castellano (el, la, los, las).
- Mantén tono académico chileno, sin frases telegráficas.`

  const userContent = `Concepto / título del nodo: "${p.titulo}"
Tipo del nodo: ${p.tipoNodo}
Modo de profundización solicitado: ${p.modo}

Contenido actual del nodo (NO debes repetirlo):
"""
${p.contenidoActual}
"""

Artículos ya citados en el nodo:
${articulosTexto}

Tarea: ${instruccionParaModo(p.modo, p.tipoNodo)}`

  const res = await callMessages({
    model: MODELO,
    max_tokens: 800,
    system,
    messages: [{ role: 'user', content: userContent }],
  })

  const texto = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('')

  const jsonStr = extraerJSON(texto)
  let parsed: { contenidoNuevo?: string; articulosNuevos?: ArticuloRelevante[] }
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error('La IA devolvió una respuesta no parseable al profundizar. Intenta de nuevo.')
  }

  return {
    contenidoNuevo: (parsed.contenidoNuevo ?? '').trim(),
    articulosNuevos: Array.isArray(parsed.articulosNuevos) ? parsed.articulosNuevos : undefined,
    etiquetaSeccion: ETIQUETA_MODO[p.modo],
  }
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

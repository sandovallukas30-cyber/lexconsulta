// Vercel Function: proxy seguro a la API de Anthropic.
// La API key vive como env var del servidor (ANTHROPIC_API_KEY, sin prefijo VITE_).
// Nunca llega al navegador del usuario.
//
// Incluye rate limiting in-memory por IP + límite global de gasto.
// Para un proyecto académico de bajo tráfico es suficiente. Si en el futuro
// necesitas garantías más fuertes (múltiples instancias de Vercel comparten
// estado), migrar a Vercel KV o Upstash Redis.

import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-5',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
])

// ============ Rate limiting ============

const VENTANA_MS = 60 * 60 * 1000 // 1 hora
const LIMITE_POR_IP = 25 // requests por IP por hora
const LIMITE_GLOBAL = 250 // requests totales por hora (techo de gasto)
const MAX_CHARS_INPUT = 60_000 // tamaño máximo del prompt (sistema + mensajes)

// Map<clave, [timestamp, ...]>. Cada timestamp = 1 request reciente.
const registro = new Map<string, number[]>()

function podarYContar(clave: string, ahora: number): number {
  const lista = registro.get(clave) ?? []
  const vigentes = lista.filter((t) => ahora - t < VENTANA_MS)
  registro.set(clave, vigentes)
  return vigentes.length
}

function registrarHit(clave: string, ahora: number): void {
  const lista = registro.get(clave) ?? []
  lista.push(ahora)
  registro.set(clave, lista)
}

function obtenerIp(req: VercelRequest): string {
  // Vercel pone la IP real en x-forwarded-for (puede venir lista separada por coma).
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim()
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].trim()
  }
  return req.headers['x-real-ip']?.toString() ?? 'desconocida'
}

function calcularRetryAfter(clave: string, ahora: number, limite: number): number {
  const lista = registro.get(clave) ?? []
  if (lista.length < limite) return 60
  // El hueco se abre cuando expira el request más antiguo dentro de la ventana.
  const indice = lista.length - limite
  const masAntiguo = lista[indice]
  const restante = VENTANA_MS - (ahora - masAntiguo)
  return Math.max(60, Math.ceil(restante / 1000))
}

function tamanoInput(system: unknown, messages: unknown[]): number {
  let n = typeof system === 'string' ? system.length : 0
  for (const m of messages) {
    if (m && typeof m === 'object' && 'content' in m) {
      const c = (m as { content: unknown }).content
      if (typeof c === 'string') n += c.length
      else if (Array.isArray(c)) {
        for (const bloque of c) {
          if (bloque && typeof bloque === 'object' && 'text' in bloque) {
            const t = (bloque as { text: unknown }).text
            if (typeof t === 'string') n += t.length
          }
        }
      }
    }
  }
  return n
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY en el servidor' })
  }

  // ----- Rate limit -----
  const ahora = Date.now()
  const ip = obtenerIp(req)

  const usoIp = podarYContar(`ip:${ip}`, ahora)
  const usoGlobal = podarYContar('global', ahora)

  if (usoIp >= LIMITE_POR_IP) {
    const retry = calcularRetryAfter(`ip:${ip}`, ahora, LIMITE_POR_IP)
    res.setHeader('Retry-After', String(retry))
    res.setHeader('X-RateLimit-Limit', String(LIMITE_POR_IP))
    res.setHeader('X-RateLimit-Remaining', '0')
    return res.status(429).json({
      error: 'Demasiadas consultas',
      detalle: `Has alcanzado el límite de ${LIMITE_POR_IP} consultas por hora desde tu conexión. Intenta nuevamente en ~${Math.ceil(retry / 60)} minutos.`,
      retryAfterSeconds: retry,
    })
  }

  if (usoGlobal >= LIMITE_GLOBAL) {
    const retry = calcularRetryAfter('global', ahora, LIMITE_GLOBAL)
    res.setHeader('Retry-After', String(retry))
    return res.status(503).json({
      error: 'Servicio saturado',
      detalle: 'Prima Lex está recibiendo más consultas de las que su cuota actual permite. Intenta nuevamente en unos minutos.',
      retryAfterSeconds: retry,
    })
  }

  const { model, max_tokens, system, messages } = req.body ?? {}

  // ----- Validación de payload -----
  if (typeof model !== 'string' || !ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ error: 'Modelo no permitido' })
  }
  if (typeof max_tokens !== 'number' || max_tokens < 1 || max_tokens > 4000) {
    return res.status(400).json({ error: 'max_tokens inválido' })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages requerido' })
  }

  const chars = tamanoInput(system, messages)
  if (chars > MAX_CHARS_INPUT) {
    return res.status(413).json({
      error: 'Consulta demasiado grande',
      detalle: `El tamaño del prompt (${chars} caracteres) excede el máximo permitido (${MAX_CHARS_INPUT}).`,
    })
  }

  // ----- Registrar el hit ANTES de llamar al upstream para evitar carrera -----
  registrarHit(`ip:${ip}`, ahora)
  registrarHit('global', ahora)

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        system,
        messages,
      }),
    })

    const data = await r.json()
    res.setHeader('X-RateLimit-Limit', String(LIMITE_POR_IP))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, LIMITE_POR_IP - usoIp - 1)))
    return res.status(r.status).json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return res.status(502).json({ error: 'Upstream error', detalle: msg })
  }
}

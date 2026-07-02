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

const VENTANA_MS = 24 * 60 * 60 * 1000 // 24 horas (1 día)
const LIMITE_SIN_REGISTRO = 3 // 3 consultas/día para usuarios sin registrar
const LIMITE_CON_REGISTRO = 10 // 10 consultas/día para usuarios registrados
const LIMITE_POR_IP_MAXIMA = 50 // protección contra abuso por IP (fallback)
const LIMITE_GLOBAL = 500 // requests totales por día (techo de gasto)
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

function revertirHit(clave: string, ahora: number): void {
  const lista = registro.get(clave) ?? []
  const indice = lista.lastIndexOf(ahora)
  if (indice !== -1) lista.splice(indice, 1)
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

function obtenerUsuarioEmail(payload: unknown): string | null {
  // Intenta extraer usuarioEmail del cuerpo del request
  if (payload && typeof payload === 'object' && 'usuarioEmail' in payload) {
    const email = (payload as { usuarioEmail?: unknown }).usuarioEmail
    if (typeof email === 'string' && email.length > 0) {
      return email.toLowerCase().trim()
    }
  }
  return null
}

function obtenerLimite(usuarioEmail: string | null): number {
  return usuarioEmail ? LIMITE_CON_REGISTRO : LIMITE_SIN_REGISTRO
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

  const { model, max_tokens, system, messages, usuarioEmail } = req.body ?? {}

  // ----- Rate limit diferenciado por usuario -----
  const ahora = Date.now()
  const ip = obtenerIp(req)
  const email = obtenerUsuarioEmail({ usuarioEmail })
  const limiteUsuario = obtenerLimite(email)

  // Clave para usuario registrado o IP (si no registrado)
  const claveUsuario = email ? `user:${email}` : `ip:${ip}`

  const usoUsuario = podarYContar(claveUsuario, ahora)
  const usoGlobal = podarYContar('global', ahora)
  const usoIpMaxima = podarYContar(`ip:${ip}`, ahora)

  // Validar límite POR USUARIO
  if (usoUsuario >= limiteUsuario) {
    const retry = calcularRetryAfter(claveUsuario, ahora, limiteUsuario)
    const tipoUsuario = email ? 'registrado' : 'sin registrar'
    const tiempoRestablecimiento = Math.ceil(retry / 3600) // horas
    res.setHeader('Retry-After', String(retry))
    res.setHeader('X-RateLimit-Limit', String(limiteUsuario))
    res.setHeader('X-RateLimit-Remaining', '0')
    res.setHeader('X-RateLimit-Type', tipoUsuario)
    return res.status(429).json({
      error: 'Límite de consultas alcanzado',
      detalle: `Has alcanzado el límite de ${limiteUsuario} consultas por día (usuario ${tipoUsuario}). Intenta nuevamente en ~${tiempoRestablecimiento} hora(s).`,
      retryAfterSeconds: retry,
      tipoUsuario,
      limiteActual: limiteUsuario,
    })
  }

  // Protección: no permitir abuso masivo desde una IP
  if (usoIpMaxima >= LIMITE_POR_IP_MAXIMA) {
    const retry = calcularRetryAfter(`ip:${ip}`, ahora, LIMITE_POR_IP_MAXIMA)
    res.setHeader('Retry-After', String(retry))
    return res.status(429).json({
      error: 'Demasiadas consultas desde tu conexión',
      detalle: `Tu conexión ha alcanzado el límite máximo de ${LIMITE_POR_IP_MAXIMA} consultas. Intenta nuevamente en unos minutos.`,
      retryAfterSeconds: retry,
    })
  }

  // Validar límite GLOBAL (techo de gasto)
  if (usoGlobal >= LIMITE_GLOBAL) {
    const retry = calcularRetryAfter('global', ahora, LIMITE_GLOBAL)
    res.setHeader('Retry-After', String(retry))
    return res.status(503).json({
      error: 'Servicio saturado',
      detalle: 'Prima Lex está recibiendo más consultas de las que su cuota diaria permite. Intenta nuevamente en unos minutos.',
      retryAfterSeconds: retry,
    })
  }

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
  registrarHit(claveUsuario, ahora)
  registrarHit('global', ahora)
  registrarHit(`ip:${ip}`, ahora)

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

    if (!r.ok) {
      // El fallo es del upstream (Anthropic), no un uso legítimo: no se cobra cuota al usuario.
      revertirHit(claveUsuario, ahora)
      revertirHit('global', ahora)
      revertirHit(`ip:${ip}`, ahora)
      res.setHeader('X-RateLimit-Limit', String(limiteUsuario))
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limiteUsuario - usoUsuario)))
      res.setHeader('X-RateLimit-Type', email ? 'registered' : 'anonymous')
      return res.status(r.status).json(data)
    }

    res.setHeader('X-RateLimit-Limit', String(limiteUsuario))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limiteUsuario - usoUsuario - 1)))
    res.setHeader('X-RateLimit-Type', email ? 'registered' : 'anonymous')
    res.setHeader('X-RateLimit-Reset', String(new Date(ahora + VENTANA_MS).toISOString()))
    return res.status(r.status).json(data)
  } catch (e) {
    revertirHit(claveUsuario, ahora)
    revertirHit('global', ahora)
    revertirHit(`ip:${ip}`, ahora)
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return res.status(502).json({ error: 'Upstream error', detalle: msg })
  }
}

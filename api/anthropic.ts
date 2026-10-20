// Vercel Function: proxy seguro a la API de Anthropic.
// La API key vive como env var del servidor (ANTHROPIC_API_KEY, sin prefijo VITE_).
// Nunca llega al navegador del usuario.
//
// Incluye rate limiting in-memory por IP + límite global de gasto.
// Para un proyecto académico de bajo tráfico es suficiente. Si en el futuro
// necesitas garantías más fuertes (múltiples instancias de Vercel comparten
// estado), migrar a Vercel KV o Upstash Redis.

import type { VercelRequest, VercelResponse } from '@vercel/node'

// Solo Haiku: los únicos usos de IA que quedan (Pasapalabra y Ahorcado) generan
// palabras y definiciones, y Haiku alcanza y es el modelo más barato.
const ALLOWED_MODELS = new Set(['claude-haiku-4-5-20251001'])

// ============ Rate limiting ============

const VENTANA_MS = 24 * 60 * 60 * 1000 // 24 horas (1 día)
// Topes por día. Cada partida de Pasapalabra o Ahorcado = 1 request a Haiku
// (centavos de dólar): el techo global acota el gasto máximo diario.
// El conteo vive en memoria de cada instancia de Vercel, así que es una red de
// seguridad aproximada, no una cuota exacta.
const LIMITE_SIN_REGISTRO = 10 // partidas/día sin verificar email
const LIMITE_CON_REGISTRO = 30 // partidas/día con email verificado
const LIMITE_POR_IP_MAXIMA = 60 // protección contra abuso por IP (fallback)
const LIMITE_GLOBAL = 400 // requests totales por día (techo de gasto)
// Tamaño máximo del prompt (sistema + mensajes) y de la respuesta. Los juegos usan
// ~5.000 caracteres y 3.500 tokens como mucho: más margen solo serviría para que
// alguien use este proxy como un Haiku gratis de propósito general.
const MAX_CHARS_INPUT = 12_000
const MAX_TOKENS_SALIDA = 3600

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

// Quién es el usuario NO se lee del cuerpo del request (cualquiera puede escribir ahí el correo que quiera
// y obtener el cupo de «verificado» o un cupo propio por cada correo inventado). Solo cuenta un correo
// confirmado por Supabase, validando el token de sesión que manda la app en `Authorization: Bearer`.
const CACHE_TOKEN_MS = 5 * 60 * 1000
const cacheTokens = new Map<string, { email: string | null; exp: number }>()

async function obtenerEmailVerificado(req: VercelRequest): Promise<string | null> {
  const cab = req.headers.authorization
  const token = typeof cab === 'string' && cab.startsWith('Bearer ') ? cab.slice(7).trim() : ''
  if (token.length < 20 || token.length > 4000) return null

  const ahora = Date.now()
  const guardado = cacheTokens.get(token)
  if (guardado && guardado.exp > ahora) return guardado.email

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) return null

  let email: string | null = null
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: anon, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    })
    if (r.ok) {
      const u = (await r.json()) as { email?: string; email_confirmed_at?: string | null; confirmed_at?: string | null }
      if (u.email && (u.email_confirmed_at || u.confirmed_at)) email = u.email.toLowerCase().trim()
    }
  } catch {
    email = null // sin respuesta de Supabase: se trata como no verificado (cupo menor), nunca como verificado
  }
  if (cacheTokens.size > 500) cacheTokens.clear()
  cacheTokens.set(token, { email, exp: ahora + CACHE_TOKEN_MS })
  return email
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

  const { model, max_tokens, system, messages } = req.body ?? {}

  // ----- Rate limit diferenciado por usuario -----
  const ahora = Date.now()
  const ip = obtenerIp(req)
  const email = await obtenerEmailVerificado(req)
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
  if (typeof max_tokens !== 'number' || max_tokens < 1 || max_tokens > MAX_TOKENS_SALIDA) {
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

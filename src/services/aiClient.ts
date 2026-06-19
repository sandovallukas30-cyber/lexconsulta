// Cliente unificado de IA. Decide entre llamada directa al SDK (dev) y proxy seguro (prod).
//
// En desarrollo local (`npm run dev`):
//   - Usa el SDK de Anthropic con VITE_ANTHROPIC_API_KEY del .env (la key queda en el bundle de dev)
//   - Permite iterar rápido sin levantar `vercel dev`
//
// En producción (build de Vercel):
//   - Hace fetch a /api/anthropic (Vercel Function)
//   - La key vive en el servidor como ANTHROPIC_API_KEY (sin prefijo VITE_, nunca llega al cliente)
//
// Todos los servicios (anthropic.ts, canvas.ts, situacion.ts) llaman a callMessages().

import Anthropic from '@anthropic-ai/sdk'

export interface MensajeMessages {
  role: 'user' | 'assistant'
  content: string
}

export interface PayloadMessages {
  model: string
  max_tokens: number
  system?: string
  messages: MensajeMessages[]
}

export interface RespuestaMessages {
  content: Array<{ type: string; text?: string; [k: string]: unknown }>
  [k: string]: unknown
}

let clienteDev: Anthropic | null = null

function getClienteDev(): Anthropic {
  if (clienteDev) return clienteDev
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'Falta VITE_ANTHROPIC_API_KEY en .env (solo necesaria en desarrollo local).'
    )
  }
  clienteDev = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  return clienteDev
}

export async function callMessages(
  payload: PayloadMessages,
  usuarioEmail?: string | null,
  onConsultasRestantes?: (n: number) => void,
): Promise<RespuestaMessages> {
  if (import.meta.env.PROD) {
    // Producción: proxy seguro
    const payloadConUsuario = usuarioEmail ? { ...payload, usuarioEmail } : payload
    const r = await fetch('/api/anthropic', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payloadConUsuario),
    })

    // Leer contador de consultas restantes del header
    const remaining = r.headers.get('X-RateLimit-Remaining')
    if (remaining !== null && onConsultasRestantes) {
      onConsultasRestantes(parseInt(remaining, 10))
    }

    if (!r.ok) {
      const body = await r.text().catch(() => '')
      let detalle = body.slice(0, 300)
      try {
        const parsed = JSON.parse(body) as { error?: string; detalle?: string }
        if (parsed.detalle) detalle = parsed.detalle
        else if (parsed.error) detalle = parsed.error
      } catch {
        // body no es JSON, usar texto plano
      }
      if (r.status === 429) {
        throw new Error(detalle || 'Demasiadas consultas en poco tiempo. Espera unos minutos antes de volver a preguntar.')
      }
      if (r.status === 503) {
        throw new Error(detalle || 'El servicio está saturado. Intenta nuevamente en unos minutos.')
      }
      if (r.status === 413) {
        throw new Error(detalle || 'La consulta es demasiado larga. Intenta acortarla.')
      }
      throw new Error(`Error del servidor (${r.status}): ${detalle}`)
    }
    const data = (await r.json()) as RespuestaMessages & { error?: string }
    if (data.error) throw new Error(data.error)
    return data
  }

  // Desarrollo: SDK directo
  const res = await getClienteDev().messages.create(payload)
  return res as unknown as RespuestaMessages
}

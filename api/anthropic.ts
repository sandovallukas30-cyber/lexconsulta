// Vercel Function: proxy seguro a la API de Anthropic.
// La API key vive como env var del servidor (ANTHROPIC_API_KEY, sin prefijo VITE_).
// Nunca llega al navegador del usuario.

import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-5',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY en el servidor' })
  }

  const { model, max_tokens, system, messages } = req.body ?? {}

  // Validación mínima
  if (typeof model !== 'string' || !ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ error: 'Modelo no permitido' })
  }
  if (typeof max_tokens !== 'number' || max_tokens < 1 || max_tokens > 4000) {
    return res.status(400).json({ error: 'max_tokens inválido' })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages requerido' })
  }

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
    return res.status(r.status).json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return res.status(502).json({ error: 'Upstream error', detalle: msg })
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

function getTokenSecret(): string {
  const secret = process.env.TOKEN_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TOKEN_SECRET no está configurado en producción')
  }
  return 'dev-secret-local'
}

// Tokens ya usados (best-effort: en memoria, no persiste entre instancias serverless,
// pero cierra la ventana de reuso dentro de la misma instancia mientras el token es válido).
const tokensUsados = new Map<string, number>()

function podarTokensUsados(ahora: number): void {
  for (const [sig, exp] of tokensUsados) {
    if (ahora > exp) tokensUsados.delete(sig)
  }
}

function verificarToken(token: string): { email: string } | null {
  const secret = getTokenSecret() // deja propagar si falta config en producción

  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null

    const sigEsperada = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sigEsperada))) return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { email: string; exp: number }
    const ahora = Date.now()
    if (ahora > data.exp) return null

    podarTokensUsados(ahora)
    if (tokensUsados.has(sig)) return null
    tokensUsados.set(sig, data.exp)

    return { email: data.email }
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const token = req.body?.token

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token requerido' })
  }

  let resultado: { email: string } | null
  try {
    resultado = verificarToken(token)
  } catch (e) {
    console.error('verify-email: fallo de configuración', e)
    return res.status(500).json({ error: 'Servicio de verificación no disponible' })
  }

  if (!resultado) {
    return res.status(400).json({ error: 'Token inválido o expirado. Solicita uno nuevo.' })
  }

  return res.status(200).json({
    success: true,
    message: 'Email verificado exitosamente',
    email: resultado.email,
    verified: true,
  })
}

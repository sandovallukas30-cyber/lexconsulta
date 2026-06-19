import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

function verificarToken(token: string): { email: string } | null {
  try {
    const secret = process.env.TOKEN_SECRET ?? 'dev-secret-local'
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null

    const sigEsperada = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sigEsperada))) return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { email: string; exp: number }
    if (Date.now() > data.exp) return null

    return { email: data.email }
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = (req.query.token as string) || req.body?.token

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token requerido' })
  }

  const resultado = verificarToken(token)

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

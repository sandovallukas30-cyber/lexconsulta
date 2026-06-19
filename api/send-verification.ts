// Vercel Function: Enviar link de verificación de email
// Genera un token único y lo almacena en memoria con expiración

import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

const EXPIRACION_TOKEN = 10 * 60 * 1000 // 10 minutos
const almacenTokens = new Map<string, { email: string; createdAt: number }>()

// Limpiar tokens expirados cada 5 minutos
setInterval(() => {
  const ahora = Date.now()
  for (const [token, data] of almacenTokens.entries()) {
    if (ahora - data.createdAt > EXPIRACION_TOKEN) {
      almacenTokens.delete(token)
    }
  }
}, 5 * 60 * 1000)

function generarToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function validarEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body ?? {}

  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email requerido' })
  }

  const emailLimpio = email.toLowerCase().trim()
  if (!validarEmail(emailLimpio)) {
    return res.status(400).json({ error: 'Email inválido' })
  }

  // Generar token
  const token = generarToken()
  almacenTokens.set(token, { email: emailLimpio, createdAt: Date.now() })

  // En desarrollo: retornar el token para simular el email
  // En producción: enviar por email (SendGrid, Resend, etc.)
  const verificationLink = `${
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'
  }/verify?token=${token}`

  return res.status(200).json({
    success: true,
    message: 'Email de verificación enviado',
    email: emailLimpio,
    // En desarrollo, exponemos el link. En producción, NO se expone
    ...(process.env.NODE_ENV !== 'production' && { verificationLink }),
  })
}

export { almacenTokens, generarToken }

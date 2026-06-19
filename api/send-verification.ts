// Vercel Function: Enviar link de verificación de email
// Genera un token único y lo almacena en memoria con expiración
// Envía email con Resend (o simula en desarrollo)

import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { Resend } from 'resend'

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

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'
  const verificationLink = `${baseUrl}/verify?token=${token}`

  // En desarrollo: no enviar email, solo retornar el link para testing
  if (process.env.NODE_ENV !== 'production') {
    return res.status(200).json({
      success: true,
      message: 'Email de verificación (simulado en desarrollo)',
      email: emailLimpio,
      verificationLink,
    })
  }

  // En producción: enviar email con Resend
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: 'Prima Lex <onboarding@resend.dev>',
      to: emailLimpio,
      subject: 'Verifica tu email - Prima Lex',
      html: `
        <h2>Verifica tu email</h2>
        <p>Haz clic en el siguiente link para completar tu registro en Prima Lex:</p>
        <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Verificar email
        </a>
        <p>O copia este link en tu navegador:</p>
        <p style="word-break: break-all; font-family: monospace; font-size: 12px; background-color: #f3f4f6; padding: 12px; border-radius: 4px;">
          ${verificationLink}
        </p>
        <p style="color: #6b7280; font-size: 12px;">Este link expira en 10 minutos.</p>
      `,
    })

    if (result.error) {
      return res.status(500).json({ error: 'Error al enviar email' })
    }

    return res.status(200).json({
      success: true,
      message: 'Email de verificación enviado',
      email: emailLimpio,
    })
  } catch (error) {
    console.error('Error enviando email con Resend:', error)
    return res.status(500).json({ error: 'Error al enviar email' })
  }
}

export { almacenTokens, generarToken }

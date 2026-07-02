import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { Resend } from 'resend'

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ============ Rate limiting (previene email bombing / agotar cuota de Resend) ============

const VENTANA_MS = 60 * 60 * 1000 // 1 hora
const LIMITE_POR_IP = 5
const LIMITE_POR_EMAIL = 3

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
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim()
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].trim()
  }
  return req.headers['x-real-ip']?.toString() ?? 'desconocida'
}

function getTokenSecret(): string {
  const secret = process.env.TOKEN_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TOKEN_SECRET no está configurado en producción')
  }
  return 'dev-secret-local'
}

function generarToken(email: string): string {
  const secret = getTokenSecret()
  const exp = Date.now() + 10 * 60 * 1000 // 10 minutos
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
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

  const ahora = Date.now()
  const ip = obtenerIp(req)
  const usoIp = podarYContar(`ip:${ip}`, ahora)
  const usoEmail = podarYContar(`email:${emailLimpio}`, ahora)

  if (usoIp >= LIMITE_POR_IP || usoEmail >= LIMITE_POR_EMAIL) {
    res.setHeader('Retry-After', '3600')
    return res.status(429).json({
      error: 'Demasiadas solicitudes. Intenta nuevamente en una hora.',
    })
  }

  registrarHit(`ip:${ip}`, ahora)
  registrarHit(`email:${emailLimpio}`, ahora)

  let token: string
  try {
    token = generarToken(emailLimpio)
  } catch {
    return res.status(500).json({ error: 'Servicio de verificación no disponible' })
  }
  const baseUrl = process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const verificationLink = `${baseUrl}/verify/${token}`

  if (process.env.NODE_ENV !== 'production') {
    return res.status(200).json({
      success: true,
      message: 'Email de verificación (simulado en desarrollo)',
      email: emailLimpio,
      verificationLink,
    })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: 'Prima Lex <onboarding@resend.dev>',
      to: emailLimpio,
      subject: 'Verifica tu email - Prima Lex',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #111;">Verifica tu email</h2>
          <p style="color: #555;">Haz clic en el botón para completar tu registro en Prima Lex y acceder a 10 consultas por día:</p>
          <a href="${verificationLink}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Verificar email
          </a>
          <p style="color: #888; font-size: 13px;">O copia este link en tu navegador:</p>
          <p style="word-break: break-all; font-family: monospace; font-size: 12px; background-color: #f3f4f6; padding: 12px; border-radius: 4px; color: #333;">
            ${verificationLink}
          </p>
          <p style="color: #aaa; font-size: 12px;">Este link expira en 10 minutos. Si no solicitaste esto, ignora este email.</p>
        </div>
      `,
    })

    if (result.error) {
      return res.status(500).json({ error: 'Error al enviar email' })
    }

    return res.status(200).json({ success: true, message: 'Email de verificación enviado', email: emailLimpio })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return res.status(500).json({ error: 'Error al enviar email' })
  }
}

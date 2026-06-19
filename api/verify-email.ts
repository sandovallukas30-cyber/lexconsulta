// Vercel Function: Verificar email y completar registro

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { almacenTokens } from './send-verification'

const EXPIRACION_TOKEN = 10 * 60 * 1000 // 10 minutos
const emailsVerificados = new Set<string>()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Aceptar token de query (GET) o body (POST)
  const token = (req.query.token as string) || req.body?.token

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token requerido' })
  }

  // Validar que el token existe
  const tokenData = almacenTokens.get(token)
  if (!tokenData) {
    return res.status(400).json({ error: 'Token inválido o expirado' })
  }

  // Validar que no expiró
  const ahora = Date.now()
  if (ahora - tokenData.createdAt > EXPIRACION_TOKEN) {
    almacenTokens.delete(token)
    return res.status(400).json({ error: 'Token expirado. Solicita uno nuevo.' })
  }

  // Marcar email como verificado
  const { email } = tokenData
  emailsVerificados.add(email)
  almacenTokens.delete(token)

  return res.status(200).json({
    success: true,
    message: 'Email verificado exitosamente',
    email,
    verified: true,
  })
}

export { emailsVerificados }

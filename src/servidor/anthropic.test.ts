import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// El cupo diario no debe depender de un correo declarado en el cuerpo del request.
function respuesta() {
  const r = { status: 0, cuerpo: undefined as unknown, headers: {} as Record<string, string> }
  const res = {
    setHeader: (k: string, v: string) => { r.headers[k] = v },
    status(c: number) { r.status = c; return this },
    json(b: unknown) { r.cuerpo = b; return this },
  } as unknown as VercelResponse
  return { r, res }
}
function pedido(ip: string, body: object, auth?: string): VercelRequest {
  return { method: 'POST', body, headers: { 'x-forwarded-for': ip, ...(auth ? { authorization: auth } : {}) } } as unknown as VercelRequest
}
const cuerpoBase = { model: 'claude-haiku-4-5-20251001', max_tokens: 100, messages: [{ role: 'user', content: 'hola' }] }

describe('api/anthropic: identidad del usuario', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = 'x'
    delete process.env.VITE_SUPABASE_URL
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: [] }) })))
  })

  it('un correo escrito en el cuerpo no da cupo propio ni de «verificado»', async () => {
    const { default: handler } = await import('../../api/anthropic')
    let ultimo = 0
    for (let i = 0; i < 12; i++) {
      const { r, res } = respuesta()
      await handler(pedido('1.2.3.4', { ...cuerpoBase, usuarioEmail: `falso${i}@x.cl` }), res)
      ultimo = r.status
    }
    expect(ultimo).toBe(429) // tope de 10 por conexión sin verificar, aunque cada pedido declare otro correo
  })

  it('un token que Supabase no confirma sigue siendo visitante', async () => {
    process.env.VITE_SUPABASE_URL = 'https://x.supabase.co'
    process.env.VITE_SUPABASE_ANON_KEY = 'anon'
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/auth/v1/user') ? { ok: false, status: 401, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ content: [] }) })))
    const { default: handler } = await import('../../api/anthropic')
    let ultimo = 0
    for (let i = 0; i < 12; i++) {
      const { r, res } = respuesta()
      await handler(pedido('5.6.7.8', cuerpoBase, 'Bearer ' + 'a'.repeat(40)), res)
      ultimo = r.status
    }
    expect(ultimo).toBe(429)
  })

  it('un correo confirmado por Supabase obtiene el cupo mayor', async () => {
    process.env.VITE_SUPABASE_URL = 'https://x.supabase.co'
    process.env.VITE_SUPABASE_ANON_KEY = 'anon'
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/auth/v1/user')
      ? { ok: true, status: 200, json: async () => ({ email: 'Ana@x.cl', email_confirmed_at: '2026-01-01' }) }
      : { ok: true, status: 200, json: async () => ({ content: [] }) })))
    const { default: handler } = await import('../../api/anthropic')
    const estados: number[] = []
    for (let i = 0; i < 12; i++) {
      const { r, res } = respuesta()
      await handler(pedido('9.9.9.9', cuerpoBase, 'Bearer ' + 'b'.repeat(40)), res)
      estados.push(r.status)
    }
    expect(estados.includes(429)).toBe(false) // 12 > 10 de visitante, bajo los 30 de verificado
  })
})

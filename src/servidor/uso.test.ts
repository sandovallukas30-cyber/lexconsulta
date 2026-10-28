import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '../../api/_tipos'

function respuesta() {
  const r = { status: 0 }
  const res = {
    status(c: number) {
      r.status = c
      return this
    },
    end() {
      return this
    },
  } as unknown as VercelResponse
  return { r, res }
}
function pedido(ip: string, body: unknown, extra: Record<string, string> = {}, metodo = 'POST'): VercelRequest {
  return { method: metodo, body, headers: { 'x-forwarded-for': ip, ...extra } } as unknown as VercelRequest
}
const envioValido = { v: 1, d: 'tablet', nueva: true, ses: true, e: { 'apunte.nuevo': 1 }, t: { hoy: 20 } }

describe('api/: los endpoints se pueden cargar en Vercel (Node ESM)', () => {
  it('todo import relativo que se queda en el código compilado lleva la extensión .js', () => {
    const sinExtension: string[] = []
    for (const archivo of readdirSync('api').filter((n) => n.endsWith('.ts'))) {
      const texto = readFileSync(`api/${archivo}`, 'utf8')
      // `import type …` se borra al compilar; cualquier otro import relativo llega tal cual a Node
      for (const m of texto.matchAll(/^\s*(?:import|export)\s+(?!type\b)[^;'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/gm)) {
        if (!/\.(js|json)$/.test(m[1])) sinExtension.push(`${archivo}: ${m[1]}`)
      }
    }
    expect(sinExtension).toEqual([])
  })
})

describe('api/uso: estadísticas de uso anónimas', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.SUPABASE_URL
    delete process.env.VITE_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 204 })))
  })

  it('apagado (sin clave de servidor): responde 204 y no llama a ninguna base', async () => {
    const { default: handler } = await import('../../api/uso')
    const { r, res } = respuesta()
    await handler(pedido('1.1.1.1', envioValido), res)
    expect(r.status).toBe(204)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('encendido: guarda solo lo validado, con la clave de servidor, y sin pasar la IP', async () => {
    process.env.SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-secreta'
    const { default: handler } = await import('../../api/uso')
    const { r, res } = respuesta()
    await handler(pedido('2.2.2.2', { ...envioValido, correo: 'a@b.cl', e: { 'apunte.nuevo': 1, 'cosa.rara': 5 } }), res)
    expect(r.status).toBe(204)
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://x.supabase.co/rest/v1/rpc/registrar_uso')
    const cuerpo = JSON.parse(String(init.body))
    expect(cuerpo).toEqual({ p_dispositivo: 'tablet', p_nueva: true, p_sesion: true, p_eventos: { 'apunte.nuevo': 1 }, p_segundos: { hoy: 20 } })
    expect(JSON.stringify(cuerpo)).not.toContain('2.2.2.2')
    expect(JSON.stringify(cuerpo)).not.toContain('a@b.cl')
  })

  it('si la base falla, igual responde 204 (el navegador no se entera)', async () => {
    process.env.SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-secreta'
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('sin red') }))
    const { default: handler } = await import('../../api/uso')
    const { r, res } = respuesta()
    await handler(pedido('3.3.3.3', envioValido), res)
    expect(r.status).toBe(204)
  })

  it('rechaza otros métodos, otros orígenes, cuerpos grandes y envíos inválidos', async () => {
    const { default: handler } = await import('../../api/uso')
    const casos: [VercelRequest, number][] = [
      [pedido('4.4.4.4', envioValido, {}, 'GET'), 405],
      [pedido('4.4.4.5', envioValido, { origin: 'https://otro-sitio.com', host: 'primalex.vercel.app' }), 403],
      [pedido('4.4.4.6', { ...envioValido, e: { 'apunte.nuevo': 'x'.repeat(5000) } }), 413],
      [pedido('4.4.4.7', { v: 1, d: 'televisor' }), 400],
      [pedido('4.4.4.8', 'esto no es json {'), 400],
    ]
    for (const [req, esperado] of casos) {
      const { r, res } = respuesta()
      await handler(req, res)
      expect(r.status).toBe(esperado)
    }
  })

  it('acepta el origen propio', async () => {
    const { default: handler } = await import('../../api/uso')
    const { r, res } = respuesta()
    await handler(pedido('5.5.5.5', envioValido, { origin: 'https://primalex.vercel.app', host: 'primalex.vercel.app' }), res)
    expect(r.status).toBe(204)
  })

  it('frena a quien manda demasiado seguido', async () => {
    const { default: handler } = await import('../../api/uso')
    let ultimo = 0
    for (let i = 0; i < 25; i++) {
      const { r, res } = respuesta()
      await handler(pedido('6.6.6.6', envioValido), res)
      ultimo = r.status
    }
    expect(ultimo).toBe(429)
  })
})

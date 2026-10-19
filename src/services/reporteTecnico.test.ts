import { describe, expect, it } from 'vitest'
import { limpiar, tipoPantalla } from './reporteTecnico'

describe('reporteTecnico: privacidad de los mensajes', () => {
  it('quita correos y números largos', () => {
    const t = limpiar('Fallo con ana.perez@uni.cl y rut 123456789 al guardar')
    expect(t).not.toContain('ana.perez')
    expect(t).not.toContain('123456789')
    expect(t).toContain('[correo]')
  })
  it('deja las URLs sin consulta ni hash', () => {
    const t = limpiar('No cargó https://x.supabase.co/rest/v1/datos?token=SECRETO&u=1#frag')
    expect(t).toContain('https://x.supabase.co/rest/v1/datos')
    expect(t).not.toContain('SECRETO')
    expect(t).not.toContain('frag')
  })
  it('acota el largo y compacta espacios', () => {
    expect(limpiar('a   b\n\nc')).toBe('a b c')
    expect(limpiar('x'.repeat(500)).length).toBe(200)
  })
})

describe('tipoPantalla', () => {
  it('clasifica por ancho como el resto de la app', () => {
    expect(tipoPantalla(390)).toBe('movil')
    expect(tipoPantalla(820)).toBe('tablet')
    expect(tipoPantalla(1099)).toBe('tablet')
    expect(tipoPantalla(1280)).toBe('escritorio')
  })
})

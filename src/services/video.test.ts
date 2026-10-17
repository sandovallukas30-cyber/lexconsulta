import { describe, expect, it } from 'vitest'
import { incrustar } from './video'

describe('incrustar', () => {
  it('YouTube: enlace largo, corto, shorts y en vivo', () => {
    const id = 'dQw4w9WgXcQ'
    for (const u of [`https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}`, `https://youtube.com/shorts/${id}`, `https://www.youtube.com/live/${id}`, `youtube.com/watch?v=${id}`]) {
      const r = incrustar(u)
      expect(r.tipo).toBe('iframe')
      if (r.tipo === 'iframe') expect(r.src).toContain(`youtube-nocookie.com/embed/${id}`)
    }
  })
  it('respeta el minuto de inicio y las listas', () => {
    const r = incrustar('https://youtu.be/dQw4w9WgXcQ?t=1m30s&list=PL1234')
    expect(r.tipo === 'iframe' && r.src).toContain('start=90')
    expect(r.tipo === 'iframe' && r.src).toContain('list=PL1234')
  })
  it('Vimeo y archivos de video directos', () => {
    expect(incrustar('https://vimeo.com/123456789')).toMatchObject({ tipo: 'iframe', origen: 'Vimeo' })
    expect(incrustar('https://sitio.cl/clase.mp4')).toMatchObject({ tipo: 'video' })
  })
  it('lo que no se puede mostrar explica por qué, sin romper', () => {
    expect(incrustar('')).toMatchObject({ tipo: 'ninguno' })
    expect(incrustar('https://youtube.com/watch?v=corto')).toMatchObject({ tipo: 'ninguno' })
    expect(incrustar('https://sitio.cl/pagina')).toMatchObject({ tipo: 'ninguno' })
    expect(incrustar('javascript:alert(1)')).toMatchObject({ tipo: 'ninguno' })
  })
  it('no deja pasar ids con caracteres raros hacia el iframe', () => {
    const r = incrustar('https://youtu.be/dQw4w9WgXcQ?list=abc"onload=x')
    expect(r.tipo === 'iframe' && r.src).not.toContain('onload')
  })
})

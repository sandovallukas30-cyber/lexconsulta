import { describe, expect, it } from 'vitest'
import { apunteAFragmentoHtml, apunteAPaginaHtml, apunteATextoPlano, escaparHtml } from './apunteExportar'

const apunte = (contenido: string, titulo = 'Clase 3') => ({ titulo, contenido })

describe('apunteAFragmentoHtml', () => {
  it('conserva negrita, rojo, resaltado, subrayado y cursiva con estilos en línea', () => {
    const h = apunteAFragmentoHtml(apunte('**clave** ==Art. 1545== ++ojo++ __sub__ ~cur~'))
    expect(h).toContain('<strong>clave</strong>')
    expect(h).toContain('color:#dc2626')
    expect(h).toContain('background-color:#fef08a')
    expect(h).toContain('<u>sub</u>')
    expect(h).toContain('<em>cur</em>')
  })

  it('escapa el HTML del usuario', () => {
    expect(escaparHtml('<b>&"')).toBe('&lt;b&gt;&amp;&quot;')
    expect(apunteAFragmentoHtml(apunte('<script>alert(1)</script>'))).not.toContain('<script>')
  })

  it('títulos, listas y recuadros', () => {
    const h = apunteAFragmentoHtml(apunte('# Uno\n\n- a\n- b\n\n3. c\n4. d\n\n> 💡 idea'))
    expect(h).toContain('<h2')
    expect(h).toContain('<ul')
    expect(h).toContain('<ol start="3"')
    expect(h).toContain('💡')
    expect(h).toContain('background-color:#fffbeb')
  })

  it('tablas con encabezado y celdas con borde', () => {
    const h = apunteAFragmentoHtml(apunte('| a | b |\n|---|---|\n| 1 | 2 |'))
    expect(h).toContain('<th')
    expect(h).toContain('border:1px solid')
  })

  it('las notas al margen pasan a una lista al final', () => {
    const h = apunteAFragmentoHtml(apunte('{{texto|mi nota}}'))
    expect(h).toContain('[1]')
    expect(h).toContain('mi nota')
  })
})

describe('apunteAPaginaHtml', () => {
  it('es un documento completo y sin recursos externos', () => {
    const h = apunteAPaginaHtml(apunte('**a**'))
    expect(h.startsWith('<!doctype html>')).toBe(true)
    expect(h).toContain('<title>Clase 3</title>')
    expect(h).not.toMatch(/(src|href)="https?:/)
  })

  it('la versión para Word lleva el espacio de nombres de Office', () => {
    expect(apunteAPaginaHtml(apunte('x'), { word: true })).toContain('urn:schemas-microsoft-com:office:word')
  })
})

describe('apunteATextoPlano', () => {
  it('usa *negrita* y _cursiva_ como WhatsApp y quita las marcas propias', () => {
    const t = apunteATextoPlano(apunte('# Título\n\n**clave** y ~cur~ y ==rojo== y ++amarillo++\n\n- uno\n- dos'))
    expect(t).toContain('*Clase 3*')
    expect(t).toContain('*Título*')
    expect(t).toContain('*clave* y _cur_ y *rojo* y amarillo')
    expect(t).toContain('• uno')
    expect(t).not.toContain('==')
    expect(t).not.toContain('++')
  })
})

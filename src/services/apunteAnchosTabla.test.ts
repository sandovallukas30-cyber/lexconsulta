import { describe, it, expect } from 'vitest'
import { parsearApunte } from './apunteFormato'
import { textoADoc, docATexto } from './apunteDoc'

const TABLA = '| Concepto | Definición |\n|---|---|\n| Acción | Poder de pedir |'

describe('anchos de columna de las tablas', () => {
  it('una tabla sin anchos se escribe igual que antes', () => {
    const texto = docATexto(textoADoc(TABLA))
    expect(texto).not.toContain('%%anchos')
    expect(parsearApunte(texto)[0]).toMatchObject({ t: 'tabla', encabezado: true })
  })

  it('los anchos viajan del texto al editor y vuelven al texto', () => {
    const conAnchos = `${TABLA}\n%%anchos 220 340`
    const bloque = parsearApunte(conAnchos)[0]
    expect(bloque).toMatchObject({ t: 'tabla', anchos: [220, 340] })
    const doc = textoADoc(conAnchos)
    expect(doc.content?.[0].content?.[0].content?.[1].attrs?.colwidth).toEqual([340])
    expect(docATexto(doc)).toContain('%%anchos 220 340')
  })

  it('la línea de anchos no queda como texto suelto ni rompe el bloque siguiente', () => {
    const bloques = parsearApunte(`${TABLA}\n%%anchos 200 0\n\nTexto después`)
    expect(bloques).toHaveLength(2)
    expect(bloques[1]).toMatchObject({ t: 'p' })
  })
})

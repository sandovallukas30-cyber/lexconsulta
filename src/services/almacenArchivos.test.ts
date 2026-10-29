import { describe, expect, it } from 'vitest'
import { esPdf, formatoTamano, MAX_BYTES_ARCHIVO, problemaArchivo } from './almacenArchivos'

describe('formatoTamano', () => {
  it('da KB hasta 1 MB y MB después, con una decimal bajo 10 MB', () => {
    expect(formatoTamano(500)).toBe('1 KB')
    expect(formatoTamano(300 * 1024)).toBe('300 KB')
    expect(formatoTamano(2.5 * 1024 * 1024)).toBe('2,5 MB')
    expect(formatoTamano(42 * 1024 * 1024)).toBe('42 MB')
  })
})

describe('esPdf', () => {
  it('reconoce un PDF por su tipo o por su extensión', () => {
    expect(esPdf('lectura.PDF')).toBe(true)
    expect(esPdf('lectura', 'application/pdf')).toBe(true)
    expect(esPdf('apuntes.docx')).toBe(false)
  })
})

describe('problemaArchivo', () => {
  it('rechaza lo vacío y lo demasiado grande, con el motivo', () => {
    expect(problemaArchivo({ name: 'a.pdf', size: 0 })).toMatch(/vacío/)
    expect(problemaArchivo({ name: 'a.pdf', size: MAX_BYTES_ARCHIVO + 1 })).toMatch(/máximo/)
    expect(problemaArchivo({ name: 'a.pdf', size: 1024 })).toBeNull()
  })
})

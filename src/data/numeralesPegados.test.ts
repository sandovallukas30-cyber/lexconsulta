import { describe, expect, it } from 'vitest'

// Los textos legales se separan por saltos de línea: un numeral («4º.-») pegado al final del
// anterior desaparece de la lista (pasó con el Art. 19 n°4 de la Constitución).
const archivos = import.meta.glob('./*.json', { eager: true, import: 'default' }) as Record<string, { articulos?: { a: string; t: string }[] }>

describe('textos legales', () => {
  it('ningún numeral queda pegado a la línea anterior', () => {
    const pegados: string[] = []
    for (const [archivo, datos] of Object.entries(archivos)) {
      for (const art of datos.articulos ?? []) {
        for (const m of (art.t ?? '').matchAll(/[;:.,] +(\d{1,2}[º°]\.-)/g)) pegados.push(`${archivo} ${art.a}: ${m[1]}`)
      }
    }
    expect(pegados).toEqual([])
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Los colores de texto del sistema de superficies deben pasar WCAG AA (4,5:1) sobre
// sus fondos, en claro y en oscuro. Se leen del propio CSS para que nadie los
// baje sin que falle este test.
const css = readFileSync(join(__dirname, 'base.css'), 'utf8')

function bloque(selector: string): string {
  const i = css.indexOf(`${selector} {`)
  return css.slice(i, css.indexOf('}', i))
}
function token(b: string, nombre: string): string {
  const m = new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{6})`).exec(b)
  if (!m) throw new Error(`falta ${nombre}`)
  return m[1]
}
function luz(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function contraste(a: string, b: string): number {
  const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe.each([
  ['claro', ':root', ['--neu-bg', '--neu-bg2', '--neu-bg3'], '#d7dbf3'], // #d7dbf3: tarjeta destacada de "Lo que sigue"
  ['oscuro', ":root[data-tema='oscuro']", ['--neu-bg', '--neu-bg2', '--neu-bg3'], null],
] as const)('contraste de texto (%s)', (_nombre, selector, fondos, extra) => {
  const b = bloque(selector)
  const lista = [...fondos.map((f) => token(b, f)), ...(extra ? [extra] : [])]
  for (const tinta of ['--neu-ink', '--neu-ink2', '--neu-ink3']) {
    it(`${tinta} llega a 4,5:1 sobre todos los fondos`, () => {
      const t = token(b, tinta)
      for (const f of lista) expect(contraste(t, f), `${tinta} ${t} sobre ${f}`).toBeGreaterThanOrEqual(4.5)
    })
  }
})

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// La fuente de íconos está recortada a los que usa la app (scripts/subset_iconos.mjs).
// Si usas un ícono `ti-…` nuevo y no regeneras la fuente, se vería un cuadro vacío.
const RAIZ = join(__dirname, '../../..')

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? archivos(p) : /\.(tsx?|css)$/.test(n) && !n.startsWith('tabler-subset') && !n.endsWith('.test.ts') ? [p] : []
  })
}

describe('fuente de íconos recortada', () => {
  it('incluye todos los íconos ti-… usados en el código', () => {
    const tabler = readFileSync(join(RAIZ, 'node_modules/@tabler/icons-webfont/dist/tabler-icons.min.css'), 'utf8')
    const existentes = new Set([...tabler.matchAll(/\.ti-([a-z0-9-]+):before/g)].map((m) => m[1]))
    const subset = readFileSync(join(RAIZ, 'src/assets/iconos/tabler-subset.css'), 'utf8')
    const incluidos = new Set([...subset.matchAll(/\.ti-([a-z0-9-]+):before/g)].map((m) => m[1]))
    const usados = new Set<string>()
    for (const f of archivos(join(RAIZ, 'src'))) for (const m of readFileSync(f, 'utf8').matchAll(/\bti-([a-z0-9][a-z0-9-]*)/g)) usados.add(m[1])
    const faltan = [...usados].filter((n) => existentes.has(n) && !incluidos.has(n))
    expect(faltan, 'Corre: node scripts/subset_iconos.mjs').toEqual([])
  })
})

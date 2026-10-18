// Recorta la fuente de íconos Tabler (495 KB) a solo los íconos que usa la app.
// Uso: npm i --no-save subset-font && node scripts/subset_iconos.mjs
// Genera src/assets/iconos/tabler-subset.woff2 y tabler-subset.css (se importan en main.tsx).
// Hay que volver a correrlo cuando se use un ícono `ti-…` nuevo; `npm test` avisa si falta uno.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import subsetFont from 'subset-font'

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const DIST = join(RAIZ, 'node_modules/@tabler/icons-webfont/dist')
const SALIDA = join(RAIZ, 'src/assets/iconos')

function archivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? archivos(p) : /\.(tsx?|css|json)$/.test(n) && !n.startsWith('tabler-subset') ? [p] : []
  })
}

export function iconosUsados() {
  const usados = new Set()
  for (const f of [...archivos(join(RAIZ, 'src')), join(RAIZ, 'index.html')]) {
    const t = readFileSync(f, 'utf8')
    for (const m of t.matchAll(/\bti-([a-z0-9][a-z0-9-]*)/g)) usados.add(m[1])
  }
  return usados
}

const css = readFileSync(join(DIST, 'tabler-icons.min.css'), 'utf8')
const codigos = new Map()
for (const m of css.matchAll(/\.ti-([a-z0-9-]+):before\{content:"\\([0-9a-f]+)"\}/g)) codigos.set(m[1], m[2])

const usados = [...iconosUsados()].filter((n) => codigos.has(n)).sort()
const desconocidos = [...iconosUsados()].filter((n) => !codigos.has(n))
const texto = usados.map((n) => String.fromCodePoint(parseInt(codigos.get(n), 16))).join('')
const fuente = readFileSync(join(DIST, 'fonts/tabler-icons.woff2'))
const recortada = await subsetFont(fuente, texto, { targetFormat: 'woff2' })

mkdirSync(SALIDA, { recursive: true })
writeFileSync(join(SALIDA, 'tabler-subset.woff2'), recortada)
const reglas = usados.map((n) => `.ti-${n}:before{content:"\\${codigos.get(n)}"}`).join('\n')
writeFileSync(
  join(SALIDA, 'tabler-subset.css'),
  `/* Generado por scripts/subset_iconos.mjs: no editar a mano. Íconos Tabler (MIT) recortados a los que usa la app. */
@font-face{font-family:"tabler-icons";font-style:normal;font-weight:400;font-display:swap;src:url("./tabler-subset.woff2") format("woff2")}
.ti{font-family:"tabler-icons" !important;speak:none;font-style:normal;font-weight:normal;font-variant:normal;text-transform:none;line-height:1;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
${reglas}
`
)
console.log(`${usados.length} íconos · ${(fuente.length / 1024).toFixed(0)} KB → ${(recortada.length / 1024).toFixed(1)} KB`)
if (desconocidos.length) console.log('Nombres ti-… que no existen en Tabler (ignorados):', desconocidos.join(', '))

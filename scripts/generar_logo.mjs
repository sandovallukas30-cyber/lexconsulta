// Genera el logo de Prima Lex en todos sus formatos: favicon.svg, íconos de la app instalable (192, 512, maskable),
// ícono de iPad/iPhone y la imagen para compartir (og.png). El dibujo vive acá: si se cambia, se corre
//   node scripts/generar_logo.mjs
// (necesita Playwright con Edge, igual que scripts/captura.mjs). El mismo dibujo, con los colores del tema, está en
// src/components/ui/LogoPrimaLex.tsx.
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const PUBLICO = path.resolve('public')
mkdirSync(PUBLICO, { recursive: true })

const INDIGO = '#5457e0'
const ORO = '#ffc94d'

/** La hoja que es una P (dirección 03 de Claude Design): una hoja de apunte cuyo contorno dibuja la P, con la esquina
 *  doblada en dorado («página que se pasa»). Va dibujada en una cuadrícula de 64 x 64. */
const HOJA = `
  <path fill-rule="evenodd" fill="#fff" d="M24 12H35A13 13 0 0 1 35 38H31V50A2 2 0 0 1 29 52H28L20 44V16A4 4 0 0 1 24 12ZM31 19.5H35A5.5 5.5 0 0 1 35 30.5H31Z"/>
  <path d="M20 44H28V52Z" fill="${ORO}"/>`

/** Ícono con esquinas redondeadas (favicon y app instalable). */
const svgRedondeado = (tam = 512) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${INDIGO}"/>${HOJA}</svg>`

/** Ícono a sangre (sin esquinas): el sistema le pone su propia máscara. El dibujo se achica al 78 % para quedar en la zona segura y se corre 1,5 a la izquierda (la P pesa más a ese lado) para que quede centrado a la vista. */
const svgASangre = (tam = 512, escala = 0.78) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 64 64"><rect width="64" height="64" fill="${INDIGO}"/><g transform="translate(${32 - 32 * escala} ${32 - 32 * escala}) scale(${escala})"><g transform="translate(-1.5 0)">${HOJA}</g></g></svg>`

const FUENTE = pathToFileURL(path.resolve('node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2')).href
const og = `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: 'Jakarta'; src: url('${FUENTE}') format('woff2'); font-weight: 200 800; }
  body { margin: 0; width: 1200px; height: 630px; display: flex; align-items: center; justify-content: center; gap: 64px;
    background: linear-gradient(135deg, #5b5fe8, #3b3ec0); font-family: 'Jakarta', 'Segoe UI', system-ui, sans-serif; color: #fff; }
</style><body>
  <div style="width:260px;height:260px;flex-shrink:0">${svgRedondeado(260).replace('<svg ', '<svg style="filter:drop-shadow(0 18px 30px rgba(20,22,80,.45))" ')}</div>
  <div><div style="font-size:112px;letter-spacing:-3px;line-height:1"><b style="font-weight:800">Prima</b> <span style="font-weight:500">Lex</span></div>
  <div style="font-size:38px;line-height:1.35;margin-top:22px;color:#e4e6ff;max-width:560px;font-weight:500">Tu semestre de Derecho, ordenado en un solo lugar.</div></div></body>`

writeFileSync(path.join(PUBLICO, 'favicon.svg'), svgRedondeado(512).replace(' width="512" height="512"', ''))

const navegador = await chromium.launch({ channel: 'msedge' })
async function png(html, ancho, alto, archivo, transparente = false) {
  const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 })
  // un archivo real (no about:blank) para que la página pueda cargar la fuente local
  const temporal = path.join(mkdtempSync(path.join(tmpdir(), 'logo-')), 'pagina.html')
  writeFileSync(temporal, html.startsWith('<svg') ? `<body style="margin:0;background:transparent">${html}</body>` : html)
  await pagina.goto(pathToFileURL(temporal).href)
  await pagina.evaluate(() => document.fonts.ready)
  await pagina.screenshot({ path: path.join(PUBLICO, archivo), omitBackground: transparente })
  await pagina.close()
  console.log('listo', archivo)
}
await png(svgRedondeado(192), 192, 192, 'icon-192.png', true)
await png(svgRedondeado(512), 512, 512, 'icon-512.png', true)
await png(svgASangre(512), 512, 512, 'icon-maskable-512.png')
await png(svgASangre(180, 0.86), 180, 180, 'apple-touch-icon.png')
await png(og, 1200, 630, 'og.png')
await navegador.close()

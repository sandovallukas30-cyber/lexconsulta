// Genera el logo de Prima Lex en todos sus formatos: favicon.svg, íconos de la app instalable (192, 512, maskable),
// ícono de iPad/iPhone y la imagen para compartir (og.png). El dibujo vive acá: si se cambia, se corre
//   node scripts/generar_logo.mjs
// (necesita Playwright con Edge, igual que scripts/captura.mjs). El mismo dibujo, con los colores del tema, está en
// src/components/ui/LogoPrimaLex.tsx.
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const PUBLICO = path.resolve('public')
mkdirSync(PUBLICO, { recursive: true })

const INDIGO = '#5457e0'
const TINTA = '#4a4dd0'
const ORO = '#ffc94d'

/** El cuaderno con la P y el marcador. Va dibujado en una cuadrícula de 64 x 64. */
const CUADERNO = `
  <path d="M16 51V17a4 4 0 0 1 4-4h22a6 6 0 0 1 6 6v32z" fill="#fff"/>
  <path d="M16 51c0-3.2 2.2-5.4 5.4-5.4H48" stroke="${TINTA}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  <path d="M24 38V23h7.2a4.6 4.6 0 0 1 0 9.2H24" stroke="${TINTA}" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M40 13v14l3-2.4 3 2.4V13z" fill="${ORO}"/>`

const DEGRADADO = (id) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b6ff0"/><stop offset="1" stop-color="#4144c7"/></linearGradient></defs>`

/** Ícono con esquinas redondeadas (favicon y app instalable). */
const svgRedondeado = (tam = 512) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 64 64">${DEGRADADO('g')}<rect width="64" height="64" rx="15" fill="url(#g)"/>${CUADERNO}</svg>`

/** Ícono a sangre (sin esquinas): el sistema le pone su propia máscara. El dibujo se achica al 78 % para quedar en la zona segura. */
const svgASangre = (tam = 512, escala = 0.78) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 64 64">${DEGRADADO('g')}<rect width="64" height="64" fill="url(#g)"/><g transform="translate(${32 - 32 * escala} ${32 - 32 * escala}) scale(${escala})">${CUADERNO}</g></svg>`

const og = `<!doctype html><meta charset="utf-8"><body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;justify-content:center;gap:64px;background:linear-gradient(135deg,#5b5fe8,#3b3ec0);font-family:'Segoe UI',system-ui,sans-serif;color:#fff">
  <div style="width:260px;height:260px;flex-shrink:0">${svgRedondeado(260).replace('<svg ', '<svg style="filter:drop-shadow(0 18px 30px rgba(20,22,80,.45))" ')}</div>
  <div><div style="font-size:112px;font-weight:800;letter-spacing:-2px;line-height:1">Prima Lex</div>
  <div style="font-size:38px;line-height:1.35;margin-top:22px;color:#e4e6ff;max-width:560px">Tu semestre de Derecho, ordenado en un solo lugar.</div></div></body>`

writeFileSync(path.join(PUBLICO, 'favicon.svg'), svgRedondeado(512).replace(' width="512" height="512"', ''))

const navegador = await chromium.launch({ channel: 'msedge' })
async function png(html, ancho, alto, archivo, transparente = false) {
  const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 })
  await pagina.setContent(html.startsWith('<svg') ? `<body style="margin:0;background:transparent">${html}</body>` : html)
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

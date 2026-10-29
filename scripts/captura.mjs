// Saca una captura PNG de un archivo HTML local con Edge (Playwright). Uso: node scripts/captura.mjs entrada.html salida.png [ancho] [alto]
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const [entrada, salida, ancho = '900', alto = '420'] = process.argv.slice(2)
if (!entrada || !salida) {
  console.error('Uso: node scripts/captura.mjs entrada.html salida.png [ancho] [alto]')
  process.exit(1)
}
const navegador = await chromium.launch({ channel: 'msedge' })
const pagina = await navegador.newPage({ viewport: { width: Number(ancho), height: Number(alto) }, deviceScaleFactor: 2 })
await pagina.goto(pathToFileURL(path.resolve(entrada)).href)
await pagina.screenshot({ path: salida })
await navegador.close()
console.log('listo', salida)

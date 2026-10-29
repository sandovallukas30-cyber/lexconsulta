// Captura del menú lateral (abierto y plegado) de la app que corre en localhost:5173, para revisar el logo y el centrado.
// Uso: node scripts/captura_menu.mjs carpeta_de_salida
import { chromium } from 'playwright'
import path from 'node:path'

const salida = process.argv[2] ?? '.'
const navegador = await chromium.launch({ channel: 'msedge' })
const pagina = await navegador.newPage({ viewport: { width: 1400, height: 800 }, deviceScaleFactor: 2 })
await pagina.goto('http://localhost:5173/hoy')
await pagina.waitForSelector('aside[aria-label="Menú principal"]')
const menu = pagina.locator('aside[aria-label="Menú principal"]')
await menu.screenshot({ path: path.join(salida, 'menu-abierto.png') })

await pagina.getByRole('button', { name: 'Colapsar menú lateral' }).last().click()
await pagina.waitForTimeout(700)
await menu.screenshot({ path: path.join(salida, 'menu-plegado.png') })

// medidas de la tarjeta de arriba con el menú plegado: el logo debe quedar centrado
const medidas = await pagina.evaluate(() => {
  const aside = document.querySelector('aside[aria-label="Menú principal"]')
  const tarjeta = aside.querySelector('.neu-raised')
  const logo = tarjeta.querySelector('svg')
  const t = tarjeta.getBoundingClientRect()
  const l = logo.getBoundingClientRect()
  return { tarjeta: { izq: t.left, der: t.right }, logo: { izq: l.left, der: l.right }, espacioIzq: l.left - t.left, espacioDer: t.right - l.right }
})
console.log(JSON.stringify(medidas))

// y se vuelve a abrir tocando el logo
await pagina.getByRole('button', { name: 'Expandir menú lateral' }).click()
await pagina.waitForTimeout(700)
console.log('abierto de nuevo:', await menu.evaluate((n) => Math.round(n.getBoundingClientRect().width)))
await navegador.close()

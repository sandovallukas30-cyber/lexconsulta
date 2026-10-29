// Prueba manual (localhost:5173): botones de ancho de columna + desplazamiento horizontal de la tabla en el editor,
// y el tirador del panel «Consultar artículo» en el modo lectura.
import { chromium } from 'playwright'
import path from 'node:path'
const salida = process.argv[2] ?? '.'
const navegador = await chromium.launch({ channel: 'msedge' })
const pagina = await navegador.newPage({ viewport: { width: 1300, height: 850 } })
await pagina.goto('http://localhost:5173/hoy')
await pagina.waitForFunction(() => window.__store)
const ramoId = await pagina.evaluate(() => {
  const s = window.__store.getState()
  const id = s.crearRamo({ nombre: 'Prueba', color: '#5457e0', semestre: '1', modulosVinculados: [] })
  const ahora = Date.now()
  s.setApuntesModulo(id, [{ id: 'ap1', titulo: 'Tabla', contenido: '| Concepto | Definición | Otra | Cuarta |\n|---|---|---|---|\n| Acción | Poder de pedir | x | y |', fechaCreacion: ahora, fechaModificacion: ahora }])
  s.abrirApunte(id, 'ap1', undefined, true)
  return id
})
pagina.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLA', m.text().slice(0, 300)) })
await pagina.waitForTimeout(2000)
await pagina.screenshot({ path: path.join(salida, 'estado.png') })
await pagina.waitForSelector('.ap-editor table', { timeout: 10000 })
const medir = () => pagina.evaluate(() => {
  const w = document.querySelector('.ap-editor .tableWrapper')
  return { cw: w.clientWidth, sw: w.scrollWidth, cols: [...document.querySelectorAll('.ap-editor th')].map((c) => c.offsetWidth) }
})
console.log('inicial (4 columnas)', JSON.stringify(await medir()))
await pagina.locator('.ap-editor td').first().click()
for (let i = 0; i < 4; i++) await pagina.getByRole('button', { name: /Columna más ancha/ }).click()
console.log('tras 4 toques en «más ancha»', JSON.stringify(await medir()))
await pagina.getByRole('button', { name: 'Columna más angosta' }).click()
console.log('tras 1 «más angosta»', JSON.stringify(await medir()))
await pagina.getByRole('button', { name: 'Ancho automático de la columna' }).click()
await pagina.waitForTimeout(300)
console.log('tras «automático»', JSON.stringify(await medir()))
for (let i = 0; i < 12; i++) await pagina.getByRole('button', { name: /Columna más ancha/ }).click()
console.log('tras 12 toques más', JSON.stringify(await medir()))
const desplazado = await pagina.evaluate(() => { const w = document.querySelector('.ap-editor .tableWrapper'); w.scrollLeft = 9999; return { scrollLeft: w.scrollLeft, maxEsperado: w.scrollWidth - w.clientWidth } })
console.log('desplazamiento horizontal', JSON.stringify(desplazado))
await pagina.screenshot({ path: path.join(salida, 'tabla-botones.png') })

// panel «Consultar artículo» en modo lectura: tirador para hacerlo más angosto
await pagina.getByRole('button', { name: 'Listo' }).click()
await pagina.waitForTimeout(800)
await pagina.getByRole('button', { name: /Consultar|artículos/i }).first().click()
await pagina.waitForSelector('aside[aria-label="Consultar un artículo"]')
const ancho = () => pagina.evaluate(() => Math.round(document.querySelector('aside[aria-label="Consultar un artículo"]').getBoundingClientRect().width))
console.log('panel: ancho de siempre', await ancho())
const tirador = pagina.getByRole('separator', { name: /Ancho del panel/ })
const t = await tirador.boundingBox()
await pagina.mouse.move(t.x + t.width / 2, t.y + 200)
await pagina.mouse.down()
await pagina.mouse.move(t.x + t.width / 2 + 120, t.y + 200, { steps: 8 })
await pagina.mouse.up()
console.log('panel: tras arrastrar 120 px a la derecha', await ancho())
const arrastrar = async (dx) => {
  const b = await tirador.boundingBox()
  const x = b.x + b.width / 2
  await pagina.mouse.move(x, b.y + 200)
  await pagina.mouse.down()
  await pagina.mouse.move(x + dx, b.y + 200, { steps: 8 })
  await pagina.mouse.up()
}
await arrastrar(-600)
console.log('panel: arrastrando mucho hacia la izquierda no pasa de', await ancho())
await arrastrar(900)
console.log('panel: arrastrando mucho hacia la derecha no baja de', await ancho())
await pagina.screenshot({ path: path.join(salida, 'panel-angosto.png') })
await tirador.dblclick()
console.log('panel: doble clic vuelve a', await ancho())
await pagina.reload()
await navegador.close()

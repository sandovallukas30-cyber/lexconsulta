// Prueba manual: abre un apunte con una tabla en la app de localhost:5173, arrastra el borde de una columna y comprueba que el ancho cambia y queda en el texto.
// Uso: node scripts/prueba_anchos_tabla.mjs carpeta_de_salida
import { chromium } from 'playwright'
import path from 'node:path'

const salida = process.argv[2] ?? '.'
const navegador = await chromium.launch({ channel: 'msedge' })
const pagina = await navegador.newPage({ viewport: { width: 1300, height: 850 } })
pagina.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLA', m.text().slice(0, 400)) })
await pagina.goto('http://localhost:5173/hoy')
await pagina.waitForFunction(() => window.__store)
await pagina.evaluate(() => {
  const s = window.__store.getState()
  const ramoId = s.crearRamo({ nombre: 'Prueba', color: '#5457e0', semestre: '1', modulosVinculados: [] })
  const ahora = Date.now()
  s.setApuntesModulo(ramoId, [
    { id: 'ap1', titulo: 'Tabla', contenido: '| Concepto | Definición |\n|---|---|\n| Acción | Poder de pedir |\n| Excepción | Defensa |', fechaCreacion: ahora, fechaModificacion: ahora },
  ])
  s.abrirApunte(ramoId, 'ap1', undefined, true)
})
await pagina.waitForTimeout(1500)
await pagina.screenshot({ path: path.join(salida, 'estado.png') })
await pagina.waitForSelector('.ap-editor table', { timeout: 8000 })
const antes = await pagina.evaluate(() => [...document.querySelectorAll('.ap-editor th')].map((c) => Math.round(c.getBoundingClientRect().width)))
const th = pagina.locator('.ap-editor th').first()
const caja = await th.boundingBox()
const x = caja.x + caja.width - 1
const y = caja.y + caja.height / 2
await pagina.mouse.move(x, y)
await pagina.mouse.down()
await pagina.mouse.move(x + 90, y, { steps: 8 })
await pagina.mouse.up()
await pagina.waitForTimeout(3500)
const despues = await pagina.evaluate(() => [...document.querySelectorAll('.ap-editor th')].map((c) => Math.round(c.getBoundingClientRect().width)))
console.log(JSON.stringify({ antes, despues }))
await pagina.screenshot({ path: path.join(salida, 'tabla-anchos.png') })
const guardado = await pagina.evaluate(() => {
  const s = window.__store.getState()
  return Object.values(s.academicoModulos).flatMap((m) => m.apuntes ?? []).map((a) => a.contenido)
})
console.log(JSON.stringify(guardado))
await navegador.close()

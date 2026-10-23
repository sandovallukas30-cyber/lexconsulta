import { horasMin } from './enfoque'
import { mensajeSemana, rangoSemana, type ResumenSemana } from './resumenSemanal'

/** Dibuja el resumen de la semana como imagen PNG (1080 × 1350) para compartir.
 *  No lleva datos personales: ni correo ni nombre; solo cifras y, si quieres,
 *  el ramo más estudiado. */

const W = 1080
const H = 1350
const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export interface OpcionesTarjeta {
  /** Nombre del ramo más estudiado (se muestra solo si se pasa). */
  ramoTop: string | null
}

export async function dibujarSemana(r: ResumenSemana, o: OpcionesTarjeta): Promise<Blob> {
  // las fuentes de la app tienen que estar cargadas antes de dibujar
  try {
    await Promise.all([document.fonts.load('800 80px "Plus Jakarta Sans"'), document.fonts.load('600 32px "Plus Jakarta Sans"')])
  } catch {
    /* si no cargan, se usa la fuente del sistema */
  }
  const lienzo = document.createElement('canvas')
  lienzo.width = W
  lienzo.height = H
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('El navegador no permite dibujar la imagen')

  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, '#5457e0')
  grad.addColorStop(1, '#2b2e58')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  const head = '"Plus Jakarta Sans", "Segoe UI", sans-serif'
  const body = '"Plus Jakarta Sans", "Segoe UI", sans-serif'

  // marca
  ctx.fillStyle = '#fff'
  ctx.font = `800 40px ${head}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('Prima Lex', 72, 112)
  ctx.font = `600 28px ${body}`
  ctx.fillStyle = 'rgba(255,255,255,.75)'
  ctx.fillText('Mi semana de estudio', 72, 156)
  ctx.textAlign = 'right'
  ctx.fillText(rangoSemana(r.desde, r.hasta), W - 72, 156)
  ctx.textAlign = 'left'

  // tarjeta
  const cx = 56
  const cy = 200
  const cw = W - 112
  const ch = 830
  ctx.save()
  ctx.shadowColor = 'rgba(10,12,40,.35)'
  ctx.shadowBlur = 50
  ctx.shadowOffsetY = 22
  ctx.fillStyle = '#eef1f9'
  rect(ctx, cx, cy, cw, ch, 56)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#8a92b0'
  ctx.font = `700 28px ${body}`
  ctx.fillText('ENFOQUE ESTA SEMANA', cx + 56, cy + 92)
  ctx.fillStyle = '#1f2344'
  ctx.font = `800 120px ${head}`
  ctx.fillText(horasMin(r.minutos), cx + 56, cy + 222)

  // barras de los 7 días
  const bx = cx + 56
  const by = cy + 270
  const bw = cw - 112
  const bh = 230
  const max = Math.max(60, ...r.porDia.map((d) => d.minutos))
  const ancho = bw / 7
  r.porDia.forEach((d, i) => {
    const alto = d.minutos > 0 ? Math.max(14, (d.minutos / max) * bh) : 8
    const x = bx + i * ancho + ancho * 0.18
    const w = ancho * 0.64
    ctx.fillStyle = d.minutos > 0 ? (i === r.mejorDia ? '#5457e0' : '#a9abf2') : '#dde3f1'
    rect(ctx, x, by + bh - alto, w, alto, 18)
    ctx.fill()
    ctx.fillStyle = '#8a92b0'
    ctx.font = `700 26px ${body}`
    ctx.textAlign = 'center'
    ctx.fillText(LETRAS[i], x + w / 2, by + bh + 42)
    ctx.textAlign = 'left'
  })

  // tres cifras
  const cifras: [string, string][] = [
    [String(r.sesiones), r.sesiones === 1 ? 'sesión' : 'sesiones'],
    [`${r.diasEstudio}/7`, 'días activos'],
    [String(r.tareasHechas), r.tareasHechas === 1 ? 'tarea hecha' : 'tareas hechas'],
  ]
  const sw = (cw - 112 - 40) / 3
  cifras.forEach(([n, t], i) => {
    const x = cx + 56 + i * (sw + 20)
    const y = cy + 585
    ctx.fillStyle = '#e9edf6'
    rect(ctx, x, y, sw, 150, 34)
    ctx.fill()
    ctx.fillStyle = '#1f2344'
    ctx.font = `800 54px ${head}`
    ctx.textAlign = 'center'
    ctx.fillText(n, x + sw / 2, y + 74)
    ctx.fillStyle = '#6b7390'
    ctx.font = `600 24px ${body}`
    ctx.fillText(t, x + sw / 2, y + 116)
    ctx.textAlign = 'left'
  })

  // ramo y racha
  ctx.fillStyle = '#6b7390'
  ctx.font = `600 28px ${body}`
  const linea = [o.ramoTop ? `Más estudiado: ${o.ramoTop}` : null, r.racha >= 2 ? `Racha: ${r.racha} días` : null].filter(Boolean).join('   ·   ')
  if (linea) {
    let texto = linea
    while (ctx.measureText(texto).width > cw - 112 && texto.length > 8) texto = texto.slice(0, -2)
    if (texto !== linea) texto += '…'
    ctx.fillText(texto, cx + 56, cy + 785)
  }

  // frase
  const frase = mensajeSemana(r)
  ctx.fillStyle = '#fff'
  ctx.font = `700 38px ${head}`
  const xTexto = 72
  const lineas: string[] = []
  let actual = ''
  for (const palabra of frase.split(' ')) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (ctx.measureText(prueba).width > W - xTexto - 72) {
      lineas.push(actual)
      actual = palabra
    } else actual = prueba
  }
  lineas.push(actual)
  lineas.forEach((l, i) => ctx.fillText(l, xTexto, 1130 + i * 52))

  ctx.fillStyle = 'rgba(255,255,255,.7)'
  ctx.font = `600 26px ${body}`
  ctx.fillText('primalex.vercel.app', xTexto, 1130 + lineas.length * 52 + 30)

  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/png'))
}

/** Comparte la imagen con el menú del celular; si el navegador no puede, la descarga. */
export async function compartirImagen(blob: Blob, nombre = 'mi-semana-prima-lex.png'): Promise<'compartida' | 'descargada'> {
  const archivo = new File([blob], nombre, { type: 'image/png' })
  try {
    if (navigator.canShare?.({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: 'Mi semana en Prima Lex', text: 'Mi semana de estudio en Prima Lex' })
      return 'compartida'
    }
  } catch (e) {
    // cerrar el menú de compartir no es un error
    if (e instanceof DOMException && e.name === 'AbortError') return 'compartida'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'descargada'
}

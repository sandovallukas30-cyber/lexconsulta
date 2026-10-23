import { parsearApunte, partirInline, type Bloque, type ItemLista, type TrozoInline } from './apunteFormato'
import { nombreArchivoApunte } from './apunteArchivo'
import type { ApunteModulo } from '../types'

/** Sacar un apunte de Prima Lex CON su formato (negritas, rojo, resaltado, recuadros, tablas, listas) para compartirlo
 *  o imprimirlo. El .md que se exportaba antes conserva las marcas de la sintaxis propia de la app, pero ninguna otra
 *  aplicación las dibuja; esto genera:
 *    - HTML con estilos en línea (se pega con formato en Word, Google Docs, Pages, correo…, y se abre en cualquier
 *      navegador, también en el celular);
 *    - un .doc que Word abre con el mismo aspecto;
 *    - texto plano al estilo WhatsApp (*negrita*, _cursiva_) para mensajes. */

type Datos = Pick<ApunteModulo, 'titulo' | 'contenido'> & Partial<Pick<ApunteModulo, 'fechaModificacion'>>

const COLOR = {
  rojo: '#dc2626',
  amarillo: '#fef08a',
  borde: '#d4d4d8',
  cabecera: '#f4f4f5',
  nota: '#bae6fd',
  tinta: '#18181b',
  suave: '#71717a',
}

const CITAS: Record<'amber' | 'rose' | 'orange' | 'zinc', { fondo: string; borde: string }> = {
  amber: { fondo: '#fffbeb', borde: '#fde68a' },
  rose: { fondo: '#fff1f2', borde: '#fecdd3' },
  orange: { fondo: '#fff7ed', borde: '#fed7aa' },
  zinc: { fondo: '#f4f4f5', borde: '#e4e4e7' },
}

function varianteDeIcono(icono: string): keyof typeof CITAS {
  if (icono.startsWith('⚠')) return 'orange'
  if (icono.startsWith('🎯')) return 'rose'
  if (icono.startsWith('⚖') || icono.startsWith('📌') || icono.startsWith('📷') || icono.startsWith('🔗')) return 'zinc'
  return 'amber'
}

export function escaparHtml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface Contexto {
  /** Notas al margen: pasan a una lista numerada al final (en papel y en otras apps no hay «pasar el mouse»). */
  notas: string[]
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

function inlineAHtml(texto: string, ctx: Contexto): string {
  return partirInline(texto)
    .map((tr: TrozoInline) => {
      if (!tr.tipo) return escaparHtml(tr.texto).replace(/\n/g, '<br>')
      const hijo = inlineAHtml(tr.texto, ctx)
      switch (tr.tipo) {
        case 'negrita':
          return `<strong>${hijo}</strong>`
        case 'subrayado':
          return `<u>${hijo}</u>`
        case 'cursiva':
          return `<em>${hijo}</em>`
        case 'rojo':
          return `<span style="color:${COLOR.rojo};font-weight:600">${hijo}</span>`
        case 'amarillo':
          return `<span style="background-color:${COLOR.amarillo}">${hijo}</span>`
        case 'grande':
          return `<span style="font-size:130%">${hijo}</span>`
        case 'enorme':
          return `<span style="font-size:170%">${hijo}</span>`
        case 'chico':
          return `<span style="font-size:82%">${hijo}</span>`
        case 'nota': {
          ctx.notas.push(tr.nota ?? '')
          return `<span style="background-color:${COLOR.nota}">${hijo}</span><sup>[${ctx.notas.length}]</sup>`
        }
      }
    })
    .join('')
}

/** Una lista del apunte puede mezclar viñetas y numeración: se parte en tramos del mismo tipo (<ul> o <ol>, y el
 *  <ol> arranca en el número que traiga el primer ítem). */
function listaAHtml(items: ItemLista[], ctx: Contexto): string {
  const tramos: ItemLista[][] = []
  for (const it of items) {
    const ultimo = tramos[tramos.length - 1]
    if (ultimo && (ultimo[0].marca === 'vineta') === (it.marca === 'vineta')) ultimo.push(it)
    else tramos.push([it])
  }
  return tramos
    .map((tramo) => {
      const numerada = tramo[0].marca !== 'vineta'
      const inicio = numerada ? Number.parseInt(tramo[0].marca, 10) : NaN
      const abre = numerada ? `<ol${Number.isFinite(inicio) && inicio !== 1 ? ` start="${inicio}"` : ''}` : '<ul'
      const lis = tramo
        .map((it) => {
          const hijos = it.hijos.length > 0 ? bloquesAHtml(it.hijos, ctx) : ''
          return `<li style="margin:3px 0">${it.texto ? inlineAHtml(it.texto, ctx) : ''}${hijos}</li>`
        })
        .join('')
      return `${abre} style="margin:0 0 12px;padding-left:1.6em">${lis}${numerada ? '</ol>' : '</ul>'}`
    })
    .join('')
}

function bloqueAHtml(b: Bloque, ctx: Contexto): string {
  switch (b.t) {
    case 'h': {
      const t = inlineAHtml(b.texto, ctx)
      if (b.n === 1) return `<h2 style="font-size:24px;line-height:1.25;margin:28px 0 10px">${t}</h2>`
      if (b.n === 2) return `<h3 style="font-size:20px;line-height:1.3;margin:24px 0 8px;padding-bottom:4px;border-bottom:1px solid ${COLOR.borde}">${t}</h3>`
      return `<h4 style="font-size:17px;line-height:1.3;margin:18px 0 6px">${t}</h4>`
    }
    case 'hr':
      return `<hr style="border:0;border-top:1px solid ${COLOR.borde};margin:20px 0">`
    case 'p':
      return `<p style="margin:0 0 12px;line-height:1.6${b.sangria > 0 ? `;margin-left:${b.sangria * 1.25}em` : ''}">${inlineAHtml(b.texto, ctx)}</p>`
    case 'lista':
      return listaAHtml(b.items, ctx)
    case 'cita': {
      const c = CITAS[varianteDeIcono(b.icono)]
      // tabla y no <div>: Word y Google Docs respetan fondo y borde de una celda, y a veces ignoran los de un div
      return (
        `<table style="width:100%;border-collapse:separate;border:1px solid ${c.borde};background-color:${c.fondo};margin:0 0 14px" cellpadding="8"><tr>` +
        (b.icono ? `<td style="width:1%;white-space:nowrap;vertical-align:top;font-size:120%;padding-right:2px">${escaparHtml(b.icono)}</td>` : '') +
        `<td style="vertical-align:top">${bloquesAHtml(b.hijos, ctx)}</td></tr></table>`
      )
    }
    case 'cols':
      return (
        `<table style="width:100%;border-collapse:collapse;margin:0 0 14px" cellpadding="6"><tr>` +
        b.cols.map((c) => `<td style="vertical-align:top;width:${Math.floor(100 / b.cols.length)}%">${bloquesAHtml(c, ctx)}</td>`).join('') +
        `</tr></table>`
      )
    case 'tabla': {
      const cuerpo = b.encabezado ? b.filas.slice(1) : b.filas
      const celda = (txt: string, cab: boolean) =>
        `<${cab ? 'th' : 'td'} style="border:1px solid ${COLOR.borde};padding:6px 10px;vertical-align:top;text-align:left;${cab ? `background-color:${COLOR.cabecera};font-weight:600` : ''}">${inlineAHtml(txt, ctx)}</${cab ? 'th' : 'td'}>`
      return (
        `<table style="width:100%;border-collapse:collapse;margin:0 0 14px;font-size:94%">` +
        (b.encabezado ? `<tr>${b.filas[0].map((c) => celda(c, true)).join('')}</tr>` : '') +
        cuerpo.map((f) => `<tr>${f.map((c) => celda(c, false)).join('')}</tr>`).join('') +
        `</table>`
      )
    }
  }
}

function bloquesAHtml(bloques: Bloque[], ctx: Contexto): string {
  return bloques.map((b) => bloqueAHtml(b, ctx)).join('\n')
}

function notasAHtml(ctx: Contexto): string {
  if (ctx.notas.length === 0) return ''
  return (
    `<hr style="border:0;border-top:1px solid ${COLOR.borde};margin:20px 0 8px"><p style="font-size:85%;color:${COLOR.suave};margin:0 0 4px"><strong>Notas</strong></p>` +
    `<ol style="font-size:85%;color:${COLOR.suave};margin:0;padding-left:1.6em">${ctx.notas.map((n) => `<li>${escaparHtml(n)}</li>`).join('')}</ol>`
  )
}

/** Solo el cuerpo del apunte con estilos en línea: lo que se copia al portapapeles. */
export function apunteAFragmentoHtml(a: Datos): string {
  const ctx: Contexto = { notas: [] }
  const cuerpo = bloquesAHtml(parsearApunte(a.contenido), ctx)
  return `<div style="font-family:Georgia,'Times New Roman',serif;color:${COLOR.tinta}"><h1 style="font-size:28px;line-height:1.2;margin:0 0 14px">${escaparHtml(a.titulo || 'Apunte')}</h1>\n${cuerpo}\n${notasAHtml(ctx)}</div>`
}

const ESTILO_DOC = `
  body { font-family: Georgia, 'Times New Roman', serif; color: ${COLOR.tinta}; background: #fff; line-height: 1.6; font-size: 16px; max-width: 800px; margin: 0 auto; padding: 24px 20px 40px; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pie { margin-top: 32px; padding-top: 8px; border-top: 1px solid ${COLOR.borde}; font: 12px system-ui, sans-serif; color: ${COLOR.suave}; }
  .meta { font: 13px system-ui, sans-serif; color: ${COLOR.suave}; margin: 0 0 20px; }
  @page { margin: 2cm; }
  @media print { body { max-width: none; padding: 0; font-size: 12.5px; } table, tr, li { break-inside: avoid; } h2, h3, h4 { break-after: avoid; } }
`

function fechaLarga(ms?: number): string {
  return new Date(ms ?? Date.now()).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Documento HTML completo y autosuficiente (sin recursos externos): se abre en cualquier navegador y se imprime bien. */
export function apunteAPaginaHtml(a: Datos, opciones: { word?: boolean } = {}): string {
  const ctx: Contexto = { notas: [] }
  const titulo = a.titulo || 'Apunte'
  const cuerpo = bloquesAHtml(parsearApunte(a.contenido), ctx)
  const metaWord = opciones.word
    ? '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->'
    : ''
  const raiz = opciones.word
    ? '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="es">'
    : '<html lang="es">'
  return (
    `<!doctype html>\n${raiz}<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${escaparHtml(titulo)}</title>${metaWord}<style>${ESTILO_DOC}</style></head><body>` +
    `<h1 style="font-size:30px;line-height:1.2;margin:0 0 6px">${escaparHtml(titulo)}</h1>` +
    `<p class="meta">Apunte de Prima Lex · ${fechaLarga(a.fechaModificacion)}</p>\n${cuerpo}\n${notasAHtml(ctx)}` +
    `<p class="pie">Hecho con Prima Lex · apunte personal</p></body></html>`
  )
}

// ---------------------------------------------------------------------------
// Texto plano (WhatsApp, mensajes, correo sin formato)
// ---------------------------------------------------------------------------

function inlineATexto(texto: string): string {
  return partirInline(texto)
    .map((tr) => {
      if (!tr.tipo) return tr.texto
      const h = inlineATexto(tr.texto)
      if (tr.tipo === 'negrita' || tr.tipo === 'rojo') return `*${h}*`
      if (tr.tipo === 'cursiva' || tr.tipo === 'subrayado') return `_${h}_`
      return h
    })
    .join('')
}

function bloqueATexto(b: Bloque, sangria = ''): string {
  switch (b.t) {
    case 'h':
      return `${sangria}*${inlineATexto(b.texto).replace(/\*/g, '')}*`
    case 'hr':
      return '———'
    case 'p':
      return sangria + inlineATexto(b.texto)
    case 'lista':
      return b.items
        .map((it) => {
          const marca = it.marca === 'vineta' ? '•' : it.marca
          const propio = `${sangria}${marca} ${inlineATexto(it.texto)}`
          const hijos = it.hijos.map((h) => bloqueATexto(h, sangria + '   ')).join('\n')
          return hijos ? `${propio}\n${hijos}` : propio
        })
        .join('\n')
    case 'cita':
      return `${b.icono ? b.icono + ' ' : ''}${b.hijos.map((h) => bloqueATexto(h)).join('\n')}`
    case 'cols':
      return b.cols.map((c) => c.map((h) => bloqueATexto(h)).join('\n')).join('\n\n')
    case 'tabla':
      return b.filas.map((f) => f.map((c) => inlineATexto(c)).join(' | ')).join('\n')
  }
}

export function apunteATextoPlano(a: Datos): string {
  const cuerpo = parsearApunte(a.contenido)
    .map((b) => bloqueATexto(b))
    .join('\n\n')
  return `*${(a.titulo || 'Apunte').replace(/\*/g, '')}*\n\n${cuerpo}\n`
}

// ---------------------------------------------------------------------------
// Entregas: portapapeles, archivos y menú de compartir del sistema
// ---------------------------------------------------------------------------

export function nombreArchivo(titulo: string, extension: string): string {
  return nombreArchivoApunte(titulo).replace(/\.md$/, `.${extension}`)
}

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function descargarApunteHtml(a: Datos) {
  descargarBlob(new Blob([apunteAPaginaHtml(a)], { type: 'text/html;charset=utf-8' }), nombreArchivo(a.titulo, 'html'))
}

export function descargarApunteWord(a: Datos) {
  // Word abre un HTML con extensión .doc y respeta fondos, bordes, tablas y listas
  descargarBlob(new Blob(['﻿', apunteAPaginaHtml(a, { word: true })], { type: 'application/msword' }), nombreArchivo(a.titulo, 'doc'))
}

/** Copia el apunte con formato (HTML) y, para apps que solo aceptan texto (WhatsApp), la versión con *negrita*. */
export async function copiarApunteConFormato(a: Datos): Promise<boolean> {
  const html = apunteAFragmentoHtml(a)
  const texto = apunteATextoPlano(a)
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([texto], { type: 'text/plain' }),
        }),
      ])
      return true
    }
  } catch {
    /* sigue con el método antiguo */
  }
  // método antiguo: se selecciona un bloque con el formato y se copia (conserva el HTML al pegar)
  const caja = document.createElement('div')
  caja.contentEditable = 'true'
  caja.innerHTML = html
  caja.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
  document.body.appendChild(caja)
  const rango = document.createRange()
  rango.selectNodeContents(caja)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(rango)
  let ok: boolean
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  sel?.removeAllRanges()
  caja.remove()
  return ok
}

/** ¿Este dispositivo puede abrir el menú de compartir con un archivo (iPhone, iPad, Android)? */
export function puedeCompartirArchivos(): boolean {
  try {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false
    return navigator.canShare({ files: [new File(['x'], 'a.html', { type: 'text/html' })] })
  } catch {
    return false
  }
}

/** Abre el menú de compartir del sistema con el apunte como página web (.html). Devuelve false si se canceló o no se pudo. */
export async function compartirApunte(a: Datos): Promise<boolean> {
  try {
    const archivo = new File([apunteAPaginaHtml(a)], nombreArchivo(a.titulo, 'html'), { type: 'text/html' })
    await navigator.share({ title: a.titulo || 'Apunte', files: [archivo] })
    return true
  } catch {
    return false
  }
}

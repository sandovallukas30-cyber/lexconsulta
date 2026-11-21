import { parsearApunte, partirInline, type Bloque, type ItemLista, type TrozoInline } from './apunteFormato'
import { nombreArchivo } from './apunteExportar'
import type { ApunteModulo } from '../types'

/** «Descargar PDF» de verdad: arma el archivo en el propio dispositivo (sin abrir el diálogo de impresión) y lo baja.
 *  Usa pdfmake, que se carga SOLO al tocar el botón (chunk aparte): no pesa en la carga normal de la app. El texto queda
 *  seleccionable y conserva negritas, color, resaltado, listas, recuadros y tablas. Los emojis se omiten porque la
 *  fuente del PDF no los dibuja. */

type Datos = Pick<ApunteModulo, 'titulo' | 'contenido'> & Partial<Pick<ApunteModulo, 'fechaModificacion'>>

const COLOR = { rojo: '#dc2626', amarillo: '#fef08a', borde: '#d4d4d8', cabecera: '#f4f4f5', nota: '#bae6fd', suave: '#71717a' }
const CITAS = {
  amber: { fondo: '#fffbeb', borde: '#fde68a' },
  rose: { fondo: '#fff1f2', borde: '#fecdd3' },
  orange: { fondo: '#fff7ed', borde: '#fed7aa' },
  zinc: { fondo: '#f4f4f5', borde: '#e4e4e7' },
}
const BASE = 10.5

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Nodo = any

function variante(icono: string): keyof typeof CITAS {
  if (icono.startsWith('⚠')) return 'orange'
  if (icono.startsWith('🎯')) return 'rose'
  if (icono.startsWith('⚖') || icono.startsWith('📌') || icono.startsWith('📷') || icono.startsWith('🔗')) return 'zinc'
  return 'amber'
}

/** La fuente del PDF no tiene emojis ni símbolos decorativos: se quitan para que no salgan cuadritos. */
function limpiar(t: string): string {
  return t.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/ {2,}/g, ' ')
}

interface Ctx {
  notas: string[]
}

function inline(texto: string, ctx: Ctx, heredado: Nodo = {}): Nodo[] {
  const salida: Nodo[] = []
  for (const tr of partirInline(texto) as TrozoInline[]) {
    if (!tr.tipo) {
      const limpio = limpiar(tr.texto)
      if (limpio) salida.push({ text: limpio, ...heredado })
      continue
    }
    let estilo: Nodo = { ...heredado }
    switch (tr.tipo) {
      case 'negrita': estilo = { ...estilo, bold: true }; break
      case 'cursiva': estilo = { ...estilo, italics: true }; break
      case 'subrayado': estilo = { ...estilo, decoration: 'underline' }; break
      case 'rojo': estilo = { ...estilo, color: COLOR.rojo, bold: true }; break
      case 'amarillo': estilo = { ...estilo, background: COLOR.amarillo }; break
      case 'grande': estilo = { ...estilo, fontSize: BASE * 1.3 }; break
      case 'enorme': estilo = { ...estilo, fontSize: BASE * 1.7 }; break
      case 'chico': estilo = { ...estilo, fontSize: BASE * 0.82 }; break
      case 'nota': {
        ctx.notas.push(tr.nota ?? '')
        estilo = { ...estilo, background: COLOR.nota }
        salida.push(...inline(tr.texto, ctx, estilo), { text: ` [${ctx.notas.length}]`, fontSize: BASE * 0.75, color: COLOR.suave })
        continue
      }
    }
    salida.push(...inline(tr.texto, ctx, estilo))
  }
  return salida.length > 0 ? salida : [{ text: '' }]
}

function lista(items: ItemLista[], ctx: Ctx): Nodo[] {
  const tramos: ItemLista[][] = []
  for (const it of items) {
    const ultimo = tramos[tramos.length - 1]
    if (ultimo && (ultimo[0].marca === 'vineta') === (it.marca === 'vineta')) ultimo.push(it)
    else tramos.push([it])
  }
  return tramos.map((tramo) => {
    const numerada = tramo[0].marca !== 'vineta'
    const cuerpo = tramo.map((it) => {
      const hijos = it.hijos.length > 0 ? bloques(it.hijos, ctx) : []
      return hijos.length > 0 ? { stack: [{ text: inline(it.texto, ctx) }, ...hijos] } : { text: inline(it.texto, ctx) }
    })
    if (!numerada) return { ul: cuerpo, margin: [0, 0, 0, 8] }
    const inicio = Number.parseInt(tramo[0].marca, 10)
    return { ol: cuerpo, start: Number.isFinite(inicio) ? inicio : 1, margin: [0, 0, 0, 8] }
  })
}

function anchosTabla(b: Extract<Bloque, { t: 'tabla' }>, columnas: number): Nodo[] {
  const a = b.anchos
  if (a && a.length === columnas && a.every((n) => n > 0)) {
    const suma = a.reduce((x, y) => x + y, 0)
    return a.map((n) => `${Math.max(8, Math.round((n / suma) * 100))}%`)
  }
  return Array(columnas).fill('*')
}

function bloque(b: Bloque, ctx: Ctx): Nodo[] {
  switch (b.t) {
    case 'h': {
      const tam = b.n === 1 ? 20 : b.n === 2 ? 15.5 : 12.5
      return [{ text: inline(b.texto, ctx, { bold: true }), fontSize: tam, margin: [0, b.n === 1 ? 14 : 10, 0, 5], keepWithNext: true }]
    }
    case 'hr':
      return [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: COLOR.borde }], margin: [0, 8, 0, 8] }]
    case 'p':
      return [{ text: inline(b.texto, ctx), margin: [b.sangria * 14, 0, 0, 7], lineHeight: 1.25 }]
    case 'lista':
      return lista(b.items, ctx)
    case 'cita': {
      const c = CITAS[variante(b.icono)]
      return [
        {
          table: { widths: ['*'], body: [[{ stack: bloques(b.hijos, ctx), fillColor: c.fondo, margin: [4, 2, 4, 0] }]] },
          layout: { hLineColor: () => c.borde, vLineColor: () => c.borde, hLineWidth: () => 0.8, vLineWidth: () => 0.8 },
          margin: [0, 2, 0, 9],
        },
      ]
    }
    case 'cols':
      return [{ columns: b.cols.map((c) => ({ stack: bloques(c, ctx) })), columnGap: 12, margin: [0, 0, 0, 8] }]
    case 'tabla': {
      const n = Math.max(1, ...b.filas.map((f) => f.length))
      const cuerpo = b.filas.map((fila, i) => {
        const cab = b.encabezado && i === 0
        return Array.from({ length: n }, (_, j) => ({
          text: inline(fila[j] ?? '', ctx, cab ? { bold: true } : {}),
          fillColor: cab ? COLOR.cabecera : undefined,
          fontSize: BASE * 0.94,
        }))
      })
      return [
        {
          table: { headerRows: b.encabezado ? 1 : 0, widths: anchosTabla(b, n), body: cuerpo, dontBreakRows: true },
          layout: { hLineColor: () => COLOR.borde, vLineColor: () => COLOR.borde, hLineWidth: () => 0.6, vLineWidth: () => 0.6, paddingTop: () => 3, paddingBottom: () => 3 },
          margin: [0, 0, 0, 10],
        },
      ]
    }
  }
}

function bloques(lista_: Bloque[], ctx: Ctx): Nodo[] {
  return lista_.flatMap((b) => bloque(b, ctx))
}

/** Arma y descarga el PDF. Devuelve false si no se pudo (el llamador avisa o usa la impresión del navegador). */
/** Baja de antemano el generador de PDF (1,5 MB) para que el primer clic en «Descargar PDF» no espere. */
export function precargarGeneradorPdf() {
  void Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).catch(() => {})
}

export async function descargarApunteComoPdf(a: Datos): Promise<boolean> {
  try {
    const ctx: Ctx = { notas: [] }
    const cuerpo = bloques(parsearApunte(a.contenido), ctx)
    const titulo = limpiar(a.titulo || 'Apunte').trim() || 'Apunte'
    const notas: Nodo[] =
      ctx.notas.length > 0
        ? [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: COLOR.borde }], margin: [0, 12, 0, 6] },
            { text: 'Notas', bold: true, fontSize: BASE * 0.9, color: COLOR.suave, margin: [0, 0, 0, 3] },
            { ol: ctx.notas.map((n) => ({ text: limpiar(n), fontSize: BASE * 0.85, color: COLOR.suave })) },
          ]
        : []

    const [{ default: pdfMake }, vfs] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ])
    const fuentes = (vfs as Nodo).default ?? vfs
    ;(pdfMake as Nodo).addVirtualFileSystem(fuentes)

    const definicion: Nodo = {
      pageSize: 'A4',
      pageMargins: [40, 44, 40, 48],
      info: { title: titulo, author: 'Prima Lex' },
      defaultStyle: { font: 'Roboto', fontSize: BASE },
      content: [
        { text: titulo, fontSize: 24, bold: true, margin: [0, 0, 0, 4] },
        {
          text: `Apunte de Prima Lex · ${new Date(a.fechaModificacion ?? Date.now()).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          fontSize: 9,
          color: COLOR.suave,
          margin: [0, 0, 0, 12],
        },
        ...cuerpo,
        ...notas,
      ],
      footer: (pagina: number, total: number) => ({ text: `${pagina} / ${total}`, alignment: 'center', fontSize: 8, color: COLOR.suave, margin: [0, 16, 0, 0] }),
    }
    await (pdfMake as Nodo).createPdf(definicion).download(nombreArchivo(a.titulo, 'pdf'))
    return true
  } catch (e) {
    console.error('PDF del apunte', e)
    return false
  }
}

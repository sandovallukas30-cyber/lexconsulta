import type { Editor } from '@tiptap/react'
import { selectedRect } from '@tiptap/pm/tables'

/** Ancho mínimo (px) de una columna: bajo eso el texto ya no se lee. */
export const ANCHO_MINIMO_COLUMNA = 60
/** Lo que cambia cada toque de «más ancha» / «más angosta». */
export const PASO_ANCHO_COLUMNA = 40

/** Cambia el ancho de la columna donde está el cursor, para todas sus filas: `delta` suma o resta píxeles y `null` la
 *  devuelve a ancho automático. Existe porque arrastrar el borde no se puede con el dedo (iPad). Devuelve `false` si el
 *  cursor no está en una tabla. */
export function cambiarAnchoColumna(editor: Editor, delta: number | null): boolean {
  const { state, view } = editor
  let rect: ReturnType<typeof selectedRect>
  try {
    rect = selectedRect(state)
  } catch {
    return false
  }
  const { map, tableStart, left } = rect
  const posiciones: number[] = []
  for (let fila = 0; fila < map.height; fila++) {
    const pos = map.map[fila * map.width + left]
    if (!posiciones.includes(pos)) posiciones.push(pos)
  }
  const primera = view.nodeDOM(tableStart + posiciones[0])
  const actual = primera instanceof HTMLElement ? primera.offsetWidth : 150
  const nuevo = delta === null ? null : Math.max(ANCHO_MINIMO_COLUMNA, Math.round(actual + delta))
  const tr = state.tr
  for (const pos of posiciones) {
    const celda = state.doc.nodeAt(tableStart + pos)
    if (!celda || celda.attrs.colspan > 1) continue
    tr.setNodeMarkup(tableStart + pos, null, { ...celda.attrs, colwidth: nuevo === null ? null : [nuevo] })
  }
  if (!tr.docChanged) return false
  view.dispatch(tr)
  if (nuevo === null) {
    // la vista de tablas de Tiptap no borra el ancho que ya tenía la columna: se limpia a mano
    const tabla = view.nodeDOM(tableStart - 1)
    if (tabla instanceof HTMLElement) tabla.querySelectorAll('col')[left]?.style.removeProperty('width')
  }
  return true
}

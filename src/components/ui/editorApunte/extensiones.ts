import { Mark, Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Paragraph from '@tiptap/extension-paragraph'
import { ListItem } from '@tiptap/extension-list'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'

/** Nota al margen: el texto anclado lleva la nota en `texto`. Va lo más afuera
 *  posible (prioridad alta) para que una nota sea un solo tramo aunque adentro
 *  haya negritas, colores, etc. */
export const Nota = Mark.create({
  name: 'nota',
  priority: 1200,
  inclusive: false,
  addAttributes() {
    return {
      texto: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-nota') ?? '',
        renderHTML: (attrs) => ({ 'data-nota': attrs.texto as string }),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-nota]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'ap-nota' }), 0]
  },
})

/** Tamaño de letra relativo: 1 grande, 2 enorme, -1 chico (0 = sin marca). */
export const Tamano = Mark.create({
  name: 'tamano',
  priority: 1100,
  addAttributes() {
    return {
      nivel: {
        default: 1,
        parseHTML: (el) => Number(el.getAttribute('data-tamano') ?? 1),
        renderHTML: (attrs) => ({ 'data-tamano': String(attrs.nivel) }),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-tamano]' }]
  },
  renderHTML({ HTMLAttributes, mark }) {
    const n = Number(mark.attrs.nivel)
    return ['span', mergeAttributes(HTMLAttributes, { class: n >= 2 ? 'ap-t2' : n > 0 ? 'ap-t1' : 'ap-tm' }), 0]
  },
})

export const Rojo = Mark.create({
  name: 'rojo',
  parseHTML() {
    return [{ tag: 'span[data-rojo]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-rojo': '', class: 'ap-rojo' }), 0]
  },
})

export const Amarillo = Mark.create({
  name: 'amarillo',
  parseHTML() {
    return [{ tag: 'mark[data-amarillo]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes, { 'data-amarillo': '', class: 'ap-amarillo' }), 0]
  },
})

export function varianteDeIcono(icono: string): 'amber' | 'rose' | 'orange' | 'zinc' {
  if (icono.startsWith('⚠')) return 'orange'
  if (icono.startsWith('🎯')) return 'rose'
  if (icono.startsWith('⚖') || icono.startsWith('📌') || icono.startsWith('📷') || icono.startsWith('🔗')) return 'zinc'
  return 'amber'
}

export const ICONOS_RECUADRO = ['📝', '💡', '🎯', '⚠️', '📌', '⚖️']

/** Recuadro destacado (los `> 📝 …` del texto). */
export const Recuadro = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      icono: {
        default: '📝',
        parseHTML: (el) => el.getAttribute('data-icono') ?? '',
        renderHTML: (attrs) => ({ 'data-icono': attrs.icono as string }),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    const icono = String(node.attrs.icono ?? '')
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-callout': '', class: `ap-callout ap-callout-${varianteDeIcono(icono)}` }),
      ['span', { class: 'ap-callout-icono', contenteditable: 'false' }, icono],
      ['div', { class: 'ap-callout-cuerpo' }, 0],
    ]
  },
  addCommands() {
    return {
      alternarRecuadro:
        (icono = '📝') =>
        ({ commands, editor }) =>
          editor.isActive(this.name) ? commands.lift(this.name) : commands.wrapIn(this.name, { icono }),
      cambiarIconoRecuadro:
        (icono: string) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { icono }),
    }
  },
})

export const Columna = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,
  parseHTML() {
    return [{ tag: 'div[data-columna]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-columna': '', class: 'ap-columna' }), 0]
  },
})

export const Columnas = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,6}',
  isolating: true,
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-columnas]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-columnas': '', class: 'ap-columnas' }), 0]
  },
  addCommands() {
    const vacia = () => ({ type: 'column', content: [{ type: 'paragraph' }] })
    return {
      insertarColumnas:
        (cantidad = 2) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, content: Array.from({ length: cantidad }, vacia) }),
      agregarColumna:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection
          for (let d = $from.depth; d > 0; d--) {
            const nodo = $from.node(d)
            if (nodo.type.name === this.name) {
              if (nodo.childCount >= 6) return false
              if (dispatch) {
                const fin = $from.before(d) + nodo.nodeSize - 1
                dispatch(state.tr.insert(fin, state.schema.nodeFromJSON(vacia())))
              }
              return true
            }
          }
          return false
        },
      quitarColumnas:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection
          for (let d = $from.depth; d > 0; d--) {
            const nodo = $from.node(d)
            if (nodo.type.name === this.name) {
              if (dispatch) {
                const contenido = nodo.content.content.flatMap((c) => c.content.content)
                dispatch(state.tr.replaceWith($from.before(d), $from.after(d), contenido))
              }
              return true
            }
          }
          return false
        },
    }
  },
})

/** Párrafo con sangría opcional (los párrafos con tab del texto original). */
const ParrafoSangria = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      sangria: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute('data-sangria') ?? 0),
        renderHTML: (attrs) => (attrs.sangria ? { 'data-sangria': String(attrs.sangria), style: `margin-left:${Number(attrs.sangria) * 1.25}em` } : {}),
      },
    }
  },
})

/** Un punto de lista: su texto y, debajo, párrafos o sub-listas (no recuadros ni
 *  tablas: el formato de texto no puede escribirlos dentro de un punto). */
const PuntoLista = ListItem.extend({
  content: 'paragraph (paragraph | bulletList | orderedList)*',
})

const CeldaTabla = TableCell.extend({ content: 'paragraph+' })
const CeldaEncabezado = TableHeader.extend({ content: 'paragraph+' })

export function crearExtensiones() {
  return [
    Nota,
    Tamano,
    Amarillo,
    Rojo,
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      paragraph: false,
      listItem: false,
      blockquote: false,
      code: false,
      codeBlock: false,
      strike: false,
      link: false,
    }),
    ParrafoSangria,
    PuntoLista,
    Table.configure({ resizable: false }),
    TableRow,
    CeldaEncabezado,
    CeldaTabla,
    Recuadro,
    Columnas,
    Columna,
  ]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      alternarRecuadro: (icono?: string) => ReturnType
      cambiarIconoRecuadro: (icono: string) => ReturnType
    }
    columns: {
      insertarColumnas: (cantidad?: number) => ReturnType
      agregarColumna: () => ReturnType
      quitarColumnas: () => ReturnType
    }
  }
}

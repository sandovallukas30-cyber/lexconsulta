import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { Editor } from '@tiptap/react'
import { useAjustes } from '../../../store/useAjustes'
import { PLANTILLAS_APUNTE } from '../../../data/plantillasApunte'
import { textoADoc } from '../../../services/apunteDoc'
import { registrarUso } from '../../../services/uso'

/** Menú de «/» al estilo Notion: al escribir una barra en una línea (sola o
 *  después de un espacio) se abre una lista de bloques —títulos, listas,
 *  recuadros, tabla…— que se filtra al seguir escribiendo y se elige con las
 *  flechas y Enter (o con el mouse). Sin símbolos de Markdown de por medio. */

interface Comando {
  id: string
  etiqueta: string
  ayuda: string
  icono: string
  /** Palabras con las que también se encuentra (sin tildes). */
  claves: string
  /** No sale en la lista de entrada: solo cuando lo que se escribe después de «/» lo nombra. */
  soloBusqueda?: boolean
  ejecutar: (ed: Editor, rango: { from: number; to: number }) => void
}

const cadena = (ed: Editor, r: { from: number; to: number }) => ed.chain().focus().deleteRange(r)

const COMANDOS: Comando[] = [
  { id: 'texto', etiqueta: 'Texto', ayuda: 'Párrafo normal', icono: 'ti-text-size', claves: 'texto parrafo normal', ejecutar: (e, r) => cadena(e, r).setParagraph().run() },
  { id: 'h1', etiqueta: 'Título', ayuda: 'Título grande', icono: 'ti-h-1', claves: 'titulo h1 encabezado grande', ejecutar: (e, r) => cadena(e, r).setHeading({ level: 1 }).run() },
  { id: 'h2', etiqueta: 'Subtítulo', ayuda: 'Título mediano', icono: 'ti-h-2', claves: 'subtitulo h2 encabezado mediano', ejecutar: (e, r) => cadena(e, r).setHeading({ level: 2 }).run() },
  { id: 'h3', etiqueta: 'Sección', ayuda: 'Título chico', icono: 'ti-h-3', claves: 'seccion h3 encabezado chico', ejecutar: (e, r) => cadena(e, r).setHeading({ level: 3 }).run() },
  { id: 'vinetas', etiqueta: 'Lista con viñetas', ayuda: 'Puntos para ideas sueltas', icono: 'ti-list', claves: 'lista vinetas puntos bullets', ejecutar: (e, r) => cadena(e, r).toggleBulletList().run() },
  { id: 'numerada', etiqueta: 'Lista numerada', ayuda: 'Pasos, requisitos, elementos', icono: 'ti-list-numbers', claves: 'lista numerada numeros pasos requisitos', ejecutar: (e, r) => cadena(e, r).toggleOrderedList().run() },
  { id: 'idea', etiqueta: 'Idea clave', ayuda: 'Recuadro 🎯 para lo que más cae', icono: 'ti-target', claves: 'idea clave recuadro importante cae', ejecutar: (e, r) => cadena(e, r).alternarRecuadro('🎯').run() },
  { id: 'nota', etiqueta: 'Nota', ayuda: 'Recuadro 📝 para aclaraciones', icono: 'ti-note', claves: 'nota recuadro aclaracion', ejecutar: (e, r) => cadena(e, r).alternarRecuadro('📝').run() },
  { id: 'ojo', etiqueta: 'Ojo', ayuda: 'Recuadro ⚠️ para una advertencia', icono: 'ti-alert-triangle', claves: 'ojo atencion advertencia cuidado excepcion', ejecutar: (e, r) => cadena(e, r).alternarRecuadro('⚠️').run() },
  { id: 'articulo', etiqueta: 'Artículo', ayuda: 'Recuadro ⚖️ para citar una norma', icono: 'ti-scale', claves: 'articulo norma ley cita codigo', ejecutar: (e, r) => cadena(e, r).alternarRecuadro('⚖️').run() },
  { id: 'tabla', etiqueta: 'Tabla', ayuda: 'Para comparar conceptos', icono: 'ti-table', claves: 'tabla comparar cuadro', ejecutar: (e, r) => cadena(e, r).insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run() },
  { id: 'columnas', etiqueta: 'Dos columnas', ayuda: 'Una cosa al lado de la otra', icono: 'ti-columns', claves: 'columnas dos lado a lado', ejecutar: (e, r) => cadena(e, r).insertarColumnas(2).run() },
  { id: 'separador', etiqueta: 'Línea separadora', ayuda: 'Divide el apunte en partes', icono: 'ti-separator-horizontal', claves: 'linea separador divisor', ejecutar: (e, r) => cadena(e, r).setHorizontalRule().run() },
]

/** Las plantillas de apunte, como bloques que se insertan donde está el cursor (sin ocupar un lugar vistoso). */
const PLANTILLAS: Comando[] = PLANTILLAS_APUNTE.map((p) => ({
  id: `plantilla-${p.id}`,
  etiqueta: `Plantilla: ${p.nombre}`,
  ayuda: p.descripcion,
  icono: p.icono,
  claves: `plantilla modelo estructura ${p.id} ${p.nombre.toLowerCase()}`,
  soloBusqueda: true,
  ejecutar: (e, r) => {
    registrarUso('apunte.plantilla')
    e.chain().focus().deleteRange(r).insertContent(textoADoc(p.contenido).content ?? []).run()
  },
}))

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

interface Abierto {
  desde: number
  consulta: string
  x: number
  y: number
}

/** Qué hay antes del cursor: una «/» al inicio de la línea o tras un espacio, y lo escrito después. */
function detectar(ed: Editor): Abierto | null {
  const sel = ed.state.selection
  if (!sel.empty || !sel.$from.parent.isTextblock) return null
  const antes = sel.$from.parent.textBetween(0, sel.$from.parentOffset, undefined, '￼')
  const m = /(?:^|\s)\/([\p{L}]{0,20})$/u.exec(antes)
  if (!m) return null
  try {
    const c = ed.view.coordsAtPos(sel.from)
    const z = useAjustes.getState().zoom || 1
    return { desde: sel.from - m[1].length - 1, consulta: m[1], x: c.left / z, y: c.bottom / z }
  } catch {
    return null
  }
}

export function MenuComandos({ editor, teclas }: { editor: Editor | null; teclas: MutableRefObject<(e: KeyboardEvent) => boolean> }) {
  const [abierto, setAbierto] = useState<Abierto | null>(null)
  const [indice, setIndice] = useState(0)
  const [cerradoEn, setCerradoEn] = useState<number | null>(null)
  const refLista = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editor) return
    const actualizar = () => {
      const d = detectar(editor)
      setAbierto(d)
      if (!d) setCerradoEn(null)
    }
    editor.on('update', actualizar)
    editor.on('selectionUpdate', actualizar)
    return () => {
      editor.off('update', actualizar)
      editor.off('selectionUpdate', actualizar)
    }
  }, [editor])

  const visible = abierto && abierto.desde !== cerradoEn ? abierto : null
  const filtrados = useMemo(() => {
    if (!visible) return []
    const q = sinTildes(visible.consulta)
    return [...COMANDOS, ...PLANTILLAS].filter((c) => (c.soloBusqueda ? q.length >= 2 : true) && (!q || sinTildes(c.etiqueta).includes(q) || c.claves.includes(q)))
  }, [visible])

  // el índice nunca se sale de la lista al filtrar
  const activo = Math.min(indice, Math.max(0, filtrados.length - 1))

  const elegir = (c: Comando) => {
    if (!editor || !visible) return
    c.ejecutar(editor, { from: visible.desde, to: editor.state.selection.from })
    setAbierto(null)
    setIndice(0)
  }

  // el editor llama a esto en cada tecla: devuelve true si el menú la usó
  teclas.current = (e) => {
    if (!visible || filtrados.length === 0) return false
    if (e.key === 'ArrowDown') {
      setIndice((activo + 1) % filtrados.length)
    } else if (e.key === 'ArrowUp') {
      setIndice((activo - 1 + filtrados.length) % filtrados.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      elegir(filtrados[activo])
    } else if (e.key === 'Escape') {
      setCerradoEn(visible.desde)
      e.stopPropagation() // que Escape no cierre también el editor
    } else return false
    e.preventDefault()
    return true
  }

  useEffect(() => {
    refLista.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activo, visible])

  if (!visible || filtrados.length === 0) return null
  const arriba = visible.y + 300 > window.innerHeight / (useAjustes.getState().zoom || 1)
  return (
    <div
      ref={refLista}
      role="listbox"
      aria-label="Insertar bloque"
      className="fixed z-[95] w-64 max-h-72 overflow-y-auto rounded-2xl p-1.5"
      style={{
        left: Math.max(8, visible.x),
        ...(arriba ? { bottom: window.innerHeight / (useAjustes.getState().zoom || 1) - visible.y + 28 } : { top: visible.y + 6 }),
        background: 'var(--neu-card, #fff)',
        boxShadow: '8px 8px 24px rgba(15, 20, 50, 0.22), 0 0 0 1px rgba(120,130,170,0.18)',
      }}
    >
      <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#8a92b0' }}>Insertar</p>
      {filtrados.map((c, i) => (
        <button
          key={c.id}
          role="option"
          aria-selected={i === activo}
          onMouseDown={(e) => {
            e.preventDefault()
            elegir(c)
          }}
          onMouseEnter={() => setIndice(i)}
          className="sin-neu sin-tactil w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left"
          style={{ background: i === activo ? 'color-mix(in srgb, var(--accent-base) 12%, transparent)' : 'transparent' }}
        >
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(120,130,170,0.12)', color: 'var(--accent-base)' }}>
            <i className={`ti ${c.icono} text-base`} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold" style={{ color: '#1f2344' }}>{c.etiqueta}</span>
            <span className="block text-[11px] truncate" style={{ color: '#6b7390' }}>{c.ayuda}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

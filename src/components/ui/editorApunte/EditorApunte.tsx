import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import { TEMAS_LECTURA } from '../../../services/lecturaTema'
import { docATexto, textoADoc, type NodoDoc } from '../../../services/apunteDoc'
import type { TemaLectura } from '../../../types'
import { NotasMargen } from '../NotasMargen'
import { crearExtensiones, ICONOS_RECUADRO } from './extensiones'
import './editorApunte.css'

const VERDE = 'var(--accent-base)'
const ESPERA_GUARDADO_MS = 700

interface Props {
  titulo: string
  contenido: string
  tema: TemaLectura
  tamanoPx: number
  onTitulo: (titulo: string) => void
  onContenido: (texto: string) => void
  onTerminar: () => void
}

interface PanelNota {
  desde: number
  hasta: number
  texto: string
}

const TemaCtx = createContext(TEMAS_LECTURA.claro)

interface PropsBoton {
  icono?: string
  titulo: string
  activo?: boolean
  onClick: () => void
  color?: string
  deshabilitado?: boolean
  texto?: string
}

function Boton({ icono, titulo, activo = false, onClick, color, deshabilitado = false, texto }: PropsBoton) {
  const tema = useContext(TemaCtx)
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={activo}
      disabled={deshabilitado}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-30 ${
        activo ? `${tema.chipBg} ${tema.text}` : `${color ?? tema.textSoft} ${tema.hoverSuave}`
      } ${texto ? 'text-xs font-bold' : ''}`}
    >
      {texto ?? <i className={`ti ${icono} text-base`} />}
    </button>
  )
}

function Separador() {
  const tema = useContext(TemaCtx)
  return <div className={`w-px h-5 mx-1 flex-shrink-0 border-l ${tema.border}`} />
}

function estadoDe(editor: Editor) {
  const tamano = editor.isActive('tamano') ? Number(editor.getAttributes('tamano').nivel) : 0
  const nivelTitulo = [1, 2, 3].find((n) => editor.isActive('heading', { level: n })) ?? 0
  let ancho = false
  editor.state.doc.forEach((n) => {
    if (n.type.name === 'columns' || n.type.name === 'table') ancho = true
  })
  return {
    negrita: editor.isActive('bold'),
    cursiva: editor.isActive('italic'),
    subrayado: editor.isActive('underline'),
    rojo: editor.isActive('rojo'),
    amarillo: editor.isActive('amarillo'),
    nota: editor.isActive('nota'),
    tamano,
    nivelTitulo,
    vinetas: editor.isActive('bulletList'),
    numerada: editor.isActive('orderedList'),
    enLista: editor.isActive('listItem'),
    recuadro: editor.isActive('callout'),
    icono: editor.isActive('callout') ? String(editor.getAttributes('callout').icono ?? '') : '',
    tabla: editor.isActive('table'),
    columnas: editor.isActive('columns'),
    deshacer: editor.can().undo(),
    rehacer: editor.can().redo(),
    haySeleccion: !editor.state.selection.empty,
    ancho,
  }
}

export default function EditorApunte({ titulo, contenido, tema: temaLectura, tamanoPx, onTitulo, onContenido, onTerminar }: Props) {
  const tema = TEMAS_LECTURA[temaLectura]
  const scrollRef = useRef<HTMLDivElement>(null)
  const refTitulo = useRef<HTMLTextAreaElement>(null)
  const [columna, setColumna] = useState<HTMLElement | null>(null)
  const [version, setVersion] = useState(0)
  const [panelNota, setPanelNota] = useState<PanelNota | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [flotante, setFlotante] = useState<{ top: number; left: number } | null>(null)
  const temporizador = useRef<number | undefined>(undefined)
  const pendiente = useRef(false)
  const alContenido = useRef(onContenido)
  useEffect(() => {
    alContenido.current = onContenido
  }, [onContenido])

  // el título ocupa las líneas que necesite (un título largo no se corta)
  useLayoutEffect(() => {
    const el = refTitulo.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [titulo, tamanoPx, columna])

  const docInicial = useMemo(() => textoADoc(contenido), []) // eslint-disable-line react-hooks/exhaustive-deps
  const extensiones = useMemo(() => crearExtensiones(), [])

  const guardarAhora = useCallback((editor: Editor | null) => {
    window.clearTimeout(temporizador.current)
    if (!editor || !pendiente.current) return
    pendiente.current = false
    try {
      alContenido.current(docATexto(editor.getJSON() as NodoDoc))
    } catch {
      pendiente.current = true
    }
  }, [])

  const editor = useEditor({
    extensions: extensiones,
    content: docInicial,
    autofocus: 'start',
    editorProps: { attributes: { class: 'ap-editor', spellcheck: 'true', 'aria-label': 'Contenido del apunte' } },
    onUpdate: ({ editor: ed }) => {
      pendiente.current = true
      setVersion((v) => v + 1)
      window.clearTimeout(temporizador.current)
      temporizador.current = window.setTimeout(() => guardarAhora(ed), ESPERA_GUARDADO_MS)
    },
  })

  const estado = useEditorState({ editor, selector: ({ editor: ed }) => (ed ? estadoDe(ed) : null) })

  // guardar lo pendiente al salir (Listo, Escape o cerrar la pantalla)
  useEffect(() => {
    if (!editor) return
    const alSalir = () => guardarAhora(editor)
    window.addEventListener('pagehide', alSalir)
    return () => {
      window.removeEventListener('pagehide', alSalir)
      alSalir()
    }
  }, [editor, guardarAhora])

  const terminar = useCallback(() => {
    guardarAhora(editor)
    onTerminar()
  }, [editor, guardarAhora, onTerminar])

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (panelNota) setPanelNota(null)
      else terminar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [terminar, panelNota])

  // barra flotante sobre el texto seleccionado
  useEffect(() => {
    if (!editor) return
    const actualizar = () => {
      const { from, to, empty } = editor.state.selection
      if (empty || !editor.isFocused) return setFlotante(null)
      try {
        const a = editor.view.coordsAtPos(from)
        const b = editor.view.coordsAtPos(to)
        const centro = (Math.min(a.left, b.left) + Math.max(a.right, b.right)) / 2
        setFlotante({ top: Math.max(8, Math.min(a.top, b.top) - 46), left: Math.min(Math.max(centro, 190), window.innerWidth - 190) })
      } catch {
        setFlotante(null)
      }
    }
    editor.on('selectionUpdate', actualizar)
    editor.on('blur', () => setFlotante(null))
    const scroll = scrollRef.current
    scroll?.addEventListener('scroll', actualizar)
    return () => {
      editor.off('selectionUpdate', actualizar)
      scroll?.removeEventListener('scroll', actualizar)
    }
  }, [editor])

  if (!editor || !estado) {
    return <div className={`flex-1 flex items-center justify-center text-sm ${tema.textSoft}`}>Preparando el editor…</div>
  }

  const cambiarTamano = (delta: number) => {
    const nuevo = Math.max(-1, Math.min(2, estado.tamano + delta))
    const cadena = editor.chain().focus()
    if (nuevo === 0) cadena.unsetMark('tamano').run()
    else cadena.setMark('tamano', { nivel: nuevo }).run()
  }

  const abrirNota = () => {
    setAviso(null)
    if (estado.nota) {
      editor.chain().focus().extendMarkRange('nota').run()
      const { from, to } = editor.state.selection
      setPanelNota({ desde: from, hasta: to, texto: String(editor.getAttributes('nota').texto ?? '') })
    } else if (estado.haySeleccion) {
      const { from, to } = editor.state.selection
      setPanelNota({ desde: from, hasta: to, texto: '' })
    } else {
      setAviso('Para agregar una nota, primero selecciona el texto al que se refiere.')
    }
  }

  const guardarNota = (texto: string) => {
    if (!panelNota) return
    const limpio = texto.trim()
    const cadena = editor.chain().focus().setTextSelection({ from: panelNota.desde, to: panelNota.hasta })
    if (limpio) cadena.setMark('nota', { texto: limpio }).run()
    else cadena.unsetMark('nota').run()
    setPanelNota(null)
  }

  const irAlAncla = (indice: number) => {
    const el = editor.view.dom.querySelectorAll('[data-nota]')[indice]
    if (!el) return null
    return editor.view.posAtDOM(el, 0)
  }
  const cambiarNota = (indice: number, texto: string) => {
    const pos = irAlAncla(indice)
    if (pos === null) return
    editor
      .chain()
      .setTextSelection(pos + 1)
      .extendMarkRange('nota')
      .updateAttributes('nota', { texto })
      .run()
  }
  const quitarNota = (indice: number) => {
    const pos = irAlAncla(indice)
    if (pos === null) return
    editor
      .chain()
      .setTextSelection(pos + 1)
      .extendMarkRange('nota')
      .unsetMark('nota')
      .run()
  }

  const barraFormato = (
    <>
      <Boton icono="ti-bold" titulo="Negrita (Ctrl+B)" activo={estado.negrita} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Boton icono="ti-italic" titulo="Cursiva (Ctrl+I)" activo={estado.cursiva} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Boton icono="ti-underline" titulo="Subrayado (Ctrl+U)" activo={estado.subrayado} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <Boton
        icono="ti-letter-a"
        titulo="Texto rojo — lo importante"
        activo={estado.rojo}
        color="text-red-500"
        onClick={() => editor.chain().focus().toggleMark('rojo').run()}
      />
      <Boton
        icono="ti-highlight"
        titulo="Marcador amarillo — ejemplos"
        activo={estado.amarillo}
        color="text-amber-500"
        onClick={() => editor.chain().focus().toggleMark('amarillo').run()}
      />
      <Boton texto="A−" titulo="Letra más chica" deshabilitado={estado.tamano <= -1} onClick={() => cambiarTamano(-1)} />
      <Boton texto="A+" titulo="Letra más grande" deshabilitado={estado.tamano >= 2} onClick={() => cambiarTamano(1)} />
      <Boton icono="ti-message-2-plus" titulo="Nota al margen" activo={estado.nota} color="text-sky-500" onClick={abrirNota} />
    </>
  )

  return (
    <TemaCtx.Provider value={tema}>
      <div className="flex-1 min-h-0 flex flex-col">
        <div className={`flex items-center gap-2 pl-3 pr-3 sm:px-5 py-1.5 border-b flex-shrink-0 ${tema.border}`}>
          <div className="flex-1 min-w-0 flex items-center gap-0.5 overflow-x-auto" role="toolbar" aria-label="Herramientas de edición">
            <Boton icono="ti-arrow-back-up" titulo="Deshacer (Ctrl+Z)" deshabilitado={!estado.deshacer} onClick={() => editor.chain().focus().undo().run()} />
            <Boton icono="ti-arrow-forward-up" titulo="Rehacer (Ctrl+Y)" deshabilitado={!estado.rehacer} onClick={() => editor.chain().focus().redo().run()} />
            <Separador />
            <select
              aria-label="Estilo del párrafo"
              value={estado.nivelTitulo}
              disabled={estado.enLista}
              onChange={(e) => {
                const n = Number(e.target.value)
                const c = editor.chain().focus()
                if (n === 0) c.setParagraph().run()
                else c.setHeading({ level: n as 1 | 2 | 3 }).run()
              }}
              className={`h-8 rounded-md px-2 text-xs flex-shrink-0 outline-none disabled:opacity-40 ${tema.chipBg} ${tema.text}`}
            >
              <option value={0}>Texto</option>
              <option value={1}>Título</option>
              <option value={2}>Subtítulo</option>
              <option value={3}>Sección</option>
            </select>
            <Separador />
            {barraFormato}
            <Boton icono="ti-clear-formatting" titulo="Quitar formato" onClick={() => editor.chain().focus().unsetAllMarks().run()} />
            <Separador />
            <Boton icono="ti-list" titulo="Viñetas (Tab = sub-nivel)" activo={estado.vinetas} onClick={() => editor.chain().focus().toggleBulletList().run()} />
            <Boton icono="ti-list-numbers" titulo="Lista numerada" activo={estado.numerada} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
            <Boton icono="ti-quote" titulo="Recuadro destacado" activo={estado.recuadro} onClick={() => editor.chain().focus().alternarRecuadro().run()} />
            <Boton
              icono="ti-table"
              titulo="Insertar tabla"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}
            />
            <Boton icono="ti-columns" titulo="Insertar columnas" onClick={() => editor.chain().focus().insertarColumnas(2).run()} />
            <Boton icono="ti-separator-horizontal" titulo="Línea separadora" onClick={() => editor.chain().focus().setHorizontalRule().run()} />

            {estado.recuadro && (
              <>
                <Separador />
                {ICONOS_RECUADRO.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    title={`Ícono del recuadro ${ic}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().cambiarIconoRecuadro(ic).run()}
                    className={`w-7 h-8 rounded-md flex-shrink-0 text-sm ${estado.icono === ic ? tema.chipBg : tema.hoverSuave}`}
                  >
                    {ic}
                  </button>
                ))}
              </>
            )}
            {estado.tabla && (
              <>
                <Separador />
                <Boton icono="ti-row-insert-bottom" titulo="Agregar fila" onClick={() => editor.chain().focus().addRowAfter().run()} />
                <Boton icono="ti-column-insert-right" titulo="Agregar columna a la tabla" onClick={() => editor.chain().focus().addColumnAfter().run()} />
                <Boton icono="ti-row-remove" titulo="Quitar fila" onClick={() => editor.chain().focus().deleteRow().run()} />
                <Boton icono="ti-column-remove" titulo="Quitar columna de la tabla" onClick={() => editor.chain().focus().deleteColumn().run()} />
                <Boton icono="ti-table-off" titulo="Eliminar tabla" color="text-red-500" onClick={() => editor.chain().focus().deleteTable().run()} />
              </>
            )}
            {estado.columnas && (
              <>
                <Separador />
                <Boton icono="ti-layout-columns" titulo="Agregar una columna" onClick={() => editor.chain().focus().agregarColumna().run()} />
                <Boton
                  icono="ti-layout-list"
                  titulo="Quitar las columnas (deja el texto)"
                  color="text-red-500"
                  onClick={() => editor.chain().focus().quitarColumnas().run()}
                />
              </>
            )}
          </div>
          <button
            type="button"
            onClick={terminar}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-white flex-shrink-0"
            style={{ background: VERDE }}
          >
            <i className="ti ti-check text-sm" />
            Listo
          </button>
        </div>

        {(panelNota || aviso) && (
          <div className={`px-3 sm:px-5 py-2 border-b flex-shrink-0 text-xs ${tema.border} ${tema.chipBg} ${tema.text}`}>
            {panelNota ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  guardarNota((e.currentTarget.elements.namedItem('nota') as HTMLInputElement).value)
                }}
              >
                <i className="ti ti-message-2 text-sm text-sky-500" aria-hidden />
                <input
                  name="nota"
                  autoFocus
                  defaultValue={panelNota.texto}
                  placeholder="Escribe la nota para el margen…"
                  className={`flex-1 min-w-0 rounded-md px-2 py-1 outline-none border ${tema.border} bg-transparent`}
                />
                <button type="submit" className="px-2.5 py-1 rounded-md text-white font-medium" style={{ background: VERDE }}>
                  Guardar nota
                </button>
                <button type="button" onClick={() => setPanelNota(null)} className={`px-2 py-1 rounded-md ${tema.hoverSuave}`}>
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>{aviso}</span>
                <button type="button" onClick={() => setAviso(null)} className={`px-2 py-0.5 rounded-md ${tema.hoverSuave}`}>
                  Entendido
                </button>
              </div>
            )}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <div ref={setColumna} className={`relative ${estado.ancho ? 'max-w-4xl' : 'max-w-2xl'} mx-auto px-5 sm:px-8 py-10`}>
            <textarea
              ref={refTitulo}
              value={titulo}
              rows={1}
              onChange={(e) => onTitulo(e.target.value.replace(/\n/g, ' '))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  editor.commands.focus('start')
                }
              }}
              aria-label="Título del apunte"
              placeholder="Título"
              className={`w-full bg-transparent outline-none resize-none overflow-hidden text-2xl sm:text-3xl font-serif font-bold mb-6 placeholder:opacity-40 ${tema.text}`}
            />
            <div
              className={`ap-tema-${temaLectura} ${temaLectura === 'oscuro' ? 'text-zinc-200' : temaLectura === 'papel' ? 'text-[#3a2c1a]' : 'text-zinc-800'}`}
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: tamanoPx }}
            >
              <EditorContent editor={editor} />
            </div>
            <NotasMargen
              columna={columna}
              raiz={editor.view.dom as HTMLElement}
              version={`${version}-${tamanoPx}`}
              tema={temaLectura}
              onCambiar={cambiarNota}
              onEliminar={quitarNota}
            />
          </div>
        </div>

        {flotante && !panelNota && (
          <div
            className={`fixed z-[90] flex items-center gap-0.5 rounded-xl border p-1 shadow-lg ${tema.bg} ${tema.border}`}
            style={{ top: flotante.top, left: flotante.left, transform: 'translateX(-50%)' }}
            role="toolbar"
            aria-label="Formato de la selección"
          >
            {barraFormato}
          </div>
        )}
      </div>
    </TemaCtx.Provider>
  )
}

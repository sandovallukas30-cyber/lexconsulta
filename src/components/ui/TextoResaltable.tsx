import { useCallback, useRef, useState, Fragment, type ReactNode, type CSSProperties } from 'react'

/** Color fijo tipo resaltador de verdad — no depende de modoOscuro (un
 * marcador amarillo se ve igual sobre cualquier fondo, es justamente la idea
 * de un resaltador físico). */
const COLOR_RESALTADO = '#fde047'
const COLOR_TEXTO_RESALTADO = '#1c1917'

/**
 * Envuelve el cuerpo de un artículo (uno o más <p>, hijos de este
 * componente) para poder seleccionar una frase con el mouse y resaltarla con
 * un botón flotante — como un marcador de texto real, distinto de la nota
 * libre que ya existe en Colecciones (esa es para tu propia interpretación;
 * esto es para marcar el texto oficial en sí).
 *
 * Compartido entre Explorador y las fichas de Colecciones: es el mismo
 * artículo, mismo dato guardado (`subrayados` en el store, por
 * `codigo::articulo`), así que un resaltado hecho en una vista aparece en
 * la otra.
 */
export function ContenedorResaltable({
  children,
  onAgregar,
}: {
  children: ReactNode
  onAgregar: (frase: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [boton, setBoton] = useState<{ x: number; y: number; frase: string } | null>(null)

  const revisarSeleccion = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !ref.current) {
      setBoton(null)
      return
    }
    const frase = sel.toString().trim().replace(/\s+/g, ' ')
    // Selecciones vacías, gigantes (arrastró toda la página sin querer) o de
    // otra parte del documento (otro artículo, el sidebar) se ignoran.
    if (!frase || frase.length > 600 || !sel.anchorNode || !ref.current.contains(sel.anchorNode)) {
      setBoton(null)
      return
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    const rectContenedor = ref.current.getBoundingClientRect()
    setBoton({ x: rect.left + rect.width / 2 - rectContenedor.left, y: rect.top - rectContenedor.top, frase })
  }, [])

  return (
    <div ref={ref} className="relative" onMouseUp={revisarSeleccion}>
      {children}
      {boton && (
        <button
          onClick={() => {
            onAgregar(boton.frase)
            window.getSelection()?.removeAllRanges()
            setBoton(null)
          }}
          className="absolute z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg whitespace-nowrap"
          style={{
            left: boton.x,
            top: boton.y,
            transform: 'translate(-50%, calc(-100% - 8px))',
            background: COLOR_RESALTADO,
            color: COLOR_TEXTO_RESALTADO,
          }}
        >
          <i className="ti ti-highlight text-sm" />
          Resaltar
        </button>
      )}
    </div>
  )
}

/**
 * Un párrafo con las frases ya guardadas envueltas en <mark>. Clic en un
 * resaltado existente lo quita (toggle). Guarda la frase EXACTA seleccionada
 * (no una posición de caracteres): el texto oficial de un artículo no
 * cambia, así que buscarla literal en el párrafo alcanza, sin tener que
 * recalcular offsets si el texto se parte en incisos para renderizarlo. Si
 * la misma frase aparece más de una vez en el artículo, se resalta en todas
 * las apariciones — aceptable para una primera versión.
 */
export function ParrafoResaltado({
  texto,
  subrayados,
  onQuitar,
  className,
  style,
}: {
  texto: string
  subrayados: string[]
  onQuitar: (frase: string) => void
  className?: string
  style?: CSSProperties
}) {
  if (subrayados.length === 0) {
    return (
      <p className={className} style={style}>
        {texto}
      </p>
    )
  }

  type Segmento = { texto: string; resaltado: boolean }
  let segmentos: Segmento[] = [{ texto, resaltado: false }]
  for (const frase of subrayados) {
    if (!frase) continue
    const siguientes: Segmento[] = []
    for (const seg of segmentos) {
      if (seg.resaltado) {
        siguientes.push(seg)
        continue
      }
      const partes = seg.texto.split(frase)
      partes.forEach((parte, i) => {
        if (parte) siguientes.push({ texto: parte, resaltado: false })
        if (i < partes.length - 1) siguientes.push({ texto: frase, resaltado: true })
      })
    }
    segmentos = siguientes
  }

  return (
    <p className={className} style={style}>
      {segmentos.map((seg, i) =>
        seg.resaltado ? (
          <mark
            key={i}
            onClick={() => onQuitar(seg.texto)}
            title="Quitar resaltado"
            style={{ background: COLOR_RESALTADO, color: COLOR_TEXTO_RESALTADO, cursor: 'pointer', borderRadius: 2 }}
          >
            {seg.texto}
          </mark>
        ) : (
          <Fragment key={i}>{seg.texto}</Fragment>
        )
      )}
    </p>
  )
}

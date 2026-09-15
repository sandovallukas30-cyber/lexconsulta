import { useCallback, useEffect, useRef, useState, Fragment, type ReactNode, type CSSProperties } from 'react'
import type { CoincidenciaReferencia, ReferenciaArticulo } from '../../services/referencias'

/** Color fijo tipo resaltador de verdad — no depende de modoOscuro (un
 * marcador se ve igual sobre cualquier fondo, es justamente la idea de un
 * resaltador físico). */
const COLOR_RESALTADO = '#fbcfe8'
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
    const range = sel.getRangeAt(0)
    // Cada <p> se resalta buscando la frase como substring de SU PROPIO
    // texto (ver ParrafoResaltado): si la selección cruza de un párrafo a
    // otro (fácil de hacer sin querer arrastrando el mouse, con el
    // interlineado amplio del modo lectura en particular), la frase
    // completa no existe entera en ninguno de los dos párrafos por
    // separado y el resaltado se guardaría sin llegar a verse nunca. Se
    // descarta aquí, antes de ofrecer el botón, para no prometer algo que
    // fallaría en silencio.
    const nodoComun = range.commonAncestorContainer
    const parrafoComun = (nodoComun instanceof Element ? nodoComun : nodoComun.parentElement)?.closest('p')
    if (!parrafoComun) {
      setBoton(null)
      return
    }
    const rect = range.getBoundingClientRect()
    const rectContenedor = ref.current.getBoundingClientRect()
    // Debajo de la selección, no arriba: el menú nativo de iOS/Safari
    // (Copiar/Consultar/Traducir...) se posiciona arriba de la selección, así
    // que si el botón propio también va arriba, quedan uno encima del otro.
    setBoton({ x: rect.left + rect.width / 2 - rectContenedor.left, y: rect.bottom - rectContenedor.top, frase })
  }, [])

  // onMouseUp no dispara con selección táctil (iPad/celular): seleccionar
  // texto con el dedo no es un "mouseup" para el navegador. selectionchange
  // sí dispara con mouse, touch y teclado por igual -- es la forma correcta
  // de detectar "el usuario terminó de seleccionar algo", pero dispara MUY
  // seguido mientras se arrastra la selección (o los tiradores de iOS), así
  // que se debounca un poco para no recalcular en cada micro-cambio.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const handler = () => {
      clearTimeout(timeout)
      timeout = setTimeout(revisarSeleccion, 150)
    }
    document.addEventListener('selectionchange', handler)
    return () => {
      document.removeEventListener('selectionchange', handler)
      clearTimeout(timeout)
    }
  }, [revisarSeleccion])

  return (
    <div ref={ref} className="relative" onMouseUp={revisarSeleccion}>
      {children}
      {boton && (
        <button
          // onPointerDown (no onClick): en iOS, tocar cualquier elemento
          // mientras hay una selección activa primero la CIERRA (el navegador
          // descarta el gesto para ocultar los tiradores de selección) y el
          // click nunca llega a disparar -- por eso se veía el botón pero no
          // hacía nada. pointerdown ocurre ANTES de ese cierre; preventDefault
          // evita que el navegador lo dispare, así la selección sigue intacta
          // cuando corremos onAgregar.
          onPointerDown={(e) => {
            e.preventDefault()
            onAgregar(boton.frase)
            window.getSelection()?.removeAllRanges()
            setBoton(null)
          }}
          className="absolute z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg whitespace-nowrap"
          style={{
            left: boton.x,
            top: boton.y,
            transform: 'translate(-50%, 10px)',
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
 * las apariciones.
 */
type Segmento =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'resaltado'; texto: string }
  | { tipo: 'referencia'; texto: string; referencia: ReferenciaArticulo }

type Rango =
  | { inicio: number; fin: number; tipo: 'resaltado' }
  | { inicio: number; fin: number; tipo: 'referencia'; referencia: ReferenciaArticulo }

/**
 * Calcula los rangos (offsets sobre el `texto` ORIGINAL) de cada resaltado y
 * referencia, en vez de ir cortando el texto frase por frase como antes.
 * Cortar en cadena (buscar la frase 1, partir el texto, buscar la frase 2
 * solo en los pedazos que quedaron...) fallaba en silencio apenas dos
 * resaltados se solapaban entre sí o con una referencia: la frase completa
 * dejaba de existir como substring en cualquiera de los pedazos ya
 * recortados, aunque sí se hubiera guardado. Calculando todos los rangos
 * primero contra el texto original, y recién después decidiendo cuáles se
 * solapan, un resaltado siempre se encuentra sin importar el orden en que
 * se haya creado o si cae encima de otro.
 */
function calcularRangos(texto: string, subrayados: string[], referencias: CoincidenciaReferencia[]): Rango[] {
  const rangos: Rango[] = referencias.map((c) => ({ inicio: c.inicio, fin: c.fin, tipo: 'referencia', referencia: c.referencia }))
  for (const frase of subrayados) {
    if (!frase) continue
    let desde = 0
    let idx: number
    while ((idx = texto.indexOf(frase, desde)) !== -1) {
      rangos.push({ inicio: idx, fin: idx + frase.length, tipo: 'resaltado' })
      desde = idx + frase.length
    }
  }
  if (rangos.length === 0) return rangos

  // Ante solape, gana el rango que empieza antes; en un empate, el más
  // largo; y si aun así empatan, la referencia (es información estructural
  // del texto, no una marca del usuario, así que se prefiere mantenerla
  // clicable). El resto de los rangos que se solapen con el ganador se
  // descarta: su texto queda igual visible, solo que dentro del segmento
  // del ganador.
  const ordenados = [...rangos].sort(
    (a, b) =>
      a.inicio - b.inicio ||
      b.fin - b.inicio - (a.fin - a.inicio) ||
      (a.tipo === b.tipo ? 0 : a.tipo === 'referencia' ? -1 : 1)
  )
  const elegidos: Rango[] = []
  let cursor = 0
  for (const r of ordenados) {
    if (r.inicio < cursor) continue
    elegidos.push(r)
    cursor = r.fin
  }
  return elegidos
}

export function ParrafoResaltado({
  texto,
  subrayados,
  onQuitar,
  referencias,
  onIrAReferencia,
  className,
  style,
}: {
  texto: string
  subrayados: string[]
  onQuitar: (frase: string) => void
  /** Referencias a otros artículos YA FILTRADAS a las que de verdad existen
   * en los datos cargados (ver detectarReferencias en services/referencias)
   * — este componente no vuelve a verificar existencia, solo renderiza lo
   * que le pasan. Opcional: si no se pasa, el párrafo se comporta como
   * antes de que existiera esta función (solo resaltado). */
  referencias?: CoincidenciaReferencia[]
  onIrAReferencia?: (ref: ReferenciaArticulo) => void
  className?: string
  style?: CSSProperties
}) {
  if (subrayados.length === 0 && (!referencias || referencias.length === 0)) {
    return (
      <p className={className} style={style}>
        {texto}
      </p>
    )
  }

  const rangos = calcularRangos(texto, subrayados, referencias ?? [])
  const segmentos: Segmento[] = []
  {
    let cursor = 0
    for (const r of rangos) {
      if (r.inicio > cursor) segmentos.push({ tipo: 'texto', texto: texto.slice(cursor, r.inicio) })
      if (r.tipo === 'referencia') segmentos.push({ tipo: 'referencia', texto: texto.slice(r.inicio, r.fin), referencia: r.referencia })
      else segmentos.push({ tipo: 'resaltado', texto: texto.slice(r.inicio, r.fin) })
      cursor = r.fin
    }
    if (cursor < texto.length) segmentos.push({ tipo: 'texto', texto: texto.slice(cursor) })
  }

  return (
    <p className={className} style={style}>
      {segmentos.map((seg, i) => {
        if (seg.tipo === 'resaltado') {
          return (
            <mark
              key={i}
              onClick={() => onQuitar(seg.texto)}
              title="Quitar resaltado"
              style={{ background: COLOR_RESALTADO, color: COLOR_TEXTO_RESALTADO, cursor: 'pointer', borderRadius: 2 }}
            >
              {seg.texto}
            </mark>
          )
        }
        if (seg.tipo === 'referencia') {
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                onIrAReferencia?.(seg.referencia)
              }}
              title={`Ir a ${seg.referencia.articulo}`}
              className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
              style={{ color: 'var(--accent-base)', cursor: 'pointer' }}
            >
              {seg.texto}
            </button>
          )
        }
        return <Fragment key={i}>{seg.texto}</Fragment>
      })}
    </p>
  )
}

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CodigoData } from '../../types'
import {
  construirEsquema,
  primerNivelParaDiagrama,
  contarTitulos,
  hijosDe,
  esClaveSinTexto,
  rangoArticulos,
  numeroRomano,
  ETIQUETAS_NIVEL,
  type NodoEsquema,
} from '../../services/esquema'

const VERDE = 'var(--accent-base)'

type Pestana = 'lista' | 'diagrama'

interface Props {
  abierto: boolean
  onCerrar: () => void
  codigo: CodigoData | null
  modoOscuro: boolean
  onSeleccionarArticulo: (a: string) => void
}

/**
 * Vista de estudio a pantalla completa: el mismo código, mostrado como
 * esquema (Libro → Título → Capítulo → Párrafo → Artículo) en vez de como
 * lectura artículo por artículo. Dos formas de verlo, mismo dato:
 * - "Lista": árbol colapsable, para repasar el detalle completo.
 * - "Diagrama": Código → sus secciones de primer nivel, como líneas de
 *   descendencia — para memorizar la forma general del índice.
 * Genérico para cualquiera de los 24 códigos cargados: bastantes de ellos no
 * usan "libro" (caen directo a "título"), y varios sí traen "párrafo" con
 * datos reales (Trabajo, Sanitario, Tributario, Minería, Orgánico de
 * Tribunales) aunque el Índice del Explorador no lo muestre todavía.
 */
export function EsquemaCodigo({ abierto, onCerrar, codigo, modoOscuro, onSeleccionarArticulo }: Props) {
  const [pestana, setPestana] = useState<Pestana>('lista')
  const [claveEnfocada, setClaveEnfocada] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abierto, onCerrar])

  // Cada vez que se abre de nuevo, empezar siempre en Lista sin nada forzado a abrir.
  useEffect(() => {
    if (abierto) {
      setPestana('lista')
      setClaveEnfocada(null)
    }
  }, [abierto])

  const arbol = useMemo(() => (codigo ? construirEsquema(codigo.articulos) : []), [codigo])

  return (
    <AnimatePresence>
      {abierto && codigo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`fixed inset-0 z-[70] flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}
        >
          <div
            className={`flex items-center gap-4 px-5 md:px-8 py-4 border-b flex-shrink-0 ${
              modoOscuro ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'
            }`}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: modoOscuro
                  ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
                  : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
              }}
            >
              <i className="ti ti-sitemap text-lg" style={{ color: VERDE }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={`text-lg md:text-xl font-serif font-semibold leading-tight truncate ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                Esquema de estudio
              </h1>
              <p className={`text-xs truncate ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                {codigo.codigo} · {codigo.articulos.length} artículos
              </p>
            </div>

            <div className={`flex items-center gap-1 p-1 rounded-lg flex-shrink-0 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <BotonPestana
                activo={pestana === 'lista'}
                onClick={() => setPestana('lista')}
                modoOscuro={modoOscuro}
                icono="ti-list-tree"
                label="Lista"
              />
              <BotonPestana
                activo={pestana === 'diagrama'}
                onClick={() => setPestana('diagrama')}
                modoOscuro={modoOscuro}
                icono="ti-binary-tree-2"
                label="Diagrama"
              />
            </div>

            <button
              onClick={onCerrar}
              aria-label="Cerrar esquema de estudio"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              <i className="ti ti-x text-lg" />
            </button>
          </div>

          <div className="flex-1 min-h-0">
            {pestana === 'lista' ? (
              <ListaEsquema
                arbol={arbol}
                modoOscuro={modoOscuro}
                claveEnfocada={claveEnfocada}
                onSeleccionarArticulo={(a) => {
                  onSeleccionarArticulo(a)
                  onCerrar()
                }}
              />
            ) : (
              <DiagramaEsquema
                codigo={codigo}
                modoOscuro={modoOscuro}
                onSeleccionarArticulo={(a) => {
                  onSeleccionarArticulo(a)
                  onCerrar()
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function BotonPestana({
  activo,
  onClick,
  modoOscuro,
  icono,
  label,
}: {
  activo: boolean
  onClick: () => void
  modoOscuro: boolean
  icono: string
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        activo ? 'text-white' : modoOscuro ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
      }`}
      style={activo ? { background: VERDE } : undefined}
    >
      <i className={`ti ${icono} text-base`} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// ============ Pestaña "Lista": árbol colapsable completo ============

function ListaEsquema({
  arbol,
  modoOscuro,
  claveEnfocada,
  onSeleccionarArticulo,
}: {
  arbol: NodoEsquema[]
  modoOscuro: boolean
  claveEnfocada: string | null
  onSeleccionarArticulo: (a: string) => void
}) {
  if (arbol.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className={modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}>Este código no tiene artículos cargados.</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-5 md:px-10 py-8">
        <div
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 mb-7 text-[11px] font-semibold uppercase tracking-wider ${
            modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          <span>Código</span>
          <i className="ti ti-chevron-right text-[10px] opacity-50" />
          <span style={{ color: VERDE }}>Libro</span>
          <i className="ti ti-chevron-right text-[10px] opacity-50" />
          <span>Título</span>
          <i className="ti ti-chevron-right text-[10px] opacity-50" />
          <span>Párrafo</span>
          <i className="ti ti-chevron-right text-[10px] opacity-50" />
          <span>Artículo</span>
        </div>

        <div className="space-y-1.5 pb-10">
          {arbol.map((nodo, i) => (
            <NodoArbolEsquema
              key={`${nodo.campo}-${nodo.clave ?? '_'}-${i}`}
              nodo={nodo}
              profundidad={0}
              modoOscuro={modoOscuro}
              esRaiz
              esUnico={arbol.length === 1}
              abiertoInicial={i === 0 || nodo.clave === claveEnfocada}
              enfocado={nodo.clave !== null && nodo.clave === claveEnfocada}
              claveEnfocada={claveEnfocada}
              onSeleccionarArticulo={onSeleccionarArticulo}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const ESTILOS_POR_CAMPO: Record<string, { tam: string; peso: string }> = {
  libro: { tam: 'text-[16px] md:text-[17px]', peso: 'font-semibold' },
  titulo: { tam: 'text-[14.5px] md:text-[15px]', peso: 'font-medium' },
  capitulo: { tam: 'text-[13.5px]', peso: 'font-normal' },
  parrafo: { tam: 'text-[13px]', peso: 'font-normal italic' },
}

function NodoArbolEsquema({
  nodo,
  profundidad,
  modoOscuro,
  esRaiz,
  esUnico,
  abiertoInicial,
  enfocado,
  claveEnfocada,
  onSeleccionarArticulo,
}: {
  nodo: NodoEsquema
  profundidad: number
  modoOscuro: boolean
  esRaiz?: boolean
  /** Si es el único nodo de nivel superior (código sin subdivisión real): no
   *  corresponde llamarlo "Preliminar", es simplemente todo el contenido. */
  esUnico?: boolean
  abiertoInicial: boolean
  enfocado: boolean
  claveEnfocada: string | null
  onSeleccionarArticulo: (a: string) => void
}) {
  const [abierto, setAbierto] = useState(abiertoInicial)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (enfocado && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Solo al montar (la pestaña se remonta entera al volver de Diagrama).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sinTexto = esClaveSinTexto(nodo.clave)
  // null aquí significa "el código no usa este campo para este tramo de
  // artículos". Si hay otras secciones hermanas, es casi siempre la parte
  // introductoria antes del primer Libro/Título numerado (común en la
  // legislación chilena); si es el ÚNICO nodo de nivel superior, el código
  // completo no tiene subdivisión real y "Preliminar" sería engañoso.
  const nombre =
    esRaiz && nodo.clave === null
      ? esUnico
        ? 'General'
        : 'PRELIMINAR'
      : sinTexto
      ? `${nodo.clave} — sección sin título registrado en la fuente`
      : nodo.clave

  const esHoja = nodo.hijos.length === 0
  const estilo = ESTILOS_POR_CAMPO[nodo.campo]

  const filaEncabezado = nombre && (
    <button
      onClick={() => setAbierto(!abierto)}
      className={`w-full text-left flex items-start gap-2 py-2 px-2 rounded-lg transition-colors ${
        modoOscuro ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-100'
      }`}
    >
      <i
        className={`ti ti-chevron-right text-xs transition-transform flex-shrink-0 mt-1 ${abierto ? 'rotate-90' : ''}`}
        style={{ color: modoOscuro ? '#71717a' : '#a1a1aa' }}
      />
      {esRaiz && (
        <span
          className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 whitespace-nowrap"
          style={{
            background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 16%, transparent)' : 'color-mix(in srgb, var(--accent-base) 7%, transparent)',
            color: VERDE,
          }}
        >
          {nodo.clave === null ? nombre.toUpperCase() : ETIQUETAS_NIVEL[nodo.campo]}
        </span>
      )}
      <span className={`font-serif ${estilo.tam} ${estilo.peso} ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{nombre}</span>
      <span className={`ml-auto text-xs font-sans whitespace-nowrap pl-3 pt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {rangoArticulos(nodo)}
      </span>
    </button>
  )

  return (
    <div ref={ref} style={{ marginLeft: profundidad * 18 }} className={esRaiz ? 'mb-1' : ''}>
      {filaEncabezado}
      <AnimatePresence initial={false}>
        {(abierto || !nombre) && (
          <motion.div
            initial={nombre ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className={nombre ? 'pl-3 border-l-2 mt-0.5 ml-2.5' : ''}
              style={nombre ? { borderColor: modoOscuro ? '#27272a' : '#e4e4e7' } : undefined}
            >
              {!esHoja &&
                nodo.hijos.map((hijo, i) => (
                  <NodoArbolEsquema
                    key={`${hijo.campo}-${hijo.clave ?? '_'}-${i}`}
                    nodo={hijo}
                    profundidad={profundidad + 1}
                    modoOscuro={modoOscuro}
                    abiertoInicial={hijo.clave !== null && hijo.clave === claveEnfocada}
                    enfocado={hijo.clave !== null && hijo.clave === claveEnfocada}
                    claveEnfocada={claveEnfocada}
                    onSeleccionarArticulo={onSeleccionarArticulo}
                  />
                ))}

              {esHoja && (
                <div className="flex flex-wrap gap-1.5 py-2">
                  {nodo.articulos.map((a) => (
                    <button
                      key={a.a}
                      onClick={() => onSeleccionarArticulo(a.a)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                        modoOscuro ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {a.a}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============ Pestaña "Diagrama": Código → secciones, con líneas ============

interface Linea {
  x1: number
  y1: number
  x2: number
  y2: number
}

function DiagramaEsquema({
  codigo,
  modoOscuro,
  onSeleccionarArticulo,
}: {
  codigo: CodigoData
  modoOscuro: boolean
  onSeleccionarArticulo: (a: string) => void
}) {
  const nodos = useMemo(() => primerNivelParaDiagrama(codigo.articulos), [codigo])
  const campo = nodos[0]?.campo ?? 'titulo'

  // Numeración mostrada en cada badge (p. ej. "LIBRO I", "LIBRO II"...). Una
  // sección sin clave (el Preliminar, cuando existe) NO cuenta para esta
  // numeración -- si contara, el verdadero Libro IV terminaría rotulado
  // "Libro V", que no existe en el código real.
  const numerosMostrados = useMemo(() => {
    let contador = 0
    return nodos.map((nodo) => (nodo.clave === null ? null : numeroRomano(++contador)))
  }, [nodos])

  const contenedorRef = useRef<HTMLDivElement>(null)
  const raizRef = useRef<HTMLDivElement>(null)
  const hijosRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [lineas, setLineas] = useState<Linea[]>([])
  const [tamano, setTamano] = useState({ w: 0, h: 0 })

  // Las líneas se calculan midiendo posiciones reales del DOM, no con
  // coordenadas fijas: el número de secciones varía muchísimo entre los 24
  // códigos (5 en el Civil, hasta 68 títulos en Procedimiento Civil), y el
  // texto de cada nombre también, así que no hay un layout fijo que sirva
  // para todos.
  const recalcular = useCallback(() => {
    const contenedor = contenedorRef.current
    const raiz = raizRef.current
    if (!contenedor || !raiz) return
    const rectContenedor = contenedor.getBoundingClientRect()
    const rectRaiz = raiz.getBoundingClientRect()
    const x1 = rectRaiz.left + rectRaiz.width / 2 - rectContenedor.left
    const y1 = rectRaiz.bottom - rectContenedor.top

    const nuevas: Linea[] = []
    hijosRefs.current.forEach((el) => {
      const r = el.getBoundingClientRect()
      nuevas.push({
        x1,
        y1,
        x2: r.left + r.width / 2 - rectContenedor.left,
        y2: r.top - rectContenedor.top,
      })
    })
    setLineas(nuevas)
    setTamano({ w: rectContenedor.width, h: rectContenedor.height })
  }, [])

  useLayoutEffect(() => {
    recalcular()
  }, [recalcular, nodos])

  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!contenedor) return
    const obs = new ResizeObserver(() => recalcular())
    obs.observe(contenedor)
    return () => obs.disconnect()
  }, [recalcular])

  if (nodos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className={modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}>Este código no tiene artículos cargados.</p>
      </div>
    )
  }

  const colorLinea = modoOscuro ? '#3f3f46' : '#d4d4d8'

  return (
    <div className="h-full overflow-auto">
      <div ref={contenedorRef} className="relative min-h-full flex flex-col items-center px-6 md:px-10 py-10">
        <svg className="absolute inset-0 pointer-events-none" width={tamano.w} height={tamano.h}>
          {lineas.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={colorLinea} strokeWidth={1.5} />
          ))}
        </svg>

        <div
          ref={raizRef}
          className="relative z-10 rounded-2xl border-2 px-6 md:px-10 py-4 text-center mb-16"
          style={{
            background: modoOscuro
              ? 'color-mix(in srgb, var(--accent-base) 16%, transparent)'
              : 'color-mix(in srgb, var(--accent-base) 7%, transparent)',
            borderColor: VERDE,
          }}
        >
          <p className="font-serif font-bold text-lg md:text-2xl" style={{ color: VERDE }}>
            {codigo.codigo.toUpperCase()}
          </p>
          <p className={`text-xs mt-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {codigo.articulos.length} artículos · {nodos.length} {ETIQUETAS_NIVEL[campo].toLowerCase()}
            {nodos.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap justify-center gap-x-6 gap-y-12 w-full max-w-6xl">
          {nodos.map((nodo, i) => {
            const sinTexto = esClaveSinTexto(nodo.clave)
            const esPreliminar = nodo.clave === null && nodos.length > 1
            const nombre = esPreliminar
              ? 'PRELIMINAR'
              : sinTexto
              ? `${nodo.clave} — sin título registrado`
              : nodo.clave ?? 'General'
            const titulosDeEsteLibro = campo === 'libro' ? contarTitulos(nodo) : null
            const etiqueta = nodo.clave === null ? nombre : `${ETIQUETAS_NIVEL[nodo.campo]} ${numerosMostrados[i]}`
            return (
              <NodoDiagrama
                key={`${nodo.clave ?? '_'}-${i}`}
                nodo={nodo}
                etiqueta={etiqueta}
                nombre={nombre}
                subtitulo={titulosDeEsteLibro !== null ? `${titulosDeEsteLibro} título${titulosDeEsteLibro === 1 ? '' : 's'}` : undefined}
                modoOscuro={modoOscuro}
                boxRef={(el) => {
                  if (el) hijosRefs.current.set(i, el)
                  else hijosRefs.current.delete(i)
                }}
                onSeleccionarArticulo={onSeleccionarArticulo}
              />
            )
          })}
        </div>

        <p className={`relative z-10 mt-10 text-xs text-center max-w-md ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Toca una sección para expandirla y ver lo que contiene, sin salir del diagrama.
        </p>
      </div>
    </div>
  )
}

/**
 * Una caja del diagrama que se abre sobre sí misma: al tocarla, calcula sus
 * propios hijos bajo demanda (hijosDe) y los dibuja debajo, con sus propias
 * un recuadro difuminado (sin líneas -- las líneas quedan solo para el nivel
 * raíz, que muestra los Libros). Así "Libro I" se expande a sus Títulos sin
 * salir del Diagrama, un Título se expande a sus Capítulos/Párrafos si los
 * tiene, y así hasta llegar a los artículos sueltos.
 */
function NodoDiagrama({
  nodo,
  etiqueta,
  nombre,
  subtitulo,
  modoOscuro,
  boxRef,
  onSeleccionarArticulo,
}: {
  nodo: NodoEsquema
  etiqueta: string
  nombre: string
  subtitulo?: string
  modoOscuro: boolean
  boxRef?: (el: HTMLButtonElement | null) => void
  onSeleccionarArticulo: (a: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const hijos = useMemo(() => (abierto ? hijosDe(nodo) : []), [abierto, nodo])
  // Hoja real: ya no hay un campo más chico que subdividir (hijosDe devolvió
  // vacío) -- lo que queda para mostrar son los artículos uno a uno.
  const esHojaDeArticulos = abierto && hijos.length === 0

  return (
    <div className="relative flex flex-col items-center">
      <button
        ref={boxRef}
        onClick={() => setAbierto((v) => !v)}
        className={`relative z-10 text-left rounded-xl border px-5 py-3.5 w-60 md:w-64 transition-colors ${
          modoOscuro ? 'bg-zinc-800/60 border-zinc-700 hover:border-[var(--accent-base)]' : 'bg-white border-zinc-200 hover:border-[var(--accent-base)] shadow-sm'
        }`}
        style={abierto ? { borderColor: VERDE } : undefined}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 16%, transparent)' : 'color-mix(in srgb, var(--accent-base) 7%, transparent)',
              color: VERDE,
            }}
          >
            {etiqueta}
          </span>
          <i
            className="ti ti-chevron-right text-xs flex-shrink-0 ml-auto transition-transform"
            style={{ color: modoOscuro ? '#71717a' : '#a1a1aa', transform: abierto ? 'rotate(90deg)' : undefined }}
          />
        </div>
        <p className={`font-serif text-[14.5px] md:text-[15px] font-semibold leading-snug ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{nombre}</p>
        <p className={`text-[11.5px] mt-1.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {rangoArticulos(nodo)}
          {subtitulo && ` · ${subtitulo}`}
        </p>
      </button>

      {abierto && (
        <div
          className={`mt-4 rounded-2xl border backdrop-blur-sm px-5 py-5 ${
            modoOscuro ? 'bg-zinc-800/40 border-zinc-700/60' : 'bg-zinc-100/70 border-zinc-200'
          }`}
        >
          {esHojaDeArticulos ? (
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {nodo.articulos.map((a) => (
                <button
                  key={a.a}
                  onClick={() => onSeleccionarArticulo(a.a)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                    modoOscuro ? 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-700' : 'bg-white text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {a.a}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-8">
              {hijos.map((hijo, i) => {
                const sinTexto = esClaveSinTexto(hijo.clave)
                const nombreHijo = sinTexto ? `${hijo.clave} — sin título registrado` : hijo.clave ?? 'General'
                return (
                  <NodoDiagrama
                    key={`${hijo.clave ?? '_'}-${i}`}
                    nodo={hijo}
                    etiqueta={ETIQUETAS_NIVEL[hijo.campo]}
                    nombre={nombreHijo}
                    modoOscuro={modoOscuro}
                    onSeleccionarArticulo={onSeleccionarArticulo}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

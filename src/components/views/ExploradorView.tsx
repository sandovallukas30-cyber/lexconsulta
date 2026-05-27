import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useCodigo } from '../../hooks/useCodigo'
import { SelectorCodigo } from '../ui/SelectorCodigo'
import { modernizar, necesitaModernizacion } from '../../services/moderniza'
import { obtenerMetadata, formatearFechaIndexacion, nombreCortoMetadata } from '../../data/codigosMetadata'
import type { Articulo, CodigoTipo } from '../../types'

const VERDE = 'var(--accent-base)'

export function ExploradorView() {
  const codigoElegido = useStore((s) => s.codigoExploradorActivo)
  const setCodigoElegido = useStore((s) => s.setCodigoExplorador)

  if (!codigoElegido) {
    return (
      <SelectorCodigo
        titulo="Explorador de códigos"
        descripcion="Elige el código que quieres explorar artículo por artículo"
        icono="ti-book-2"
        onElegir={(tipo) => setCodigoElegido(tipo)}
      />
    )
  }

  return <ExploradorInterno tipoActivo={codigoElegido} onCambiarCodigo={() => setCodigoElegido(null)} />
}

function ExploradorInterno({ tipoActivo, onCambiarCodigo }: { tipoActivo: CodigoTipo; onCambiarCodigo: () => void }) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const modernizarLenguaje = useStore((s) => s.modernizarLenguaje)
  const toggleModernizar = useStore((s) => s.toggleModernizar)
  const aplicarModernizacion = modernizarLenguaje && necesitaModernizacion(tipoActivo)
  const transformarTexto = (t: string) => (aplicarModernizacion ? modernizar(t) : t)
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [indiceAbierto, setIndiceAbierto] = useState(false)
  const [busquedaAbierta, setBusquedaAbierta] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  // Reset selección cuando cambia el código
  useEffect(() => {
    setSeleccionadoId(null)
    setBusqueda('')
  }, [tipoActivo])

  const { codigo, cargando: cargandoCodigo } = useCodigo(tipoActivo)

  const arts = codigo?.articulos ?? []
  const seleccionado = useMemo(
    () => arts.find((a) => a.a === seleccionadoId) ?? arts[0] ?? null,
    [arts, seleccionadoId]
  )

  const indiceActual = useMemo(
    () => (seleccionado ? arts.findIndex((a) => a.a === seleccionado.a) : -1),
    [arts, seleccionado]
  )

  const anterior = indiceActual > 0 ? arts[indiceActual - 1] : null
  const siguiente = indiceActual >= 0 && indiceActual < arts.length - 1 ? arts[indiceActual + 1] : null

  // Cercanos: 2 antes y 2 después
  const cercanos = useMemo(() => {
    if (indiceActual < 0) return []
    const start = Math.max(0, indiceActual - 2)
    const end = Math.min(arts.length, indiceActual + 3)
    return arts.slice(start, end)
  }, [arts, indiceActual])

  useEffect(() => {
    if (!seleccionadoId && arts.length > 0) {
      setSeleccionadoId(arts[0].a)
    }
  }, [arts, seleccionadoId])

  // Atajos: Cmd/Ctrl+K para buscar, flechas para navegar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBusquedaAbierta(true)
      }
      if (e.key === 'Escape') {
        setBusquedaAbierta(false)
        setIndiceAbierto(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (cargandoCodigo) {
    return <PantallaCargandoCodigo modoOscuro={modoOscuro} />
  }
  if (!codigo) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <p className={modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}>No hay códigos cargados.</p>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div
        className={`flex items-center gap-3 px-6 py-3 border-b ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <button
          onClick={onCambiarCodigo}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors group ${
            modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
          }`}
          title="Cambiar código"
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
          >
            <i className="ti ti-book-2 text-base" style={{ color: VERDE }} />
          </span>
          <div className="hidden md:block text-left">
            <p className={`text-sm font-semibold leading-tight ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              {codigo.codigo}
            </p>
            <p className={`text-[11px] leading-tight ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {codigo.total_articulos} arts.
              {codigo.total_transitorios ? ` · ${codigo.total_transitorios} trans.` : ''}
            </p>
          </div>
          <i
            className={`ti ti-chevron-down text-xs opacity-0 group-hover:opacity-60 transition-opacity ${
              modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          />
        </button>

        <FichaCodigo tipo={tipoActivo} modoOscuro={modoOscuro} />

        <div className="flex-1" />

        <button
          onClick={() => setIndiceAbierto(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            modoOscuro
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          <i className="ti ti-list-tree text-base" />
          Índice
        </button>

        {necesitaModernizacion(tipoActivo) && (
          <button
            onClick={toggleModernizar}
            title={modernizarLenguaje ? 'Mostrar texto original (siglo XIX)' : 'Modernizar lenguaje antiguo'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              modernizarLenguaje
                ? 'text-white'
                : modoOscuro
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
            style={modernizarLenguaje ? { background: VERDE } : undefined}
          >
            <i className={`ti ${modernizarLenguaje ? 'ti-language' : 'ti-language-off'} text-base`} />
            Lenguaje moderno
          </button>
        )}


        <button
          onClick={() => setBusquedaAbierta(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors min-w-[220px] ${
            modoOscuro
              ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
          }`}
        >
          <i className="ti ti-search text-base" />
          <span className="flex-1 text-left">Buscar artículo...</span>
          <kbd
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              modoOscuro ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-zinc-400 border border-zinc-200'
            }`}
          >
            Ctrl+K
          </kbd>
        </button>
      </div>

      {seleccionado && (
        <div
          className={`px-6 py-2.5 border-b text-xs flex items-center gap-1.5 overflow-x-auto ${
            modoOscuro ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500'
          }`}
        >
          <span className={modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}>{codigo.codigo}</span>
          {seleccionado.libro && <><Sep /><span className="truncate">Libro {seleccionado.libro}</span></>}
          {seleccionado.titulo && <><Sep /><span className="truncate">Título {seleccionado.titulo}</span></>}
          {seleccionado.capitulo && <><Sep /><span className="truncate">Cap. {seleccionado.capitulo}</span></>}
          {seleccionado.parrafo && <><Sep /><span className="truncate">Párrafo {seleccionado.parrafo}</span></>}
          <Sep />
          <span className="font-semibold whitespace-nowrap" style={{ color: VERDE }}>
            {seleccionado.a}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {seleccionado && (
          <AnimatePresence mode="wait">
            <motion.article
              key={seleccionado.a}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`max-w-3xl mx-auto my-8 rounded-2xl p-10 ${
                modoOscuro ? 'bg-zinc-800/40 border border-zinc-800' : 'bg-white shadow-sm border border-zinc-200/60'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3 mb-6">
                <h1
                  className={`text-3xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}
                  style={{ color: undefined }}
                >
                  <span style={{ color: VERDE }}>{seleccionado.a}</span>
                </h1>
                <span className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {indiceActual + 1} de {arts.length}
                </span>
              </div>
              <ArticuloTexto texto={transformarTexto(seleccionado.t)} modoOscuro={modoOscuro} />
            </motion.article>
          </AnimatePresence>
        )}
      </div>

      <div
        className={`border-t px-4 py-3 ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <NavBtn
            disabled={!anterior}
            label="Anterior"
            sub={anterior?.a}
            onClick={() => anterior && setSeleccionadoId(anterior.a)}
            icono="ti-chevron-left"
            modoOscuro={modoOscuro}
            align="left"
          />

          <Carrusel
            arts={cercanos}
            actualId={seleccionado?.a}
            onSelect={(a) => setSeleccionadoId(a)}
            modoOscuro={modoOscuro}
          />

          <NavBtn
            disabled={!siguiente}
            label="Siguiente"
            sub={siguiente?.a}
            onClick={() => siguiente && setSeleccionadoId(siguiente.a)}
            icono="ti-chevron-right"
            modoOscuro={modoOscuro}
            align="right"
          />
        </div>
      </div>

      <ModalIndice
        abierto={indiceAbierto}
        onCerrar={() => setIndiceAbierto(false)}
        arts={arts}
        actualId={seleccionado?.a}
        onSelect={(a) => {
          setSeleccionadoId(a)
          setIndiceAbierto(false)
        }}
        modoOscuro={modoOscuro}
      />

      <ModalBusqueda
        abierto={busquedaAbierta}
        onCerrar={() => setBusquedaAbierta(false)}
        arts={arts}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        onSelect={(a) => {
          setSeleccionadoId(a)
          setBusquedaAbierta(false)
          setBusqueda('')
        }}
        modoOscuro={modoOscuro}
      />
    </div>
  )
}

function Sep() {
  return <i className="ti ti-chevron-right text-[10px] opacity-50 flex-shrink-0" />
}

function NavBtn({
  disabled,
  label,
  sub,
  onClick,
  icono,
  modoOscuro,
  align,
}: {
  disabled: boolean
  label: string
  sub?: string
  onClick: () => void
  icono: string
  modoOscuro: boolean
  align: 'left' | 'right'
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors flex-shrink-0 ${
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : modoOscuro
          ? 'hover:bg-zinc-800 text-zinc-300'
          : 'hover:bg-zinc-100 text-zinc-700'
      }`}
    >
      {align === 'left' && <i className={`ti ${icono} text-lg`} />}
      <div className={align === 'right' ? 'text-right' : 'text-left'}>
        <p className={`text-[10px] uppercase tracking-wider font-semibold ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {label}
        </p>
        <p className="font-mono text-xs font-semibold">{sub ?? '—'}</p>
      </div>
      {align === 'right' && <i className={`ti ${icono} text-lg`} />}
    </button>
  )
}

function Carrusel({
  arts,
  actualId,
  onSelect,
  modoOscuro,
}: {
  arts: Articulo[]
  actualId?: string
  onSelect: (a: string) => void
  modoOscuro: boolean
}) {
  return (
    <div className="flex-1 flex items-center gap-1 overflow-x-auto justify-center min-w-0">
      {arts.map((a) => {
        const activo = a.a === actualId
        return (
          <button
            key={a.a}
            onClick={() => onSelect(a.a)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex-shrink-0 ${
              activo
                ? 'text-white font-semibold'
                : modoOscuro
                ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
            }`}
            style={activo ? { background: VERDE } : undefined}
            title={primerasPalabras(a.t, 10)}
          >
            {a.a}
          </button>
        )
      })}
    </div>
  )
}

function ModalIndice({
  abierto,
  onCerrar,
  arts,
  actualId,
  onSelect,
  modoOscuro,
}: {
  abierto: boolean
  onCerrar: () => void
  arts: Articulo[]
  actualId?: string
  onSelect: (a: string) => void
  modoOscuro: boolean
}) {
  const arbol = useMemo(() => construirArbol(arts), [arts])

  return (
    <AnimatePresence>
      {abierto && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onCerrar}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className={`fixed right-0 top-0 bottom-0 z-50 w-[360px] flex flex-col shadow-2xl ${
              modoOscuro ? 'bg-zinc-900' : 'bg-white'
            }`}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div>
                <h2 className={`text-base font-serif font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                  Índice del código
                </h2>
                <p className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Navega por libros, títulos y capítulos
                </p>
              </div>
              <button
                onClick={onCerrar}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <ArbolIndice
                arbol={arbol}
                actualId={actualId}
                onSelect={onSelect}
                modoOscuro={modoOscuro}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

interface NodoArbol {
  libro: string | null
  titulos: Map<string | null, Map<string | null, Articulo[]>>
  total: number
}

function construirArbol(arts: Articulo[]): NodoArbol[] {
  const libros: Map<string | null, NodoArbol> = new Map()
  for (const a of arts) {
    const libroKey = a.libro ?? null
    if (!libros.has(libroKey)) libros.set(libroKey, { libro: libroKey, titulos: new Map(), total: 0 })
    const nodo = libros.get(libroKey)!
    nodo.total++
    const tituloKey = a.titulo ?? null
    if (!nodo.titulos.has(tituloKey)) nodo.titulos.set(tituloKey, new Map())
    const titulos = nodo.titulos.get(tituloKey)!
    const capituloKey = a.capitulo ?? null
    if (!titulos.has(capituloKey)) titulos.set(capituloKey, [])
    titulos.get(capituloKey)!.push(a)
  }
  return [...libros.values()]
}

function ArbolIndice({
  arbol,
  actualId,
  onSelect,
  modoOscuro,
}: {
  arbol: NodoArbol[]
  actualId?: string
  onSelect: (a: string) => void
  modoOscuro: boolean
}) {
  return (
    <div className="space-y-3">
      {arbol.map((libro) => (
        <NodoLibro key={libro.libro ?? '_'} libro={libro} actualId={actualId} onSelect={onSelect} modoOscuro={modoOscuro} />
      ))}
    </div>
  )
}

function NodoLibro({
  libro,
  actualId,
  onSelect,
  modoOscuro,
}: {
  libro: NodoArbol
  actualId?: string
  onSelect: (a: string) => void
  modoOscuro: boolean
}) {
  const contieneActual = useMemo(() => {
    for (const titulos of libro.titulos.values())
      for (const arts of titulos.values())
        if (arts.some((a) => a.a === actualId)) return true
    return false
  }, [libro, actualId])

  const [abierto, setAbierto] = useState(contieneActual)
  useEffect(() => {
    if (contieneActual) setAbierto(true)
  }, [contieneActual])

  return (
    <div>
      <button
        onClick={() => setAbierto(!abierto)}
        className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 text-sm transition-colors ${
          modoOscuro ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
        }`}
      >
        <i className={`ti ti-chevron-right text-xs transition-transform ${abierto ? 'rotate-90' : ''}`} />
        <i className="ti ti-book text-sm" />
        <span className="flex-1 truncate font-medium">{libro.libro ?? 'General'}</span>
        <span className={`text-[10px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>{libro.total}</span>
      </button>
      {abierto && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l pl-2.5" style={{ borderColor: modoOscuro ? '#27272a' : '#e4e4e7' }}>
          {[...libro.titulos.entries()].map(([tituloKey, capitulos]) => (
            <NodoTitulo
              key={tituloKey ?? '_'}
              tituloKey={tituloKey}
              capitulos={capitulos}
              actualId={actualId}
              onSelect={onSelect}
              modoOscuro={modoOscuro}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NodoTitulo({
  tituloKey,
  capitulos,
  actualId,
  onSelect,
  modoOscuro,
}: {
  tituloKey: string | null
  capitulos: Map<string | null, Articulo[]>
  actualId?: string
  onSelect: (a: string) => void
  modoOscuro: boolean
}) {
  const contieneActual = useMemo(() => {
    for (const arts of capitulos.values()) if (arts.some((a) => a.a === actualId)) return true
    return false
  }, [capitulos, actualId])

  const [abierto, setAbierto] = useState(contieneActual)
  useEffect(() => {
    if (contieneActual) setAbierto(true)
  }, [contieneActual])

  const total = [...capitulos.values()].reduce((s, a) => s + a.length, 0)

  return (
    <div>
      <button
        onClick={() => setAbierto(!abierto)}
        className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 text-xs transition-colors ${
          modoOscuro ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
        }`}
      >
        <i className={`ti ti-chevron-right text-[10px] transition-transform ${abierto ? 'rotate-90' : ''}`} />
        <span className="flex-1 truncate">{tituloKey ?? '(General)'}</span>
        <span className={`text-[10px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>{total}</span>
      </button>
      {abierto && (
        <div className="ml-3 space-y-0.5">
          {[...capitulos.entries()].map(([capituloKey, arts]) => (
            <NodoCapitulo
              key={capituloKey ?? '_'}
              capituloKey={capituloKey}
              arts={arts}
              actualId={actualId}
              onSelect={onSelect}
              modoOscuro={modoOscuro}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NodoCapitulo({
  capituloKey,
  arts,
  actualId,
  onSelect,
  modoOscuro,
}: {
  capituloKey: string | null
  arts: Articulo[]
  actualId?: string
  onSelect: (a: string) => void
  modoOscuro: boolean
}) {
  const contieneActual = arts.some((a) => a.a === actualId)
  const [abierto, setAbierto] = useState(contieneActual)
  useEffect(() => {
    if (contieneActual) setAbierto(true)
  }, [contieneActual])

  const titulo = capituloKey ?? null
  const conTitulo = titulo !== null

  return (
    <div>
      {conTitulo && (
        <button
          onClick={() => setAbierto(!abierto)}
          className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 text-[11px] transition-colors ${
            modoOscuro ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
          }`}
        >
          <i className={`ti ti-chevron-right text-[10px] transition-transform ${abierto ? 'rotate-90' : ''}`} />
          <span className="flex-1 truncate">{titulo}</span>
          <span className={`text-[10px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>{arts.length}</span>
        </button>
      )}
      {(abierto || !conTitulo) && (
        <div className={conTitulo ? 'ml-3' : ''}>
          {arts.map((a) => {
            const activo = a.a === actualId
            return (
              <button
                key={a.a}
                onClick={() => onSelect(a.a)}
                className={`w-full text-left px-2 py-1 rounded text-[11px] font-mono transition-colors truncate ${
                  activo
                    ? 'font-semibold text-white'
                    : modoOscuro
                    ? 'text-zinc-400 hover:bg-zinc-800'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
                style={activo ? { background: VERDE } : undefined}
              >
                {a.a}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ModalBusqueda({
  abierto,
  onCerrar,
  arts,
  busqueda,
  setBusqueda,
  onSelect,
  modoOscuro,
}: {
  abierto: boolean
  onCerrar: () => void
  arts: Articulo[]
  busqueda: string
  setBusqueda: (s: string) => void
  onSelect: (a: string) => void
  modoOscuro: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [indiceActivo, setIndiceActivo] = useState(0)

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return arts.slice(0, 50)

    // Si lo que escribió parece un identificador de artículo puro
    // (ej. "161", "art 161", "art. 161", "artículo 161°"), buscamos por
    // número de artículo en vez de por contenido — es lo que el usuario
    // normalmente espera al teclear solo el número.
    const matchSoloId = q.match(/^(?:art(?:[íi]culo)?\.?\s*)?(\d+)\s*[°ºo]?\s*$/i)
    const qSoloIdArticulo = matchSoloId !== null
    const qNumPuro = matchSoloId ? matchSoloId[1] : null

    type Puntuado = { a: typeof arts[number]; score: number }
    const puntuados: Puntuado[] = []

    for (const a of arts) {
      const numArt = a.a.replace(/[^\d]/g, '')
      let score = 0

      if (qSoloIdArticulo && qNumPuro) {
        // Búsqueda por identificador: solo importa el número del artículo,
        // NO las menciones a ese número dentro del texto de otros artículos.
        if (numArt === qNumPuro) score = 10000
        else if (numArt.startsWith(qNumPuro)) score = 1000 - (numArt.length - qNumPuro.length)
      } else {
        // Búsqueda mixta o de texto libre.
        if (a.a.toLowerCase().includes(q)) score += 500
        const lower = a.t.toLowerCase()
        if (lower.includes(q)) score += 100
        // Bonus por palabras individuales del query (>2 chars)
        const palabras = q.split(/\s+/).filter((w) => w.length > 2)
        for (const w of palabras) {
          if (lower.includes(w)) score += 10
        }
      }

      if (score > 0) puntuados.push({ a, score })
    }

    return puntuados
      .sort((x, y) => y.score - x.score)
      .slice(0, 50)
      .map((p) => p.a)
  }, [arts, busqueda])

  useEffect(() => {
    setIndiceActivo(0)
  }, [busqueda, abierto])

  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 50)
  }, [abierto])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceActivo((i) => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const r = resultados[indiceActivo]
      if (r) onSelect(r.a)
    }
  }

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onCerrar}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] ${
              modoOscuro ? 'bg-zinc-900' : 'bg-white'
            }`}
          >
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <i className={`ti ti-search text-lg ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <input
                ref={inputRef}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={onKey}
                placeholder='Busca por número ("161") o palabra clave ("vacaciones")'
                className={`flex-1 bg-transparent outline-none text-base ${
                  modoOscuro ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
                }`}
              />
              <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${modoOscuro ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}>
                ESC
              </kbd>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {resultados.length === 0 ? (
                <div className={`text-center py-10 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <i className="ti ti-search-off text-2xl mb-2 block" />
                  <p className="text-sm">Sin resultados</p>
                </div>
              ) : (
                resultados.map((a, i) => {
                  const activo = i === indiceActivo
                  return (
                    <button
                      key={a.a}
                      onClick={() => onSelect(a.a)}
                      onMouseEnter={() => setIndiceActivo(i)}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        activo
                          ? modoOscuro
                            ? 'bg-zinc-800'
                            : 'bg-zinc-100'
                          : ''
                      }`}
                    >
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-mono text-xs font-semibold" style={{ color: VERDE }}>
                          {a.a}
                        </span>
                        {a.libro && (
                          <span className={`text-[10px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                            · Libro {a.libro.split(' — ')[0]}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs line-clamp-1 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        {primerasPalabras(a.t, 18)}
                      </p>
                    </button>
                  )
                })
              )}
            </div>

            <div
              className={`px-4 py-2 border-t flex items-center gap-3 text-[10px] ${
                modoOscuro ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'
              }`}
            >
              <span><kbd className="font-mono">↑↓</kbd> navegar</span>
              <span><kbd className="font-mono">↵</kbd> abrir</span>
              <span><kbd className="font-mono">esc</kbd> cerrar</span>
              <span className="ml-auto">{resultados.length} resultado{resultados.length !== 1 ? 's' : ''}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FichaCodigo({ tipo, modoOscuro }: { tipo: CodigoTipo; modoOscuro: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const meta = obtenerMetadata(tipo)
  const setCodigoExplorador = useStore((s) => s.setCodigoExplorador)

  useEffect(() => {
    if (!abierto) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [abierto])

  if (!meta) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        title="Ver fuente, decreto y fecha de indexación"
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          abierto
            ? modoOscuro
              ? 'bg-zinc-800 text-[var(--accent-400)]'
              : 'bg-[var(--accent-50)] text-[var(--accent-700)]'
            : modoOscuro
            ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
        }`}
      >
        <i className="ti ti-info-circle text-base" />
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full left-0 mt-2 w-80 rounded-xl shadow-xl z-30 overflow-hidden border ${
              modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className={`px-4 py-3 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-100'}`}>
              <div className={`text-[11px] uppercase tracking-wider font-semibold mb-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Ficha del código
              </div>
              <div className={`text-sm font-semibold leading-tight ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                {meta.nombreOficial}
              </div>
            </div>
            <div className="px-4 py-3 space-y-2.5 text-xs">
              <FichaFila label="Norma de origen" modoOscuro={modoOscuro}>
                {meta.norma}
              </FichaFila>
              <FichaFila label="Última indexación" modoOscuro={modoOscuro}>
                {formatearFechaIndexacion(meta.fechaIndexacion)}
              </FichaFila>
              <FichaFila label="Fuente" modoOscuro={modoOscuro}>
                <a
                  href={meta.fuenteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 underline ${
                    modoOscuro ? 'text-[var(--accent-400)] hover:text-[var(--accent-300)]' : 'text-[var(--accent-700)] hover:text-[var(--accent-800)]'
                  }`}
                >
                  Biblioteca del Congreso Nacional
                  <i className="ti ti-external-link text-xs" />
                </a>
              </FichaFila>
              {meta.notas && (
                <div
                  className={`flex items-start gap-2 text-[11px] leading-relaxed px-2.5 py-2 rounded-md ${
                    modoOscuro ? 'bg-amber-950/30 text-amber-300 border border-amber-900/60' : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <i className="ti ti-alert-triangle text-xs mt-0.5 flex-shrink-0" />
                  <span>{meta.notas}</span>
                </div>
              )}
              {meta.relacionadas && meta.relacionadas.length > 0 && (
                <FichaFila label="Ver también" modoOscuro={modoOscuro}>
                  <div className="flex flex-wrap gap-1.5">
                    {meta.relacionadas.map((relTipo) => (
                      <button
                        key={relTipo}
                        onClick={() => {
                          setCodigoExplorador(relTipo)
                          setAbierto(false)
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                          modoOscuro
                            ? 'border-zinc-700 bg-zinc-800/50 text-[var(--accent-400)] hover:bg-zinc-800 hover:border-[var(--accent-700)]'
                            : 'border-zinc-200 bg-zinc-50 text-[var(--accent-700)] hover:bg-[var(--accent-50)] hover:border-[var(--accent-300)]'
                        }`}
                        title={`Abrir ${nombreCortoMetadata(relTipo)} en el Explorador`}
                      >
                        <i className="ti ti-link text-[10px]" />
                        {nombreCortoMetadata(relTipo)}
                      </button>
                    ))}
                  </div>
                </FichaFila>
              )}
              <p className={`text-[10px] leading-relaxed pt-1 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                La fecha indica cuándo se procesó el PDF oficial. <strong>Puede no incluir reformas legales posteriores</strong>. Verifica siempre contra el texto vigente en la fuente.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FichaFila({
  label,
  modoOscuro,
  children,
}: {
  label: string
  modoOscuro: boolean
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-28 flex-shrink-0 text-[10px] uppercase tracking-wide ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {label}
      </div>
      <div className={`flex-1 ${modoOscuro ? 'text-zinc-200' : 'text-zinc-700'}`}>{children}</div>
    </div>
  )
}

function PantallaCargandoCodigo({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <div className={`h-full flex items-center justify-center ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
        >
          <i className="ti ti-loader-2 text-2xl" style={{ color: VERDE }} />
        </motion.div>
        <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>Cargando código...</p>
      </div>
    </div>
  )
}

function primerasPalabras(texto: string, n: number): string {
  const palabras = texto.split(/\s+/).slice(0, n)
  return palabras.join(' ') + (texto.split(/\s+/).length > n ? '…' : '')
}

function separarNotas(texto: string): { principal: string; notas: { etiqueta: string; texto: string }[] } {
  const re = /(?:^|\s)NOTA(?:\s+(\d+))?\s*:?\s*/g
  const matches: { start: number; end: number; num: string | undefined }[] = []
  let m
  while ((m = re.exec(texto)) !== null) {
    matches.push({ start: m.index + (m[0].startsWith(' ') ? 1 : 0), end: m.index + m[0].length, num: m[1] })
  }
  if (matches.length === 0) return { principal: texto.trim(), notas: [] }
  const principal = texto.substring(0, matches[0].start).trim()
  const notas: { etiqueta: string; texto: string }[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].end
    const end = i + 1 < matches.length ? matches[i + 1].start : texto.length
    notas.push({
      etiqueta: matches[i].num ? `Nota ${matches[i].num}` : 'Nota',
      texto: texto.substring(start, end).trim(),
    })
  }
  return { principal, notas }
}

function ArticuloTexto({ texto, modoOscuro }: { texto: string; modoOscuro: boolean }) {
  const { principal, notas } = useMemo(() => separarNotas(texto), [texto])
  const parrafos = useMemo(
    () => principal.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0),
    [principal]
  )
  return (
    <>
      <div
        className={modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {parrafos.map((p, i) => (
          <p
            key={i}
            className="text-[17px] leading-[1.8] mb-4 last:mb-0"
            style={i === 0 ? undefined : { textIndent: '1.5rem' }}
          >
            {p}
          </p>
        ))}
      </div>
      {notas.length > 0 && (
        <div className="mt-6 space-y-2.5">
          {notas.map((n, i) => (
            <div
              key={i}
              className={`rounded-lg px-4 py-3 border ${
                modoOscuro
                  ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-100/70 border-zinc-200 text-zinc-600'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <i
                  className={`ti ti-info-circle text-sm ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}
                />
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold ${
                    modoOscuro ? 'text-zinc-500' : 'text-zinc-500'
                  }`}
                >
                  {n.etiqueta}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{n.texto}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

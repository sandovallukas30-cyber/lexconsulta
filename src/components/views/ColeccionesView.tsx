import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useCodigo } from '../../hooks/useCodigo'
import { precargar, obtenerCodigo } from '../../services/codigos'
import { COLECCIONES_PLANTILLA } from '../../data/coleccionesPlantilla'
import type {
  Articulo,
  ArticuloColeccion,
  Coleccion,
  CodigoTipo,
  EstadoRepaso,
  ModoVistaColeccion,
  TipoRelacion,
  ConexionColeccion,
  FuncionJuridica,
  GrupoColeccion,
} from '../../types'

const VERDE = 'var(--accent-base)'

export function ColeccionesView() {
  const coleccionActivaId = useStore((s) => s.coleccionActivaId)
  const coleccion = useStore((s) =>
    s.colecciones.find((c) => c.id === s.coleccionActivaId)
  )

  if (coleccionActivaId && coleccion) {
    return <ColeccionDetalle coleccion={coleccion} />
  }
  return <ListaColecciones />
}

// ============================================================
// LISTA
// ============================================================

function ListaColecciones() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const colecciones = useStore((s) => s.colecciones)
  const setColeccionActiva = useStore((s) => s.setColeccionActiva)
  const eliminarColeccion = useStore((s) => s.eliminarColeccion)
  const [modalNueva, setModalNueva] = useState(false)

  const ordenadas = useMemo(
    () => [...colecciones].sort((a, b) => b.fechaModificacion - a.fechaModificacion),
    [colecciones]
  )

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              Colecciones
            </h1>
            <p className={`text-sm mt-1.5 max-w-md ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Junta artículos de cualquier código bajo un mismo tema, para estudiarlos
              todos juntos sin ir cambiando de pantalla.
            </p>
          </div>
          <button
            onClick={() => setModalNueva(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ background: VERDE }}
          >
            <i className="ti ti-plus text-base" />
            Nueva colección
          </button>
        </div>

        {ordenadas.length === 0 ? (
          <EmptyState onCrear={() => setModalNueva(true)} modoOscuro={modoOscuro} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ordenadas.map((c, i) => (
              <TarjetaColeccion
                key={c.id}
                coleccion={c}
                delay={i * 0.03}
                onAbrir={() => setColeccionActiva(c.id)}
                onEliminar={() => {
                  if (confirm(`¿Eliminar la colección "${c.titulo}"? Los artículos no se borran, solo esta agrupación.`)) {
                    eliminarColeccion(c.id)
                  }
                }}
                modoOscuro={modoOscuro}
              />
            ))}
          </div>
        )}

        <SeccionPlantillas expandidaPorDefecto={ordenadas.length === 0} modoOscuro={modoOscuro} />
      </div>

      <ModalNuevaColeccion abierto={modalNueva} onCerrar={() => setModalNueva(false)} modoOscuro={modoOscuro} />
    </div>
  )
}

function SeccionPlantillas({
  expandidaPorDefecto,
  modoOscuro,
}: {
  expandidaPorDefecto: boolean
  modoOscuro: boolean
}) {
  const [abierta, setAbierta] = useState(expandidaPorDefecto)
  const crearColeccion = useStore((s) => s.crearColeccion)
  const agregarArticulo = useStore((s) => s.agregarArticuloAColeccion)
  const setColeccionActiva = useStore((s) => s.setColeccionActiva)
  // EXPERIMENTAL: solo lo usan las plantillas "demo" que traen conexiones y
  // grupos ya armados, no las plantillas clásicas de solo-artículos.
  const crearConexion = useStore((s) => s.crearConexionColeccion)
  const crearGrupo = useStore((s) => s.crearGrupoColeccion)

  const usarPlantilla = (plantillaId: string) => {
    const plantilla = COLECCIONES_PLANTILLA.find((p) => p.id === plantillaId)
    if (!plantilla) return
    const id = crearColeccion(plantilla.titulo)
    for (const art of plantilla.articulos) agregarArticulo(id, art)
    for (const cx of plantilla.conexiones ?? []) crearConexion(id, cx.desde, cx.hasta, cx.tipo)
    for (const g of plantilla.grupos ?? []) crearGrupo(id, g.titulo, g.articulos)
    setColeccionActiva(id)
  }

  return (
    <div className="mt-10">
      <button
        onClick={() => setAbierta(!abierta)}
        className={`flex items-center gap-2 text-sm font-semibold mb-4 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}
      >
        <i className={`ti ti-chevron-right text-sm transition-transform ${abierta ? 'rotate-90' : ''}`} />
        Plantillas para empezar
        <span className={`text-xs font-normal ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
          ({COLECCIONES_PLANTILLA.length})
        </span>
      </button>

      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className={`text-xs mb-4 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Temas clásicos de Derecho Civil, ya armados. Al usar una se crea una copia propia
              que puedes editar libremente.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
              {COLECCIONES_PLANTILLA.map((p) => (
                <button
                  key={p.id}
                  onClick={() => usarPlantilla(p.id)}
                  className={`text-left rounded-lg border p-4 transition-colors ${
                    modoOscuro
                      ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <h4 className={`text-sm font-serif font-semibold mb-1 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                    {p.titulo}
                  </h4>
                  <p className={`text-xs mb-2 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{p.descripcion}</p>
                  <span className={`text-[11px] font-medium ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {p.articulos.length} artículos · usar plantilla
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyState({ onCrear, modoOscuro }: { onCrear: () => void; modoOscuro: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center py-20"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
      >
        <i className="ti ti-stack-2 text-3xl" style={{ color: VERDE }} />
      </div>
      <h2 className={`text-lg font-serif font-semibold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
        Aún no tienes colecciones
      </h2>
      <p className={`text-sm max-w-sm mx-auto mb-6 leading-relaxed ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
        Por ejemplo: "Extinción de los contratos" con los Art. 1545, 1567 y 1698 del
        Código Civil, todos a la vista, sin cambiar de pantalla.
      </p>
      <button
        onClick={onCrear}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: VERDE }}
      >
        <i className="ti ti-plus text-base" />
        Crear tu primera colección
      </button>
    </motion.div>
  )
}

function TarjetaColeccion({
  coleccion,
  delay,
  onAbrir,
  onEliminar,
  modoOscuro,
}: {
  coleccion: Coleccion
  delay: number
  onAbrir: () => void
  onEliminar: () => void
  modoOscuro: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      onClick={onAbrir}
      className={`group relative text-left rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${
        modoOscuro
          ? 'bg-zinc-800/40 border-zinc-800 hover:border-[var(--accent-700)]'
          : 'bg-white border-zinc-200 hover:border-[var(--accent-500)]'
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onEliminar()
        }}
        title="Eliminar colección"
        className={`absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
          modoOscuro ? 'text-zinc-500 hover:bg-zinc-800 hover:text-red-400' : 'text-zinc-400 hover:bg-zinc-100 hover:text-red-500'
        }`}
      >
        <i className="ti ti-trash text-sm" />
      </button>

      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
        style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)' : 'color-mix(in srgb, var(--accent-base) 8%, transparent)' }}
      >
        <i className="ti ti-stack-2 text-xl" style={{ color: VERDE }} />
      </div>

      <h3 className={`text-base font-serif font-semibold leading-tight mb-1 pr-6 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
        {coleccion.titulo}
      </h3>
      <p className={`text-xs mb-3 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
        {coleccion.articulos.length} artículo{coleccion.articulos.length !== 1 ? 's' : ''}
      </p>

      {coleccion.articulos.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {coleccion.articulos.slice(0, 6).map((a, i) => (
            <span
              key={i}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                modoOscuro ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {a.articulo}
            </span>
          ))}
          {coleccion.articulos.length > 6 && (
            <span className={`px-1 py-0.5 text-[10px] ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
              +{coleccion.articulos.length - 6}
            </span>
          )}
        </div>
      )}

      <p className={`text-[10px] pt-3 border-t ${modoOscuro ? 'border-zinc-800 text-zinc-600' : 'border-zinc-100 text-zinc-400'}`}>
        Modificada {formatearFecha(coleccion.fechaModificacion)}
      </p>
    </motion.div>
  )
}

function ModalNuevaColeccion({
  abierto,
  onCerrar,
  modoOscuro,
}: {
  abierto: boolean
  onCerrar: () => void
  modoOscuro: boolean
}) {
  const crearColeccion = useStore((s) => s.crearColeccion)
  const setColeccionActiva = useStore((s) => s.setColeccionActiva)
  const [titulo, setTitulo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (abierto) {
      setTitulo('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [abierto])

  const crear = () => {
    const t = titulo.trim()
    if (!t) return
    const id = crearColeccion(t)
    setColeccionActiva(id)
    onCerrar()
  }

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onCerrar}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${modoOscuro ? 'bg-zinc-900' : 'bg-white'}`}
          >
            <div className={`px-5 py-4 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <h2 className={`text-base font-serif font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                Nueva colección
              </h2>
              <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                Ponle el nombre del tema que vas a estudiar
              </p>
            </div>
            <div className="px-5 py-4">
              <input
                ref={inputRef}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && crear()}
                placeholder="Ej: Extinción de los contratos"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                  modoOscuro
                    ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[var(--accent-600)]'
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-[var(--accent-500)]'
                }`}
              />
            </div>
            <div className={`px-5 py-3 border-t flex justify-end gap-2 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <button
                onClick={onCerrar}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  modoOscuro ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={crear}
                disabled={!titulo.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                style={{ background: VERDE }}
              >
                Crear
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// DETALLE
// ============================================================

interface ArticuloResuelto {
  codigo: CodigoTipo
  articulo: string
  art: Articulo | null
  nombreCodigo: string
  cargando: boolean
  estado: EstadoRepaso
  nota: string
  /** EXPERIMENTAL (rama experimento-visualizacion): no existe en main. */
  posicion?: { x: number; y: number }
  funcion?: FuncionJuridica
}

/** Resuelve el texto completo de cada artículo de la colección, cargando en
 * segundo plano los códigos que aún no estén en memoria. */
function useArticulosResueltos(articulos: ArticuloColeccion[]): ArticuloResuelto[] {
  const codigosStore = useStore((s) => s.codigos)
  const tiposNecesarios = useMemo(
    () => Array.from(new Set(articulos.map((a) => a.codigo))),
    [articulos]
  )
  const clave = tiposNecesarios.join(',')
  const [, forzarActualizacion] = useState(0)

  useEffect(() => {
    let cancelado = false
    precargar(tiposNecesarios).then(() => {
      if (!cancelado) forzarActualizacion((v) => v + 1)
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  return articulos.map((ac) => {
    const data = obtenerCodigo(ac.codigo)
    const art = data?.articulos.find((a) => a.a === ac.articulo) ?? null
    const meta = codigosStore.find((c) => c.tipo === ac.codigo)
    return {
      codigo: ac.codigo,
      articulo: ac.articulo,
      art,
      nombreCodigo: meta?.nombreCorto ?? ac.codigo,
      cargando: !data,
      estado: ac.estado ?? 'pendiente',
      nota: ac.nota ?? '',
      posicion: ac.posicion,
      funcion: ac.funcion,
    }
  })
}

const ESTADO_SIGUIENTE: Record<EstadoRepaso, EstadoRepaso> = {
  pendiente: 'repasando',
  repasando: 'dominado',
  dominado: 'pendiente',
}

const ESTADO_INFO: Record<EstadoRepaso, { icono: string; label: string; colorLight: string; colorDark: string }> = {
  pendiente: { icono: 'ti-circle', label: 'Pendiente', colorLight: 'text-zinc-400', colorDark: 'text-zinc-600' },
  repasando: { icono: 'ti-circle-half-2', label: 'Repasando', colorLight: 'text-amber-600', colorDark: 'text-amber-400' },
  dominado: { icono: 'ti-circle-check-filled', label: 'Dominado', colorLight: 'text-emerald-600', colorDark: 'text-emerald-400' },
}

function ColeccionDetalle({ coleccion }: { coleccion: Coleccion }) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const setColeccionActiva = useStore((s) => s.setColeccionActiva)
  const renombrarColeccion = useStore((s) => s.renombrarColeccion)
  const eliminarColeccion = useStore((s) => s.eliminarColeccion)
  const quitarArticulo = useStore((s) => s.quitarArticuloDeColeccion)
  const moverArticulo = useStore((s) => s.moverArticuloColeccion)
  const marcarEstado = useStore((s) => s.marcarEstadoArticulo)
  const guardarNota = useStore((s) => s.guardarNotaArticulo)
  const moverPosicionLibre = useStore((s) => s.moverArticuloPosicionLibre)
  const crearConexion = useStore((s) => s.crearConexionColeccion)
  const eliminarConexion = useStore((s) => s.eliminarConexionColeccion)
  const asignarFuncion = useStore((s) => s.asignarFuncionArticulo)
  const crearGrupo = useStore((s) => s.crearGrupoColeccion)
  const eliminarGrupo = useStore((s) => s.eliminarGrupoColeccion)
  const organizarPorConexiones = useStore((s) => s.organizarPorConexiones)

  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [tituloTmp, setTituloTmp] = useState(coleccion.titulo)
  const [modalAgregar, setModalAgregar] = useState(false)
  const [modoRepaso, setModoRepaso] = useState(false)
  // EXPERIMENTAL (rama experimento-visualizacion): selector de layout, no existe en main.
  const [modoVista, setModoVista] = useState<ModoVistaColeccion>('mamposteria')
  const inputTituloRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTituloTmp(coleccion.titulo)
  }, [coleccion.titulo])

  useEffect(() => {
    if (editandoTitulo) setTimeout(() => inputTituloRef.current?.focus(), 30)
  }, [editandoTitulo])

  const guardarTitulo = () => {
    const t = tituloTmp.trim()
    if (t && t !== coleccion.titulo) renombrarColeccion(coleccion.id, t)
    else setTituloTmp(coleccion.titulo)
    setEditandoTitulo(false)
  }

  const articulosResueltos = useArticulosResueltos(coleccion.articulos)

  const dominados = articulosResueltos.filter((a) => a.estado === 'dominado').length

  // Leyenda de colores: solo tiene sentido mostrarla si la colección mezcla
  // más de un área (si es puro Civil, por ejemplo, no hay nada que distinguir).
  const areasPresentes = useMemo(() => {
    const familias = new Set(coleccion.articulos.map((a) => COLOR_POR_CODIGO[a.codigo]))
    return Array.from(familias).map((f) => ({ familia: f, nombre: NOMBRE_FAMILIA[f], hex: HEX_POR_FAMILIA[f] }))
  }, [coleccion.articulos])

  return (
    <div className={`h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div
        className={`flex items-center gap-3 px-6 py-3 border-b ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <button
          onClick={() => setColeccionActiva(null)}
          title="Volver a Colecciones"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
            modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
          }`}
        >
          <i className="ti ti-arrow-left text-lg" />
        </button>

        {editandoTitulo ? (
          <input
            ref={inputTituloRef}
            value={tituloTmp}
            onChange={(e) => setTituloTmp(e.target.value)}
            onBlur={guardarTitulo}
            onKeyDown={(e) => {
              if (e.key === 'Enter') guardarTitulo()
              if (e.key === 'Escape') {
                setTituloTmp(coleccion.titulo)
                setEditandoTitulo(false)
              }
            }}
            className={`flex-1 min-w-0 bg-transparent outline-none border-b-2 text-lg font-serif font-semibold px-0.5 ${
              modoOscuro ? 'text-white' : 'text-zinc-900'
            }`}
            style={{ borderColor: VERDE }}
          />
        ) : (
          <button
            onClick={() => setEditandoTitulo(true)}
            title="Renombrar"
            className="group/title flex-1 min-w-0 text-left flex items-center gap-2"
          >
            <h1 className={`text-lg font-serif font-semibold truncate ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              {coleccion.titulo}
            </h1>
            <i
              className={`ti ti-pencil text-xs opacity-0 group-hover/title:opacity-60 transition-opacity flex-shrink-0 ${
                modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            />
          </button>
        )}

        {coleccion.articulos.length > 0 && (
          <span className={`text-xs flex-shrink-0 hidden sm:inline ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {dominados}/{coleccion.articulos.length} dominados
          </span>
        )}

        {coleccion.articulos.length > 0 && (
          <button
            onClick={() => setModoRepaso(!modoRepaso)}
            title="En modo repaso, las fichas empiezan ocultas: intenta recordar antes de tocarlas"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0 transition-colors ${
              modoRepaso
                ? 'text-white'
                : modoOscuro
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
            style={modoRepaso ? { background: VERDE } : undefined}
          >
            <i className="ti ti-brain text-base" />
            <span className="hidden md:inline">Modo repaso</span>
          </button>
        )}

        {/* EXPERIMENTAL: selector de layout, no existe en main */}
        {coleccion.articulos.length > 0 && (
          <div className={`flex items-center gap-0.5 p-0.5 rounded-lg flex-shrink-0 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            {(
              [
                { id: 'mamposteria' as const, icono: 'ti-layout-grid', title: 'Mampostería (actual)' },
                { id: 'horizontal' as const, icono: 'ti-arrows-horizontal', title: 'Fila horizontal' },
                { id: 'pizarra' as const, icono: 'ti-drag-drop', title: 'Pizarra libre (arrastrar)' },
                { id: 'arbol' as const, icono: 'ti-sitemap', title: 'Vista árbol (según conexiones)' },
              ]
            ).map((op) => (
              <button
                key={op.id}
                onClick={() => setModoVista(op.id)}
                title={op.title}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                  modoVista === op.id
                    ? modoOscuro
                      ? 'bg-zinc-700 text-white'
                      : 'bg-white text-zinc-900 shadow-sm'
                    : modoOscuro
                      ? 'text-zinc-500 hover:text-zinc-300'
                      : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <i className={`ti ${op.icono} text-sm`} />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setModalAgregar(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white flex-shrink-0 transition-opacity hover:opacity-90"
          style={{ background: VERDE }}
        >
          <i className="ti ti-plus text-base" />
          <span className="hidden sm:inline">Agregar artículo</span>
        </button>

        <button
          onClick={() => {
            if (confirm(`¿Eliminar la colección "${coleccion.titulo}"?`)) {
              eliminarColeccion(coleccion.id)
            }
          }}
          title="Eliminar colección"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
            modoOscuro ? 'text-zinc-500 hover:bg-zinc-800 hover:text-red-400' : 'text-zinc-400 hover:bg-zinc-100 hover:text-red-500'
          }`}
        >
          <i className="ti ti-trash text-base" />
        </button>
      </div>

      {areasPresentes.length > 1 && (
        <div
          className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 px-6 py-2 border-b text-xs ${
            modoOscuro ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
          }`}
        >
          {areasPresentes.map((a) => (
            <span key={a.familia} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.hex }} />
              {a.nombre}
            </span>
          ))}
        </div>
      )}

      {coleccion.articulos.length > 0 && modoVista === 'pizarra' ? (
        // EXPERIMENTAL: pizarra libre, no existe en main.
        <VistaPizarra
          articulos={articulosResueltos}
          conexiones={coleccion.conexiones ?? []}
          grupos={coleccion.grupos ?? []}
          onQuitar={(ref) => quitarArticulo(coleccion.id, ref)}
          onCambiarEstado={(ref, estado) => marcarEstado(coleccion.id, ref, estado)}
          onGuardarNota={(ref, nota) => guardarNota(coleccion.id, ref, nota)}
          onMoverPosicion={(ref, pos) => moverPosicionLibre(coleccion.id, ref, pos)}
          onCrearConexion={(desde, hasta, tipo) => crearConexion(coleccion.id, desde, hasta, tipo)}
          onEliminarConexion={(conexionId) => eliminarConexion(coleccion.id, conexionId)}
          onAsignarFuncion={(ref, funcion) => asignarFuncion(coleccion.id, ref, funcion)}
          onCrearGrupo={(titulo, refs) => crearGrupo(coleccion.id, titulo, refs)}
          onEliminarGrupo={(grupoId) => eliminarGrupo(coleccion.id, grupoId)}
          onOrganizarPorConexiones={(posiciones) => organizarPorConexiones(coleccion.id, posiciones)}
          modoRepaso={modoRepaso}
          modoOscuro={modoOscuro}
        />
      ) : coleccion.articulos.length > 0 && modoVista === 'arbol' ? (
        // EXPERIMENTAL: vista árbol, no existe en main.
        <VistaArbol articulos={articulosResueltos} conexiones={coleccion.conexiones ?? []} modoOscuro={modoOscuro} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className={modoVista === 'horizontal' ? 'py-6' : 'max-w-6xl mx-auto px-6 py-6'}>
            {coleccion.articulos.length === 0 ? (
              <div className="text-center py-16 px-6">
                <p className={`text-sm mb-4 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Esta colección está vacía. Agrega los artículos que quieres tener juntos.
                </p>
                <button
                  onClick={() => setModalAgregar(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: VERDE }}
                >
                  <i className="ti ti-plus text-base" />
                  Agregar artículo
                </button>
              </div>
            ) : modoVista === 'horizontal' ? (
              // EXPERIMENTAL: fila única con scroll horizontal, no existe en main.
              <div className="flex gap-4 overflow-x-auto px-6 pb-4">
                {articulosResueltos.map((ar, i) => (
                  <div key={`${ar.codigo}::${ar.articulo}`} className="flex-shrink-0 w-[380px]">
                    <TarjetaArticulo
                      item={ar}
                      posicion={i}
                      total={articulosResueltos.length}
                      onQuitar={() => quitarArticulo(coleccion.id, { codigo: ar.codigo, articulo: ar.articulo })}
                      onMover={(dir) => moverArticulo(coleccion.id, i, dir)}
                      onCambiarEstado={(estado) => marcarEstado(coleccion.id, { codigo: ar.codigo, articulo: ar.articulo }, estado)}
                      onGuardarNota={(nota) => guardarNota(coleccion.id, { codigo: ar.codigo, articulo: ar.articulo }, nota)}
                      modoRepaso={modoRepaso}
                      modoOscuro={modoOscuro}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // Mampostería con columnas CSS: cada ficha "cae" al primer hueco
              // disponible en su columna, en vez de dejar espacio muerto al
              // lado de una ficha larga (como pasaba con flex-wrap por filas).
              <div className="columns-1 sm:columns-2 xl:columns-3 gap-4">
                {articulosResueltos.map((ar, i) => (
                  <div key={`${ar.codigo}::${ar.articulo}`} className="break-inside-avoid mb-4">
                    <TarjetaArticulo
                      item={ar}
                      posicion={i}
                      total={articulosResueltos.length}
                      onQuitar={() => quitarArticulo(coleccion.id, { codigo: ar.codigo, articulo: ar.articulo })}
                      onMover={(dir) => moverArticulo(coleccion.id, i, dir)}
                      onCambiarEstado={(estado) => marcarEstado(coleccion.id, { codigo: ar.codigo, articulo: ar.articulo }, estado)}
                      onGuardarNota={(nota) => guardarNota(coleccion.id, { codigo: ar.codigo, articulo: ar.articulo }, nota)}
                      modoRepaso={modoRepaso}
                      modoOscuro={modoOscuro}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ModalAgregarArticulo
        abierto={modalAgregar}
        onCerrar={() => setModalAgregar(false)}
        coleccionId={coleccion.id}
        modoOscuro={modoOscuro}
      />
    </div>
  )
}

// Colores por área del derecho, siguiendo la asociación informal chilena
// (civil = azul, penal = negro, laboral = naranja, etc.), no un hash al
// azar. Las leyes especiales se agrupan bajo el color del área a la que
// pertenecen en la práctica (ej. Ley Karin y Accidentes del Trabajo → con
// Laboral; Insolvencia → con Comercial, que el usuario pidió en amarillo
// en vez del verde oscuro tradicional).
type FamiliaColor =
  | 'red' | 'blue' | 'indigo' | 'zinc' | 'rose' | 'orange' | 'purple'
  | 'yellow' | 'sky' | 'slate' | 'lime' | 'teal' | 'stone' | 'cyan'
  | 'emerald' | 'fuchsia'

const COLOR_POR_CODIGO: Record<CodigoTipo, FamiliaColor> = {
  con: 'red', // Constitucional
  civ: 'blue', // Civil
  pci: 'indigo', // Procesal Civil
  pen: 'zinc', // Penal
  ppe: 'rose', // Procesal Penal
  rpa: 'zinc', // Resp. Penal Adolescente → familia Penal
  dro: 'zinc', // Ley de Drogas → familia Penal
  lab: 'orange', // Laboral
  acc: 'orange', // Accidentes del Trabajo → familia Laboral
  kar: 'orange', // Ley Karin → familia Laboral
  tra: 'orange', // alias legado de 'lab', no usado en el catálogo activo
  tri: 'purple', // Tributario
  com: 'yellow', // Comercial (pedido explícito: amarillo, no verde oscuro)
  ins: 'yellow', // Insolvencia → familia Comercial
  pad: 'sky', // Administrativo
  trn: 'sky', // Transparencia → familia Administrativo
  cot: 'slate', // Orgánico de Tribunales (organización judicial, sin área fija)
  mil: 'lime', // Justicia Militar
  pdc: 'teal', // Internacional (Pacto Civiles y Políticos)
  pde: 'teal', // Internacional (Pacto DESC)
  min: 'stone', // Minería
  agu: 'cyan', // Aguas
  san: 'emerald', // Sanitario (sin área fija en la lista, verde por salud)
  fam: 'fuchsia', // Familia
}

const HEX_POR_FAMILIA: Record<FamiliaColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  indigo: '#6366f1',
  zinc: '#71717a',
  rose: '#f43f5e',
  orange: '#f97316',
  purple: '#a855f7',
  yellow: '#eab308',
  sky: '#0ea5e9',
  slate: '#64748b',
  lime: '#84cc16',
  teal: '#14b8a6',
  stone: '#78716c',
  cyan: '#06b6d4',
  emerald: '#10b981',
  fuchsia: '#d946ef',
}

const NOMBRE_FAMILIA: Record<FamiliaColor, string> = {
  red: 'Constitucional',
  blue: 'Civil',
  indigo: 'Procesal civil',
  zinc: 'Penal',
  rose: 'Procesal penal',
  orange: 'Laboral',
  purple: 'Tributario',
  yellow: 'Comercial',
  sky: 'Administrativo',
  slate: 'Orgánico judicial',
  lime: 'Justicia militar',
  teal: 'Internacional',
  stone: 'Minería',
  cyan: 'Aguas',
  emerald: 'Sanitario',
  fuchsia: 'Familia',
}

const CLASE_TEXTO_POR_FAMILIA: Record<FamiliaColor, { light: string; dark: string }> = {
  red: { light: 'text-red-700', dark: 'text-red-400' },
  blue: { light: 'text-blue-700', dark: 'text-blue-400' },
  indigo: { light: 'text-indigo-700', dark: 'text-indigo-400' },
  zinc: { light: 'text-zinc-700', dark: 'text-zinc-400' },
  rose: { light: 'text-rose-700', dark: 'text-rose-400' },
  orange: { light: 'text-orange-700', dark: 'text-orange-400' },
  purple: { light: 'text-purple-700', dark: 'text-purple-400' },
  yellow: { light: 'text-yellow-700', dark: 'text-yellow-400' },
  sky: { light: 'text-sky-700', dark: 'text-sky-400' },
  slate: { light: 'text-slate-700', dark: 'text-slate-400' },
  lime: { light: 'text-lime-700', dark: 'text-lime-400' },
  teal: { light: 'text-teal-700', dark: 'text-teal-400' },
  stone: { light: 'text-stone-700', dark: 'text-stone-400' },
  cyan: { light: 'text-cyan-700', dark: 'text-cyan-400' },
  emerald: { light: 'text-emerald-700', dark: 'text-emerald-400' },
  fuchsia: { light: 'text-fuchsia-700', dark: 'text-fuchsia-400' },
}

function colorParaCodigo(tipo: CodigoTipo, modoOscuro: boolean): { texto: string; barra: string } {
  const familia = COLOR_POR_CODIGO[tipo]
  const clases = CLASE_TEXTO_POR_FAMILIA[familia]
  return { texto: modoOscuro ? clases.dark : clases.light, barra: HEX_POR_FAMILIA[familia] }
}

function TarjetaArticulo({
  item,
  posicion,
  total,
  onQuitar,
  onMover,
  onCambiarEstado,
  onGuardarNota,
  modoRepaso,
  modoOscuro,
  ocultarReordenar,
}: {
  item: ArticuloResuelto
  posicion: number
  total: number
  onQuitar: () => void
  onMover: (direccion: -1 | 1) => void
  onCambiarEstado: (estado: EstadoRepaso) => void
  onGuardarNota: (nota: string) => void
  modoRepaso: boolean
  modoOscuro: boolean
  /** En pizarra libre "mover antes/después" no tiene sentido (no hay una
   * secuencia lineal) y quedaba siempre deshabilitado — se oculta del todo. */
  ocultarReordenar?: boolean
}) {
  const [expandido, setExpandido] = useState(!modoRepaso)
  const [notaTmp, setNotaTmp] = useState(item.nota)
  const notaRef = useRef<HTMLTextAreaElement>(null)
  const { texto: colorTexto, barra: colorBarra } = colorParaCodigo(item.codigo, modoOscuro)
  const estadoInfo = ESTADO_INFO[item.estado]

  // Al entrar/salir de modo repaso, todas las fichas se re-colapsan o
  // re-expanden en bloque. Después de eso, cada clic individual (para
  // "voltear" una ficha y revisar si acertaste) funciona con normalidad.
  useEffect(() => {
    setExpandido(!modoRepaso)
  }, [modoRepaso])

  useEffect(() => {
    setNotaTmp(item.nota)
  }, [item.nota])

  // Auto-crece con el contenido: la tarjeta entera (y la mampostería) se
  // ajustan solas porque no hay alto fijo en ningún contenedor padre.
  useEffect(() => {
    if (!expandido) return
    const el = notaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [notaTmp, expandido])

  return (
    <div
      className={`w-full rounded-xl border overflow-hidden flex ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      {/* Lomo de color: identifica el código de origen de un vistazo */}
      <div className="w-1.5 flex-shrink-0" style={{ background: colorBarra }} />

      <div className="flex-1 min-w-0">
        {/* Tira de control: reordenar y quitar, discreta */}
        <div className={`flex items-center px-2 py-1 ${ocultarReordenar ? 'justify-end' : 'justify-between'} ${modoOscuro ? 'bg-zinc-800/40' : 'bg-zinc-50'}`}>
          {!ocultarReordenar && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onMover(-1)}
                disabled={posicion === 0}
                title="Mover antes"
                className={`w-6 h-6 flex items-center justify-center rounded disabled:opacity-20 disabled:cursor-not-allowed ${
                  modoOscuro ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-200 text-zinc-400'
                }`}
              >
                <i className="ti ti-chevron-left text-sm" />
              </button>
              <button
                onClick={() => onMover(1)}
                disabled={posicion === total - 1}
                title="Mover después"
                className={`w-6 h-6 flex items-center justify-center rounded disabled:opacity-20 disabled:cursor-not-allowed ${
                  modoOscuro ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-200 text-zinc-400'
                }`}
              >
                <i className="ti ti-chevron-right text-sm" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onCambiarEstado(ESTADO_SIGUIENTE[item.estado])}
              title={`${estadoInfo.label} · clic para cambiar`}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                modoOscuro ? estadoInfo.colorDark : estadoInfo.colorLight
              } ${modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'}`}
            >
              <i className={`ti ${estadoInfo.icono} text-sm`} />
            </button>
            <button
              onClick={onQuitar}
              title="Quitar de la colección"
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                modoOscuro ? 'text-zinc-500 hover:bg-zinc-800 hover:text-red-400' : 'text-zinc-400 hover:bg-zinc-200 hover:text-red-500'
              }`}
            >
              <i className="ti ti-x text-sm" />
            </button>
          </div>
        </div>

        {/* Encabezado grande, mismo estilo que el título de artículo en Explorador */}
        <button
          onClick={() => setExpandido(!expandido)}
          className={`w-full flex items-start justify-between gap-2 px-4 py-3 text-left ${
            expandido ? (modoOscuro ? 'border-b border-zinc-800' : 'border-b border-zinc-100') : ''
          }`}
        >
          <div className="min-w-0">
            <div className={`text-[10px] uppercase tracking-wider font-semibold mb-0.5 ${colorTexto}`}>
              {item.nombreCodigo}
            </div>
            <div className={`font-serif text-2xl font-bold leading-none ${colorTexto}`}>
              {item.articulo}
            </div>
          </div>
          <i
            className={`ti ti-chevron-down text-lg mt-1 transition-transform flex-shrink-0 ${expandido ? 'rotate-180' : ''} ${
              modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {expandido && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className={`px-4 py-3 text-sm leading-relaxed ${modoOscuro ? 'text-zinc-300 bg-zinc-900/50' : 'text-zinc-700 bg-zinc-50/50'}`}
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {item.cargando ? (
                  <p className={`text-xs italic ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>Cargando…</p>
                ) : !item.art ? (
                  <p className={`text-xs italic ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    No se encontró este artículo en el código cargado.
                  </p>
                ) : (
                  dividirIncisos(item.art.t).map((p, i) => (
                    <p key={i} className="mb-2 last:mb-0 whitespace-pre-line" style={i === 0 ? undefined : { textIndent: '1rem' }}>
                      {p}
                    </p>
                  ))
                )}
              </div>

              {/* Nota propia: opcional, se guarda al salir del campo */}
              <div className={`px-4 py-2.5 border-t ${modoOscuro ? 'border-zinc-800' : 'border-zinc-100'}`}>
                <textarea
                  ref={notaRef}
                  value={notaTmp}
                  onChange={(e) => setNotaTmp(e.target.value)}
                  onBlur={() => {
                    if (notaTmp !== item.nota) onGuardarNota(notaTmp)
                  }}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault()
                      if (notaTmp !== item.nota) onGuardarNota(notaTmp)
                      e.currentTarget.blur()
                    }
                  }}
                  placeholder="Agrega tu propia nota o acordeón mental... (Ctrl+Enter guarda)"
                  rows={1}
                  className={`w-full bg-transparent outline-none text-xs resize-none overflow-hidden placeholder:italic ${
                    modoOscuro ? 'text-zinc-300 placeholder:text-zinc-600' : 'text-zinc-700 placeholder:text-zinc-400'
                  }`}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function dividirIncisos(texto: string): string[] {
  if (!texto || !texto.trim()) return []
  return texto.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0)
}

// ============================================================
// EXPERIMENTAL: PIZARRA LIBRE (rama experimento-visualizacion, no existe en main)
// ============================================================

type RefArticulo = { codigo: CodigoTipo; articulo: string }

/** Posición inicial en grilla simple para fichas que aún no se han arrastrado
 * nunca (sin `posicion` guardada). Una vez que el usuario arrastra una, su
 * posición pasa a ser la guardada y deja de depender del índice. */
function posicionPorDefecto(indice: number): { x: number; y: number } {
  const columnas = 4
  return { x: (indice % columnas) * 360 + 24, y: Math.floor(indice / columnas) * 320 + 24 }
}

function mismoArticulo(a: RefArticulo, b: RefArticulo): boolean {
  return a.codigo === b.codigo && a.articulo === b.articulo
}

/** Punto de anclaje de las líneas de conexión: centro horizontal de la
 * ficha, altura fija cerca del encabezado (así no depende del alto
 * dinámico y variable del cuerpo/nota de cada ficha). */
function anchorDe(ref: RefArticulo, articulos: ArticuloResuelto[]): { x: number; y: number } {
  const idx = articulos.findIndex((a) => mismoArticulo(a, ref))
  const item = idx >= 0 ? articulos[idx] : undefined
  const pos = item?.posicion ?? posicionPorDefecto(Math.max(0, idx))
  return { x: pos.x + 170, y: pos.y + 56 }
}

const NOMBRE_RELACION: Record<TipoRelacion, string> = {
  desarrolla: 'Desarrolla',
  complementa: 'Complementa',
  limita: 'Limita',
  excepcion: 'Excepción',
  consecuencia: 'Consecuencia',
  remite_a: 'Remite a',
  relacionado_con: 'Relacionado con',
  contradice: 'Contradice',
  mismo_concepto: 'Mismo concepto',
}

const TIPOS_RELACION: { id: TipoRelacion; icono: string }[] = [
  { id: 'desarrolla', icono: 'ti-arrow-big-right' },
  { id: 'complementa', icono: 'ti-plus' },
  { id: 'limita', icono: 'ti-shield' },
  { id: 'excepcion', icono: 'ti-alert-triangle' },
  { id: 'consecuencia', icono: 'ti-arrow-right' },
  { id: 'remite_a', icono: 'ti-external-link' },
  { id: 'relacionado_con', icono: 'ti-link' },
  { id: 'contradice', icono: 'ti-alert-octagon' },
  { id: 'mismo_concepto', icono: 'ti-copy' },
]

/** Agrupa los 9 tipos de relación en 3 familias, para que el menú se pueda
 * escanear más rápido y para colorear el chip de relación en Vista árbol
 * según qué tan "fuerte" es el vínculo, en vez de un gris plano para las 9. */
const FAMILIAS_RELACION: { label: string; color: string; tipos: TipoRelacion[] }[] = [
  { label: 'Estructurales', color: '#3b82f6', tipos: ['desarrolla', 'complementa', 'remite_a'] },
  { label: 'De tensión', color: '#ef4444', tipos: ['limita', 'excepcion', 'contradice'] },
  { label: 'Neutras', color: '#71717a', tipos: ['consecuencia', 'relacionado_con', 'mismo_concepto'] },
]

function familiaDeRelacion(tipo: TipoRelacion): { label: string; color: string } {
  return FAMILIAS_RELACION.find((f) => f.tipos.includes(tipo)) ?? FAMILIAS_RELACION[2]
}

const FUNCIONES_JURIDICAS: { id: FuncionJuridica; label: string; color: string }[] = [
  { id: 'regla_general', label: 'Regla general', color: '#3b82f6' },
  { id: 'excepcion', label: 'Excepción', color: '#22c55e' },
  { id: 'concepto', label: 'Concepto', color: '#f97316' },
  { id: 'procedimiento', label: 'Procedimiento', color: '#a855f7' },
  { id: 'sancion', label: 'Sanción', color: '#ef4444' },
  { id: 'complementaria', label: 'Complementaria', color: '#a1a1aa' },
]

/** Layout determinístico por capas (sin IA): cada artículo queda en la fila
 * que corresponde a la ruta más larga de conexiones que llega hasta él
 * (relajación tipo Bellman-Ford, tolera ciclos porque se acota el número de
 * iteraciones). Usa solo las conexiones que el propio usuario creó.
 *
 * Dentro de cada fila, el orden horizontal ya NO es el orden de inserción
 * original (eso dejaba artículos conectados dispersos, sin relación visual
 * con sus vecinos): se ordenan por "barycenter" — el promedio de la posición
 * X de sus conexiones entrantes ya ubicadas en filas anteriores — para que
 * un artículo quede alineado cerca de aquello que lo conecta. Es la misma
 * heurística clásica de dibujo de grafos por capas (Sugiyama), en una sola
 * pasada hacia adelante para mantenerlo simple y determinístico. */
function calcularLayoutPorCapas(
  articulos: ArticuloResuelto[],
  conexiones: ConexionColeccion[]
): { ref: RefArticulo; posicion: { x: number; y: number } }[] {
  const key = (r: RefArticulo) => `${r.codigo}::${r.articulo}`
  const capa = new Map<string, number>()
  for (const a of articulos) capa.set(key(a), 0)

  for (let iter = 0; iter < articulos.length + 1; iter++) {
    let cambio = false
    for (const cx of conexiones) {
      const kd = key(cx.desde)
      const kh = key(cx.hasta)
      if (!capa.has(kd) || !capa.has(kh)) continue
      const nueva = capa.get(kd)! + 1
      if (nueva > capa.get(kh)!) {
        capa.set(kh, nueva)
        cambio = true
      }
    }
    if (!cambio) break
  }

  // Quién conecta hacia cada artículo (sus "padres"), para el barycenter.
  const padresDe = new Map<string, string[]>()
  for (const cx of conexiones) {
    const kh = key(cx.hasta)
    if (!padresDe.has(kh)) padresDe.set(kh, [])
    padresDe.get(kh)!.push(key(cx.desde))
  }

  const porCapa = new Map<number, ArticuloResuelto[]>()
  for (const a of articulos) {
    const c = capa.get(key(a))!
    if (!porCapa.has(c)) porCapa.set(c, [])
    porCapa.get(c)!.push(a)
  }

  // Posición X ya asignada, fila por fila de arriba hacia abajo, para que el
  // barycenter de una fila pueda mirar dónde quedaron sus padres.
  const ESPACIO_X = 380
  const ESPACIO_Y = 260
  const MARGEN = 40
  const xAsignada = new Map<string, number>()
  const resultado: { ref: RefArticulo; posicion: { x: number; y: number } }[] = []

  for (const c of [...porCapa.keys()].sort((a, b) => a - b)) {
    const items = porCapa.get(c)!

    // "Deseada": promedio de X de los padres ya ubicados (filas de arriba).
    // Si no tiene padres ubicados (raíz, o quedó aislado), no hay una
    // posición que lo "atraiga": se ordena al final, en su orden original.
    const conDeseada: { item: ArticuloResuelto; deseada: number }[] = []
    const sinDeseada: ArticuloResuelto[] = []
    items.forEach((item, i) => {
      const padres = (padresDe.get(key(item)) ?? []).filter((k) => xAsignada.has(k))
      if (padres.length === 0) {
        sinDeseada.push(item)
      } else {
        const promedio = padres.reduce((suma, k) => suma + xAsignada.get(k)!, 0) / padres.length
        conDeseada.push({ item, deseada: promedio + i * 0.001 }) // +i: desempate estable
      }
    })
    conDeseada.sort((a, b) => a.deseada - b.deseada)
    const ordenados = [...conDeseada.map((x) => x.item), ...sinDeseada]
    const deseadaPorClave = new Map(conDeseada.map((x) => [key(x.item), x.deseada]))

    // Barrido de izquierda a derecha: cada ítem intenta caer justo en su X
    // deseada (para quedar alineado bajo su padre), pero nunca más cerca del
    // anterior que el espaciado mínimo — así lo conectado queda junto de
    // verdad (no solo "en el mismo orden"), sin superponerse entre sí.
    let xPrevio: number | null = null
    ordenados.forEach((item) => {
      const deseada = deseadaPorClave.get(key(item))
      const minimo = xPrevio === null ? MARGEN : xPrevio + ESPACIO_X
      const x = deseada !== undefined ? Math.max(deseada, minimo) : minimo
      xAsignada.set(key(item), x)
      xPrevio = x
      resultado.push({ ref: { codigo: item.codigo, articulo: item.articulo }, posicion: { x, y: c * ESPACIO_Y + MARGEN } })
    })
  }
  return resultado
}

function VistaPizarra({
  articulos,
  conexiones,
  grupos,
  onQuitar,
  onCambiarEstado,
  onGuardarNota,
  onMoverPosicion,
  onCrearConexion,
  onEliminarConexion,
  onAsignarFuncion,
  onCrearGrupo,
  onEliminarGrupo,
  onOrganizarPorConexiones,
  modoRepaso,
  modoOscuro,
}: {
  articulos: ArticuloResuelto[]
  conexiones: ConexionColeccion[]
  grupos: GrupoColeccion[]
  onQuitar: (ref: RefArticulo) => void
  onCambiarEstado: (ref: RefArticulo, estado: EstadoRepaso) => void
  onGuardarNota: (ref: RefArticulo, nota: string) => void
  onMoverPosicion: (ref: RefArticulo, pos: { x: number; y: number }) => void
  onCrearConexion: (desde: RefArticulo, hasta: RefArticulo, tipo: TipoRelacion) => void
  onEliminarConexion: (conexionId: string) => void
  onAsignarFuncion: (ref: RefArticulo, funcion: FuncionJuridica | undefined) => void
  onCrearGrupo: (titulo: string, articulos: RefArticulo[]) => void
  onEliminarGrupo: (grupoId: string) => void
  onOrganizarPorConexiones: (posiciones: { ref: RefArticulo; posicion: { x: number; y: number } }[]) => void
  modoRepaso: boolean
  modoOscuro: boolean
}) {
  const filas = Math.ceil(articulos.length / 4)
  const anchoBase = Math.max(1600, 4 * 360 + 48)
  const altoBase = Math.max(1000, filas * 320 + 48)

  const NIVEL_MAX = 4
  const INCREMENTO_ANCHO = 500
  const INCREMENTO_ALTO = 400
  const [nivelExpansion, setNivelExpansion] = useState(0)

  const anchoCanvas = anchoBase + nivelExpansion * INCREMENTO_ANCHO
  const altoCanvas = altoBase + nivelExpansion * INCREMENTO_ALTO

  // Estado de la conexión que se está dibujando (arrastrando desde el punto
  // de una ficha hacia otra), del menú de tipo de relación, y de la
  // conexión seleccionada (solo ella muestra su etiqueta).
  const [origenConexion, setOrigenConexion] = useState<RefArticulo | null>(null)
  const [punteroActual, setPunteroActual] = useState<{ x: number; y: number } | null>(null)
  const [menuTipo, setMenuTipo] = useState<{ desde: RefArticulo; hasta: RefArticulo; x: number; y: number } | null>(null)
  const [conexionSeleccionada, setConexionSeleccionada] = useState<string | null>(null)

  // Selección múltiple (Shift/Ctrl+clic en una ficha) para agrupar.
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [modalGrupoAbierto, setModalGrupoAbierto] = useState(false)

  // Alto real (medido con ResizeObserver) de cada ficha, para que el
  // recuadro de un grupo se ajuste a su contenido real y no a una altura
  // fija estimada que quedaba corta o con espacio de más según el largo
  // de la nota o si la ficha está expandida.
  const [alturas, setAlturas] = useState<Map<string, number>>(new Map())
  const reportarAltura = (key: string, h: number) => {
    setAlturas((prev) => (prev.get(key) === h ? prev : new Map(prev).set(key, h)))
  }

  // Pan del lienzo: clic sostenido sobre el fondo vacío (no una ficha, no
  // una conexión) y arrastrar mueve la vista, como en Miro/FigJam.
  const [panActivo, setPanActivo] = useState(false)
  const panRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lienzoRef = useRef<HTMLDivElement>(null)

  const keyRef = (ref: RefArticulo) => `${ref.codigo}::${ref.articulo}`

  const iniciarConexion = (ref: RefArticulo) => {
    setOrigenConexion(ref)
    setConexionSeleccionada(null)
  }

  const completarConexion = (hasta: RefArticulo, clientX: number, clientY: number) => {
    if (!origenConexion || mismoArticulo(origenConexion, hasta)) {
      setOrigenConexion(null)
      setPunteroActual(null)
      return
    }
    setMenuTipo({ desde: origenConexion, hasta, x: clientX, y: clientY })
    setOrigenConexion(null)
    setPunteroActual(null)
  }

  const cancelarConexion = () => {
    setOrigenConexion(null)
    setPunteroActual(null)
  }

  const alternarSeleccion = (ref: RefArticulo) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      const k = keyRef(ref)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  useEffect(() => {
    if (!origenConexion) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelarConexion()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origenConexion])

  return (
    <div className="flex-1 relative">
      {/* Controles de expandir/retraer: posición fija en la esquina, no se
          mueven con el scroll del lienzo (viven fuera del div con overflow). */}
      <div
        className={`absolute top-3 right-3 z-30 flex items-center gap-2 px-2 py-1.5 rounded-lg border shadow-sm ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <button
          onClick={() => setNivelExpansion((n) => Math.max(0, n - 1))}
          disabled={nivelExpansion === 0}
          title="Retraer pizarra"
          className={`w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed transition-colors ${
            modoOscuro ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-600'
          }`}
        >
          <i className="ti ti-minus text-sm" />
        </button>
        <div className="flex items-center gap-0.5" title={`Espacio del lienzo: nivel ${nivelExpansion} de ${NIVEL_MAX}`}>
          {Array.from({ length: NIVEL_MAX }).map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: i < nivelExpansion ? VERDE : modoOscuro ? '#3f3f46' : '#d4d4d8',
              }}
            />
          ))}
        </div>
        <button
          onClick={() => setNivelExpansion((n) => Math.min(NIVEL_MAX, n + 1))}
          disabled={nivelExpansion === NIVEL_MAX}
          title="Expandir pizarra"
          className={`w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed transition-colors ${
            modoOscuro ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-600'
          }`}
        >
          <i className="ti ti-plus text-sm" />
        </button>
      </div>

      {/* Aviso de conexión en curso, u organizar automático cuando no se está
          conectando: mismo lugar (esquina superior izquierda), mutuamente
          excluyentes. */}
      {origenConexion ? (
        <div
          className={`absolute top-3 left-3 z-30 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm ${
            modoOscuro ? 'bg-zinc-900 text-zinc-300 border border-zinc-800' : 'bg-white text-zinc-600 border border-zinc-200'
          }`}
        >
          Suelta sobre otra ficha para conectar · Esc o clic vacío para cancelar
        </div>
      ) : (
        <button
          onClick={() => onOrganizarPorConexiones(calcularLayoutPorCapas(articulos, conexiones))}
          disabled={conexiones.length === 0}
          title="Reordena las fichas según las conexiones creadas. Sin IA: solo usa lo que tú ya conectaste."
          className={`absolute top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
            modoOscuro ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <i className="ti ti-sitemap text-sm" />
          Organizar según conexiones
        </button>
      )}

      {/* Barra de selección múltiple: aparece con 2+ fichas seleccionadas
          (Shift/Ctrl+clic), para agruparlas. */}
      {seleccionados.size >= 2 && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-lg ${
            modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          <span className={`text-xs ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {seleccionados.size} fichas seleccionadas
          </span>
          <button
            onClick={() => setModalGrupoAbierto(true)}
            className="px-3 py-1 rounded-md text-xs font-semibold text-white"
            style={{ background: VERDE }}
          >
            Agrupar
          </button>
          <button
            onClick={() => setSeleccionados(new Set())}
            className={`px-2 py-1 rounded-md text-xs ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            Cancelar
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className={`h-full overflow-auto ${modoOscuro ? 'bg-zinc-950' : 'bg-zinc-100'}`}
        onPointerUp={() => {
          cancelarConexion()
          setPanActivo(false)
        }}
        onPointerLeave={() => setPanActivo(false)}
      >
        <div
          ref={lienzoRef}
          className="relative"
          style={{
            width: anchoCanvas,
            height: altoCanvas,
            backgroundImage: `radial-gradient(circle, ${modoOscuro ? '#3f3f46' : '#d4d4d8'} 1.5px, transparent 1.5px)`,
            backgroundSize: '28px 28px',
            cursor: origenConexion ? 'crosshair' : panActivo ? 'grabbing' : 'grab',
          }}
          onPointerDown={(e) => {
            // Solo si el clic aterrizó directo en el fondo (no en una ficha,
            // ni en una línea de conexión, ni en el popup de una etiqueta).
            if (e.target !== lienzoRef.current || origenConexion) return
            if (seleccionados.size > 0) setSeleccionados(new Set())
            setConexionSeleccionada(null)
            setPanActivo(true)
            panRef.current = {
              x: e.clientX,
              y: e.clientY,
              scrollLeft: scrollRef.current?.scrollLeft ?? 0,
              scrollTop: scrollRef.current?.scrollTop ?? 0,
            }
          }}
          onPointerMove={(e) => {
            if (panActivo && panRef.current && scrollRef.current) {
              scrollRef.current.scrollLeft = panRef.current.scrollLeft - (e.clientX - panRef.current.x)
              scrollRef.current.scrollTop = panRef.current.scrollTop - (e.clientY - panRef.current.y)
              return
            }
            if (!origenConexion || !lienzoRef.current) return
            const r = lienzoRef.current.getBoundingClientRect()
            setPunteroActual({ x: e.clientX - r.left, y: e.clientY - r.top })
          }}
        >
          {/* Recuadros de agrupación: debajo de todo lo demás. El tamaño se
              recalcula en vivo desde la posición actual de sus miembros. */}
          {grupos.map((g) => {
            const ALTO_ESTIMADO_INICIAL = 160 // respaldo solo hasta la primera medición real
            const datos = g.articulos
              .map((ref) => {
                const idx = articulos.findIndex((a) => mismoArticulo(a, ref))
                if (idx < 0) return null
                const pos = articulos[idx].posicion ?? posicionPorDefecto(idx)
                const h = alturas.get(keyRef(ref)) ?? ALTO_ESTIMADO_INICIAL
                return { x: pos.x, y: pos.y, h }
              })
              .filter((p): p is { x: number; y: number; h: number } => p !== null)
            if (datos.length === 0) return null
            const minX = Math.min(...datos.map((p) => p.x)) - 16
            const minY = Math.min(...datos.map((p) => p.y)) - 40
            const maxX = Math.max(...datos.map((p) => p.x)) + 340 + 16
            const maxY = Math.max(...datos.map((p) => p.y + p.h)) + 16
            return (
              <div
                key={g.id}
                className="absolute rounded-xl border-2 border-dashed"
                style={{
                  left: minX,
                  top: minY,
                  width: maxX - minX,
                  height: maxY - minY,
                  borderColor: modoOscuro ? '#52525b' : '#a1a1aa',
                  background: modoOscuro ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                }}
              >
                <div
                  className={`absolute -top-3 left-3 px-2 py-0.5 rounded flex items-center gap-1.5 text-xs font-semibold ${
                    modoOscuro ? 'bg-zinc-900 text-zinc-300' : 'bg-white text-zinc-700'
                  }`}
                >
                  {g.titulo}
                  <button
                    onClick={() => onEliminarGrupo(g.id)}
                    title="Eliminar grupo (no borra los artículos)"
                    className={`${modoOscuro ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}
                  >
                    <i className="ti ti-x text-[10px]" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Líneas de conexión, sobre los grupos pero bajo las fichas.
              pointer-events: none en el contenedor para no bloquear
              arrastres/pan; cada línea reactiva su propio pointer-events. */}
          <svg className="absolute inset-0" style={{ width: anchoCanvas, height: altoCanvas, pointerEvents: 'none' }}>
            <defs>
              {/* Un marker de flecha por familia de relación, para que la
                  punta de flecha combine con el color de su línea. */}
              {FAMILIAS_RELACION.map((f) => (
                <marker
                  key={f.color}
                  id={`flecha-${f.color.slice(1)}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={f.color} />
                </marker>
              ))}
            </defs>
            {conexiones.map((cx) => {
              const desde = anchorDe(cx.desde, articulos)
              const hasta = anchorDe(cx.hasta, articulos)
              const seleccionada = conexionSeleccionada === cx.id
              const familia = familiaDeRelacion(cx.tipo)
              const midX = (desde.x + hasta.x) / 2
              const midY = (desde.y + hasta.y) / 2
              return (
                <g key={cx.id}>
                  {/* Línea más gruesa y coloreada por familia (antes gris
                      plano) para que se note a simple vista, sin tener que
                      seleccionarla. */}
                  <line
                    x1={desde.x}
                    y1={desde.y}
                    x2={hasta.x}
                    y2={hasta.y}
                    stroke={familia.color}
                    strokeWidth={seleccionada ? 3.5 : 2.5}
                    opacity={seleccionada ? 1 : 0.8}
                    markerEnd={`url(#flecha-${familia.color.slice(1)})`}
                  />
                  {/* hitbox invisible más ancha, para hacer clic fácil */}
                  <line
                    x1={desde.x}
                    y1={desde.y}
                    x2={hasta.x}
                    y2={hasta.y}
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={() => setConexionSeleccionada(seleccionada ? null : cx.id)}
                  />
                  {/* Etiqueta del tipo de relación: ahora SIEMPRE visible
                      (antes solo aparecía al seleccionar la línea), para que
                      la categoría se lea sin clic. El botón de borrar sigue
                      apareciendo solo si está seleccionada, para no arriesgar
                      un borrado accidental con solo pasar cerca. */}
                  <foreignObject x={midX - 80} y={midY - 13} width={160} height={26} style={{ pointerEvents: 'auto' }}>
                    <div
                      onClick={() => setConexionSeleccionada(seleccionada ? null : cx.id)}
                      className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border cursor-pointer ${
                        seleccionada ? 'shadow-md' : 'shadow-sm'
                      }`}
                      style={{
                        color: familia.color,
                        background: modoOscuro ? `${familia.color}26` : `${familia.color}1A`,
                        borderColor: seleccionada ? familia.color : `${familia.color}40`,
                      }}
                    >
                      <span className="truncate">{NOMBRE_RELACION[cx.tipo]}</span>
                      {seleccionada && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEliminarConexion(cx.id)
                            setConexionSeleccionada(null)
                          }}
                          title="Eliminar conexión"
                          className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10"
                        >
                          <i className="ti ti-x text-[10px]" />
                        </button>
                      )}
                    </div>
                  </foreignObject>
                </g>
              )
            })}
            {origenConexion && punteroActual && (
              <line
                x1={anchorDe(origenConexion, articulos).x}
                y1={anchorDe(origenConexion, articulos).y}
                x2={punteroActual.x}
                y2={punteroActual.y}
                stroke={VERDE}
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}
          </svg>

          {articulos.map((ar, i) => (
            <TarjetaLibre
              key={`${ar.codigo}::${ar.articulo}`}
              item={ar}
              indice={i}
              onQuitar={() => onQuitar({ codigo: ar.codigo, articulo: ar.articulo })}
              onCambiarEstado={(estado) => onCambiarEstado({ codigo: ar.codigo, articulo: ar.articulo }, estado)}
              onGuardarNota={(nota) => onGuardarNota({ codigo: ar.codigo, articulo: ar.articulo }, nota)}
              onMoverPosicion={(pos) => onMoverPosicion({ codigo: ar.codigo, articulo: ar.articulo }, pos)}
              conectando={!!origenConexion}
              onIniciarConexion={() => iniciarConexion({ codigo: ar.codigo, articulo: ar.articulo })}
              onCompletarConexion={(clientX, clientY) => completarConexion({ codigo: ar.codigo, articulo: ar.articulo }, clientX, clientY)}
              onCambiarFuncion={(funcion) => onAsignarFuncion({ codigo: ar.codigo, articulo: ar.articulo }, funcion)}
              seleccionado={seleccionados.has(keyRef({ codigo: ar.codigo, articulo: ar.articulo }))}
              onAlternarSeleccion={() => alternarSeleccion({ codigo: ar.codigo, articulo: ar.articulo })}
              onAlturaCambio={(h) => reportarAltura(keyRef({ codigo: ar.codigo, articulo: ar.articulo }), h)}
              modoRepaso={modoRepaso}
              modoOscuro={modoOscuro}
            />
          ))}
        </div>
      </div>

      {menuTipo && (
        <MenuTipoRelacion
          x={menuTipo.x}
          y={menuTipo.y}
          onElegir={(tipo) => {
            onCrearConexion(menuTipo.desde, menuTipo.hasta, tipo)
            setMenuTipo(null)
          }}
          onCerrar={() => setMenuTipo(null)}
          modoOscuro={modoOscuro}
        />
      )}

      {modalGrupoAbierto && (
        <ModalNombreGrupo
          onCrear={(titulo) => {
            onCrearGrupo(
              titulo,
              [...seleccionados].map((k) => {
                const [codigo, articulo] = k.split('::')
                return { codigo: codigo as CodigoTipo, articulo }
              })
            )
            setSeleccionados(new Set())
            setModalGrupoAbierto(false)
          }}
          onCerrar={() => setModalGrupoAbierto(false)}
          modoOscuro={modoOscuro}
        />
      )}
    </div>
  )
}

function ModalNombreGrupo({
  onCrear,
  onCerrar,
  modoOscuro,
}: {
  onCrear: (titulo: string) => void
  onCerrar: () => void
  modoOscuro: boolean
}) {
  const [titulo, setTitulo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const crear = () => {
    const t = titulo.trim()
    if (t) onCrear(t)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onCerrar}>
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${modoOscuro ? 'bg-zinc-900' : 'bg-white'}`}
        >
          <div className={`px-5 py-4 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <h2 className={`text-base font-serif font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>Nombrar grupo</h2>
            <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>Ej. "Modos de extinción"</p>
          </div>
          <div className="px-5 py-4">
            <input
              ref={inputRef}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crear()}
              placeholder="Nombre del grupo"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                modoOscuro
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[var(--accent-600)]'
                  : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-[var(--accent-500)]'
              }`}
            />
          </div>
          <div className={`px-5 py-3 border-t flex justify-end gap-2 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <button
              onClick={onCerrar}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                modoOscuro ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={crear}
              disabled={!titulo.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
              style={{ background: VERDE }}
            >
              Crear grupo
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function MenuTipoRelacion({
  x,
  y,
  onElegir,
  onCerrar,
  modoOscuro,
}: {
  x: number
  y: number
  onElegir: (tipo: TipoRelacion) => void
  onCerrar: () => void
  modoOscuro: boolean
}) {
  const left = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 230)
  const top = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 460)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onCerrar} />
      <div
        className={`fixed z-50 rounded-lg border shadow-xl overflow-hidden py-1 ${
          modoOscuro ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
        }`}
        style={{ left: Math.max(8, left), top: Math.max(8, top), width: 210 }}
      >
        <div className={`px-3 py-1.5 text-[10px] uppercase tracking-wide font-semibold ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Tipo de relación
        </div>
        {/* Agrupadas por familia (estructurales / de tensión / neutras) en
            vez de una lista plana de 9: más rápido de escanear, y el color
            de cada familia se reutiliza en el chip de Vista árbol. */}
        {FAMILIAS_RELACION.map((familia, fi) => (
          <div key={familia.label}>
            {fi > 0 && <div className={`my-1 mx-2 border-t ${modoOscuro ? 'border-zinc-800' : 'border-zinc-100'}`} />}
            <div className="px-3 pt-1 pb-0.5 text-[9px] uppercase tracking-wide font-semibold" style={{ color: familia.color }}>
              {familia.label}
            </div>
            {familia.tipos.map((id) => {
              const t = TIPOS_RELACION.find((x) => x.id === id)
              if (!t) return null
              return (
                <button
                  key={id}
                  onClick={() => onElegir(id)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    modoOscuro ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <i className={`ti ${t.icono} text-sm flex-shrink-0`} style={{ color: familia.color }} />
                  {NOMBRE_RELACION[id]}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

function TarjetaLibre({
  item,
  indice,
  onQuitar,
  onCambiarEstado,
  onGuardarNota,
  onMoverPosicion,
  conectando,
  onIniciarConexion,
  onCompletarConexion,
  onCambiarFuncion,
  seleccionado,
  onAlternarSeleccion,
  onAlturaCambio,
  modoRepaso,
  modoOscuro,
}: {
  item: ArticuloResuelto
  indice: number
  onQuitar: () => void
  onCambiarEstado: (estado: EstadoRepaso) => void
  onGuardarNota: (nota: string) => void
  onMoverPosicion: (pos: { x: number; y: number }) => void
  conectando: boolean
  onIniciarConexion: () => void
  onCompletarConexion: (clientX: number, clientY: number) => void
  onCambiarFuncion: (funcion: FuncionJuridica | undefined) => void
  seleccionado: boolean
  onAlternarSeleccion: () => void
  onAlturaCambio?: (alturaPx: number) => void
  modoRepaso: boolean
  modoOscuro: boolean
}) {
  const pos = item.posicion ?? posicionPorDefecto(indice)
  const raizRef = useRef<HTMLDivElement>(null)

  // Alto real de la tarjeta (cambia al expandir/colapsar o con notas largas):
  // se reporta al lienzo para que el recuadro de grupo se ajuste a contenido
  // real en vez de una altura fija adivinada.
  useEffect(() => {
    const el = raizRef.current
    if (!el || !onAlturaCambio) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height
      if (h) onAlturaCambio(Math.round(h))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [onAlturaCambio])

  return (
    <motion.div
      // La key incluye la posición: fuerza a React a remontar el nodo tras
      // cada arrastre, así el transform interno de drag de framer-motion no
      // se acumula sobre el nuevo left/top (que es la fuente de verdad real).
      key={`${pos.x}-${pos.y}`}
      ref={raizRef}
      drag={!conectando}
      dragMomentum={false}
      onDragEnd={(_e, info) => {
        onMoverPosicion({ x: Math.round(pos.x + info.offset.x), y: Math.round(pos.y + info.offset.y) })
      }}
      whileDrag={{ zIndex: 20, boxShadow: '0 12px 28px rgba(0,0,0,0.28)' }}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: 340,
        cursor: conectando ? 'crosshair' : 'grab',
        outline: seleccionado ? '3px solid #3b82f6' : undefined,
        outlineOffset: 3,
        borderRadius: 14,
      }}
      onPointerUp={(e) => {
        if (conectando) {
          e.stopPropagation()
          onCompletarConexion(e.clientX, e.clientY)
        }
      }}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.stopPropagation()
          onAlternarSeleccion()
        }
      }}
    >
      {/* Punto de conexión: arrastra desde acá hacia otra ficha. Más grande
          que un botón de clic normal porque el gesto es un arrastre (necesita
          más margen de error), y con ícono propio en vez de un punto ambiguo
          para que se lea como "conectar" a simple vista. stopPropagation en
          pointerdown para no activar el arrastre de toda la tarjeta. */}
      <button
        onPointerDown={(e) => {
          e.stopPropagation()
          onIniciarConexion()
        }}
        title="Arrastra hasta otra ficha para conectarlas"
        className={`absolute z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
          modoOscuro ? 'bg-zinc-800 border-zinc-500 hover:border-white' : 'bg-white border-zinc-400 hover:border-zinc-900'
        }`}
        style={{ right: -13, top: 44, cursor: 'crosshair' }}
      >
        <i className={`ti ti-link text-xs ${modoOscuro ? 'text-zinc-300' : 'text-zinc-600'}`} />
      </button>

      <SelectorFuncion funcion={item.funcion} onCambiar={onCambiarFuncion} modoOscuro={modoOscuro} />

      {/* Insignia de selección múltiple: azul a propósito, distinto del
          verde que ya significa "conexión" en las líneas y en el aviso de
          "dibujando conexión" — dos estados distintos no deben compartir color. */}
      {seleccionado && (
        <div
          className="absolute z-10 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md"
          style={{ right: -8, bottom: -8, background: '#3b82f6' }}
        >
          <i className="ti ti-check text-sm" />
        </div>
      )}

      <TarjetaArticulo
        item={item}
        posicion={0}
        total={1}
        onQuitar={onQuitar}
        onMover={() => {}}
        onCambiarEstado={onCambiarEstado}
        onGuardarNota={onGuardarNota}
        modoRepaso={modoRepaso}
        modoOscuro={modoOscuro}
        ocultarReordenar
      />
    </motion.div>
  )
}

function SelectorFuncion({
  funcion,
  onCambiar,
  modoOscuro,
}: {
  funcion?: FuncionJuridica
  onCambiar: (funcion: FuncionJuridica | undefined) => void
  modoOscuro: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const actual = funcion ? FUNCIONES_JURIDICAS.find((f) => f.id === funcion) : undefined

  return (
    // Abajo a la izquierda a propósito: el lomo de color (código de origen)
    // ya ocupa toda la orilla izquierda de arriba a abajo, así que la función
    // jurídica —un dato distinto— se separa hacia la esquina inferior en vez
    // de competir con el lomo justo en la esquina superior.
    <div className="absolute z-10" style={{ left: -13, bottom: 14 }}>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          setAbierto((v) => !v)
        }}
        title={actual ? `Función: ${actual.label}` : 'Asignar función jurídica'}
        className="w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
        style={{
          background: actual ? actual.color : modoOscuro ? '#27272a' : '#ffffff',
          borderColor: actual ? actual.color : modoOscuro ? '#71717a' : '#a1a1aa',
        }}
      >
        {!actual && <i className={`ti ti-tag text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`} />}
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div
            className={`absolute z-50 top-6 left-0 rounded-lg border shadow-xl py-1 overflow-hidden ${
              modoOscuro ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
            }`}
            style={{ width: 170 }}
          >
            {FUNCIONES_JURIDICAS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  onCambiar(f.id)
                  setAbierto(false)
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  modoOscuro ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: f.color }} />
                {f.label}
              </button>
            ))}
            {actual && (
              <button
                onClick={() => {
                  onCambiar(undefined)
                  setAbierto(false)
                }}
                className={`w-full text-left px-3 py-1.5 text-xs border-t ${
                  modoOscuro ? 'border-zinc-800 text-red-400 hover:bg-zinc-800' : 'border-zinc-100 text-red-500 hover:bg-zinc-50'
                }`}
              >
                Quitar función
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// EXPERIMENTAL: VISTA ÁRBOL (rama experimento-visualizacion, no existe en main)
// ============================================================
//
// LÍMITE CONOCIDO, anotado a propósito en vez de arreglado (ver conversación
// del 2026-08-24): un artículo puede aparecer legítimamente bajo más de un
// padre (ver `visitados` en NodoArbol más abajo), y cada aparición vuelve a
// expandir su subárbol COMPLETO desde cero. Con un grafo con "diamantes"
// (varios artículos que convergen en el mismo artículo aguas abajo — muy
// común en la práctica: un concepto que varias normas citan para el mismo
// cálculo o requisito), esto explota combinatoriamente. Medido con la
// plantilla demo "Terminación del contrato de trabajo" (16 artículos reales,
// 22 conexiones, sin ciclos): 87 tarjetas renderizadas y ~8.400px de alto —
// un mismo artículo (Art. 178) repetido 18 veces. Pizarra y mampostería no
// tienen este problema (cada artículo se dibuja una sola vez ahí). Posible
// arreglo futuro: cortar la expansión después de la primera aparición
// completa de un artículo y dejar un enlace "↑ ver arriba" en las
// repeticiones siguientes, en vez de re-expandir todo el subárbol.
//
/** Artículos sin ninguna conexión entrante son las raíces del árbol. Si el
 * grafo no tiene raíces (ej. todo forma un ciclo), se usan todos los
 * artículos como raíz para no dejar la vista vacía. */
function VistaArbol({
  articulos,
  conexiones,
  modoOscuro,
}: {
  articulos: ArticuloResuelto[]
  conexiones: ConexionColeccion[]
  modoOscuro: boolean
}) {
  const porDesde = useMemo(() => {
    const mapa = new Map<string, ConexionColeccion[]>()
    for (const cx of conexiones) {
      const k = `${cx.desde.codigo}::${cx.desde.articulo}`
      if (!mapa.has(k)) mapa.set(k, [])
      mapa.get(k)!.push(cx)
    }
    return mapa
  }, [conexiones])

  const tieneEntrante = useMemo(() => {
    const set = new Set<string>()
    for (const cx of conexiones) set.add(`${cx.hasta.codigo}::${cx.hasta.articulo}`)
    return set
  }, [conexiones])

  const raices = useMemo(() => {
    const propias = articulos.filter((a) => !tieneEntrante.has(`${a.codigo}::${a.articulo}`))
    return propias.length > 0 ? propias : articulos
  }, [articulos, tieneEntrante])

  return (
    <div className={`flex-1 overflow-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {conexiones.length === 0 && (
          <p className={`text-sm mb-6 px-4 py-3 rounded-lg border ${modoOscuro ? 'bg-zinc-800/40 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500'}`}>
            Todavía no hay conexiones creadas en esta colección, así que cada artículo aparece como una raíz suelta.
            Crea conexiones en la pizarra para armar la jerarquía.
          </p>
        )}
        <div className="space-y-8">
          {raices.map((raiz) => (
            <NodoArbol
              key={`${raiz.codigo}::${raiz.articulo}`}
              articulo={raiz}
              porDesde={porDesde}
              articulos={articulos}
              visitados={new Set([`${raiz.codigo}::${raiz.articulo}`])}
              nivel={0}
              modoOscuro={modoOscuro}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function NodoArbol({
  articulo,
  porDesde,
  articulos,
  visitados,
  nivel,
  tipoRelacionEntrante,
  modoOscuro,
}: {
  articulo: ArticuloResuelto
  porDesde: Map<string, ConexionColeccion[]>
  articulos: ArticuloResuelto[]
  visitados: Set<string>
  nivel: number
  tipoRelacionEntrante?: TipoRelacion
  modoOscuro: boolean
}) {
  const key = `${articulo.codigo}::${articulo.articulo}`
  const hijos = porDesde.get(key) ?? []
  const { texto: colorTexto, barra: colorBarra } = colorParaCodigo(articulo.codigo, modoOscuro)
  const colorLinea = modoOscuro ? '#3f3f46' : '#d4d4d8'
  // Mismo color por familia que en el menú de conexión: "Contradice" (tensión)
  // y "Complementa" (estructural) ahora se distinguen a simple vista, en vez
  // de un chip gris plano para las 9 relaciones por igual.
  const familiaEntrante = tipoRelacionEntrante ? familiaDeRelacion(tipoRelacionEntrante) : undefined

  return (
    <div className="relative">
      {/* Muesca horizontal que conecta esta tarjeta con el tronco vertical
          del padre (el border-left del contenedor de hermanos). */}
      {nivel > 0 && (
        <div className="absolute top-8 -left-6 w-6 h-0.5" style={{ background: colorLinea }} />
      )}

      {/* La tarjeta del nodo, con más presencia visual: lomo de color,
          "Art. X" grande igual que en el resto de la app, y la etiqueta de
          relación como chip arriba (no un texto suelto). */}
      <div
        className={`inline-flex items-stretch rounded-xl border shadow-sm overflow-hidden ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
        style={{ minWidth: 220 }}
      >
        <div className="w-1.5 flex-shrink-0" style={{ background: colorBarra }} />
        <div className="px-4 py-3">
          {tipoRelacionEntrante && familiaEntrante && (
            <span
              className="inline-block mb-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ color: familiaEntrante.color, background: `${familiaEntrante.color}22` }}
            >
              {NOMBRE_RELACION[tipoRelacionEntrante]}
            </span>
          )}
          <div className="flex items-baseline gap-2">
            <span className={`font-serif font-bold text-lg leading-none ${colorTexto}`}>{articulo.articulo}</span>
            <span className={`text-[11px] uppercase tracking-wide ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {articulo.nombreCodigo}
            </span>
          </div>
        </div>
      </div>

      {/* Hijos: tronco vertical (border-left) del que cuelgan las ramas. */}
      {hijos.length > 0 && (
        <div className="ml-4 pl-6 mt-4 border-l-2 space-y-4" style={{ borderColor: colorLinea }}>
          {hijos.map((cx) => {
            const hijoKey = `${cx.hasta.codigo}::${cx.hasta.articulo}`
            const hijoItem = articulos.find((a) => a.codigo === cx.hasta.codigo && a.articulo === cx.hasta.articulo)
            if (!hijoItem) return null
            if (visitados.has(hijoKey)) {
              return (
                <div key={cx.id} className="relative">
                  <div className="absolute top-4 -left-6 w-6 h-0.5" style={{ background: colorLinea }} />
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed text-xs italic ${
                      modoOscuro ? 'border-zinc-700 text-zinc-500' : 'border-zinc-300 text-zinc-400'
                    }`}
                  >
                    <i className="ti ti-corner-up-left text-xs" />
                    {cx.hasta.articulo} (vuelve a un artículo ya mostrado más arriba)
                  </div>
                </div>
              )
            }
            return (
              <NodoArbol
                key={cx.id}
                articulo={hijoItem}
                porDesde={porDesde}
                articulos={articulos}
                visitados={new Set([...visitados, hijoKey])}
                nivel={nivel + 1}
                tipoRelacionEntrante={cx.tipo}
                modoOscuro={modoOscuro}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// MODAL: AGREGAR ARTÍCULO
// ============================================================

function useResultadosBusqueda(arts: Articulo[], busqueda: string): Articulo[] {
  return useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return arts.slice(0, 30)

    const matchSoloId = q.match(/^(?:art(?:[íi]culo)?\.?\s*)?(\d+)\s*[°ºo]?\s*$/i)
    const qNumPuro = matchSoloId ? matchSoloId[1] : null

    type Puntuado = { a: Articulo; score: number }
    const puntuados: Puntuado[] = []
    for (const a of arts) {
      const numArt = a.a.replace(/[^\d]/g, '')
      let score = 0
      if (qNumPuro) {
        if (numArt === qNumPuro) score += 10000
        else if (numArt.startsWith(qNumPuro)) score += 1000 - (numArt.length - qNumPuro.length)
      } else {
        if (a.a.toLowerCase().includes(q)) score += 500
        if (a.t.toLowerCase().includes(q)) score += 100
      }
      if (score > 0) puntuados.push({ a, score })
    }
    return puntuados
      .sort((x, y) => y.score - x.score)
      .slice(0, 30)
      .map((p) => p.a)
  }, [arts, busqueda])
}

function ModalAgregarArticulo({
  abierto,
  onCerrar,
  coleccionId,
  modoOscuro,
}: {
  abierto: boolean
  onCerrar: () => void
  coleccionId: string
  modoOscuro: boolean
}) {
  const codigosStore = useStore((s) => s.codigos)
  const coleccion = useStore((s) => s.colecciones.find((c) => c.id === coleccionId))
  const agregarArticulo = useStore((s) => s.agregarArticuloAColeccion)
  const [codigoTipo, setCodigoTipo] = useState<CodigoTipo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { codigo, cargando } = useCodigo(codigoTipo)
  const arts = codigo?.articulos ?? []
  const resultados = useResultadosBusqueda(arts, busqueda)

  const yaAgregados = useMemo(
    () => new Set((coleccion?.articulos ?? []).map((a) => `${a.codigo}::${a.articulo}`)),
    [coleccion]
  )

  useEffect(() => {
    if (!abierto) {
      setCodigoTipo(null)
      setBusqueda('')
    }
  }, [abierto])

  useEffect(() => {
    if (codigoTipo) setTimeout(() => inputRef.current?.focus(), 50)
  }, [codigoTipo])

  const totalAgregados = coleccion?.articulos.length ?? 0

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onCerrar}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] ${
              modoOscuro ? 'bg-zinc-900' : 'bg-white'
            }`}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div>
                <h2 className={`text-base font-serif font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                  Agregar artículos
                </h2>
                <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {totalAgregados} agregado{totalAgregados !== 1 ? 's' : ''} · elige el código y busca
                </p>
              </div>
              <button
                onClick={onCerrar}
                aria-label="Cerrar"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className={`flex flex-wrap gap-1.5 px-5 py-3 border-b max-h-28 overflow-y-auto ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              {codigosStore.map((c) => (
                <button
                  key={c.tipo}
                  onClick={() => setCodigoTipo(c.tipo)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    codigoTipo === c.tipo
                      ? 'text-white'
                      : modoOscuro
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                  style={codigoTipo === c.tipo ? { background: VERDE } : undefined}
                >
                  {c.nombreCorto}
                </button>
              ))}
            </div>

            {codigoTipo ? (
              <>
                <div className={`flex items-center gap-2 px-5 py-3 border-b flex-shrink-0 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <i className={`ti ti-search ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`} />
                  <input
                    ref={inputRef}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder='Número ("1545") o palabra clave ("extinción")'
                    className={`flex-1 bg-transparent outline-none text-sm ${
                      modoOscuro ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
                    }`}
                  />
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  {cargando ? (
                    <div className={`py-10 text-center text-sm ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      <i className="ti ti-loader-2 text-xl animate-spin block mb-2" />
                      Cargando código…
                    </div>
                  ) : resultados.length === 0 ? (
                    <div className={`py-10 text-center text-sm ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      <i className="ti ti-search-off text-xl block mb-2" />
                      Sin resultados
                    </div>
                  ) : (
                    resultados.map((a) => {
                      const clave = `${codigoTipo}::${a.a}`
                      const agregado = yaAgregados.has(clave)
                      return (
                        <button
                          key={a.a}
                          disabled={agregado}
                          onClick={() => agregarArticulo(coleccionId, { codigo: codigoTipo, articulo: a.a })}
                          className={`w-full text-left px-5 py-2.5 flex items-center gap-3 transition-colors ${
                            agregado
                              ? 'opacity-50 cursor-default'
                              : modoOscuro
                                ? 'hover:bg-zinc-800'
                                : 'hover:bg-zinc-50'
                          }`}
                        >
                          <span className="font-mono text-xs font-semibold flex-shrink-0" style={{ color: VERDE }}>
                            {a.a}
                          </span>
                          <span className={`text-xs line-clamp-1 flex-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            {primerasPalabras(a.t, 14)}
                          </span>
                          <i
                            className={`ti ${agregado ? 'ti-check' : 'ti-plus'} text-sm flex-shrink-0`}
                            style={agregado ? { color: VERDE } : undefined}
                          />
                        </button>
                      )
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center py-16">
                <p className={`text-sm ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Elige un código arriba para empezar a buscar
                </p>
              </div>
            )}

            <div className={`px-5 py-3 border-t flex justify-end flex-shrink-0 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <button
                onClick={onCerrar}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: VERDE }}
              >
                Listo
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function primerasPalabras(texto: string, n: number): string {
  const palabras = texto.split(/\s+/).slice(0, n)
  return palabras.join(' ') + (texto.split(/\s+/).length > n ? '…' : '')
}

function formatearFecha(ts: number): string {
  return new Date(ts).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

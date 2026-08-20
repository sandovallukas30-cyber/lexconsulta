import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useCodigo } from '../../hooks/useCodigo'
import { precargar, obtenerCodigo } from '../../services/codigos'
import type { Articulo, ArticuloColeccion, Coleccion, CodigoTipo } from '../../types'

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
      </div>

      <ModalNuevaColeccion abierto={modalNueva} onCerrar={() => setModalNueva(false)} modoOscuro={modoOscuro} />
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
    }
  })
}

function ColeccionDetalle({ coleccion }: { coleccion: Coleccion }) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const setColeccionActiva = useStore((s) => s.setColeccionActiva)
  const renombrarColeccion = useStore((s) => s.renombrarColeccion)
  const eliminarColeccion = useStore((s) => s.eliminarColeccion)
  const quitarArticulo = useStore((s) => s.quitarArticuloDeColeccion)
  const moverArticulo = useStore((s) => s.moverArticuloColeccion)

  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [tituloTmp, setTituloTmp] = useState(coleccion.titulo)
  const [modalAgregar, setModalAgregar] = useState(false)
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

        <span className={`text-xs flex-shrink-0 hidden sm:inline ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {coleccion.articulos.length} artículo{coleccion.articulos.length !== 1 ? 's' : ''}
        </span>

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

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {coleccion.articulos.length === 0 ? (
            <div className="text-center py-16">
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
          ) : (
            <div className="flex flex-wrap gap-4 items-start">
              {articulosResueltos.map((ar, i) => (
                <TarjetaArticulo
                  key={`${ar.codigo}::${ar.articulo}`}
                  item={ar}
                  posicion={i}
                  total={articulosResueltos.length}
                  onQuitar={() => quitarArticulo(coleccion.id, { codigo: ar.codigo, articulo: ar.articulo })}
                  onMover={(dir) => moverArticulo(coleccion.id, i, dir)}
                  modoOscuro={modoOscuro}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ModalAgregarArticulo
        abierto={modalAgregar}
        onCerrar={() => setModalAgregar(false)}
        coleccionId={coleccion.id}
        modoOscuro={modoOscuro}
      />
    </div>
  )
}

function TarjetaArticulo({
  item,
  posicion,
  total,
  onQuitar,
  onMover,
  modoOscuro,
}: {
  item: ArticuloResuelto
  posicion: number
  total: number
  onQuitar: () => void
  onMover: (direccion: -1 | 1) => void
  modoOscuro: boolean
}) {
  const [expandido, setExpandido] = useState(true)
  const color = 'var(--accent-base)'

  return (
    <div
      className={`w-full sm:w-[380px] flex-shrink-0 rounded-xl border overflow-hidden ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      {/* Tira de control: reordenar y quitar, discreta */}
      <div className={`flex items-center justify-between px-2 py-1 ${modoOscuro ? 'bg-zinc-800/40' : 'bg-zinc-50'}`}>
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

      {/* Encabezado grande, mismo estilo que el título de artículo en Explorador */}
      <button
        onClick={() => setExpandido(!expandido)}
        className={`w-full flex items-start justify-between gap-2 px-4 py-3 text-left ${
          expandido ? (modoOscuro ? 'border-b border-zinc-800' : 'border-b border-zinc-100') : ''
        }`}
      >
        <div className="min-w-0">
          <div className={`text-[10px] uppercase tracking-wider font-semibold mb-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {item.nombreCodigo}
          </div>
          <div className="font-serif text-2xl font-bold leading-none" style={{ color }}>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function dividirIncisos(texto: string): string[] {
  if (!texto || !texto.trim()) return []
  return texto.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0)
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

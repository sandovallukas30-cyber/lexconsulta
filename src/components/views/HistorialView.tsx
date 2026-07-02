import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import type { ConsultaHistorial, VistaId } from '../../types'

const VERDE = 'var(--accent-base)'

const moduloLabel: Record<VistaId, string> = {
  consultar: 'Consultar',
  situacion: 'Situación',
  canvas: 'Canvas',
  comparar: 'Comparar',
  mapa: 'Mapa',
  explorador: 'Explorador',
  historial: 'Historial',
  admin: 'Admin',
  practica: 'Práctica',
}

const moduloIcono: Record<VistaId, string> = {
  consultar: 'ti-messages',
  situacion: 'ti-list-numbers',
  canvas: 'ti-affiliate',
  comparar: 'ti-versions',
  mapa: 'ti-network',
  explorador: 'ti-book-2',
  historial: 'ti-history',
  admin: 'ti-settings-2',
  practica: 'ti-puzzle',
}

export function HistorialView() {
  const historial = useStore((s) => s.historial)
  const cargarConsulta = useStore((s) => s.cargarConsulta)
  const eliminarConsulta = useStore((s) => s.eliminarConsulta)
  const consultaActivaId = useStore((s) => s.consultaActivaId)
  const modoOscuro = useStore((s) => s.modoOscuro)

  const [busqueda, setBusqueda] = useState('')
  const [moduloFiltro, setModuloFiltro] = useState<VistaId | 'todos'>('todos')

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return historial
      .map((h) => ({ ...h, fecha: new Date(h.fecha) }))
      .filter((h) => moduloFiltro === 'todos' || h.modulo === moduloFiltro)
      .filter((h) => {
        if (!q) return true
        if (h.titulo.toLowerCase().includes(q)) return true
        return h.mensajes.some((m) => m.contenido.toLowerCase().includes(q))
      })
  }, [historial, busqueda, moduloFiltro])

  const stats = useMemo(() => {
    let util = 0
    let noUtil = 0
    let asistente = 0
    for (const h of historial) {
      for (const m of h.mensajes) {
        if (m.rol !== 'assistant') continue
        asistente++
        if (m.valoracion === 'util') util++
        else if (m.valoracion === 'no_util') noUtil++
      }
    }
    return { util, noUtil, sinValorar: asistente - util - noUtil, total: asistente }
  }, [historial])

  function exportarFeedback() {
    const entradas: Array<Record<string, unknown>> = []
    for (const h of historial) {
      for (let i = 0; i < h.mensajes.length; i++) {
        const m = h.mensajes[i]
        if (m.rol !== 'assistant' || !m.valoracion) continue
        const previo = h.mensajes[i - 1]
        entradas.push({
          consultaId: h.id,
          modulo: h.modulo,
          fecha: h.fecha,
          pregunta: previo?.rol === 'user' ? previo.contenido : null,
          respuesta: m.contenido,
          valoracion: m.valoracion,
          comentario: m.comentarioValoracion ?? null,
          citas: m.citas?.map((c) => c.articulo) ?? [],
          citasNoVerificadas: m.citasNoVerificadas ?? [],
        })
      }
    }
    const blob = new Blob([JSON.stringify(entradas, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prima-lex-feedback-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const grupos = useMemo(() => agruparPorFecha(filtrados), [filtrados])
  const modulosUsados = useMemo(() => {
    const s = new Set<VistaId>()
    for (const h of historial) s.add(h.modulo)
    return [...s]
  }, [historial])

  if (historial.length === 0) return <EmptyState modoOscuro={modoOscuro} />

  return (
    <div className={`h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div
        className={`px-6 py-4 border-b space-y-3 ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'
          }`}
        >
          <i className={`ti ti-search text-base ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en mis consultas..."
            className={`flex-1 bg-transparent outline-none text-sm ${
              modoOscuro ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
            }`}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
              className={modoOscuro ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}
            >
              <i className="ti ti-x text-sm" />
            </button>
          )}
        </div>

        {modulosUsados.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <ChipFiltro
              activo={moduloFiltro === 'todos'}
              onClick={() => setModuloFiltro('todos')}
              modoOscuro={modoOscuro}
            >
              Todos ({historial.length})
            </ChipFiltro>
            {modulosUsados.map((m) => (
              <ChipFiltro
                key={m}
                activo={moduloFiltro === m}
                onClick={() => setModuloFiltro(m)}
                modoOscuro={modoOscuro}
              >
                <i className={`ti ${moduloIcono[m]} text-xs mr-1`} />
                {moduloLabel[m]} ({historial.filter((h) => h.modulo === m).length})
              </ChipFiltro>
            ))}
          </div>
        )}

        {stats.total > 0 && (
          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            <span className={modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}>Feedback de respuestas:</span>
            <span className={`inline-flex items-center gap-1 ${modoOscuro ? 'text-[var(--accent-400)]' : 'text-[var(--accent-700)]'}`}>
              <i className="ti ti-thumb-up text-xs" /> {stats.util} útil{stats.util !== 1 ? 'es' : ''}
            </span>
            <span className={`inline-flex items-center gap-1 ${modoOscuro ? 'text-rose-400' : 'text-rose-700'}`}>
              <i className="ti ti-thumb-down text-xs" /> {stats.noUtil} mejorable{stats.noUtil !== 1 ? 's' : ''}
            </span>
            <span className={modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}>
              · {stats.sinValorar} sin valorar
            </span>
            {(stats.util + stats.noUtil) > 0 && (
              <button
                onClick={exportarFeedback}
                className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                  modoOscuro
                    ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}
                title="Descargar las respuestas valoradas en un archivo JSON para análisis"
              >
                <i className="ti ti-download text-xs" />
                Exportar feedback
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtrados.length === 0 ? (
          <div className={`text-center py-16 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <i className="ti ti-search-off text-3xl mb-2 block" />
            <p className="text-sm">Ningún resultado para tu búsqueda</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {grupos.map(({ label, items }) => (
              <section key={label}>
                <h2
                  className={`text-[11px] uppercase tracking-wider font-semibold mb-2 ${
                    modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                >
                  {label}
                </h2>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((h) => (
                      <ConsultaCard
                        key={h.id}
                        consulta={h}
                        activa={consultaActivaId === h.id}
                        onCargar={() => cargarConsulta(h.id)}
                        onEliminar={() => eliminarConsulta(h.id)}
                        modoOscuro={modoOscuro}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ChipFiltro({
  activo,
  onClick,
  modoOscuro,
  children,
}: {
  activo: boolean
  onClick: () => void
  modoOscuro: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        activo
          ? 'text-white'
          : modoOscuro
          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
      }`}
      style={activo ? { background: VERDE } : undefined}
    >
      {children}
    </button>
  )
}

function ConsultaCard({
  consulta,
  activa,
  onCargar,
  onEliminar,
  modoOscuro,
}: {
  consulta: ConsultaHistorial
  activa: boolean
  onCargar: () => void
  onEliminar: () => void
  modoOscuro: boolean
}) {
  const ultimaRespuesta = [...consulta.mensajes].reverse().find((m) => m.rol === 'assistant')
  const numMensajes = consulta.mensajes.length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.2 }}
      className={`group rounded-xl border transition-colors ${
        activa
          ? modoOscuro
            ? 'bg-zinc-800 border-[var(--accent-700)]'
            : 'bg-[var(--accent-50)]/50 border-[var(--accent-300)]'
          : modoOscuro
          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          : 'bg-white border-zinc-200 hover:border-zinc-300'
      }`}
    >
      <button onClick={onCargar} className="w-full text-left px-4 py-3">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)' : 'color-mix(in srgb, var(--accent-base) 8%, transparent)' }}
          >
            <i
              className={`ti ${moduloIcono[consulta.modulo]} text-base`}
              style={{ color: VERDE }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3
                className={`text-sm font-semibold leading-snug ${
                  modoOscuro ? 'text-white' : 'text-zinc-900'
                }`}
              >
                {consulta.titulo}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('¿Eliminar esta consulta del historial?')) onEliminar()
                }}
                className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-md flex items-center justify-center ${
                  modoOscuro
                    ? 'text-zinc-500 hover:bg-zinc-800 hover:text-red-400'
                    : 'text-zinc-400 hover:bg-zinc-100 hover:text-red-500'
                }`}
                title="Eliminar"
                aria-label="Eliminar consulta"
              >
                <i className="ti ti-trash text-sm" />
              </button>
            </div>
            {ultimaRespuesta && (
              <p
                className={`text-xs leading-snug line-clamp-2 ${
                  modoOscuro ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                {ultimaRespuesta.contenido.replace(/[*#`>_-]/g, '').slice(0, 200)}
              </p>
            )}
            <div className={`flex items-center gap-3 mt-2 text-[11px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              <span>
                <i className="ti ti-clock text-[11px] mr-0.5" />
                {fechaRelativa(new Date(consulta.fecha))}
              </span>
              <span>·</span>
              <span>
                {numMensajes} mensaje{numMensajes !== 1 ? 's' : ''}
              </span>
              <span>·</span>
              <span>{moduloLabel[consulta.modulo]}</span>
              {activa && (
                <>
                  <span>·</span>
                  <span className="font-semibold" style={{ color: VERDE }}>
                    Activa
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  )
}

function EmptyState({ modoOscuro }: { modoOscuro: boolean }) {
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
        >
          <i className="ti ti-history text-4xl" style={{ color: VERDE }} />
        </div>
        <h3 className={`text-2xl font-serif font-semibold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          Aún no hay historial
        </h3>
        <p className={`text-sm leading-relaxed mb-6 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Tus consultas aparecerán aquí automáticamente. Puedes retomar cualquier conversación cuando quieras.
        </p>
        <button
          onClick={() => setVistaActiva('consultar')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: VERDE }}
        >
          <i className="ti ti-messages text-base" />
          Hacer mi primera consulta
        </button>
      </div>
    </div>
  )
}

interface Grupo {
  label: string
  items: ConsultaHistorial[]
}

function agruparPorFecha(items: ConsultaHistorial[]): Grupo[] {
  const ahora = new Date()
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)
  const haceSemana = new Date(hoy)
  haceSemana.setDate(haceSemana.getDate() - 7)
  const haceMes = new Date(hoy)
  haceMes.setMonth(haceMes.getMonth() - 1)

  const grupos: Record<string, ConsultaHistorial[]> = {
    Hoy: [],
    Ayer: [],
    'Esta semana': [],
    'Este mes': [],
    Anterior: [],
  }
  for (const it of items) {
    const f = new Date(it.fecha)
    if (f >= hoy) grupos['Hoy'].push(it)
    else if (f >= ayer) grupos['Ayer'].push(it)
    else if (f >= haceSemana) grupos['Esta semana'].push(it)
    else if (f >= haceMes) grupos['Este mes'].push(it)
    else grupos['Anterior'].push(it)
  }
  return Object.entries(grupos)
    .filter(([, v]) => v.length > 0)
    .map(([label, items]) => ({ label, items }))
}

function fechaRelativa(d: Date): string {
  const ahora = Date.now()
  const diff = ahora - d.getTime()
  const min = Math.floor(diff / 60000)
  const horas = Math.floor(diff / 3600000)
  const dias = Math.floor(diff / 86400000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  if (horas < 24) return `hace ${horas} h`
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

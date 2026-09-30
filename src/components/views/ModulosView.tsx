import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ModalRespaldo } from '../ui/ModalRespaldo'
import { useStore } from '../../store/useStore'
import { MODULOS } from '../../data/modulos'
import { ModuloCard } from '../ui/ModuloCard'
import { ModuloDetalle, type Tab } from '../ui/ModuloDetalle'
import { RamoCard } from '../ui/RamoCard'
import { ModalRamo } from '../ui/ModalRamo'
import { diasHasta, evaluacionesPendientes, obtenerProximosEventos, formatearCountdown, urgenciaDe, moduloDesdeRamo, type EvaluacionPendiente, type Urgencia } from '../../services/modulosAcademico'
import { calcularRachaEstudio, contarTarjetasVencidas } from '../../services/actividadEstudio'
import type { Ramo } from '../../types'


/** Color del chip de cuenta regresiva: ≤3 días rojo, ≤7 ámbar, más gris. */
function claseUrgencia(u: Urgencia, modoOscuro: boolean): string {
  if (u === 'urgente') return modoOscuro ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700'
  if (u === 'proximo') return modoOscuro ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700'
  if (u === 'vencido') return modoOscuro ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
  return modoOscuro ? 'bg-zinc-700/60 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
}

/** Nombre, color e ícono de un módulo del catálogo O de un Ramo propio --
 *  antes solo se buscaba en MODULOS y las evaluaciones de los Ramos se
 *  descartaban sin mostrarse. */
function resolverModulo(id: string, ramos: Ramo[]): { nombre: string; color: string; icono: string } | null {
  const m = MODULOS.find((x) => x.id === id)
  if (m) return m
  const r = ramos.find((x) => x.id === id)
  if (!r) return null
  return moduloDesdeRamo(r, MODULOS.filter((x) => r.modulosVinculados.includes(x.id)))
}

function FilaEvaluacion({
  item, ramos, modoOscuro, onAbrir,
}: {
  item: EvaluacionPendiente
  ramos: Ramo[]
  modoOscuro: boolean
  onAbrir: (moduloId: string, tab: Tab, evaluacionId?: string) => void
}) {
  const modulo = resolverModulo(item.moduloId, ramos)
  if (!modulo) return null
  const u = urgenciaDe(item.dias)
  const e = item.evaluacion
  return (
    <button
      // abre Exámenes con ESTA evaluación en edición: para una vencida es
      // justo lo que hay que hacer (anotar la nota o corregir la fecha)
      onClick={() => onAbrir(item.moduloId, 'examenes', e.id)}
      className={`w-full flex items-center gap-3 p-3 min-h-[56px] rounded-xl border text-left transition-colors ${
        modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
      }`}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${modulo.color} 14%, transparent)` }}>
        <i className="ti ti-clipboard-check text-base" style={{ color: modulo.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{e.nombre}</div>
        <div className={`text-xs truncate ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {modulo.nombre} · {e.ponderacion}% · {formatearFechaLarga(e.fecha)}
        </div>
      </div>
      <span className={`text-xs font-semibold px-2 py-1 rounded-md flex-shrink-0 ${claseUrgencia(u, modoOscuro)}`}>
        {formatearCountdown(item.dias)}
      </span>
    </button>
  )
}

function formatearFechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
}

const MAX_PROXIMAS = 5

/** Las 3 clases pendientes más cercanas, en una línea compacta (antes se
 *  mezclaban con las evaluaciones en la misma lista). */
function ProximasClases({ ramos, modoOscuro, onAbrir }: { ramos: Ramo[]; modoOscuro: boolean; onAbrir: (moduloId: string, tab: Tab) => void }) {
  const academicoModulos = useStore((s) => s.academicoModulos)
  const clases = useMemo(
    () =>
      obtenerProximosEventos(academicoModulos)
        .filter((e) => e.tipo === 'clase' && diasHasta(e.fecha) >= 0 && resolverModulo(e.moduloId, ramos))
        .slice(0, 3),
    [academicoModulos, ramos]
  )
  if (clases.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Próximas clases">
      {clases.map((c, i) => {
        const m = resolverModulo(c.moduloId, ramos)!
        return (
          <button
            key={`${c.moduloId}-${i}`}
            onClick={() => onAbrir(c.moduloId, 'clases')}
            title={`${m.nombre}: ${c.titulo}`}
            className={`inline-flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-lg text-xs border transition-colors ${
              modoOscuro ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-white'
            }`}
          >
            <i className="ti ti-calendar-event text-sm" style={{ color: m.color }} />
            <span className="truncate max-w-[180px]">{c.titulo}</span>
            <span className={modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}>· {formatearCountdown(diasHasta(c.fecha)).toLowerCase()}</span>
          </button>
        )
      })}
    </div>
  )
}

/** B3: evaluaciones sin nota ordenadas por cercanía (todas las de módulos
 *  Y ramos), con cuenta regresiva y color por urgencia; vencidas aparte. */
function ProximasEvaluaciones({ modoOscuro, onAbrir }: { modoOscuro: boolean; onAbrir: (moduloId: string, tab: Tab, evaluacionId?: string) => void }) {
  const academicoModulos = useStore((s) => s.academicoModulos)
  const ramos = useStore((s) => s.ramos)
  const [verTodas, setVerTodas] = useState(false)
  const [verVencidas, setVerVencidas] = useState(false)
  const { proximas, vencidas } = useMemo(() => {
    const r = evaluacionesPendientes(academicoModulos)
    // solo las que tienen a dónde navegar (módulo del catálogo o ramo existente)
    const valida = (x: EvaluacionPendiente) => resolverModulo(x.moduloId, ramos) !== null
    return { proximas: r.proximas.filter(valida), vencidas: r.vencidas.filter(valida) }
  }, [academicoModulos, ramos])

  const hayClases = useMemo(() => obtenerProximosEventos(academicoModulos).some((e) => e.tipo === 'clase' && diasHasta(e.fecha) >= 0), [academicoModulos])
  if (proximas.length === 0 && vencidas.length === 0 && !hayClases) return null
  const visibles = verTodas ? proximas : proximas.slice(0, MAX_PROXIMAS)
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'

  return (
    <section aria-labelledby="titulo-proximas-evaluaciones">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 id="titulo-proximas-evaluaciones" className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Próximas evaluaciones
        </h2>
        {proximas.length > 0 && <span className={`text-xs ${suave}`}>{proximas.length} pendiente{proximas.length === 1 ? '' : 's'}</span>}
      </div>
      {proximas.length === 0 ? (
        <p className={`text-sm ${suave}`}>No tienes evaluaciones próximas registradas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visibles.map((x) => (
            <FilaEvaluacion key={`${x.moduloId}-${x.evaluacion.id}`} item={x} ramos={ramos} modoOscuro={modoOscuro} onAbrir={onAbrir} />
          ))}
        </div>
      )}
      {proximas.length > MAX_PROXIMAS && (
        <button onClick={() => setVerTodas((v) => !v)} className="mt-2 text-xs font-medium min-h-[36px]" style={{ color: 'var(--accent-texto)' }}>
          {verTodas ? 'Ver menos' : `Ver todas (${proximas.length})`}
        </button>
      )}
      <ProximasClases ramos={ramos} modoOscuro={modoOscuro} onAbrir={onAbrir} />
      {vencidas.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setVerVencidas((v) => !v)}
            aria-expanded={verVencidas}
            className={`flex items-center gap-1.5 text-xs font-medium min-h-[36px] ${suave}`}
          >
            <i className={`ti ti-chevron-right text-sm transition-transform ${verVencidas ? 'rotate-90' : ''}`} />
            Vencidas sin nota ({vencidas.length}) — anota la nota o corrige la fecha
          </button>
          {verVencidas && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {vencidas.map((x) => (
                <FilaEvaluacion key={`${x.moduloId}-${x.evaluacion.id}`} item={x} ramos={ramos} modoOscuro={modoOscuro} onAbrir={onAbrir} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function DashboardHoy({ modoOscuro }: { modoOscuro: boolean }) {
  const diasActividadEstudio = useStore((s) => s.diasActividadEstudio)
  const colecciones = useStore((s) => s.colecciones)
  const setVistaActiva = useStore((s) => s.setVistaActiva)

  const racha = calcularRachaEstudio(diasActividadEstudio)
  const tarjetasVencidas = contarTarjetasVencidas(colecciones)

  if (racha === 0 && tarjetasVencidas === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {racha > 0 && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-500/15">
            <i className="ti ti-flame text-lg text-orange-500" />
          </div>
          <div>
            <div className={`text-xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{racha}</div>
            <div className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {racha === 1 ? 'día seguido estudiando' : 'días seguidos estudiando'}
            </div>
          </div>
        </div>
      )}
      {tarjetasVencidas > 0 && (
        <button
          onClick={() => setVistaActiva('colecciones')}
          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
            modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--accent-base) 15%, transparent)' }}
          >
            <i className="ti ti-cards text-lg" style={{ color: 'var(--accent-texto)' }} />
          </div>
          <div>
            <div className={`text-xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{tarjetasVencidas}</div>
            <div className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {tarjetasVencidas === 1 ? 'tarjeta para repasar hoy' : 'tarjetas para repasar hoy'}
            </div>
          </div>
        </button>
      )}
    </div>
  )
}

function MisRamos({
  modoOscuro,
  onAbrirRamo,
  onEditarRamo,
  onNuevoRamo,
}: {
  modoOscuro: boolean
  onAbrirRamo: (id: string) => void
  onEditarRamo: (ramo: Ramo) => void
  onNuevoRamo: () => void
}) {
  const ramos = useStore((s) => s.ramos)

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Mis ramos</h2>
        <button
          onClick={onNuevoRamo}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            modoOscuro ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          <i className="ti ti-plus text-sm" />
          Agregar ramo
        </button>
      </div>

      {ramos.length === 0 ? (
        <div className={`flex flex-col items-center justify-center text-center py-10 rounded-xl border border-dashed ${
          modoOscuro ? 'border-zinc-800 text-zinc-500' : 'border-zinc-300 text-zinc-400'
        }`}>
          <i className="ti ti-school text-2xl mb-2 opacity-60" />
          <p className="text-sm">Agrega los ramos que cursas este semestre, con su profesor y horario.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ramos.map((ramo) => (
            <RamoCard
              key={ramo.id}
              ramo={ramo}
              modulos={MODULOS.filter((m) => ramo.modulosVinculados.includes(m.id))}
              modoOscuro={modoOscuro}
              onClick={() => onAbrirRamo(ramo.id)}
              onEditar={() => onEditarRamo(ramo)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ModulosView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const progresoModulos = useStore((s) => s.progresoModulos)
  const moduloActivoId = useStore((s) => s.moduloActivoId)
  const setModuloActivo = useStore((s) => s.setModuloActivo)
  const ramos = useStore((s) => s.ramos)
  const [tabInicial, setTabInicial] = useState<Tab | undefined>(undefined)
  const [evaluacionEnfocada, setEvaluacionEnfocada] = useState<string | undefined>(undefined)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [ramoEditando, setRamoEditando] = useState<Ramo | null>(null)
  const [respaldoAbierto, setRespaldoAbierto] = useState(false)

  const modulosOrdenados = [...MODULOS].sort((a, b) => a.orden - b.orden)
  const moduloDeCatalogo = moduloActivoId ? MODULOS.find((m) => m.id === moduloActivoId) : undefined
  // Un Ramo propio se abre con el mismo moduloActivoId (su id de Ramo hace
  // de id de "módulo virtual" -- ver moduloDesdeRamo): si el id activo no
  // está en el catálogo fijo, se busca acá antes de darlo por inexistente.
  const ramoActivo = !moduloDeCatalogo && moduloActivoId ? ramos.find((r) => r.id === moduloActivoId) : undefined
  const moduloActivo = moduloDeCatalogo ?? (ramoActivo ? moduloDesdeRamo(ramoActivo, MODULOS.filter((m) => ramoActivo.modulosVinculados.includes(m.id))) : undefined)

  const abrirModulo = (moduloId: string, tab?: Tab, evaluacionId?: string) => {
    setTabInicial(tab)
    setEvaluacionEnfocada(evaluacionId)
    setModuloActivo(moduloId)
  }

  const abrirNuevoRamo = () => {
    setRamoEditando(null)
    setModalAbierto(true)
  }

  const abrirEdicionRamo = (ramo: Ramo) => {
    setRamoEditando(ramo)
    setModalAbierto(true)
  }

  // ModalRamo se renderiza UNA sola vez, envolviendo ambas ramas (detalle y
  // lista) -- antes vivía solo dentro del `return` de la lista, así que
  // "Editar ramo" desde dentro del detalle (ModuloDetalle ya hizo su propio
  // `return` antes de llegar ahí) nunca llegaba a montarlo: el botón
  // encendía el estado pero no había ningún <ModalRamo> presente para
  // mostrarlo.
  if (moduloActivo) {
    return (
      <>
        <ModuloDetalle
          modulo={moduloActivo}
          modoOscuro={modoOscuro}
          tabInicial={tabInicial}
          evaluacionEnfocada={evaluacionEnfocada}
          onVolver={() => setModuloActivo(null)}
          onEditar={ramoActivo ? () => abrirEdicionRamo(ramoActivo) : undefined}
        />
        <ModalRamo abierto={modalAbierto} ramoEditando={ramoEditando} onCerrar={() => setModalAbierto(false)} />
      </>
    )
  }

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: modoOscuro
                ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
                : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
            }}
          >
            <i className="ti ti-layout-grid text-xl" style={{ color: 'var(--accent-texto)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              Módulos
            </h1>
            <p className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Selecciona un área del derecho para explorar sus contenidos y ver tu progreso
            </p>
          </div>
          <button
            onClick={() => setRespaldoAbierto(true)}
            title="Exportar o importar un respaldo de tus ramos, apuntes, colecciones y mapas"
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-xs font-medium transition-colors ${
              modoOscuro ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <i className="ti ti-database-export text-sm" />
            <span className="hidden sm:inline">Respaldo</span>
          </button>
        </div>

        <div className="mt-8 space-y-8">
          <DashboardHoy modoOscuro={modoOscuro} />

          <MisRamos
            modoOscuro={modoOscuro}
            onAbrirRamo={(id) => abrirModulo(id)}
            onEditarRamo={abrirEdicionRamo}
            onNuevoRamo={abrirNuevoRamo}
          />

          <ProximasEvaluaciones modoOscuro={modoOscuro} onAbrir={abrirModulo} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulosOrdenados.map((modulo) => (
              <ModuloCard
                key={modulo.id}
                modulo={modulo}
                progreso={progresoModulos[modulo.id]}
                modoOscuro={modoOscuro}
                onClick={() => abrirModulo(modulo.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <ModalRamo abierto={modalAbierto} ramoEditando={ramoEditando} onCerrar={() => setModalAbierto(false)} />
      <AnimatePresence>{respaldoAbierto && <ModalRespaldo onCerrar={() => setRespaldoAbierto(false)} />}</AnimatePresence>
    </div>
  )
}

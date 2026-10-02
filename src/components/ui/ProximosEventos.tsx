import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Tab } from './moduloDetalle/utilidades'
import { diasHasta, evaluacionesPendientes, obtenerProximosEventos, formatearCountdown, urgenciaDe, resolverModulo, type EvaluacionPendiente, type Urgencia } from '../../services/modulosAcademico'
import type { Ramo } from '../../types'

/** Próximas evaluaciones y clases de TODOS los ramos y módulos (B3). Viven acá
 *  para usarse igual en «Mis ramos» y en la portada «Hoy». */

/** Color del chip de cuenta regresiva: ≤3 días rojo, ≤7 ámbar, más gris. */
function claseUrgencia(u: Urgencia, modoOscuro: boolean): string {
  if (u === 'urgente') return modoOscuro ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700'
  if (u === 'proximo') return modoOscuro ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700'
  if (u === 'vencido') return modoOscuro ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
  return modoOscuro ? 'bg-zinc-700/60 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
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
export function ProximasClases({ ramos, modoOscuro, onAbrir }: { ramos: Ramo[]; modoOscuro: boolean; onAbrir: (moduloId: string, tab: Tab) => void }) {
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
export function ProximasEvaluaciones({ modoOscuro, onAbrir }: { modoOscuro: boolean; onAbrir: (moduloId: string, tab: Tab, evaluacionId?: string) => void }) {
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

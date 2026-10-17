import { useStore } from '../../store/useStore'
import type { TareaPlan } from '../../types'
import { colorRamo, etiquetaFecha, nombreRamo, progresoSubtareas } from '../../services/tareasPlan'
import { horasMin } from '../../services/enfoque'

const COLOR_PRIORIDAD = { alta: '#dc2626', media: '#d97706', baja: '#a1a1aa' } as const

interface Props {
  tarea: TareaPlan
  /** Si se pasa, el título abre el editor (vista Tareas). */
  onAbrir?: () => void
  abierta?: boolean
}

/** Una tarea en una línea: casilla, título, ramo, fecha y avance de subtareas.
 *  La usan las vistas Tareas y Hoy. */
export function FilaTarea({ tarea, onAbrir, abierta }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const ramos = useStore((s) => s.ramos)
  const alternar = useStore((s) => s.alternarTareaPlan)

  const ramo = nombreRamo(tarea.ramoId, ramos)
  const fecha = tarea.fecha ? etiquetaFecha(tarea.fecha, tarea.hecha) : null
  const { hechas, total } = progresoSubtareas(tarea)
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'

  const titulo = (
    <span
      className={`text-sm font-medium break-words text-left ${
        tarea.hecha ? `line-through ${suave}` : modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
      }`}
    >
      {tarea.titulo}
    </span>
  )

  return (
    <div className="flex items-start gap-3 py-2.5">
      <button
        role="checkbox"
        aria-checked={tarea.hecha}
        aria-label={`${tarea.hecha ? 'Marcar como pendiente' : 'Marcar como hecha'}: ${tarea.titulo}`}
        onClick={() => alternar(tarea.id)}
        className="sin-tactil relative mt-0.5 w-[22px] h-[22px] min-w-0 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors before:content-[''] before:absolute before:-inset-2.5"
        style={
          tarea.hecha
            ? { background: 'var(--accent-base)', borderColor: 'var(--accent-base)' }
            : { borderColor: modoOscuro ? '#52525b' : '#a1a1aa' }
        }
      >
        {tarea.hecha && <i className="ti ti-check text-xs text-white animate-[pop_0.3s_ease-out]" aria-hidden="true" />}
      </button>

      <div className="flex-1 min-w-0">
        {onAbrir ? (
          <button onClick={onAbrir} aria-expanded={abierta} className="block w-full text-left min-h-[24px]">
            {titulo}
          </button>
        ) : (
          titulo
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {ramo && (
            <span className={`inline-flex items-center gap-1.5 text-xs ${suave}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: colorRamo(tarea.ramoId, ramos) }} aria-hidden="true" />
              {ramo}
            </span>
          )}
          {fecha && (
            <span
              className={`text-xs font-medium ${
                fecha.tono === 'vencida' ? 'text-red-600' : fecha.tono === 'hoy' ? '' : suave
              }`}
              style={fecha.tono === 'hoy' ? { color: 'var(--accent-texto)' } : undefined}
            >
              {fecha.texto}
            </span>
          )}
          {(tarea.minutosEnfocados ?? 0) > 0 && (
            <span className={`text-xs ${suave}`} title="Tiempo de enfoque dedicado a esta tarea">
              <i className="ti ti-hourglass-high text-[11px] mr-0.5" aria-hidden="true" />
              {horasMin(tarea.minutosEnfocados ?? 0)}
            </span>
          )}
          {total > 0 && (
            <span className={`text-xs ${suave}`}>
              <i className="ti ti-list-check text-[11px] mr-0.5" aria-hidden="true" />
              {hechas}/{total}
            </span>
          )}
        </div>
      </div>

      {tarea.prioridad !== 'baja' && !tarea.hecha && (
        <span
          className="mt-2 w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: COLOR_PRIORIDAD[tarea.prioridad] }}
          title={`Prioridad ${tarea.prioridad}`}
        >
          <span className="sr-only">Prioridad {tarea.prioridad}</span>
        </span>
      )}
    </div>
  )
}

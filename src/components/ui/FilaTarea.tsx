import { useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { avisar } from '../../store/useAvisos'
import type { TareaPlan } from '../../types'
import { colorRamo, ETIQUETA_PRIORIDAD, etiquetaFecha, mananaISO, nombreRamo, progresoSubtareas } from '../../services/tareasPlan'
import { horasMin } from '../../services/enfoque'
import { celebrar } from '../../services/celebrar'

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
  const actualizar = useStore((s) => s.actualizarTareaPlan)
  const refCasilla = useRef<HTMLButtonElement>(null)

  // En el celular la fila se desliza: a la derecha la completa (o la reabre), a la izquierda la pasa a mañana.
  // Con mouse no hay gesto: ahí están la casilla y el editor de siempre.
  const tactil = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches, [])
  const x = useMotionValue(0)
  const [moviendo, setMoviendo] = useState(false)
  const opHecha = useTransform(x, [0, 40, 90], [0, 0.5, 1])
  const opManana = useTransform(x, [0, -40, -90], [0, 0.5, 1])
  const UMBRAL = 90
  const vibrar = () => {
    try {
      navigator.vibrate?.(12)
    } catch {
      /* sin vibración */
    }
  }
  const alternarConFiesta = () => {
    if (!tarea.hecha) celebrar(refCasilla.current)
    alternar(tarea.id)
  }
  const pasarAManana = () => {
    const antes = tarea.fecha
    actualizar(tarea.id, { fecha: mananaISO() })
    avisar.conDeshacer('Tarea pasada a mañana', () => actualizar(tarea.id, { fecha: antes }))
  }

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

  const fila = (
    <div className="flex items-start gap-3 py-2.5">
      <button
        ref={refCasilla}
        role="checkbox"
        aria-checked={tarea.hecha}
        aria-label={`${tarea.hecha ? 'Marcar como pendiente' : 'Marcar como hecha'}: ${tarea.titulo}`}
        onClick={(ev) => {
          if (!tarea.hecha) celebrar(ev.currentTarget)
          alternar(tarea.id)
        }}
        className="sin-tactil relative mt-0.5 w-[26px] h-[26px] min-w-0 rounded-[9px] flex items-center justify-center flex-shrink-0 transition-shadow before:content-[''] before:absolute before:-inset-2.5"
        style={{ background: 'var(--neu-bg)', boxShadow: tarea.hecha ? 'var(--neu-presionada-chica)' : 'var(--neu-chica)' }}
      >
        {tarea.hecha && <i className="ti ti-check text-sm animate-[pop_0.3s_ease-out]" style={{ color: 'var(--neu-ok)' }} aria-hidden="true" />}
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
            <span
              className="inline-flex items-center text-[11.5px] font-bold px-2.5 py-0.5 rounded-full"
              style={{
                background: `color-mix(in srgb, ${colorRamo(tarea.ramoId, ramos)} 15%, transparent)`,
                color: `color-mix(in srgb, ${colorRamo(tarea.ramoId, ramos)} var(--chip-mezcla), var(--neu-ink))`,
              }}
            >
              {ramo}
            </span>
          )}
          {fecha && (
            <span
              className={`text-xs font-medium ${
                fecha.tono === 'vencida' ? 'text-[var(--neu-danger)]' : fecha.tono === 'hoy' ? '' : suave
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

      {!tarea.hecha && (
        <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] flex-shrink-0" style={{ color: 'var(--neu-ink2)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: COLOR_PRIORIDAD[tarea.prioridad] }} aria-hidden="true" />
          {ETIQUETA_PRIORIDAD[tarea.prioridad]}
          <span className="sr-only"> (prioridad)</span>
        </span>
      )}
    </div>
  )

  if (!tactil) return fila

  return (
    <div className="relative overflow-hidden">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-start gap-2 pl-4 text-sm font-bold text-white"
        style={{ opacity: opHecha, background: 'var(--neu-ok)' }}
      >
        <i className={`ti ${tarea.hecha ? 'ti-arrow-back-up' : 'ti-check'} text-lg`} />
        {tarea.hecha ? 'Reabrir' : 'Hecha'}
      </motion.div>
      {!tarea.hecha && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-end gap-2 pr-4 text-sm font-bold text-white"
          style={{ opacity: opManana, background: 'var(--neu-warn)' }}
        >
          Mañana
          <i className="ti ti-calendar-event text-lg" />
        </motion.div>
      )}
      <motion.div
        drag="x"
        className="relative"
        dragDirectionLock
        dragMomentum={false}
        style={{ x, background: moviendo ? 'var(--neu-card)' : 'transparent' }}
        onDragStart={() => setMoviendo(true)}
        onDrag={() => {
          // la fila va con el dedo, con un poco de resistencia; una tarea hecha solo se puede reabrir (derecha)
          const dx = x.get()
          if (dx < 0 && tarea.hecha) x.set(dx * 0.1)
        }}
        onDragEnd={(_, info) => {
          setMoviendo(false)
          animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 })
          if (info.offset.x > UMBRAL || info.velocity.x > 700) {
            vibrar()
            alternarConFiesta()
          } else if (!tarea.hecha && (info.offset.x < -UMBRAL || info.velocity.x < -700)) {
            vibrar()
            pasarAManana()
          }
        }}
      >
        {fila}
      </motion.div>
    </div>
  )
}

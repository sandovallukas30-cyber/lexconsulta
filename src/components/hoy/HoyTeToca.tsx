import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { hoyTeToca, type ItemHoy } from '../../services/hoyTeToca'
import { hoyISO, nombreRamo } from '../../services/tareasPlan'
import { horasMin } from '../../services/enfoque'

/** «Hoy te toca»: lo que conviene estudiar hoy (simulacro de la próxima prueba, errores, tarjetas y artículos que
 *  vencen), con su tiempo estimado y un botón para empezar cada cosa. No aparece si no hay nada. */
export function HoyTeToca() {
  const academico = useStore((s) => s.academicoModulos)
  const colecciones = useStore((s) => s.colecciones)
  const repasoApuntes = useStore((s) => s.repasoApuntes)
  const erroresPrueba = useStore((s) => s.erroresPrueba)
  const ramos = useStore((s) => s.ramos)
  const irAPractica = useStore((s) => s.irAPractica)

  const items = useMemo(
    () =>
      hoyTeToca({
        academico,
        colecciones,
        repasoApuntes,
        erroresPrueba,
        nombreRamo: (id) => nombreRamo(id, ramos) ?? 'Asignatura',
        hoy: hoyISO(),
        ahora: Date.now(),
      }),
    [academico, colecciones, repasoApuntes, erroresPrueba, ramos]
  )
  if (items.length === 0) return null
  const total = items.reduce((n, i) => n + i.minutos, 0)

  return (
    <section className="neu-raised p-4 sm:p-5" aria-label="Hoy te toca">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-[18px] font-bold flex-1" style={{ color: 'var(--neu-ink)', fontFamily: 'var(--font-head)' }}>Hoy te toca</h2>
        <span className="text-xs font-semibold" style={{ color: 'var(--neu-ink2)' }}>≈ {horasMin(total)}</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((it: ItemHoy) => (
          <li key={it.id}>
            <button
              onClick={() => irAPractica(it.accion)}
              className="w-full flex items-center gap-3 p-3 rounded-control text-left min-h-[56px] transition-colors hover:brightness-[0.97]"
              style={{ background: 'var(--neu-bg)' }}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--neu-card)', color: 'var(--accent-texto)' }}>
                <i className={`ti ${it.icono} text-lg`} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold" style={{ color: 'var(--neu-ink)' }}>{it.titulo}</span>
                <span className="block text-xs line-clamp-2" style={{ color: 'var(--neu-ink2)' }}>{it.detalle}</span>
              </span>
              <span className="text-xs font-semibold flex-shrink-0 tabular-nums" style={{ color: 'var(--neu-ink2)' }}>{it.minutos} min</span>
              <i className="ti ti-chevron-right flex-shrink-0" style={{ color: 'var(--neu-ink3)' }} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

import { useStore } from '../../store/useStore'
import { useEsMovil } from '../../hooks/useEsMovil'
import { precargarVista } from '../../vistas'
import type { VistaId } from '../../types'

const DESTINOS: { id: VistaId; icono: string; etiqueta: string }[] = [
  { id: 'hoy', icono: 'ti-sun', etiqueta: 'Hoy' },
  { id: 'tareas', icono: 'ti-checkbox', etiqueta: 'Tareas' },
  { id: 'enfoque', icono: 'ti-hourglass-high', etiqueta: 'Enfoque' },
  { id: 'explorador', icono: 'ti-book-2', etiqueta: 'Explorar' },
]

/** Navegación inferior en teléfonos y tablets en vertical (donde el menú lateral no cabe): los cuatro destinos
 *  más usados y «Más», que abre el menú completo. Todos con área táctil de 44 px o más. */
export function BarraInferior() {
  const esMovil = useEsMovil()
  const vistaActiva = useStore((s) => s.vistaActiva)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const setMenuMovilAbierto = useStore((s) => s.setMenuMovilAbierto)
  if (!esMovil) return null

  const claseBase = 'flex-1 min-w-0 min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-[13px] font-semibold transition-colors'
  return (
    <nav
      aria-label="Navegación principal"
      className="flex-shrink-0 flex items-stretch border-t"
      style={{ background: 'var(--neu-card)', borderColor: 'var(--neu-line)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {DESTINOS.map((d) => {
        const activo = vistaActiva === d.id
        return (
          <button
            key={d.id}
            onClick={() => setVistaActiva(d.id)}
            onPointerEnter={() => precargarVista(d.id)}
            aria-current={activo ? 'page' : undefined}
            className={claseBase}
            style={{ color: activo ? 'var(--accent-texto)' : 'var(--neu-ink2)' }}
          >
            <i className={`ti ${d.icono} text-[22px]`} aria-hidden="true" />
            <span className="truncate max-w-full px-1">{d.etiqueta}</span>
          </button>
        )
      })}
      <button onClick={() => setMenuMovilAbierto(true)} className={claseBase} style={{ color: 'var(--neu-ink2)' }} aria-haspopup="dialog">
        <i className="ti ti-menu-2 text-[22px]" aria-hidden="true" />
        <span>Más</span>
      </button>
    </nav>
  )
}

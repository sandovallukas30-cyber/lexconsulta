import { useEnfoque, msMostrados } from '../../store/useEnfoque'
import { useAhora } from '../../hooks/useMotorEnfoque'
import { mmss } from '../../services/enfoque'

/** El temporizador en marcha o en pausa se ve junto a «Enfoque» en el menú lateral (antes era un chip flotante
 *  arriba a la derecha que tapaba la barra de herramientas del lector). Colapsado, queda un punto de color. */
export function EnfoqueEnMenu({ colapsado }: { colapsado: boolean }) {
  const s = useEnfoque()
  const corriendo = s.estado === 'corriendo'
  const ahora = useAhora(corriendo)
  if (s.estado === 'detenido') return null
  const tiempo = mmss(msMostrados(s, ahora))
  const etiqueta = `${corriendo ? 'En marcha' : 'En pausa'}: ${tiempo}`
  if (colapsado) {
    return (
      <span
        role="img"
        aria-label={etiqueta}
        title={etiqueta}
        className={`absolute top-2 right-3 w-2.5 h-2.5 rounded-full ${corriendo ? 'animate-pulse' : ''}`}
        style={{ background: 'var(--accent-base)' }}
      />
    )
  }
  return (
    <span
      title={etiqueta}
      className="ml-auto text-[12px] font-bold tabular-nums px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: 'color-mix(in srgb, var(--accent-base) 14%, transparent)', color: 'var(--accent-texto)' }}
    >
      <span className="sr-only">{corriendo ? 'En marcha' : 'En pausa'} </span>
      {tiempo}
    </span>
  )
}

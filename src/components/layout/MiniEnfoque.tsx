import { useStore } from '../../store/useStore'
import { useEnfoque, esFlow, msMostrados } from '../../store/useEnfoque'
import { useAhora } from '../../hooks/useMotorEnfoque'
import { mmss, NOMBRE_MODO } from '../../services/enfoque'

/** Píldora de la barra superior con el tiempo del temporizador mientras hay uno
 *  en marcha o en pausa, para verlo y volver a él desde cualquier sección. */
export function MiniEnfoque() {
  const estado = useEnfoque((s) => s.estado)
  const s = useEnfoque()
  const vistaActiva = useStore((st) => st.vistaActiva)
  const setVistaActiva = useStore((st) => st.setVistaActiva)
  const corriendo = estado === 'corriendo'
  const ahora = useAhora(corriendo)
  if (estado === 'detenido' || vistaActiva === 'enfoque') return null
  const color = s.modo === 'foco' ? 'var(--accent-base)' : '#16a34a'
  return (
    <button
      onClick={() => setVistaActiva('enfoque')}
      title="Ir a Enfoque"
      aria-label={`${esFlow(s) ? 'Flowtime' : NOMBRE_MODO[s.modo]} ${corriendo ? 'en marcha' : 'en pausa'}: ${mmss(msMostrados(s, ahora))}. Ir a Enfoque`}
      className="boton boton-borde gap-2 font-semibold tabular-nums"
    >
      <span className={`w-2 h-2 rounded-full ${corriendo ? 'animate-pulse' : ''}`} style={{ background: color }} aria-hidden="true" />
      {mmss(msMostrados(s, ahora))}
    </button>
  )
}

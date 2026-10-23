import { useEffect } from 'react'
import { useAjustes } from '../../store/useAjustes'

export const esPantallaTactil = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

/** Aviso breve, una sola vez por dispositivo, que enseña un gesto que no se ve a simple vista (deslizar un artículo, una
 *  tarea o una tarjeta). Se cierra solo, al tocarlo o al marcarlo como visto. Con `activa` en false no aparece ni cuenta
 *  como visto (p. ej. en computador, donde el gesto no existe). */
export function PistaGesto({ id, texto, activa = true }: { id: string; texto: string; activa?: boolean }) {
  const vista = useAjustes((s) => s.pistasVistas.includes(id))
  const mostrar = activa && !vista

  const marcarVista = () => {
    const s = useAjustes.getState()
    if (!s.pistasVistas.includes(id)) s.set({ pistasVistas: [...s.pistasVistas, id] })
  }

  useEffect(() => {
    if (!mostrar) return
    const t = setTimeout(marcarVista, 9000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrar])

  if (!mostrar) return null
  return (
    <div className="fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 9.5rem)' }}>
      <button
        type="button"
        onClick={marcarVista}
        className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-xl max-w-sm text-left"
        style={{ background: 'var(--neu-card)', borderColor: 'var(--neu-line)', color: 'var(--neu-ink)' }}
      >
        <i className="ti ti-bulb text-lg flex-shrink-0" style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
        <span>{texto}</span>
        <i className="ti ti-x text-sm flex-shrink-0 opacity-60" aria-label="Entendido" />
      </button>
    </div>
  )
}

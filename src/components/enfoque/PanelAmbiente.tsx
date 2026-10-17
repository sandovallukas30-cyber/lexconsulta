import { useState } from 'react'
import { useEnfoqueLocal } from '../../store/useEnfoqueLocal'
import { SONIDOS } from '../../services/ambiente'
import { Interruptor } from '../ui/AjustesInterfaz'
import { SelectorFondo } from './FondoEnfoque'

/** Sonido ambiente del enfoque: suena mientras corre un enfoque y no se corta
 *  al cambiar de pantalla. (El fondo animado se elige en el modo concentración.) */
export function PanelAmbiente() {
  const sonido = useEnfoqueLocal((s) => s.sonido)
  const volumen = useEnfoqueLocal((s) => s.volumen)
  const soloEnfocando = useEnfoqueLocal((s) => s.soloEnfocando)
  const set = useEnfoqueLocal((s) => s.set)
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="w-full max-w-md mt-3">
      <button onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="text-xs font-semibold flex items-center gap-1 mx-auto" style={{ color: 'var(--neu-ink2)' }}>
        <i className={`ti ti-chevron-right transition-transform ${abierto ? 'rotate-90' : ''}`} aria-hidden="true" />
        Fondo y sonido{sonido !== 'apagado' ? ` · ${SONIDOS.find(([id]) => id === sonido)?.[1] ?? ''}` : ''}
      </button>
      {abierto && (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-center" style={{ color: 'var(--neu-ink3)' }}>Fondo (se ve en el modo concentración)</p>
          <SelectorFondo />
          <p className="text-[11px] font-bold uppercase tracking-wide text-center pt-1" style={{ color: 'var(--neu-ink3)' }}>Sonido</p>
          <div className="flex flex-wrap gap-1.5 justify-center" role="group" aria-label="Sonido ambiente">
            {SONIDOS.map(([id, nombre]) => (
              <button
                key={id}
                aria-pressed={sonido === id}
                onClick={() => set({ sonido: id })}
                className={`boton boton-chico ${sonido === id ? 'boton-primario' : 'boton-suave'}`}
              >
                {nombre}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-xs font-semibold" style={{ color: 'var(--neu-ink2)' }}>
            <i className="ti ti-volume" aria-hidden="true" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volumen}
              disabled={sonido === 'apagado'}
              onChange={(e) => set({ volumen: Number(e.target.value) })}
              aria-label="Volumen del sonido ambiente"
              className="flex-1"
            />
            <span className="tabular-nums w-9 text-right">{Math.round(volumen * 100)} %</span>
          </label>
          <Interruptor
            activo={soloEnfocando}
            onChange={(v) => set({ soloEnfocando: v })}
            etiqueta="Solo mientras estoy enfocando"
            descripcion="Se silencia en los descansos y cuando pausas el reloj."
          />
        </div>
      )}
    </div>
  )
}

import { useEnfoque, esFlow, msEnfocados, msMostrados } from '../../store/useEnfoque'
import { useStore } from '../../store/useStore'
import { useAhora } from '../../hooks/useMotorEnfoque'
import { mmss, NOMBRE_MODO } from '../../services/enfoque'
import { CalificarSesion } from '../ui/CalificarSesion'
import { SelectorRamo } from '../ui/SelectorRamo'

/** Temporizador pequeño: hora, progreso y controles. Lo usa la sala de estudio. */
export function PomodoroCompacto({ selectores = true, variante = 'vertical', grande = false }: { selectores?: boolean; variante?: 'vertical' | 'horizontal' | 'pildora'; grande?: boolean }) {
  const s = useEnfoque()
  const tareas = useStore((st) => st.tareasPlan)
  const corriendo = s.estado === 'corriendo'
  const ahora = useAhora(corriendo, 500)
  const flow = esFlow(s)
  const ms = msMostrados(s, ahora)
  const bloque = Math.max(60_000, s.ajustes.foco * 60_000)
  const avance = flow ? (ms % bloque) / bloque : s.totalMs ? 1 - ms / s.totalMs : 0
  const puedeTerminar = s.modo === 'foco' && s.inicioSesion !== null && msEnfocados(s, ahora) >= 60_000
  const etiqueta = s.modo === 'foco' ? (flow ? 'Flowtime' : 'Enfoque') : NOMBRE_MODO[s.modo]
  const pendientes = tareas.filter((t) => !t.hecha && (!s.ramoId || !t.ramoId || t.ramoId === s.ramoId))
  const textoJugar = corriendo ? 'Pausar' : s.estado === 'pausado' || (s.inicioSesion !== null && s.modo === 'foco') ? 'Reanudar' : 'Iniciar'

  const jugar = (
    <button onClick={corriendo ? s.pausar : s.iniciar} className="boton boton-primario px-5">
      <i className={`ti ${corriendo ? 'ti-player-pause' : 'ti-player-play'}`} aria-hidden="true" /> {textoJugar}
    </button>
  )
  const barra = (
    <div
      className="h-2 rounded-full overflow-hidden w-full"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(avance * 100)}
      aria-label="Avance del temporizador"
    >
      <i className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, avance)) * 100}%`, background: 'var(--accent-base)' }} />
    </div>
  )

  if (variante === 'pildora') {
    return (
      <div className={`neu-chip inline-flex items-center gap-2 pl-3 pr-1.5 ${grande ? 'py-1.5' : 'py-1'}`} role="group" aria-label="Temporizador">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--neu-ink3)' }}>{etiqueta}</span>
        <span className={`${grande ? 'text-3xl' : 'text-sm'} font-extrabold tabular-nums`} style={{ color: 'var(--neu-ink)' }}>{mmss(ms)}</span>
        <button onClick={corriendo ? s.pausar : s.iniciar} className={`boton ${grande ? 'boton-primario' : 'boton-suave boton-chico'} boton-icono`} aria-label={corriendo ? 'Pausar' : 'Iniciar'}>
          <i className={`ti ${corriendo ? 'ti-player-pause' : 'ti-player-play'}`} aria-hidden="true" />
        </button>
      </div>
    )
  }

  const botones = (
    <>
    <div className="flex items-center justify-center gap-2 flex-wrap">
      <button onClick={s.reiniciar} className="boton boton-suave boton-icono" aria-label="Reiniciar" title="Reiniciar: descarta lo avanzado">
        <i className="ti ti-rotate" aria-hidden="true" />
      </button>
      {jugar}
      {s.modo !== 'foco' ? (
        <button onClick={s.saltarDescanso} className="boton boton-suave boton-icono" aria-label="Saltar el descanso" title="Saltar el descanso">
          <i className="ti ti-player-skip-forward" aria-hidden="true" />
        </button>
      ) : (
        <button onClick={s.terminar} disabled={!puedeTerminar} className="boton boton-suave boton-chico" title={puedeTerminar ? 'Guarda lo que llevas' : 'Necesitas al menos un minuto'}>
          <i className="ti ti-flag" aria-hidden="true" /> Guardar
        </button>
      )}
    </div>
    {s.modo === 'foco' && s.inicioSesion !== null && !puedeTerminar && (
      <p className="text-[11px] text-center w-full" style={{ color: 'var(--neu-ink2)' }}>Para guardar hace falta al menos 1 minuto enfocado.</p>
    )}
    </>
  )

  if (variante === 'horizontal') {
    return (
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--neu-ink3)' }}>{etiqueta}</span>
          <span className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--neu-ink)' }}>{mmss(ms)}</span>
        </div>
        <div className="flex-1 min-w-[120px]">{barra}</div>
        {botones}
        {selectores && <SelectorRamo valor={s.ramoId} onChange={(v) => s.setObjetivo(v, null)} className="h-control px-3 text-sm" etiqueta="Ramo de la sesión" />}
        <CalificarSesion />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--neu-ink3)' }}>{etiqueta}</span>
      <span className="text-5xl font-extrabold tabular-nums" style={{ color: 'var(--neu-ink)' }} aria-live="off">{mmss(ms)}</span>
      {barra}
      {botones}
      {s.modo === 'foco' && s.inicioSesion !== null && (
        <button onClick={s.distraje} className="boton boton-fantasma boton-chico">
          <i className="ti ti-bolt" aria-hidden="true" /> Me distraje{s.distracciones > 0 ? ` · ${s.distracciones}` : ''}
        </button>
      )}
      {selectores && (
        <div className="w-full space-y-2">
          <SelectorRamo valor={s.ramoId} onChange={(v) => s.setObjetivo(v, v === s.ramoId ? s.tareaId : null)} className="w-full h-control px-3 text-sm" etiqueta="Ramo de la sesión" />
          <select
            value={s.tareaId ?? ''}
            onChange={(ev) => {
              const t = tareas.find((x) => x.id === ev.target.value)
              s.setObjetivo(t?.ramoId ?? s.ramoId, t?.id ?? null)
            }}
            aria-label="Tarea en la que trabajas"
            className="w-full h-control px-3 text-sm"
          >
            <option value="">Sin tarea</option>
            {pendientes.map((t) => (
              <option key={t.id} value={t.id}>{t.titulo}</option>
            ))}
          </select>
        </div>
      )}
      <div className="w-full"><CalificarSesion /></div>
    </div>
  )
}

import { useMemo } from 'react'
import type { RegistroPrueba } from '../../types'
import { NOMBRE_TIPO_PRUEBA, pendientes, resumenPorTipo, type FiltroRegistro } from '../../services/registroPrueba'
import { confirmar } from '../../services/confirmar'

/** «Tus errores»: en qué tipo de pregunta te equivocas más y cuántas siguen mal. Deja practicar solo eso. */
export function PanelErroresPrueba({
  registro, filtro, modo, onPracticar, onBorrar,
}: {
  registro: Record<string, RegistroPrueba>
  filtro: FiltroRegistro
  modo: 'alternativas' | 'desarrollo'
  onPracticar: () => void
  onBorrar: () => void
}) {
  const resumen = useMemo(() => resumenPorTipo(registro, filtro), [registro, filtro])
  const pend = useMemo(() => pendientes(registro, filtro).filter(([, r]) => (modo === 'desarrollo') === (r.tipo === 'desarrollo')), [registro, filtro, modo])
  if (resumen.length === 0) return null
  const suave = { color: 'var(--neu-ink2)' }

  return (
    <section className="neu-raised p-5 space-y-3" aria-label="Tus errores">
      <h2 className="text-[17px] font-bold" style={{ color: 'var(--neu-ink)', fontFamily: 'var(--font-head)' }}>Tus errores</h2>
      <ul className="space-y-1.5">
        {resumen.map((r) => {
          const total = r.aciertos + r.fallos
          const pct = Math.round((r.fallos / Math.max(1, total)) * 100)
          return (
            <li key={r.tipo} className="flex items-center gap-3 text-sm">
              <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--neu-ink)' }}>{NOMBRE_TIPO_PRUEBA[r.tipo]}</span>
              <span className="flex-shrink-0 font-semibold" style={{ color: pct >= 50 ? 'var(--texto-mal)' : 'var(--neu-ink2)' }}>
                {r.fallos} de {total} mal
              </span>
              {r.pendientes > 0 && <span className="flex-shrink-0 text-xs" style={suave}>{r.pendientes} {r.pendientes === 1 ? 'pendiente' : 'pendientes'}</span>}
            </li>
          )
        })}
      </ul>
      <div className="flex gap-2 flex-wrap">
        <button onClick={onPracticar} disabled={pend.length === 0} className="boton boton-primario flex-1">
          {pend.length > 0 ? `Practicar lo que sigo fallando (${pend.length})` : modo === 'desarrollo' ? 'No quedan temas de desarrollo pendientes' : 'No quedan preguntas pendientes'}
        </button>
        <button
          onClick={() =>
            void confirmar({ titulo: '¿Borrar el registro de errores?', mensaje: 'Se borra el historial de aciertos y fallos del modo prueba. Tus apuntes y tarjetas no se tocan.', etiquetaConfirmar: 'Borrar', peligro: true }).then((ok) => {
              if (ok) onBorrar()
            })
          }
          className="boton boton-fantasma"
        >
          Borrar registro
        </button>
      </div>
    </section>
  )
}

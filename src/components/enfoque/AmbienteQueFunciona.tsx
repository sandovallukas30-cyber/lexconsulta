import { useMemo } from 'react'
import { useEnfoque } from '../../store/useEnfoque'
import { ambienteQueFunciona, MIN_AMBIENTE, type FilaAmbiente } from '../../services/enfoqueStats'
import { FONDOS } from '../../services/fondos'
import { SONIDOS } from '../../services/ambiente'

const dec = (n: number) => n.toFixed(1).replace('.', ',')

function Tabla({ titulo, filas, nombre }: { titulo: string; filas: FilaAmbiente[]; nombre: (c: string) => string }) {
  if (filas.length === 0) return null
  return (
    <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--neu-ink3)' }}>{titulo}</p>
      {filas.map((f, i) => (
        <div key={f.clave} className="flex items-center gap-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>
              {nombre(f.clave)}
              {i === 0 && filas.length > 1 ? ' · el mejor' : ''}
            </p>
            <p className="text-xs" style={{ color: 'var(--neu-ink2)' }}>
              {f.n} sesiones · {Math.round(f.minutos)} min en promedio · {dec(f.distracciones)} distracciones por sesión
            </p>
          </div>
          <span className="neu-chip px-3 py-1 text-xs font-bold tabular-nums" style={{ color: 'var(--neu-ink)' }}>{dec(f.calidad)} / 5</span>
        </div>
      ))}
    </div>
  )
}

/** Con tus propias sesiones calificadas: con qué fondo y con qué sonido te concentras mejor. */
export function AmbienteQueFunciona() {
  const sesiones = useEnfoque((s) => s.sesiones)
  const d = useMemo(() => ambienteQueFunciona(sesiones), [sesiones])
  const nombreFondo = (c: string) => FONDOS.find((f) => f.id === c)?.nombre ?? c
  const nombreSonido = (c: string) => SONIDOS.find(([id]) => id === c)?.[1] ?? c
  const mejor = d.fondos[0]
  const frase =
    mejor && d.base !== null && mejor.calidad > d.base + 0.2
      ? `Con «${nombreFondo(mejor.clave)}» te concentras más: ${dec(mejor.calidad)} de 5 frente a ${dec(d.base)} sin fondo.`
      : mejor
      ? `Hasta ahora «${nombreFondo(mejor.clave)}» es el fondo con mejor concentración (${dec(mejor.calidad)} de 5).`
      : null
  return (
    <section className="neu-raised p-5">
      <h2 className="text-[15px] font-bold mb-2" style={{ color: 'var(--neu-ink)' }}>
        <i className="ti ti-sparkles mr-2" style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
        Qué ambiente te funciona
      </h2>
      {d.fondos.length === 0 && d.sonidos.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>
          Califica tus sesiones trabajando con distintos fondos y sonidos. Necesito al menos {MIN_AMBIENTE} de cada uno para compararlos; llevas {d.calificadas} calificadas.
        </p>
      ) : (
        <>
          {frase && <p className="text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>{frase}</p>}
          <Tabla titulo="Por fondo" filas={d.fondos} nombre={nombreFondo} />
          <Tabla titulo="Por sonido" filas={d.sonidos} nombre={nombreSonido} />
        </>
      )}
    </section>
  )
}

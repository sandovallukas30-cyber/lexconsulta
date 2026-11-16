import { useRef, useState } from 'react'
import { evaluarRespuesta, UMBRAL_LOGRADO, type PreguntaDesarrollo } from '../../services/desarrollo'

/** Una pregunta de desarrollo: escribes la respuesta, la app marca qué puntos clave de tu apunte aparecieron y tú
 *  corriges lo que no entendió (tocando cada punto). Al terminar entrega los puntos cubiertos. */
export function DesarrolloPregunta({
  pregunta, esUltima, onTerminar,
}: {
  pregunta: PreguntaDesarrollo
  esUltima: boolean
  onTerminar: (cubiertos: boolean[]) => void
}) {
  const [texto, setTexto] = useState('')
  const [cubiertos, setCubiertos] = useState<boolean[] | null>(null)
  const suave = { color: 'var(--neu-ink2)' }

  const refResultado = useRef<HTMLDivElement>(null)
  const revisar = () => {
    setCubiertos(evaluarRespuesta(texto, pregunta.puntos).cubiertos)
    window.setTimeout(() => refResultado.current?.focus(), 30)
  }
  const alternar = (i: number) => setCubiertos((c) => c && c.map((x, k) => (k === i ? !x : x)))
  const hechos = cubiertos?.filter(Boolean).length ?? 0
  const porcentaje = cubiertos ? hechos / pregunta.puntos.length : 0

  return (
    <section className="neu-raised p-5 sm:p-6 space-y-4" aria-label="Pregunta de desarrollo">
      <p className="text-[17px] font-semibold leading-snug" style={{ color: 'var(--neu-ink)' }}>{pregunta.enunciado}</p>

      {!cubiertos ? (
        <>
          <label className="block">
            <span className="sr-only">Tu respuesta</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={9}
              placeholder="Escribe tu respuesta como en la prueba: plazos, quórums, requisitos, diferencias…"
              className="w-full rounded-control p-3 text-[15px] leading-snug border outline-none campo-foco bg-[var(--neu-bg)] border-zinc-200 text-[var(--neu-ink)]"
            />
          </label>
          <div className="flex gap-2 flex-wrap">
            <button onClick={revisar} disabled={texto.trim().length < 5} className="boton boton-primario flex-1">
              Revisar mi respuesta
            </button>
            <button onClick={revisar} className="boton boton-suave" title="Ver la pauta sin responder (cuenta como no logrado)">
              No sé
            </button>
          </div>
        </>
      ) : (
        <>
          <div aria-live="polite" ref={refResultado} tabIndex={-1} className="outline-none">
            <p className="text-sm font-bold" style={{ color: porcentaje >= UMBRAL_LOGRADO ? 'var(--texto-ok)' : 'var(--texto-mal)' }}>
              {hechos} de {pregunta.puntos.length} puntos clave · {porcentaje >= UMBRAL_LOGRADO ? 'Logrado' : 'Por reforzar'}
            </p>
            <p className="text-xs mt-0.5" style={suave}>
              La app los busca en tu texto. Cada punto es un botón: presionado = lo dijiste; si se equivocó, tócalo para corregirlo.
            </p>
          </div>
          <ul className="space-y-1.5" aria-label="Puntos clave">
            {pregunta.puntos.map((p, i) => (
              <li key={`${p.texto}-${i}`}>
                <button
                  onClick={() => alternar(i)}
                  aria-pressed={cubiertos[i]}
                  className="w-full text-left flex gap-3 items-start p-2.5 rounded-control border-2 border-transparent min-h-[44px]"
                  style={cubiertos[i] ? { borderColor: 'var(--texto-ok)', background: 'rgba(5,150,105,0.1)' } : { borderColor: 'var(--texto-mal)', background: 'rgba(220,38,38,0.08)' }}
                >
                  <i className={`ti ${cubiertos[i] ? 'ti-check' : 'ti-x'} text-base mt-0.5 flex-shrink-0`} style={{ color: cubiertos[i] ? 'var(--texto-ok)' : 'var(--texto-mal)' }} aria-hidden="true" />
                  <span className="text-[15px] leading-snug" style={{ color: 'var(--neu-ink)' }}>
                    {p.texto}
                    {p.tipo === 'cantidad' && <span className="text-xs ml-2" style={suave}><span className="sr-only">, </span>plazo o quórum</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <details>
            <summary className="text-sm font-semibold cursor-pointer min-h-[44px] flex items-center" style={{ color: 'var(--accent-texto)' }}>
              Ver la pauta (tu apunte)
            </summary>
            <p className="text-sm leading-relaxed whitespace-pre-wrap mt-2" style={suave}>{pregunta.pauta}</p>
          </details>
          <button onClick={() => onTerminar(cubiertos)} className="boton boton-primario w-full">
            {esUltima ? 'Ver resultado' : 'Siguiente'}
          </button>
        </>
      )}
    </section>
  )
}

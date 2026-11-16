import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialogo } from '../../hooks/useDialogo'
import { compararRecitado } from '../../services/recitar'
import { registrarUso } from '../../services/uso'

/** Recitar de memoria: el texto queda oculto, escribes lo que recuerdas y la app lo compara con el original, marcando
 *  en verde lo que dijiste y en rojo lo que faltó (por palabras clave, sin exigir el mismo orden). */
export function RecitarMemoria({ titulo, texto, onCerrar }: { titulo: string; texto: string; onCerrar: () => void }) {
  const ref = useDialogo<HTMLDivElement>(true, onCerrar)
  const [recitado, setRecitado] = useState('')
  const [comparar, setComparar] = useState(false)
  const r = useMemo(() => (comparar ? compararRecitado(texto, recitado) : null), [comparar, texto, recitado])
  const suave = { color: 'var(--neu-ink2)' }
  const pct = r ? Math.round(r.porcentaje * 100) : 0
  const refResultado = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (comparar) refResultado.current?.focus()
  }, [comparar])

  const empezarDeNuevo = () => {
    setRecitado('')
    setComparar(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onCerrar}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recitar-titulo"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-2xl"
        style={{ background: 'var(--neu-card)', color: 'var(--neu-ink)' }}
      >
        <header className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 id="recitar-titulo" className="text-lg font-bold" style={{ fontFamily: 'var(--font-head)' }}>
              Recitar de memoria
            </h2>
            <p className="text-sm truncate" style={suave}>{titulo}</p>
          </div>
          <button onClick={onCerrar} className="boton boton-fantasma boton-chico boton-icono" aria-label="Cerrar">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </header>

        {!r ? (
          <>
            <p className="text-sm" style={suave}>
              El texto está oculto. Escribe lo que recuerdas, con tus palabras: la app busca las ideas, los plazos y los quórums, no el orden exacto.
            </p>
            <label className="block">
              <span className="sr-only">Lo que recuerdas</span>
              <textarea
                data-autofocus
                value={recitado}
                onChange={(e) => setRecitado(e.target.value)}
                rows={10}
                placeholder="Escribe aquí lo que recuerdas…"
                className="w-full rounded-control p-3 text-[15px] leading-snug border outline-none campo-foco bg-[var(--neu-bg)] border-zinc-200 text-[var(--neu-ink)]"
              />
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  registrarUso('practica.recitar')
                  setComparar(true)
                }}
                className="boton boton-primario flex-1"
              >
                {recitado.trim() ? 'Comparar con el original' : 'Ver el original (no me acuerdo)'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div ref={refResultado} tabIndex={-1} className="outline-none">
              <p className="text-3xl font-extrabold leading-none" style={{ color: pct >= 70 ? 'var(--texto-ok)' : 'var(--texto-mal)' }}>
                {pct} %
                <span className="text-base font-semibold ml-2" style={suave}>
                  {r.recordadas} de {r.total} ideas clave
                </span>
              </p>
            </div>
            <p className="text-xs" style={suave}>
              <span className="px-1 rounded" style={{ background: 'rgba(5,150,105,0.18)' }}>Verde</span> lo que dijiste ·{' '}
              <span className="px-1 rounded" style={{ background: 'rgba(220,38,38,0.18)' }}>Rojo</span> lo que faltó.
            </p>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap rounded-control p-3" style={{ background: 'var(--neu-bg)' }} aria-label="El original, con lo que dijiste en verde y lo que faltó en rojo y subrayado">
              {r.trozos.map((t, i) =>
                t.estado === 'neutro' ? (
                  <span key={i}>{t.texto}</span>
                ) : (
                  <span
                    key={i}
                    className="rounded px-0.5"
                    style={{ background: t.estado === 'ok' ? 'rgba(5,150,105,0.18)' : 'rgba(220,38,38,0.2)', textDecoration: t.estado === 'falta' ? 'underline' : undefined }}
                  >
                    {t.texto}
                  </span>
                ),
              )}
            </p>
            {r.faltaron.length > 0 && (
              <p className="text-sm" style={suave}>
                <strong style={{ color: 'var(--neu-ink)' }}>Te faltó:</strong> {r.faltaron.slice(0, 14).join(' · ')}
                {r.faltaron.length > 14 ? ` · y ${r.faltaron.length - 14} más` : ''}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={empezarDeNuevo} className="boton boton-primario flex-1">Intentar de nuevo</button>
              <button onClick={onCerrar} className="boton boton-suave flex-1">Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { colorRamo } from '../../services/tareasPlan'
import { formatoNota, NOTA_APROBAR, resumenNotas, type ResumenNotas } from '../../services/notas'

function chipEstado(r: ResumenNotas, modoOscuro: boolean): { texto: string; clase: string } {
  const verde = modoOscuro ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-700'
  const rojo = modoOscuro ? 'bg-red-500/15 text-red-400' : 'bg-red-500/10 text-red-700'
  const ambar = modoOscuro ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-500/10 text-amber-800'
  const neutro = modoOscuro ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
  switch (r.estado) {
    case 'asegurado':
      return { texto: 'Aprobado asegurado', clase: verde }
    case 'imposible':
      return { texto: 'No alcanza el 4,0', clase: rojo }
    case 'completo':
      return { texto: r.promedio !== null && r.promedio >= NOTA_APROBAR ? 'Aprobado' : 'Reprobado', clase: r.promedio !== null && r.promedio >= NOTA_APROBAR ? verde : rojo }
    case 'posible': {
      const n = r.necesaria ?? 0
      return { texto: `Necesitas ${formatoNota(n)}`, clase: n >= 6 ? rojo : n >= 5 ? ambar : neutro }
    }
    default:
      return { texto: 'Sin evaluaciones', clase: neutro }
  }
}

/** Mirada al semestre completo: promedio de cada ramo, cuánto te falta para
 *  aprobar y cuáles están en riesgo. Solo cuenta ramos con evaluaciones. */
export function ResumenSemestre({ onAbrirRamo }: { onAbrirRamo: (id: string) => void }) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const ramos = useStore((s) => s.ramos)
  const academico = useStore((s) => s.academicoModulos)

  const filas = useMemo(
    () =>
      ramos
        .map((r) => ({ ramo: r, notas: resumenNotas(academico[r.id]?.evaluaciones ?? []) }))
        .filter((f) => f.notas.estado !== 'sin-datos'),
    [ramos, academico]
  )
  if (filas.length === 0) return null

  const conPromedio = filas.filter((f) => f.notas.promedio !== null)
  const general = conPromedio.length > 0 ? conPromedio.reduce((a, f) => a + (f.notas.promedio as number), 0) / conPromedio.length : null
  const enRiesgo = filas.filter((f) => f.notas.estado === 'imposible' || (f.notas.estado === 'posible' && (f.notas.necesaria ?? 0) >= 6)).length
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'

  return (
    <section aria-labelledby="titulo-resumen-semestre">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 id="titulo-resumen-semestre" className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Mi semestre
        </h2>
        {general !== null && (
          <span className={`text-xs ${suave}`}>
            Promedio general <strong className={modoOscuro ? 'text-white' : 'text-zinc-900'}>{formatoNota(general)}</strong>
            {enRiesgo > 0 && <span className="text-red-600 font-medium"> · {enRiesgo} en riesgo</span>}
          </span>
        )}
      </div>
      <ul className={`rounded-tarjeta border divide-y shadow-tarjeta ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800 divide-zinc-800' : 'bg-white border-zinc-200 divide-zinc-100'}`}>
        {filas.map(({ ramo, notas }) => {
          const chip = chipEstado(notas, modoOscuro)
          return (
            <li key={ramo.id}>
              <button
                onClick={() => onAbrirRamo(ramo.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left ${modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
              >
                <span className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: colorRamo(ramo.id, ramos) }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium truncate ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{ramo.nombre}</span>
                  <span className={`block text-xs ${suave}`}>
                    {notas.pesoEvaluado}% evaluado
                    {notas.pesoSinCargar > 0 && ` · falta cargar ${notas.pesoSinCargar}%`}
                  </span>
                </span>
                <span className={`text-base font-bold tabular-nums flex-shrink-0 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                  {notas.promedio !== null ? formatoNota(notas.promedio) : '—'}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${chip.clase}`}>{chip.texto}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

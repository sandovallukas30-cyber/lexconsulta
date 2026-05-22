import { useStore } from '../../store/useStore'
import type { Jurisprudencia } from '../../types'

interface Props {
  jur: Jurisprudencia
}

export function JurBlock({ jur }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)

  return (
    <div
      className={`rounded-lg border p-4 ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-amber-50/40 border-amber-200/60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: modoOscuro ? '#78350f30' : '#fef3c7' }}
        >
          <i className="ti ti-gavel text-base" style={{ color: '#92400e' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${modoOscuro ? 'text-amber-200' : 'text-amber-900'}`}>
              {jur.organo}
            </span>
            <span className={`text-xs font-mono ${modoOscuro ? 'text-amber-400/70' : 'text-amber-700'}`}>
              {jur.referencia}
            </span>
          </div>
          <p className={`text-sm mt-1.5 leading-relaxed ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {jur.resumen}
          </p>
        </div>
      </div>
    </div>
  )
}

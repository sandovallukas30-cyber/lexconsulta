import type { Ramo, Modulo } from '../../types'

interface Props {
  ramo: Ramo
  modulos: Modulo[]
  modoOscuro: boolean
  onClick: () => void
}

export function RamoCard({ ramo, modulos, modoOscuro, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-colors ${
        modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className={`font-semibold text-sm ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{ramo.nombre}</h3>
        {ramo.semestre && (
          <span className={`text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0 ${modoOscuro ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
            {ramo.semestre}
          </span>
        )}
      </div>

      <div className={`text-xs space-y-0.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {ramo.codigoCurso && <div>{ramo.codigoCurso}</div>}
        {ramo.profesor && <div>{ramo.profesor}</div>}
        {ramo.horario && <div>{ramo.horario}{ramo.sala ? ` · ${ramo.sala}` : ''}</div>}
      </div>

      {modulos.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {modulos.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md"
              style={{ background: m.color + '20', color: m.color }}
            >
              <i className={`ti ${m.icono} text-xs`} />
              {m.nombre}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

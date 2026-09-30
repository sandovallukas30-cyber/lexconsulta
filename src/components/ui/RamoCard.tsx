import type { Ramo, Modulo } from '../../types'
import { ICONO_RAMO_DEFECTO } from '../../services/modulosAcademico'

const VERDE = 'var(--accent-base)'

interface Props {
  ramo: Ramo
  modulos: Modulo[]
  modoOscuro: boolean
  onClick: () => void
  onEditar: () => void
}

export function RamoCard({ ramo, modulos, modoOscuro, onClick, onEditar }: Props) {
  const color = ramo.color ?? VERDE
  const icono = ramo.icono ?? ICONO_RAMO_DEFECTO
  // Tarjeta y lápiz son botones HERMANOS: antes el lápiz era un
  // role="button" dentro del <button> de la tarjeta (interactivo anidado:
  // los lectores de pantalla no lo anuncian y axe lo marca como grave).
  return (
    <div className="group relative">
    <button
      onClick={onClick}
      className={`relative w-full h-full text-left p-4 rounded-xl border transition-colors ${
        modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
      }`}
    >

      <div className="flex items-start gap-3 mb-2 pr-6">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: color + '20' }}
        >
          <i className={`ti ${icono} text-base`} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold text-sm leading-tight ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{ramo.nombre}</h3>
            {ramo.semestre && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0 ${modoOscuro ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
                {ramo.semestre}
              </span>
            )}
          </div>
        </div>
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
    <button
      onClick={onEditar}
      title="Editar ramo"
      aria-label={`Editar ramo ${ramo.nombre}`}
      className="boton boton-fantasma boton-chico boton-icono absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
    >
      <i className="ti ti-pencil text-xs" aria-hidden />
    </button>
    </div>
  )
}

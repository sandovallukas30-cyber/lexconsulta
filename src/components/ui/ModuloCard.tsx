import { motion } from 'framer-motion'
import type { Modulo, ProgresoModulo } from '../../types'

interface ModuloCardProps {
  modulo: Modulo
  progreso: ProgresoModulo | undefined
  modoOscuro: boolean
  onClick: () => void
}

export function ModuloCard({ modulo, progreso, modoOscuro, onClick }: ModuloCardProps) {
  const porcentaje = progreso?.porcentajeDominio ?? 0
  const temasCompletados = progreso?.temasCompletados ?? 0

  return (
    <motion.button
      whileHover={{ translateY: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group w-full rounded-lg p-6 text-left transition-all overflow-hidden relative ${
        modoOscuro ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-white hover:bg-zinc-50'
      } border ${modoOscuro ? 'border-zinc-700' : 'border-zinc-200'} shadow-sm hover:shadow-md`}
    >
      {/* Fondo de progreso */}
      <div
        className="absolute inset-0 opacity-5 transition-all"
        style={{
          background: modulo.color,
          width: `${porcentaje}%`,
        }}
      />

      <div className="relative z-10">
        {/* Encabezado: Icono + Nombre */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: modulo.color + '20' }}
          >
            <i className={`ti ${modulo.icono} text-lg`} style={{ color: modulo.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm leading-tight ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              {modulo.nombre}
            </h3>
          </div>
        </div>

        {/* Descripción */}
        <p
          className={`text-xs leading-relaxed mb-4 line-clamp-2 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}
        >
          {modulo.descripcion}
        </p>

        {/* Barra de progreso */}
        <div className="mb-3">
          <div
            className={`h-2 rounded-full overflow-hidden ${modoOscuro ? 'bg-zinc-700' : 'bg-zinc-200'}`}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${porcentaje}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: modulo.color }}
            />
          </div>
        </div>

        {/* Estadísticas */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3 text-xs">
            <div className={`${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              <span className="font-medium" style={{ color: modulo.color }}>
                {temasCompletados}
              </span>
              /{modulo.temasIncluidos} temas
            </div>
            <div className={`${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              <span className="font-medium" style={{ color: modulo.color }}>
                {porcentaje}%
              </span>
              dominio
            </div>
          </div>
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 ${
              modoOscuro ? 'bg-zinc-700' : 'bg-zinc-100'
            }`}
            style={{ borderColor: modulo.color }}
          >
            <i className="ti ti-arrow-right text-[10px]" style={{ color: modulo.color }} />
          </div>
        </div>
      </div>
    </motion.button>
  )
}

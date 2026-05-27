import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { codigosCargados, obtenerCodigo } from '../../services/codigos'
import type { CodigoTipo } from '../../types'

const VERDE = '#0F6E56'

interface Props {
  titulo: string
  descripcion: string
  icono: string
  onElegir: (tipo: CodigoTipo) => void
}

export function SelectorCodigo({ titulo, descripcion, icono, onElegir }: Props) {
  const codigos = useStore((s) => s.codigos)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const cargados = codigosCargados()

  const lista = useMemo(() => {
    return codigos.map((c) => {
      const cargado = cargados.includes(c.tipo)
      const data = cargado ? obtenerCodigo(c.tipo) : null
      return {
        tipo: c.tipo,
        nombre: c.nombre,
        descripcion: c.descripcion,
        categoria: c.categoria,
        bloqueado: c.bloqueado,
        cargado,
        totalArts: data ? data.total_articulos + (data.total_transitorios ?? 0) : 0,
      }
    })
  }, [codigos, cargados])

  const disponibles = lista.filter((c) => c.cargado)
  const pendientes = lista.filter((c) => !c.cargado)
  // Dividir disponibles en dos secciones: códigos (incluye fundamentales,
  // sustantivos y procedimentales) vs. leyes especiales.
  const codigosDisponibles = disponibles.filter((c) => c.categoria !== 'especiales')
  const leyesEspeciales = disponibles.filter((c) => c.categoria === 'especiales')

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-10"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: modoOscuro ? '#0F6E5625' : '#0F6E5610' }}
          >
            <i className={`ti ${icono} text-3xl`} style={{ color: VERDE }} />
          </div>
          <h1 className={`text-3xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            {titulo}
          </h1>
          <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {descripcion}
          </p>
        </motion.div>

        {codigosDisponibles.length > 0 && (
          <section className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2
                className={`text-[11px] uppercase tracking-wider font-semibold ${
                  modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                Códigos ({codigosDisponibles.length})
              </h2>
              <span className={`text-[10px] ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                fundamentales, sustantivos y procedimentales
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {codigosDisponibles.map((c, i) => (
                <CodigoCard
                  key={c.tipo}
                  codigo={c}
                  onClick={() => onElegir(c.tipo)}
                  modoOscuro={modoOscuro}
                  delay={i * 0.03}
                />
              ))}
            </div>
          </section>
        )}

        {leyesEspeciales.length > 0 && (
          <section className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2
                className={`text-[11px] uppercase tracking-wider font-semibold ${
                  modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                Leyes especiales ({leyesEspeciales.length})
              </h2>
              <span className={`text-[10px] ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                normas que regulan materias específicas
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {leyesEspeciales.map((c, i) => (
                <CodigoCard
                  key={c.tipo}
                  codigo={c}
                  onClick={() => onElegir(c.tipo)}
                  modoOscuro={modoOscuro}
                  delay={i * 0.03}
                />
              ))}
            </div>
          </section>
        )}

        {pendientes.length > 0 && (
          <section>
            <h2
              className={`text-[11px] uppercase tracking-wider font-semibold mb-3 ${
                modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            >
              Próximamente ({pendientes.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {pendientes.map((c) => (
                <div
                  key={c.tipo}
                  className={`px-3 py-2.5 rounded-lg border opacity-40 ${
                    modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}
                >
                  <p className={`text-xs font-semibold ${modoOscuro ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {c.nombre}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    {c.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

interface CodigoCardProps {
  codigo: {
    tipo: CodigoTipo
    nombre: string
    descripcion: string
    categoria: string
    bloqueado?: boolean
    totalArts: number
  }
  onClick: () => void
  modoOscuro: boolean
  delay: number
}

function CodigoCard({ codigo, onClick, modoOscuro, delay }: CodigoCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      onClick={onClick}
      className={`group text-left rounded-xl border-2 p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 ${
        modoOscuro
          ? 'bg-zinc-800/40 border-zinc-800 hover:border-emerald-700'
          : 'bg-white border-zinc-200 hover:border-emerald-500'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: modoOscuro ? '#0F6E5630' : '#0F6E5615' }}
        >
          <i className="ti ti-book-2 text-xl" style={{ color: VERDE }} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className={`text-base font-serif font-semibold leading-tight ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            {codigo.nombre}
          </h3>
          <p className={`text-[11px] mt-0.5 uppercase tracking-wider ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {codigo.categoria}
            {codigo.bloqueado && (
              <span className="ml-2">
                <i className="ti ti-lock text-[10px]" />
              </span>
            )}
          </p>
        </div>
      </div>

      <p className={`text-xs leading-relaxed mb-3 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {codigo.descripcion}
      </p>

      <div
        className={`flex items-center justify-between text-[11px] pt-3 border-t ${
          modoOscuro ? 'border-zinc-800' : 'border-zinc-100'
        }`}
      >
        <span className={modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}>
          {codigo.totalArts > 0 ? `${codigo.totalArts} artículos` : 'Sin datos'}
        </span>
        <span
          className="flex items-center gap-1 font-semibold transition-colors"
          style={{ color: VERDE }}
        >
          Abrir
          <i className="ti ti-arrow-right text-sm group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </motion.button>
  )
}

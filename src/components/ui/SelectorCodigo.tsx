import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { codigosCargados, obtenerCodigo } from '../../services/codigos'
import type { CodigoTipo } from '../../types'

const VERDE = 'var(--accent-base)'

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
  const [tratadosAbierto, setTratadosAbierto] = useState(false)

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
  // Tres secciones: Códigos (fundamentales + sustantivos + procedimentales),
  // Leyes especiales, y Tratados internacionales.
  const codigosDisponibles = disponibles.filter(
    (c) => c.categoria !== 'especiales' && c.categoria !== 'tratados'
  )
  const leyesEspeciales = disponibles.filter((c) => c.categoria === 'especiales')
  const tratadosDisponibles = disponibles.filter((c) => c.categoria === 'tratados')

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
            style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
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

        {tratadosDisponibles.length > 0 && (
          <section className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2
                className={`text-[11px] uppercase tracking-wider font-semibold ${
                  modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                Tratados internacionales
              </h2>
              <span className={`text-[10px] ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                convenios ratificados por Chile (Art. 5 inc. 2° CPR)
              </span>
            </div>

            {/* Card-acordeón: una sola entrada que al abrirse despliega los tratados específicos. */}
            <button
              onClick={() => setTratadosAbierto((v) => !v)}
              className={`w-full text-left rounded-xl border-2 p-5 transition-all ${
                modoOscuro
                  ? 'bg-zinc-800/40 border-zinc-800 hover:border-emerald-700'
                  : 'bg-white border-zinc-200 hover:border-emerald-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)' : 'color-mix(in srgb, var(--accent-base) 8%, transparent)' }}
                >
                  <i className="ti ti-world text-xl" style={{ color: 'var(--accent-base)' }} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base font-serif font-semibold leading-tight ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                    Tratados internacionales
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {tratadosDisponibles.length} tratado{tratadosDisponibles.length !== 1 ? 's' : ''} indexado{tratadosDisponibles.length !== 1 ? 's' : ''}
                    {' · '}
                    {tratadosAbierto ? 'haz clic para ocultar' : 'haz clic para ver el detalle'}
                  </p>
                </div>
                <i
                  className={`ti ti-chevron-down text-xl transition-transform flex-shrink-0 ${tratadosAbierto ? 'rotate-180' : ''} ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}
                />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {tratadosAbierto && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="pl-6 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tratadosDisponibles.map((c, i) => (
                      <CodigoCard
                        key={c.tipo}
                        codigo={c}
                        onClick={() => onElegir(c.tipo)}
                        modoOscuro={modoOscuro}
                        delay={i * 0.03}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
          ? 'bg-zinc-800/40 border-zinc-800 hover:border-[var(--accent-700)]'
          : 'bg-white border-zinc-200 hover:border-[var(--accent-500)]'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)' : 'color-mix(in srgb, var(--accent-base) 8%, transparent)' }}
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

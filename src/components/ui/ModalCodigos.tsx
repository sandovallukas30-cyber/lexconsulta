import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import type { CategoriaCodigo, CodigoActivo } from '../../types'

const VERDE = '#0F6E56'

const tituloCategoria: Record<CategoriaCodigo, string> = {
  fundamentales: 'Fundamentales',
  sustantivos: 'Códigos sustantivos',
  procedimentales: 'Códigos procedimentales',
  especiales: 'Leyes especiales',
}

const ordenCategorias: CategoriaCodigo[] = [
  'fundamentales',
  'sustantivos',
  'procedimentales',
  'especiales',
]

interface Props {
  abierto: boolean
  onCerrar: () => void
}

export function ModalCodigos({ abierto, onCerrar }: Props) {
  const codigos = useStore((s) => s.codigos)
  const toggleCodigo = useStore((s) => s.toggleCodigo)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [busqueda, setBusqueda] = useState('')

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return codigos
    return codigos.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.nombreCorto.toLowerCase().includes(q) ||
        c.descripcion.toLowerCase().includes(q)
    )
  }, [codigos, busqueda])

  const porCategoria = useMemo(() => {
    const map: Record<CategoriaCodigo, CodigoActivo[]> = {
      fundamentales: [],
      sustantivos: [],
      procedimentales: [],
      especiales: [],
    }
    for (const c of filtrados) {
      const cat = c.categoria ?? 'sustantivos'
      if (map[cat]) map[cat].push(c)
    }
    // Dentro de cada categoría: cargados primero, pendientes después
    for (const cat of Object.keys(map) as CategoriaCodigo[]) {
      map[cat].sort((a, b) => {
        if (a.cargado === b.cargado) return 0
        return a.cargado ? -1 : 1
      })
    }
    return map
  }, [filtrados])

  const activos = codigos.filter((c) => c.activo).length
  const disponibles = codigos.filter((c) => c.cargado).length

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onCerrar}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={`max-w-2xl w-full max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
              modoOscuro ? 'bg-zinc-900' : 'bg-white'
            }`}
          >
            <div
              className={`px-6 py-4 border-b flex items-start justify-between gap-4 ${
                modoOscuro ? 'border-zinc-800' : 'border-zinc-200'
              }`}
            >
              <div>
                <h2
                  className={`text-xl font-serif font-semibold ${
                    modoOscuro ? 'text-white' : 'text-zinc-900'
                  }`}
                >
                  Gestionar códigos
                </h2>
                <p className={`text-xs mt-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {activos} activos · {disponibles} disponibles · {codigos.length} totales
                  <span className={`ml-1 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    (incluye leyes especiales)
                  </span>
                </p>
              </div>
              <button
                onClick={onCerrar}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  modoOscuro
                    ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className={`px-6 py-3 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'
                }`}
              >
                <i className={`ti ti-search text-base ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`} />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar código o ley..."
                  autoFocus
                  className={`flex-1 bg-transparent outline-none text-sm ${
                    modoOscuro ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
                  }`}
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className={modoOscuro ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}
                  >
                    <i className="ti ti-x text-sm" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {ordenCategorias.map((cat) => {
                const items = porCategoria[cat]
                if (items.length === 0) return null
                return (
                  <div key={cat}>
                    <h3
                      className={`text-[11px] uppercase tracking-wider font-semibold mb-2 ${
                        modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
                      }`}
                    >
                      {tituloCategoria[cat]}
                    </h3>
                    <div className="space-y-1.5">
                      {items.map((c) => (
                        <CodigoRow
                          key={c.tipo}
                          codigo={c}
                          modoOscuro={modoOscuro}
                          onToggle={() => toggleCodigo(c.tipo)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              {filtrados.length === 0 && (
                <div className={`text-center py-12 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <i className="ti ti-search-off text-3xl mb-2 block" />
                  <p className="text-sm">No se encontraron códigos ni leyes</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CodigoRow({
  codigo,
  modoOscuro,
  onToggle,
}: {
  codigo: CodigoActivo
  modoOscuro: boolean
  onToggle: () => void
}) {
  const interactivo = !codigo.bloqueado && codigo.cargado
  return (
    <button
      onClick={onToggle}
      disabled={!interactivo}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
        !interactivo
          ? 'cursor-default'
          : modoOscuro
          ? 'hover:bg-zinc-800 cursor-pointer'
          : 'hover:bg-zinc-50 cursor-pointer'
      }`}
    >
      <div
        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
          codigo.activo
            ? 'border-transparent'
            : modoOscuro
            ? 'border-zinc-700'
            : 'border-zinc-300'
        }`}
        style={codigo.activo ? { background: VERDE } : undefined}
      >
        {codigo.activo && <i className="ti ti-check text-white text-xs font-bold" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            {codigo.nombre}
          </span>
          {codigo.bloqueado && (
            <i
              className={`ti ti-lock text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}
              title="Siempre activo"
            />
          )}
          {!codigo.cargado && (
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                modoOscuro ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              pendiente
            </span>
          )}
        </div>
        <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {codigo.descripcion}
        </p>
      </div>
    </button>
  )
}

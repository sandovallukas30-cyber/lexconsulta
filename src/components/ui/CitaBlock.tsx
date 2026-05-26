import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { etiquetaInciso, analizarParrafos } from '../../services/incisos'
import type { Cita } from '../../types'

interface Props {
  cita: Cita
}

export function CitaBlock({ cita }: Props) {
  const [expandido, setExpandido] = useState(false)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const numerarIncisos = useStore((s) => s.numerarIncisos)
  const color = '#0F6E56'

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      <button
        onClick={() => setExpandido(!expandido)}
        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
          modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
        }`}
      >
        <div
          className="w-1 h-10 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm font-semibold" style={{ color }}>
              {cita.articulo.startsWith('Art.') ? cita.articulo : `Art. ${cita.articulo}`}
            </span>
            <span className={`text-sm truncate ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {cita.titulo}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {cita.relevancia}
          </p>
        </div>
        <i
          className={`ti ti-chevron-down text-lg transition-transform ${
            expandido ? 'rotate-180' : ''
          } ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={`px-4 py-3 border-t text-sm leading-relaxed ${
                modoOscuro ? 'border-zinc-800 text-zinc-300 bg-zinc-900/50' : 'border-zinc-100 text-zinc-700 bg-zinc-50/50'
              }`}
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {(() => {
                const parrafos = analizarParrafos(cita.texto_original)
                const totalIncisos = parrafos.filter((p) => p.tipo === 'inciso').length
                const mostrarNumeros = numerarIncisos && totalIncisos > 1
                return parrafos.map((p, i) => {
                  const esInciso = p.tipo === 'inciso'
                  const indentExtra = p.tipo === 'numeral' ? '0.8rem' : p.tipo === 'letra' ? '1.6rem' : '0rem'
                  return (
                    <p
                      key={i}
                      className="mb-2 last:mb-0 whitespace-pre-line relative"
                      style={
                        mostrarNumeros
                          ? { paddingLeft: `calc(1.9rem + ${indentExtra})` }
                          : esInciso && i === 0
                          ? undefined
                          : { textIndent: indentExtra !== '0rem' ? `calc(1rem + ${indentExtra})` : '1rem' }
                      }
                    >
                      {mostrarNumeros && esInciso && (
                        <span
                          className={`absolute left-0 top-0 font-mono text-[10px] font-medium select-none ${
                            modoOscuro ? 'text-zinc-600' : 'text-zinc-400'
                          }`}
                          style={{ width: '1.6rem', textAlign: 'right', lineHeight: '1.6rem' }}
                          title={`Inciso ${etiquetaInciso(p.indiceInciso!)}`}
                        >
                          {etiquetaInciso(p.indiceInciso!)}
                        </span>
                      )}
                      {p.texto}
                    </p>
                  )
                })
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


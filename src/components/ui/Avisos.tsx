import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAvisos, type Aviso } from '../../store/useAvisos'
import { useStore } from '../../store/useStore'

const ICONO: Record<Aviso['tipo'], string> = {
  exito: 'ti-circle-check',
  error: 'ti-alert-triangle',
  info: 'ti-info-circle',
}

/** Pila de avisos abajo al centro (en móvil, a todo el ancho con 16 px de
 *  margen). Se pausa la cuenta regresiva mientras el puntero está encima,
 *  para que "Deshacer" no desaparezca justo cuando se va a pulsar. */
export function Avisos() {
  const avisos = useAvisos((s) => s.avisos)
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[120] flex flex-col items-center gap-2 pointer-events-none print:hidden"
    >
      <AnimatePresence initial={false}>
        {avisos.map((a) => (
          <ItemAviso key={a.id} aviso={a} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ItemAviso({ aviso }: { aviso: Aviso }) {
  const cerrar = useAvisos((s) => s.cerrar)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [pausado, setPausado] = useState(false)
  const restante = useRef(aviso.duracionMs)
  const inicio = useRef(0)

  useEffect(() => {
    if (pausado) return
    inicio.current = Date.now()
    const t = window.setTimeout(() => cerrar(aviso.id), restante.current)
    return () => {
      window.clearTimeout(t)
      restante.current -= Date.now() - inicio.current
    }
  }, [pausado, aviso.id, cerrar])

  const colorIcono = aviso.tipo === 'error' ? 'text-red-500' : aviso.tipo === 'exito' ? 'text-emerald-500' : modoOscuro ? 'text-zinc-400' : 'text-zinc-500'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      role={aviso.tipo === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      className={`pointer-events-auto w-full sm:w-auto sm:min-w-[320px] max-w-md flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl shadow-lg border text-sm ${
        modoOscuro ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
      }`}
    >
      <i className={`ti ${ICONO[aviso.tipo]} text-lg flex-shrink-0 ${colorIcono}`} aria-hidden />
      <span className="flex-1 min-w-0 py-1.5">{aviso.mensaje}</span>
      {aviso.accion && (
        <button
          onClick={() => {
            aviso.accion?.alPulsar()
            cerrar(aviso.id)
          }}
          className="px-3 min-h-[36px] rounded-lg text-sm font-semibold transition-colors hover:bg-[color-mix(in_srgb,var(--accent-base)_12%,transparent)]"
          style={{ color: 'var(--accent-base)' }}
        >
          {aviso.accion.etiqueta}
        </button>
      )}
      <button
        onClick={() => cerrar(aviso.id)}
        aria-label="Cerrar aviso"
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          modoOscuro ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-400 hover:bg-zinc-100'
        }`}
      >
        <i className="ti ti-x text-base" />
      </button>
    </motion.div>
  )
}

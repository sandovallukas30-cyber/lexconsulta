import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useDialogo } from '../../hooks/useDialogo'
import { useConfirmacion, type ConfirmacionPendiente } from '../../services/confirmar'

/** Monta el diálogo de `confirmar()` (services/confirmar.ts). Va una sola vez en App. */
export function DialogoConfirmar() {
  const pendiente = useConfirmacion((s) => s.pendiente)
  return <AnimatePresence>{pendiente && <Cuerpo key="confirmacion" pendiente={pendiente} />}</AnimatePresence>
}

function Cuerpo({ pendiente }: { pendiente: ConfirmacionPendiente }) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [noVolver, setNoVolver] = useState(false)
  const cancelar = () => pendiente.resolver(false, false)
  const dialogoRef = useDialogo<HTMLDivElement>(true, cancelar)
  const linea = modoOscuro ? 'border-zinc-800' : 'border-zinc-200'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 print:hidden"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={cancelar}
    >
      <motion.div
        ref={dialogoRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-confirmar"
        aria-describedby={pendiente.mensaje ? 'texto-confirmar' : undefined}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl shadow-flotante overflow-hidden ${modoOscuro ? 'bg-zinc-900' : 'bg-white'}`}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: pendiente.peligro ? 'color-mix(in srgb, var(--neu-danger) 14%, transparent)' : 'color-mix(in srgb, var(--accent-base) 14%, transparent)',
                color: pendiente.peligro ? 'var(--neu-danger)' : 'var(--accent-base)',
              }}
            >
              <i className={`ti ${pendiente.peligro ? 'ti-trash' : 'ti-info-circle'} text-xl`} />
            </span>
            <div className="min-w-0">
              <h2 id="titulo-confirmar" className={`text-base font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                {pendiente.titulo}
              </h2>
              {pendiente.mensaje && (
                <p id="texto-confirmar" className={`text-sm mt-1 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {pendiente.mensaje}
                </p>
              )}
            </div>
          </div>

          {pendiente.vistaPrevia && (
            <p
              className={`mt-3 rounded-lg px-3 py-2 text-sm italic line-clamp-4 break-words ${modoOscuro ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-700'}`}
            >
              {pendiente.vistaPrevia}
            </p>
          )}
          {pendiente.nota && <p className={`mt-3 text-xs ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>{pendiente.nota}</p>}
        </div>

        <div className={`px-5 py-3 border-t flex flex-col gap-3 ${linea}`}>
          {pendiente.clave && (
            <label className={`flex items-center gap-2.5 text-sm cursor-pointer min-h-[36px] ${modoOscuro ? 'text-zinc-300' : 'text-zinc-600'}`}>
              <input
                type="checkbox"
                checked={noVolver}
                onChange={(e) => setNoVolver(e.target.checked)}
                className="w-4 h-4 flex-shrink-0"
                style={{ accentColor: 'var(--accent-base)' }}
              />
              No volver a preguntar
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={cancelar} className="boton boton-fantasma">
              {pendiente.etiquetaCancelar ?? 'Cancelar'}
            </button>
            <button
              onClick={() => pendiente.resolver(true, noVolver)}
              className="boton boton-primario"
              style={pendiente.peligro ? { background: 'var(--neu-danger)', color: '#fff' } : undefined}
              data-autofocus
            >
              {pendiente.etiquetaConfirmar ?? 'Aceptar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

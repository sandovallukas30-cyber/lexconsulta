import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import type { PerfilUsuario } from '../../types'

export function ModalPerfil() {
  const perfil = useStore((s) => s.perfil)
  const modalAbierto = useStore((s) => s.modalPerfilAbierto)
  const setPerfil = useStore((s) => s.setPerfil)
  const cerrarModal = useStore((s) => s.cerrarModalPerfil)
  const modoOscuro = useStore((s) => s.modoOscuro)

  const visible = modalAbierto || perfil === null
  const puedeCerrar = perfil !== null

  const seleccionar = (p: PerfilUsuario) => {
    setPerfil(p)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => puedeCerrar && cerrarModal()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={`max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden ${
              modoOscuro ? 'bg-zinc-900' : 'bg-white'
            }`}
          >
            <div className="px-8 py-6 text-center" style={{ background: 'var(--accent-base)' }}>
              <h2 className="text-2xl font-serif font-bold text-white">
                Bienvenido a Prima Lex
              </h2>
              <p className="text-[var(--accent-50)] mt-2 text-sm">
                Selecciona tu perfil para adaptar el lenguaje y las funciones
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <PerfilCard
                tipo="ciudadano"
                icono="ti-user"
                titulo="Ciudadano"
                descripcion="Lenguaje simple, ejemplos cotidianos y pasos de acción concretos."
                seleccionado={perfil === 'ciudadano'}
                onClick={() => seleccionar('ciudadano')}
                modoOscuro={modoOscuro}
              />
              <PerfilCard
                tipo="profesional"
                icono="ti-briefcase"
                titulo="Profesional"
                descripcion="Lenguaje técnico-jurídico, citas de incisos y referencias doctrinarias."
                seleccionado={perfil === 'profesional'}
                onClick={() => seleccionar('profesional')}
                modoOscuro={modoOscuro}
              />
            </div>

            {puedeCerrar && (
              <div className={`px-6 pb-6 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <p className="text-xs text-center">
                  Puedes cambiar de perfil en cualquier momento desde la barra superior
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface PerfilCardProps {
  tipo: 'ciudadano' | 'profesional'
  icono: string
  titulo: string
  descripcion: string
  seleccionado: boolean
  onClick: () => void
  modoOscuro: boolean
}

function PerfilCard({ icono, titulo, descripcion, seleccionado, onClick, modoOscuro }: PerfilCardProps) {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-xl border-2 text-left transition-all ${
        seleccionado
          ? 'border-[var(--accent-600)]'
          : modoOscuro
          ? 'border-zinc-800 hover:border-zinc-700'
          : 'border-zinc-200 hover:border-zinc-300'
      } ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-50'}`}
      style={seleccionado ? { background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 8%, transparent)' : 'color-mix(in srgb, var(--accent-base) 3%, transparent)' } : undefined}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
        style={{ background: 'var(--accent-base)', color: 'white' }}
      >
        <i className={`ti ${icono} text-2xl`} />
      </div>
      <h3 className={`text-lg font-semibold mb-1 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
        {titulo}
      </h3>
      <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {descripcion}
      </p>
    </button>
  )
}

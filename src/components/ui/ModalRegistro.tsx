import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'

const VERDE = 'var(--accent-base)'

interface ModalRegistroProps {
  abierto: boolean
  onCerrar: () => void
}

export function ModalRegistro({ abierto, onCerrar }: ModalRegistroProps) {
  const registrarUsuario = useStore((s) => s.registrarUsuario)
  const usuarioEmail = useStore((s) => s.usuarioEmail)
  const cerrarSesion = useStore((s) => s.cerrarSesion)
  const modoOscuro = useStore((s) => s.modoOscuro)

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  const validarEmail = (e: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(e)
  }

  const handleRegistro = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const emailLimpio = email.trim().toLowerCase()
    if (!emailLimpio) {
      setError('Ingresa tu email')
      return
    }
    if (!validarEmail(emailLimpio)) {
      setError('Email inválido')
      return
    }

    registrarUsuario(emailLimpio)
    setEnviado(true)
    setTimeout(() => {
      setEmail('')
      setEnviado(false)
      onCerrar()
    }, 2000)
  }

  const handleCerrarSesion = () => {
    cerrarSesion()
    setEmail('')
    setError('')
    setEnviado(false)
    onCerrar()
  }

  return (
    <AnimatePresence>
      {abierto && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCerrar}
            className="fixed inset-0 bg-black/30 z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 rounded-2xl shadow-2xl z-50 ${
              modoOscuro ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'
            }`}
          >
            <div className={`px-6 py-8 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              {!usuarioEmail ? (
                <>
                  <div className="text-center mb-6">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{
                        background: modoOscuro
                          ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
                          : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
                      }}
                    >
                      <i className="ti ti-mail text-3xl" style={{ color: VERDE }} />
                    </div>
                    <h2 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                      Obtén más consultas
                    </h2>
                    <p className={`text-sm mt-2 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      Registra tu email para acceder a 10 consultas por día
                    </p>
                  </div>

                  {enviado ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`text-center py-6 rounded-lg ${
                        modoOscuro ? 'bg-green-950/30 border border-green-700' : 'bg-green-50 border border-green-300'
                      }`}
                    >
                      <i className="ti ti-check text-3xl text-green-500 mb-3 block" />
                      <p className="text-green-700 font-semibold">¡Registro exitoso!</p>
                      <p className={`text-sm mt-1 ${modoOscuro ? 'text-green-400' : 'text-green-600'}`}>
                        Ahora tienes 10 consultas por día
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleRegistro} className="space-y-4">
                      <div>
                        <label
                          htmlFor="email"
                          className={`block text-sm font-medium mb-2 ${
                            modoOscuro ? 'text-zinc-300' : 'text-zinc-700'
                          }`}
                        >
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            setError('')
                          }}
                          placeholder="tu@email.com"
                          className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm transition-colors ${
                            modoOscuro
                              ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[var(--accent-600)] outline-none'
                              : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-[var(--accent-600)] outline-none'
                          }`}
                        />
                      </div>

                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm font-medium"
                        >
                          {error}
                        </motion.p>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition-all hover:shadow-lg"
                        style={{ background: VERDE }}
                      >
                        Registrarse
                      </button>
                    </form>
                  )}

                  <p
                    className={`text-xs text-center mt-4 ${
                      modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                  >
                    Tu email no será compartido ni usado para marketing
                  </p>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{
                        background: modoOscuro
                          ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
                          : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
                      }}
                    >
                      <i className="ti ti-user-check text-3xl" style={{ color: VERDE }} />
                    </div>
                    <h2 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                      Sesión activa
                    </h2>
                  </div>

                  <div
                    className={`p-4 rounded-lg mb-6 ${
                      modoOscuro ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-zinc-50 border border-zinc-200'
                    }`}
                  >
                    <p className={`text-sm ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <span className="font-medium">Registrado como:</span>
                    </p>
                    <p className="text-lg font-semibold" style={{ color: VERDE }}>
                      {usuarioEmail}
                    </p>
                  </div>

                  <div className={`mb-4 p-3 rounded-lg ${
                    modoOscuro ? 'bg-green-950/20 border border-green-700/50' : 'bg-green-50 border border-green-300'
                  }`}>
                    <p className={`text-sm ${modoOscuro ? 'text-green-400' : 'text-green-700'}`}>
                      <i className="ti ti-check text-sm mr-2" />
                      10 consultas por día disponibles
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={onCerrar}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        modoOscuro
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                      }`}
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={handleCerrarSesion}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        modoOscuro
                          ? 'bg-red-950/30 hover:bg-red-950/50 text-red-400'
                          : 'bg-red-50 hover:bg-red-100 text-red-700'
                      }`}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

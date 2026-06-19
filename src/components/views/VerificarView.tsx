import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'

const VERDE = 'var(--accent-base)'

export function VerificarView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const registrarUsuario = useStore((s) => s.registrarUsuario)

  const [estado, setEstado] = useState<'cargando' | 'exito' | 'error'>('cargando')
  const [mensaje, setMensaje] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) {
      setEstado('error')
      setMensaje('Token no encontrado')
      return
    }

    const verificar = async () => {
      try {
        const res = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = (await res.json()) as { email?: string; message?: string; error?: string }

        if (!res.ok) {
          setEstado('error')
          setMensaje(data.error || 'Error al verificar email')
          return
        }

        if (data.email) {
          setEmail(data.email)
          registrarUsuario(data.email)
          setEstado('exito')
          setMensaje('¡Email verificado exitosamente!')

          // Redireccionar a home después de 2 segundos
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        }
      } catch (error) {
        setEstado('error')
        setMensaje('Error al verificar email')
      }
    }

    verificar()
  }, [])

  return (
    <div
      className={`h-screen flex items-center justify-center ${
        modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'
      }`}
    >
      <div
        className={`w-96 rounded-2xl shadow-2xl p-8 ${
          modoOscuro ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
        }`}
      >
        {estado === 'cargando' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center animate-spin" style={{ borderColor: VERDE, borderWidth: '4px', borderRightColor: 'transparent' }} />
            <p className={`text-lg font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              Verificando email...
            </p>
          </div>
        )}

        {estado === 'exito' && (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(34, 197, 94, 0.1)' }}
            >
              <i className="ti ti-check text-3xl text-green-500" />
            </div>
            <h1 className={`text-2xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              {mensaje}
            </h1>
            <p className={`text-sm mb-4 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Tu email <span className="font-semibold text-green-500">{email}</span> ha sido verificado.
            </p>
            <p className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Redireccionando a home en 2 segundos...
            </p>
          </div>
        )}

        {estado === 'error' && (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(239, 68, 68, 0.1)' }}
            >
              <i className="ti ti-x text-3xl text-red-500" />
            </div>
            <h1 className={`text-2xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              {mensaje}
            </h1>
            <p className={`text-sm mb-4 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Por favor, intenta registrarte de nuevo o contacta soporte.
            </p>
            <button
              onClick={() => {
                window.location.href = '/'
              }}
              className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: VERDE }}
            >
              Ir a home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import { Component, type ReactNode } from 'react'

/** Límite de error de cada vista (C8). Con las vistas cargadas bajo demanda,
 *  un corte de red al abrir una deja su chunk sin bajar; antes cualquier
 *  error dejaba la pantalla en blanco. El navegador guarda el import()
 *  fallido, así que la salida real es recargar (la vista activa se
 *  recuerda y se vuelve a la misma). */
export class LimiteError extends Component<{ children: ReactNode; modoOscuro: boolean }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('Error en la vista:', error)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const oscuro = this.props.modoOscuro
    const deRed = /fetch|import|chunk|module/i.test(error.message)
    return (
      <div className={`h-full flex items-center justify-center p-8 ${oscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
        <div className="max-w-sm text-center" role="alert">
          <p className={`text-base font-semibold mb-1 ${oscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>No se pudo abrir esta sección</p>
          <p className={`text-sm mb-5 ${oscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {deRed ? 'Parece un problema de conexión. Revisa tu internet y recarga.' : 'Ocurrió un error inesperado. Tus datos siguen guardados en este navegador.'}
          </p>
          <button onClick={() => window.location.reload()} className="boton boton-primario px-4">
            Recargar
          </button>
        </div>
      </div>
    )
  }
}

import { useStore } from '../../store/useStore'

const titulos: Record<string, string> = {
  consultar: 'Consultar',
  situacion: 'Situación concreta',
  canvas: 'Canvas jurídico',
  comparar: 'Comparar normas',
  mapa: 'Mapa de normas',
  explorador: 'Explorador de códigos',
  historial: 'Historial',
  admin: 'Administración',
}

export function Topbar() {
  const perfil = useStore((s) => s.perfil)
  const vistaActiva = useStore((s) => s.vistaActiva)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const toggleModoOscuro = useStore((s) => s.toggleModoOscuro)
  const abrirModalPerfil = useStore((s) => s.abrirModalPerfil)

  return (
    <header
      className={`h-16 px-6 flex items-center justify-between border-b ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      <div>
        <h2 className={`text-lg font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          {titulos[vistaActiva]}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleModoOscuro}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            modoOscuro
              ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
          title={modoOscuro ? 'Modo claro' : 'Modo oscuro'}
        >
          <i className={`ti ${modoOscuro ? 'ti-sun' : 'ti-moon'} text-lg`} />
        </button>

        <button
          onClick={abrirModalPerfil}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            modoOscuro
              ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          <i className={`ti ${perfil === 'profesional' ? 'ti-briefcase' : 'ti-user'} text-base`} />
          <span className="capitalize">{perfil ?? 'Seleccionar perfil'}</span>
        </button>
      </div>
    </header>
  )
}

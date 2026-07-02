import { useStore } from '../../store/useStore'

interface TopbarProps {
  onAbrirRegistro?: () => void
}

const titulos: Record<string, string> = {
  consultar: 'Consultar',
  situacion: 'Situación concreta',
  canvas: 'Canvas jurídico',
  comparar: 'Comparar normas',
  mapa: 'Mapa de normas',
  explorador: 'Explorador de códigos',
  historial: 'Historial',
  admin: 'Administración',
  practica: 'Práctica · Pasapalabra',
}

export function Topbar({ onAbrirRegistro }: TopbarProps = {}) {
  const perfil = useStore((s) => s.perfil)
  const vistaActiva = useStore((s) => s.vistaActiva)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const toggleModoOscuro = useStore((s) => s.toggleModoOscuro)
  const abrirModalPerfil = useStore((s) => s.abrirModalPerfil)
  const usuarioEmail = useStore((s) => s.usuarioEmail)
  const usuarioRegistrado = useStore((s) => s.usuarioRegistrado)
  const consultasRestantesStore = useStore((s) => s.consultasRestantes)
  const fechaConsultas = useStore((s) => s.fechaConsultas)

  // Resetear contador si es un nuevo día
  const hoy = new Date().toISOString().slice(0, 10)
  const consultasRestantes = fechaConsultas === hoy ? consultasRestantesStore : null
  const limiteMaximo = usuarioRegistrado ? 10 : 3
  const restantes = consultasRestantes ?? limiteMaximo
  const sinConsultas = restantes === 0
  const pocasConsultas = restantes <= 2 && restantes > 0

  return (
    <header
      className={`h-16 px-6 flex items-center justify-between border-b ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <h2 className={`text-lg font-semibold flex-shrink-0 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          {titulos[vistaActiva]}
        </h2>
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border truncate ${
            modoOscuro
              ? 'bg-amber-950/30 border-amber-900/60 text-amber-300'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
          title="Esta plataforma no constituye asesoría legal. Consulta siempre con un profesional para decisiones jurídicas."
        >
          <i className="ti ti-alert-triangle text-xs flex-shrink-0" />
          <span className="truncate">Orientación educativa · No reemplaza asesoría legal profesional</span>
        </div>
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
          aria-label={modoOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          <i className={`ti ${modoOscuro ? 'ti-sun' : 'ti-moon'} text-lg`} />
        </button>

        {onAbrirRegistro && (
          <button
            onClick={onAbrirRegistro}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              sinConsultas
                ? modoOscuro
                  ? 'bg-red-950/40 text-red-400 hover:bg-red-950/60'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
                : pocasConsultas
                ? modoOscuro
                  ? 'bg-amber-950/30 text-amber-400 hover:bg-amber-950/50'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                : usuarioEmail
                ? modoOscuro
                  ? 'bg-green-950/30 text-green-400 hover:bg-green-950/50'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
                : modoOscuro
                ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
            title={
              sinConsultas
                ? 'Límite diario alcanzado'
                : usuarioEmail
                ? `Registrado como: ${usuarioEmail}`
                : 'Registrarse para más consultas'
            }
          >
            <i className={`ti ${
              sinConsultas ? 'ti-alert-circle' : usuarioEmail ? 'ti-user-check' : 'ti-mail'
            } text-base`} />
            <span className="text-xs font-medium">
              {usuarioEmail
                ? `${restantes} consultas`
                : sinConsultas || pocasConsultas
                ? `${restantes}/3 consultas`
                : 'Registrarse'}
            </span>
          </button>
        )}

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

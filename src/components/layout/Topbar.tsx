import { useStore } from '../../store/useStore'
import { MiniEnfoque } from './MiniEnfoque'

interface TopbarProps {
  onAbrirRegistro?: () => void
}

const titulos: Record<string, string> = {
  hoy: 'Hoy',
  tareas: 'Tareas',
  enfoque: 'Enfoque',
  calendario: 'Calendario',
  modulos: 'Módulos',
  mapasmentales: 'Mapas mentales',
  explorador: 'Explorador de códigos',
  colecciones: 'Colecciones',
  admin: 'Administración',
  practica: 'Práctica · Pasapalabra',
}

// Los límites del servidor (api/anthropic.ts) están temporalmente muy altos
// mientras solo el dueño del proyecto usa la app: este contador ya no tiene
// nada útil que mostrar (saldría algo como "997 consultas"), así que se
// oculta en vez de eso. Volver a `true` junto con revertir los límites del
// servidor restaura el aviso original.
const MOSTRAR_CONTADOR_CONSULTAS = false

export function Topbar({ onAbrirRegistro }: TopbarProps = {}) {
  const vistaActiva = useStore((s) => s.vistaActiva)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const toggleModoOscuro = useStore((s) => s.toggleModoOscuro)
  const usuarioEmail = useStore((s) => s.usuarioEmail)
  const usuarioRegistrado = useStore((s) => s.usuarioRegistrado)
  const consultasRestantesStore = useStore((s) => s.consultasRestantes)
  const fechaConsultas = useStore((s) => s.fechaConsultas)
  const setMenuMovilAbierto = useStore((s) => s.setMenuMovilAbierto)

  // Resetear contador si es un nuevo día
  const hoy = new Date().toISOString().slice(0, 10)
  const consultasRestantes = fechaConsultas === hoy ? consultasRestantesStore : null
  const limiteMaximo = usuarioRegistrado ? 10 : 3
  const restantes = consultasRestantes ?? limiteMaximo
  const sinConsultas = restantes === 0
  const pocasConsultas = restantes <= 2 && restantes > 0

  return (
    <header
      className={`h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-2 flex-shrink-0 ${
        modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={() => setMenuMovilAbierto(true)}
          aria-label="Abrir menú"
          className="boton boton-fantasma boton-icono -ml-1 md:hidden"
        >
          <i className="ti ti-menu-2 text-xl" />
        </button>
        <h2 className={`text-lg font-bold tracking-tight truncate md:hidden ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          {titulos[vistaActiva]}
        </h2>
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium truncate ${
            modoOscuro ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200/60 text-zinc-600'
          }`}
          title="Esta plataforma no constituye asesoría legal. Consulta siempre con un profesional para decisiones jurídicas."
        >
          <i className="ti ti-info-circle text-xs flex-shrink-0" />
          <span className="truncate lg:hidden">Orientación educativa</span>
          <span className="truncate hidden lg:inline">Orientación educativa · No reemplaza asesoría legal profesional</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <MiniEnfoque />
        <button
          onClick={toggleModoOscuro}
          className="boton boton-fantasma boton-icono"
          title={modoOscuro ? 'Modo claro' : 'Modo oscuro'}
          aria-label={modoOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          <i className={`ti ${modoOscuro ? 'ti-sun' : 'ti-moon'} text-lg`} />
        </button>

        {MOSTRAR_CONTADOR_CONSULTAS && onAbrirRegistro && (
          <button
            onClick={onAbrirRegistro}
            className={`boton gap-2 ${
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

      </div>
    </header>
  )
}

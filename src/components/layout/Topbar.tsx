import { useStore } from '../../store/useStore'
import { MiniEnfoque } from './MiniEnfoque'

const titulos: Record<string, string> = {
  hoy: 'Hoy',
  tareas: 'Tareas',
  enfoque: 'Enfoque',
  calendario: 'Calendario',
  modulos: 'Mis ramos',
  mapasmentales: 'Mapas mentales',
  explorador: 'Explorador de códigos',
  colecciones: 'Colecciones',
  practica: 'Práctica · Pasapalabra',
}

export function Topbar() {
  const vistaActiva = useStore((s) => s.vistaActiva)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const setMenuMovilAbierto = useStore((s) => s.setMenuMovilAbierto)
  const menuMovilAbierto = useStore((s) => s.menuMovilAbierto)

  return (
    <>
    {/* Con el menú fijo (pantallas grandes) no hay franja superior: el contenido empieza arriba del todo. El
        temporizador en marcha se ve junto a «Enfoque» en el menú (EnfoqueEnMenu), no flotando sobre el contenido. */}
    <header className="escritorio:hidden h-14 sm:h-[72px] px-3 sm:px-8 pt-3 flex items-center justify-between gap-2 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={() => setMenuMovilAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={menuMovilAbierto}
          className="boton boton-fantasma boton-icono -ml-1 escritorio:hidden"
        >
          <i className="ti ti-menu-2 text-xl" />
        </button>
        <h2 className={`text-lg font-bold tracking-tight truncate escritorio:hidden ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          {titulos[vistaActiva]}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <MiniEnfoque />
      </div>
    </header>
    </>
  )
}

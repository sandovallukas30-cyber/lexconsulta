import { useStore } from '../../store/useStore'
import { useEnfoque } from '../../store/useEnfoque'
import { MiniEnfoque } from './MiniEnfoque'

export function Topbar() {
  const vistaActiva = useStore((s) => s.vistaActiva)
  const estadoEnfoque = useEnfoque((s) => s.estado)

  // Cada vista ya trae su propio título (o migas), así que esta franja solo aparece para mostrar el temporizador en
  // marcha: antes repetía el nombre de la vista justo encima de su título y dejaba un hueco en celular y tablet.
  // Con el menú fijo (pantallas grandes) no hay franja: el temporizador se ve junto a «Enfoque» (EnfoqueEnMenu).
  if (estadoEnfoque === 'detenido' || vistaActiva === 'enfoque') return null

  return (
    <header className="escritorio:hidden px-3 sm:px-8 pt-3 flex items-center justify-end gap-2 flex-shrink-0">
      <MiniEnfoque />
    </header>
  )
}

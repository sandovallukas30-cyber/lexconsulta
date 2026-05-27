import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { ModalPerfil } from './components/ui/ModalPerfil'
import { ConsultarView } from './components/views/ConsultarView'
import { SituacionView } from './components/views/SituacionView'
import { CanvasView } from './components/views/CanvasView'
import { CompararView } from './components/views/CompararView'
import { MapaView } from './components/views/MapaView'
import { ExploradorView } from './components/views/ExploradorView'
import { HistorialView } from './components/views/HistorialView'
import { AdminView } from './components/views/AdminView'
import { PracticaView } from './components/views/PracticaView'
import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { aplicarTema } from './theme'
import type { VistaId } from './types'

const vistas: Record<VistaId, React.ComponentType> = {
  consultar: ConsultarView,
  situacion: SituacionView,
  canvas: CanvasView,
  comparar: CompararView,
  mapa: MapaView,
  explorador: ExploradorView,
  historial: HistorialView,
  admin: AdminView,
  practica: PracticaView,
}

function App() {
  const vistaActiva = useStore((s) => s.vistaActiva)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const temaColor = useStore((s) => s.temaColor)
  const VistaComponente = vistas[vistaActiva]

  // Aplicar el tema de color al :root cada vez que cambia. Se ejecuta también
  // al montar la app, así si el usuario tenía guardada una preferencia previa
  // (vía persist), la app aparece con su tema desde el primer pintado.
  useEffect(() => {
    aplicarTema(temaColor)
  }, [temaColor])

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden ${modoOscuro ? 'dark' : ''} ${
        modoOscuro ? 'bg-zinc-950' : 'bg-zinc-50'
      }`}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <VistaComponente />
        </main>
      </div>
      <ModalPerfil />
    </div>
  )
}

export default App

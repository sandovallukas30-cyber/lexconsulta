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
import { AnimatePresence } from 'framer-motion'
import { useStore } from './store/useStore'
import { aplicarTema } from './theme'
import { Omnibar } from './components/ui/Omnibar'
import { RightSidebar } from './components/layout/RightSidebar'
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
  const omnibarAbierto = useStore((s) => s.omnibarAbierto)
  const setOmnibarAbierto = useStore((s) => s.setOmnibarAbierto)
  const VistaComponente = vistas[vistaActiva]

  // Aplicar el tema de color al :root cada vez que cambia. Se ejecuta también
  // al montar la app, así si el usuario tenía guardada una preferencia previa
  // (vía persist), la app aparece con su tema desde el primer pintado.
  useEffect(() => {
    aplicarTema(temaColor)
  }, [temaColor])

  // Atajo global: Cmd/Ctrl+K para abrir Omnibar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOmnibarAbierto(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setOmnibarAbierto])

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden ${modoOscuro ? 'dark' : ''} ${
        modoOscuro ? 'bg-zinc-950' : 'bg-zinc-50'
      }`}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <VistaComponente />
          </main>
          <RightSidebar />
        </div>
      </div>
      <ModalPerfil />
      <AnimatePresence>
        {omnibarAbierto && <Omnibar onClose={() => setOmnibarAbierto(false)} />}
      </AnimatePresence>
    </div>
  )
}

export default App

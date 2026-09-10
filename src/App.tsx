import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { ModalPerfil } from './components/ui/ModalPerfil'
import { ModalRegistro } from './components/ui/ModalRegistro'
import { ConsultarView } from './components/views/ConsultarView'
import { SituacionView } from './components/views/SituacionView'
import { CanvasView } from './components/views/CanvasView'
import { MapaView } from './components/views/MapaView'
import { ExploradorView } from './components/views/ExploradorView'
import { ColeccionesView, ModalConfirmarImportacion } from './components/views/ColeccionesView'
import { PARAM_IMPORTAR, decodificarColeccion } from './services/compartirColeccion'
import type { ColeccionCompartida } from './types'
import { MapasMentalesView } from './components/views/MapasMentalesView'
import { HistorialView } from './components/views/HistorialView'
import { AdminView } from './components/views/AdminView'
import { PracticaView } from './components/views/PracticaView'
import { PlazosView } from './components/views/PlazosView'
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from './store/useStore'
import { aplicarTema } from './theme'
import { Omnibar } from './components/ui/Omnibar'
import { RightSidebar } from './components/layout/RightSidebar'
import { esAdmin } from './config/admin'
import type { VistaId } from './types'

const vistas: Record<VistaId, React.ComponentType> = {
  consultar: ConsultarView,
  situacion: SituacionView,
  canvas: CanvasView,
  mapa: MapaView,
  explorador: ExploradorView,
  colecciones: ColeccionesView,
  mapasmentales: MapasMentalesView,
  historial: HistorialView,
  admin: AdminView,
  practica: PracticaView,
  plazos: PlazosView,
}

function App() {
  const vistaActiva = useStore((s) => s.vistaActiva)
  const usuarioEmail = useStore((s) => s.usuarioEmail)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const temaColor = useStore((s) => s.temaColor)
  const omnibarAbierto = useStore((s) => s.omnibarAbierto)
  const setOmnibarAbierto = useStore((s) => s.setOmnibarAbierto)
  const importarColeccion = useStore((s) => s.importarColeccion)
  const setColeccionActiva = useStore((s) => s.setColeccionActiva)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const VistaComponente = vistaActiva === 'admin' && !esAdmin(usuarioEmail) ? vistas.consultar : vistas[vistaActiva]
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState(false)
  const [coleccionParaImportar, setColeccionParaImportar] = useState<ColeccionCompartida | null>(null)

  // Detecta un link de Colección compartida (?colImportar=...) al entrar a
  // la app — a nivel raíz, no dentro de ColeccionesView, porque la vista
  // por defecto es Consultar: si esto viviera adentro de esa vista, un link
  // abierto por alguien que nunca usó la app antes (el caso típico al
  // compartir) nunca lo detectaría. No importa directo: primero se
  // confirma con el usuario (ModalConfirmarImportacion), para que abrir el
  // link de alguien no agregue una colección sin avisar. El parámetro se
  // saca de la URL apenas se lee (haya salido válido o no), para que
  // recargar la página no vuelva a preguntar ni a repetir el mismo error.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const crudo = params.get(PARAM_IMPORTAR)
    if (crudo === null) return
    params.delete(PARAM_IMPORTAR)
    const nuevaQuery = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (nuevaQuery ? `?${nuevaQuery}` : '') + window.location.hash)
    const decodificada = decodificarColeccion(crudo)
    if (decodificada) setColeccionParaImportar(decodificada)
    else alert('El link de colección compartida no es válido o está dañado.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        <Topbar onAbrirRegistro={() => setModalRegistroAbierto(true)} />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <VistaComponente />
          </main>
          <RightSidebar />
        </div>
      </div>
      <ModalPerfil />
      <ModalRegistro abierto={modalRegistroAbierto} onCerrar={() => setModalRegistroAbierto(false)} />
      <AnimatePresence>
        {omnibarAbierto && <Omnibar onClose={() => setOmnibarAbierto(false)} />}
      </AnimatePresence>
      {coleccionParaImportar && (
        <ModalConfirmarImportacion
          compartida={coleccionParaImportar}
          onCancelar={() => setColeccionParaImportar(null)}
          onConfirmar={() => {
            const id = importarColeccion(coleccionParaImportar)
            setColeccionParaImportar(null)
            setColeccionActiva(id)
            setVistaActiva('colecciones')
          }}
        />
      )}
    </div>
  )
}

export default App

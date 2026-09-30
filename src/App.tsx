import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { ModalPerfil } from './components/ui/ModalPerfil'
import { ModalRegistro } from './components/ui/ModalRegistro'
import { PARAM_IMPORTAR, decodificarColeccion } from './services/compartirColeccion'
import type { ColeccionCompartida } from './types'
import { useState, useEffect, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from './store/useStore'
import { avisar } from './store/useAvisos'
import { aplicarTema } from './theme'
import { Omnibar } from './components/ui/Omnibar'
import { PanelAtajos } from './components/ui/PanelAtajos'
import { Avisos } from './components/ui/Avisos'
import { RightSidebar } from './components/layout/RightSidebar'
import { esAdmin } from './config/admin'
import { vistas } from './vistas'
import { LimiteError } from './components/ui/LimiteError'

// solo se descarga si alguien abre un enlace para importar una colección
const ModalConfirmarImportacion = lazy(() =>
  import('./components/views/ColeccionesView').then((m) => ({ default: m.ModalConfirmarImportacion }))
)

/** Mientras baja el chunk de la vista: el mismo fondo, sin saltos. */
function CargandoVista({ modoOscuro }: { modoOscuro: boolean }) {
  return <div className={`h-full ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`} aria-busy="true" aria-label="Cargando" />
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
    else avisar.error('El link de colección compartida no es válido o está dañado.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Aplicar el tema de color al :root cada vez que cambia. Se ejecuta también
  // al montar la app, así si el usuario tenía guardada una preferencia previa
  // (vía persist), la app aparece con su tema desde el primer pintado.
  useEffect(() => {
    aplicarTema(temaColor)
  }, [temaColor])

  // El tema también en <html>: los modales y avisos van por portal fuera
  // del div .dark de abajo y los tokens de index.css lo leen de acá.
  useEffect(() => {
    document.documentElement.dataset.tema = modoOscuro ? 'oscuro' : 'claro'
  }, [modoOscuro])

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
            <LimiteError key={vistaActiva} modoOscuro={modoOscuro}>
              <Suspense fallback={<CargandoVista modoOscuro={modoOscuro} />}>
                <VistaComponente />
              </Suspense>
            </LimiteError>
          </main>
          <RightSidebar />
        </div>
      </div>
      <ModalPerfil />
      <Avisos />
      <PanelAtajos />
      <ModalRegistro abierto={modalRegistroAbierto} onCerrar={() => setModalRegistroAbierto(false)} />
      <AnimatePresence>
        {omnibarAbierto && <Omnibar onClose={() => setOmnibarAbierto(false)} />}
      </AnimatePresence>
      {coleccionParaImportar && (
        <Suspense fallback={null}>
        <ModalConfirmarImportacion
          compartida={coleccionParaImportar}
          onCancelar={() => setColeccionParaImportar(null)}
          onConfirmar={() => {
            const id = importarColeccion(coleccionParaImportar)
            avisar.exito(`Colección "${coleccionParaImportar.titulo}" importada`)
            setColeccionParaImportar(null)
            setColeccionActiva(id)
            setVistaActiva('colecciones')
          }}
        />
        </Suspense>
      )}
    </div>
  )
}

export default App

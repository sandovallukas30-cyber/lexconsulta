import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { PARAM_IMPORTAR, decodificarColeccion } from './services/compartirColeccion'
import type { ColeccionCompartida } from './types'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from './store/useStore'
import { useAplicarAjustes } from './hooks/useAplicarAjustes'
import { useRecordatorios } from './hooks/useRecordatorios'
import { useCuentaInit } from './hooks/useCuentaInit'
import { ModalCuenta } from './components/ui/ModalCuenta'
import { useSala, PARAM_SALA } from './store/useSala'
import { avisar } from './store/useAvisos'
import { aplicarTema } from './theme'
import { Omnibar } from './components/ui/Omnibar'
import { PanelAtajos } from './components/ui/PanelAtajos'
import { Avisos } from './components/ui/Avisos'
import { RightSidebar } from './components/layout/RightSidebar'
import { esAdmin } from './config/admin'
import { useCuenta } from './store/useCuenta'
import { useRutas } from './hooks/useRutas'
import { BarraInferior } from './components/layout/BarraInferior'
import { vistas } from './vistas'
import { useMotorEnfoque } from './hooks/useMotorEnfoque'
import { LimiteError } from './components/ui/LimiteError'

// solo se descarga si alguien abre un enlace para importar una colección
const ModalConfirmarImportacion = lazy(() =>
  import('./components/views/ColeccionesView').then((m) => ({ default: m.ModalConfirmarImportacion }))
)

/** Mientras baja el chunk de la vista: el mismo fondo, sin saltos. */
/** Mientras llega el código de la vista: un esqueleto con la forma de la
 *  pantalla (título, tarjetas) que aparece solo si la espera se nota. */
function CargandoVista({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <div className={`h-full overflow-hidden ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`} role="status" aria-busy="true" aria-label="Cargando">
      <div className="esqueleto-contenedor max-w-3xl mx-auto px-6 py-8 space-y-5">
        <div className="esqueleto-bloque h-8 w-56" />
        <div className="esqueleto-bloque h-4 w-80 max-w-full" />
        <div className="esqueleto-bloque h-24 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <div className="esqueleto-bloque h-32" />
          <div className="esqueleto-bloque h-32" />
        </div>
        <div className="esqueleto-bloque h-20 w-full" />
      </div>
    </div>
  )
}

const SalaEstudio = lazy(() => import('./components/enfoque/SalaEstudio').then((m) => ({ default: m.SalaEstudio })))

function App() {
  useMotorEnfoque()
  useAplicarAjustes()
  useRutas()
  useRecordatorios()
  useCuentaInit()
  const vistaActiva = useStore((s) => s.vistaActiva)
  // el acceso a Administración va con el correo confirmado de la cuenta (Supabase)
  const usuarioEmail = useCuenta((s) => s.perfil?.email ?? null)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const temaColor = useStore((s) => s.temaColor)
  const omnibarAbierto = useStore((s) => s.omnibarAbierto)
  const setOmnibarAbierto = useStore((s) => s.setOmnibarAbierto)
  const importarColeccion = useStore((s) => s.importarColeccion)
  const setColeccionActiva = useStore((s) => s.setColeccionActiva)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const VistaComponente = vistaActiva === 'admin' && !esAdmin(usuarioEmail) ? vistas.modulos : vistas[vistaActiva]
  const salaAbierta = useSala((s) => s.abierta)

  // enlace compartido de la sala de estudio (?sala=<video>): abre la sala con ese video
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const video = params.get(PARAM_SALA)
    if (video === null) return
    params.delete(PARAM_SALA)
    const q = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : '') + window.location.hash)
    setVistaActiva('enfoque')
    useSala.getState().abrir(video.slice(0, 500))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [coleccionParaImportar, setColeccionParaImportar] = useState<ColeccionCompartida | null>(null)

  // Detecta un link de Colección compartida (?colImportar=...) al entrar a
  // la app — a nivel raíz, no dentro de ColeccionesView, porque la vista
  // por defecto es Módulos: si esto viviera adentro de esa vista, un link
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
  // Al cambiar de sección el foco pasa al contenido nuevo (antes caía al <body> y había que recorrer todo con Tab otra vez)
  const refContenido = useRef<HTMLElement>(null)
  const primeraVista = useRef(true)
  useEffect(() => {
    if (primeraVista.current) {
      primeraVista.current = false
      return
    }
    refContenido.current?.focus({ preventScroll: true })
  }, [vistaActiva])

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
      className={`flex h-full w-full overflow-hidden bg-[var(--neu-bg)] ${modoOscuro ? 'dark' : ''}`}
    >
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Topbar />
        <div className="flex-1 flex overflow-hidden">
          <main id="contenido" ref={refContenido} tabIndex={-1} data-vista={vistaActiva} className="flex-1 overflow-y-auto outline-none">
            <LimiteError key={vistaActiva} modoOscuro={modoOscuro}>
              <Suspense fallback={<CargandoVista modoOscuro={modoOscuro} />}>
                <VistaComponente />
              </Suspense>
            </LimiteError>
          </main>
          <RightSidebar />
        </div>
        <BarraInferior />
      </div>
      <AnimatePresence>
        {salaAbierta && (
          <Suspense key="sala" fallback={null}>
            <SalaEstudio />
          </Suspense>
        )}
      </AnimatePresence>
      <ModalCuenta />
      <Avisos />
      <PanelAtajos />
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

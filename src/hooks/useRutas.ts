import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { RUTAS, TITULO_APP, tituloDeVista, vistaDeRuta } from '../services/rutas'
import { useEnfoque } from '../store/useEnfoque'

// La dirección con la que se abrió la página, leída una sola vez (los efectos de React corren dos veces en
// desarrollo y el segundo pasaría ya con la dirección reescrita por el primero).
const RUTA_INICIAL = typeof window === 'undefined' ? '/' : window.location.pathname

/** Sincroniza la sección activa con la dirección del navegador (cada sección tiene su URL, el botón Atrás
 *  funciona) y con el título de la pestaña. Se monta una vez en App. */
export function useRutas() {
  const vista = useStore((s) => s.vistaActiva)
  const setVista = useStore((s) => s.setVistaActiva)
  const primera = useRef(true)
  const [listo, setListo] = useState(false)

  // al abrir una dirección de sección (/tareas…), se entra a esa sección; «/» deja la última usada
  useEffect(() => {
    const pedida = vistaDeRuta(RUTA_INICIAL)
    if (pedida && pedida !== useStore.getState().vistaActiva) setVista(pedida)
    setListo(true)
  }, [setVista])

  // Atrás / Adelante del navegador
  useEffect(() => {
    const alNavegar = () => setVista(vistaDeRuta(window.location.pathname) ?? 'hoy')
    window.addEventListener('popstate', alNavegar)
    return () => window.removeEventListener('popstate', alNavegar)
  }, [setVista])

  // sección → dirección y título
  useEffect(() => {
    if (!listo) return
    const ruta = RUTAS[vista]
    if (window.location.pathname !== ruta) {
      // la primera vez se reemplaza (no ensucia el historial); conserva ?consulta y #ancla (enlaces compartidos)
      const destino = ruta + window.location.search + window.location.hash
      if (primera.current) window.history.replaceState(null, '', destino)
      else window.history.pushState(null, '', destino)
    }
    primera.current = false
    const titulo = vista === 'hoy' ? TITULO_APP : tituloDeVista(vista)
    document.documentElement.dataset.tituloBase = titulo
    // si hay un temporizador en marcha o en pausa, el título lo muestra el motor de Enfoque
    if (useEnfoque.getState().estado === 'detenido') document.title = titulo
  }, [vista, listo])
}

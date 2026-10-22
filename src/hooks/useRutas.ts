import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { RUTAS, TITULO_APP, tituloDeVista, vistaDeRuta } from '../services/rutas'
import { useEnfoque } from '../store/useEnfoque'
import { obtenerMetadata } from '../data/codigosMetadata'
import type { CodigoTipo } from '../types'

// La dirección con la que se abrió la página, leída una sola vez (los efectos de React corren dos veces en
// desarrollo y el segundo pasaría ya con la dirección reescrita por el primero).
const RUTA_INICIAL = typeof window === 'undefined' ? '/' : window.location.pathname
const BUSQUEDA_INICIAL = typeof window === 'undefined' ? '' : window.location.search

/** El Explorador guarda en la dirección qué código y artículo se leen (`?codigo=…&art=…`) para poder
 *  compartir un enlace al artículo. En las demás secciones esos datos sobran. */
function sinDatosDelExplorador(busqueda: string): string {
  const p = new URLSearchParams(busqueda)
  p.delete('codigo')
  p.delete('art')
  const s = p.toString()
  return s ? `?${s}` : ''
}

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
    if (pedida === 'explorador') {
      // enlace a un artículo: /explorador?codigo=codigoCivil&art=Art.%201545
      const p = new URLSearchParams(BUSQUEDA_INICIAL)
      const codigo = p.get('codigo')
      const art = p.get('art')
      if (codigo && obtenerMetadata(codigo as CodigoTipo)?.nombreOficial) {
        if (art) useStore.getState().abrirArticuloEnExplorador(codigo as CodigoTipo, art)
        else useStore.getState().setCodigoExplorador(codigo as CodigoTipo)
      }
    }
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
      const busqueda = vista === 'explorador' ? window.location.search : sinDatosDelExplorador(window.location.search)
      const destino = ruta + busqueda + window.location.hash
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

import { useEffect } from 'react'
import { useAjustes, prefiereMenosMovimiento } from '../store/useAjustes'

/** Pasa los ajustes de interfaz (useAjustes) al documento: atributos en
 *  <html> que lee neumorfismo.css y el zoom de toda la página. Se monta una
 *  vez en App. */
export function useAplicarAjustes() {
  const zoom = useAjustes((s) => s.zoom)
  const estilo = useAjustes((s) => s.estilo)
  const contraste = useAjustes((s) => s.contraste)
  const animaciones = useAjustes((s) => s.animaciones)

  useEffect(() => {
    const el = document.documentElement
    el.style.zoom = zoom === 1 ? '' : String(zoom)
    el.style.setProperty('--zoom', String(zoom))

    // Cuánto se encogen las unidades vh/vw con el zoom depende del navegador (Safari del iPad y
    // Chrome no coinciden). En vez de suponerlo, se mide: una caja de 100vw se compara con la ventana.
    // --zoom-vu = 1 si las unidades ya vienen ajustadas, = zoom si no (lo que usa neumorfismo.css).
    const medir = () => {
      const sonda = document.createElement('div')
      sonda.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:0;visibility:hidden;pointer-events:none'
      document.body.appendChild(sonda)
      const ancho = sonda.getBoundingClientRect().width
      sonda.remove()
      const r = window.innerWidth > 0 && ancho > 0 ? ancho / window.innerWidth : zoom
      // entre 0,5 y 2: valores fuera de ese rango son una medición fallida
      el.style.setProperty('--zoom-vu', String(r >= 0.5 && r <= 2 ? Math.round(r * 1000) / 1000 : zoom))
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [zoom])

  useEffect(() => {
    const el = document.documentElement
    el.dataset.estilo = estilo
    el.dataset.contraste = contraste ? 'si' : 'no'
    el.dataset.animaciones = animaciones && !prefiereMenosMovimiento() ? 'si' : 'no'
  }, [estilo, contraste, animaciones])
}

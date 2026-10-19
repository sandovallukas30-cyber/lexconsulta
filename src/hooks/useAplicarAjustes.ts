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
    const tactil = window.matchMedia('(pointer: coarse)').matches
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')

    // En iPad y celular el zoom de la app es un zoom REAL de pantalla: se cambia el ancho que el navegador
    // da a la página (meta viewport). Así, al achicar, la app se cree una pantalla más ancha y reacomoda las
    // columnas; al agrandar, pasa a la distribución de una pantalla más chica. Con el `zoom` de CSS solo
    // cambiaba el tamaño de las cosas, no su distribución. En computador se sigue usando el zoom de CSS.
    let cancelado = false
    const BASE = 'width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content'
    const aplicarVista = async () => {
      if (!meta) return
      meta.setAttribute('content', BASE)
      if (zoom === 1) return
      // se espera a que el navegador acepte el ancho base para medirlo (el de la pantalla en su giro actual)
      await new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())))
      if (cancelado) return
      const base = window.innerWidth
      if (!(base > 0)) return
      meta.setAttribute('content', `width=${Math.round(base / zoom)}, initial-scale=${zoom}, minimum-scale=${Math.min(zoom, 1)}, viewport-fit=cover, interactive-widget=resizes-content`)
    }

    if (tactil && meta) {
      el.style.zoom = ''
      el.style.setProperty('--zoom', '1')
      void aplicarVista()
      // al girar la pantalla, se vuelve a medir
      const girar = () => void aplicarVista()
      window.addEventListener('orientationchange', girar)
      return () => {
        cancelado = true
        window.removeEventListener('orientationchange', girar)
      }
    }

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

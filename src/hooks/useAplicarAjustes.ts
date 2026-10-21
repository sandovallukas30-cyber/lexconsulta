import { useEffect } from 'react'
import { useAjustes, prefiereMenosMovimiento } from '../store/useAjustes'

// Ancho (en px CSS) que se pidió con el meta viewport para el zoom táctil; null = vista normal. Vive fuera del hook
// para que sobreviva a los re-montajes del efecto.
let anchoAplicado: number | null = null
let corrida = 0
const esperarCuadros = (n: number) =>
  new Promise<void>((ok) => {
    const paso = (i: number) => (i <= 0 ? ok() : requestAnimationFrame(() => paso(i - 1)))
    paso(n)
  })

/** Pasa los ajustes de interfaz (useAjustes) al documento: atributos en
 *  <html> que lee base.css y el zoom de toda la página. Se monta una
 *  vez en App. */
export function useAplicarAjustes() {
  const zoom = useAjustes((s) => s.zoom)
  const contraste = useAjustes((s) => s.contraste)
  const animaciones = useAjustes((s) => s.animaciones)

  // Salida de emergencia: abrir la web con «?sinzoom» devuelve el tamaño de la interfaz a normal (por si una vista
  // quedó descuadrada y no se alcanzan los ajustes).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('sinzoom') && useAjustes.getState().zoom !== 1) useAjustes.getState().set({ zoom: 1 })
  }, [])

  useEffect(() => {
    const el = document.documentElement
    const tactil = window.matchMedia('(pointer: coarse)').matches
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')

    // En iPad y celular el zoom de la app es un zoom REAL de pantalla: se cambia el ancho que el navegador
    // da a la página (meta viewport). Así, al achicar, la app se cree una pantalla más ancha y reacomoda las
    // columnas; al agrandar, pasa a la distribución de una pantalla más chica. Con el `zoom` de CSS solo
    // cambiaba el tamaño de las cosas, no su distribución. En computador se sigue usando el zoom de CSS.
    let cancelado = false
    // minimum-scale=1: el navegador no puede «achicar para que quepa» (así se descuadraba la página, abarcando mucho más de lo debido)
    const BASE = 'width=device-width, initial-scale=1.0, minimum-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content'
    const aplicarVista = async () => {
      if (!meta) return
      const mia = ++corrida
      const previo = anchoAplicado
      // si el valor ya era el mismo, Safari no recalcula: se pasa primero por otro para forzarlo
      meta.setAttribute('content', 'width=device-width, initial-scale=1.0')
      meta.setAttribute('content', BASE)
      anchoAplicado = null
      if (zoom === 1) return
      // Se mide el ancho real de la pantalla, pero solo cuando el navegador YA aceptó el ancho normal: si se mide antes,
      // se lee el ancho de la vista con zoom y el cálculo se acumula (cada vuelta de otra app la dejaba más ancha que
      // la pantalla y se cortaba el lado derecho).
      let base = 0
      for (let i = 0; i < 25; i++) {
        await esperarCuadros(3)
        if (cancelado || mia !== corrida) return
        const w = window.innerWidth
        if (previo === null || w !== previo) {
          base = w
          break
        }
      }
      // si no se pudo medir con seguridad, se deja la vista normal (sin zoom) en vez de adivinar
      if (!(base >= 300 && base <= 3000)) return
      const ancho = Math.round(base / zoom)
      meta.setAttribute('content', `width=${ancho}, initial-scale=${zoom}, minimum-scale=${Math.min(zoom, 1)}, viewport-fit=cover, interactive-widget=resizes-content`)
      anchoAplicado = ancho
      // comprobación: si el navegador no tomó el ancho pedido, se vuelve a la vista normal
      await esperarCuadros(6)
      if (cancelado || mia !== corrida) return
      if (Math.abs(window.innerWidth - ancho) > 3) {
        meta.setAttribute('content', BASE)
        anchoAplicado = null
      }
    }

    if (tactil && meta) {
      el.style.zoom = ''
      el.style.setProperty('--zoom', '1')
      void aplicarVista()
      // al girar la pantalla, se vuelve a medir
      const girar = () => void aplicarVista()
      // al volver de otra app (iPad), Safari a veces deja la vista con otro ancho: se reaplica
      const volver = () => {
        if (document.visibilityState === 'visible') void aplicarVista()
      }
      window.addEventListener('orientationchange', girar)
      window.addEventListener('pageshow', girar)
      document.addEventListener('visibilitychange', volver)
      return () => {
        cancelado = true
        window.removeEventListener('orientationchange', girar)
        window.removeEventListener('pageshow', girar)
        document.removeEventListener('visibilitychange', volver)
      }
    }

    el.style.zoom = zoom === 1 ? '' : String(zoom)
    el.style.setProperty('--zoom', String(zoom))

    // Cuánto se encogen las unidades vh/vw con el zoom depende del navegador (Safari del iPad y
    // Chrome no coinciden). En vez de suponerlo, se mide: una caja de 100vw se compara con la ventana.
    // --zoom-vu = 1 si las unidades ya vienen ajustadas, = zoom si no (lo que usa base.css).
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
    el.dataset.contraste = contraste ? 'si' : 'no'
    el.dataset.animaciones = animaciones && !prefiereMenosMovimiento() ? 'si' : 'no'
  }, [contraste, animaciones])
}

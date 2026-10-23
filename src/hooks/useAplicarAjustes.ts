import { useEffect } from 'react'
import { useAjustes, prefiereMenosMovimiento } from '../store/useAjustes'
import { cargarFuenteLectura, esFuenteLectura, FUENTE_LECTURA_DEFECTO } from '../services/fuentesLectura'

/** Pasa los ajustes de interfaz (useAjustes) al documento: atributos en
 *  <html> que lee base.css y el zoom de toda la página. Se monta una
 *  vez en App. */
export function useAplicarAjustes() {
  const zoom = useAjustes((s) => s.zoom)
  const contraste = useAjustes((s) => s.contraste)
  const animaciones = useAjustes((s) => s.animaciones)
  const fuenteLectura = useAjustes((s) => s.fuenteLectura)

  // Salida de emergencia: abrir la web con «?sinzoom» devuelve el tamaño de la interfaz a normal (por si una vista
  // quedó descuadrada y no se alcanzan los ajustes).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('sinzoom') && useAjustes.getState().zoom !== 1) useAjustes.getState().set({ zoom: 1 })
  }, [])

  useEffect(() => {
    const el = document.documentElement
    // El tamaño de la interfaz es el `zoom` de CSS en todos los dispositivos, también en iPad y celular. Antes, en
    // táctil se pedía a Safari un ancho de pantalla fijo (meta viewport) calculado una vez; al minimizar la app,
    // girarla o dividir la pantalla, ese ancho quedaba desfasado y la interfaz se descuadraba o no se adaptaba a la
    // división. Con el viewport siempre en «ancho del dispositivo», el navegador reacomoda solo.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    meta?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content')

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

  // Letra de lectura: un valor guardado que ya no exista vuelve a la clásica
  useEffect(() => {
    const id = esFuenteLectura(fuenteLectura) ? fuenteLectura : FUENTE_LECTURA_DEFECTO
    document.documentElement.dataset.fuenteLectura = id
    void cargarFuenteLectura(id)
  }, [fuenteLectura])
}

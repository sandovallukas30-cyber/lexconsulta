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
  }, [zoom])

  useEffect(() => {
    const el = document.documentElement
    el.dataset.estilo = estilo
    el.dataset.contraste = contraste ? 'si' : 'no'
    el.dataset.animaciones = animaciones && !prefiereMenosMovimiento() ? 'si' : 'no'
  }, [estilo, contraste, animaciones])
}

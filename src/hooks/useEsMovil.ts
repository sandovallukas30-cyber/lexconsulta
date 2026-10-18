import { useSyncExternalStore } from 'react'

/** Ancho bajo el cual el sidebar pasa a ser un panel deslizable (C6). Llega
 *  hasta 1099 px para cubrir iPad vertical (744-1024): con el menú fijo de
 *  296 px el contenido quedaba en ~520 px. Debe coincidir con la variante
 *  `escritorio` de index.css. */
const CONSULTA_MOVIL = '(max-width: 1099px)'

function suscribir(avisar: () => void) {
  const mq = window.matchMedia(CONSULTA_MOVIL)
  mq.addEventListener('change', avisar)
  return () => mq.removeEventListener('change', avisar)
}

/** true en pantallas de menos de 1100 px (móvil y tablet vertical) (se actualiza al girar/redimensionar). */
export function useEsMovil(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA_MOVIL).matches,
    () => false
  )
}

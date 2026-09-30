import { useSyncExternalStore } from 'react'

/** Ancho bajo el cual el sidebar pasa a ser un panel deslizable (C6). */
const CONSULTA_MOVIL = '(max-width: 767px)'

function suscribir(avisar: () => void) {
  const mq = window.matchMedia(CONSULTA_MOVIL)
  mq.addEventListener('change', avisar)
  return () => mq.removeEventListener('change', avisar)
}

/** true en pantallas de menos de 768 px (se actualiza al girar/redimensionar). */
export function useEsMovil(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA_MOVIL).matches,
    () => false
  )
}

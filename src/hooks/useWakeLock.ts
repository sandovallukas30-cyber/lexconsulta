import { useEffect } from 'react'

/** Evita que la pantalla se apague sola mientras `activo` es true -- típico
 *  dejando la tablet apoyada en la mesa mientras se lee. El sistema libera
 *  el lock solo al cambiar de pestaña/app; si se sigue activo al volver, se
 *  vuelve a pedir. Antes vivía como un efecto suelto dentro de
 *  ModoLecturaOverlay en ExploradorView.tsx -- se sacó a un hook para que
 *  el modo lectura de Apuntes (ModoLecturaApunte) lo use igual, sin
 *  duplicar la lógica de permisos/reintentos. */
export function useWakeLock(activo: boolean) {
  useEffect(() => {
    if (!activo || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let vigente = true
    const pedir = async () => {
      try {
        const s = await navigator.wakeLock.request('screen')
        if (vigente) sentinel = s
        else s.release().catch(() => {})
      } catch {
        // Sin permiso, o documento no visible en ese instante -- no es
        // crítico, simplemente no se evita que la pantalla se apague.
      }
    }
    pedir()
    const alVolverVisible = () => {
      if (document.visibilityState === 'visible' && !sentinel) pedir()
    }
    document.addEventListener('visibilitychange', alVolverVisible)
    return () => {
      vigente = false
      document.removeEventListener('visibilitychange', alVolverVisible)
      sentinel?.release().catch(() => {})
    }
  }, [activo])
}

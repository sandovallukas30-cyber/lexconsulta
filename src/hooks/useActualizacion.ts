import { useEffect } from 'react'
import { useAvisos } from '../store/useAvisos'

const AUSENCIA_LARGA_MS = 30 * 60_000
const PATRON_PRINCIPAL = /\/assets\/index-[\w-]+\.js/

/** En un iPad o un celular la app puede quedar abierta días en segundo plano con el código viejo (volver a ella no
 *  recarga la página). Al volver, y cada 15 minutos, se mira si el sitio publicó una versión nueva y, si es así, se
 *  ofrece actualizar. Solo en producción. */
export function useActualizacion() {
  useEffect(() => {
    if (!import.meta.env.PROD) return
    const actual = [...document.scripts].map((s) => s.src).find((s) => PATRON_PRINCIPAL.test(s))
    const archivoActual = actual ? PATRON_PRINCIPAL.exec(actual)?.[0] : null
    if (!archivoActual) return

    let avisado: string | null = null
    const revisar = async (recargarSiNueva = false) => {
      try {
        const html = await (await fetch('/', { cache: 'no-store' })).text()
        const nuevo = PATRON_PRINCIPAL.exec(html)?.[0]
        if (!nuevo || nuevo === archivoActual || nuevo === avisado) return
        avisado = nuevo
        // volvió tras un rato largo fuera: nada en pantalla se interrumpe, se actualiza solo
        if (recargarSiNueva) { window.location.reload(); return }
        useAvisos.getState().mostrar({
          tipo: 'info',
          mensaje: 'Hay una versión nueva de Prima Lex.',
          duracionMs: 120_000,
          accion: { etiqueta: 'Actualizar', alPulsar: () => window.location.reload() },
        })
      } catch {
        // sin conexión: se vuelve a intentar más tarde
      }
    }

    let oculta = 0
    const alVolver = () => {
      if (document.visibilityState === 'hidden') { oculta = Date.now(); return }
      const larga = oculta > 0 && Date.now() - oculta > AUSENCIA_LARGA_MS
      oculta = 0
      void revisar(larga)
    }
    document.addEventListener('visibilitychange', alVolver)
    const id = window.setInterval(() => void revisar(), 15 * 60_000)
    const inicio = window.setTimeout(() => void revisar(), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      window.clearInterval(id)
      window.clearTimeout(inicio)
    }
  }, [])
}

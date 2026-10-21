import { useEffect } from 'react'
import { useAvisos } from '../store/useAvisos'

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
    const revisar = async () => {
      try {
        const html = await (await fetch('/', { cache: 'no-store' })).text()
        const nuevo = PATRON_PRINCIPAL.exec(html)?.[0]
        if (!nuevo || nuevo === archivoActual || nuevo === avisado) return
        avisado = nuevo
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

    const alVolver = () => {
      if (document.visibilityState === 'visible') void revisar()
    }
    document.addEventListener('visibilitychange', alVolver)
    const id = window.setInterval(revisar, 15 * 60_000)
    const inicio = window.setTimeout(revisar, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      window.clearInterval(id)
      window.clearTimeout(inicio)
    }
  }, [])
}

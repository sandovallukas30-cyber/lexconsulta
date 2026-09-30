import { useEffect } from 'react'

/** Impresión de UNA pieza (C9): un artículo o un apunte, sin barras ni menús.
 *
 *  Todas las vistas imprimibles viven fuera de #root (portal a body) y
 *  index.css oculta #root al imprimir. Las antiguas (código completo,
 *  colección, mapa mental) se muestran siempre que existan; las nuevas solo
 *  cuando `body[data-imprimir]` las pide, y ese atributo además oculta las
 *  antiguas -- así "Imprimir artículo" no imprime también el código entero
 *  que el Explorador tiene montado. */
export type ModoImpresion = 'articulo' | 'apunte'

export function imprimir(modo: ModoImpresion) {
  document.body.dataset.imprimir = modo
  const fin = () => {
    delete document.body.dataset.imprimir
    window.removeEventListener('afterprint', fin)
  }
  window.addEventListener('afterprint', fin)
  window.print()
}

/** Mientras `activo`, Ctrl+P (o Archivo → Imprimir) imprime `modo` en vez
 *  de una hoja en blanco. */
export function useImprimirConCtrlP(modo: ModoImpresion, activo: boolean) {
  useEffect(() => {
    if (!activo) return
    const antes = () => {
      if (!document.body.dataset.imprimir) document.body.dataset.imprimir = modo
    }
    const despues = () => {
      if (document.body.dataset.imprimir === modo) delete document.body.dataset.imprimir
    }
    window.addEventListener('beforeprint', antes)
    window.addEventListener('afterprint', despues)
    return () => {
      window.removeEventListener('beforeprint', antes)
      window.removeEventListener('afterprint', despues)
    }
  }, [modo, activo])
}

import { normalizarConMapa, normalizarConsulta } from './buscarApuntes'

/** Resaltado de una coincidencia de búsqueda dentro del DOM (Modo Lectura de
 *  apuntes y artículo del Explorador), con la CSS Custom Highlight API
 *  (`::highlight(prima-busqueda)` en index.css). */

/** Primera aparición de `consulta` (sin tildes ni mayúsculas) dentro de
 *  `raiz`, como Range del DOM -- busca nodo de texto por nodo de texto. */
export function rangoDeCoincidencia(raiz: HTMLElement, consulta: string): Range | null {
  const palabras = normalizarConsulta(consulta)
  if (palabras.length === 0) return null
  // primero la frase completa; si no está en un mismo nodo, la primera palabra
  const candidatos = palabras.length > 1 ? [palabras.join(' '), palabras[0]] : [palabras[0]]
  for (const buscado of candidatos) {
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const texto = n.textContent ?? ''
      const { norm, mapa } = normalizarConMapa(texto)
      const i = norm.indexOf(buscado)
      if (i < 0) continue
      const rango = document.createRange()
      rango.setStart(n, mapa[i])
      rango.setEnd(n, mapa[i + buscado.length - 1] + 1)
      return rango
    }
  }
  return null
}

type ApiResaltado = { highlights?: Map<string, unknown> }

/** Marca la primera coincidencia y la centra en pantalla. Si el navegador no
 *  tiene la Highlight API, la deja seleccionada. Devuelve si la encontró. */
export function resaltarCoincidencia(raiz: HTMLElement, consulta: string): boolean {
  const rango = rangoDeCoincidencia(raiz, consulta)
  if (!rango) return false
  ;(rango.startContainer.parentElement ?? raiz).scrollIntoView({ block: 'center' })
  const api = (globalThis as { CSS?: ApiResaltado }).CSS?.highlights
  const Resaltado = (globalThis as { Highlight?: new (r: Range) => unknown }).Highlight
  if (api && Resaltado) api.set('prima-busqueda', new Resaltado(rango))
  else {
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(rango)
  }
  return true
}

export function quitarResaltado() {
  ;(globalThis as { CSS?: ApiResaltado }).CSS?.highlights?.delete('prima-busqueda')
}

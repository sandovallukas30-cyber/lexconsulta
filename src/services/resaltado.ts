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
type ConstructorResaltado = new (...r: Range[]) => unknown

/** Todas las apariciones de la búsqueda dentro de `raiz`: la frase completa si está; si no, cada palabra suelta
 *  (con un tope, para que un texto enorme no se llene de marcas). */
export function rangosDeCoincidencias(raiz: HTMLElement, consulta: string, tope = 200): Range[] {
  const palabras = normalizarConsulta(consulta)
  if (palabras.length === 0) return []
  const recorrer = (buscados: string[]) => {
    const rangos: Range[] = []
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n && rangos.length < tope; n = walker.nextNode()) {
      const texto = n.textContent ?? ''
      const { norm, mapa } = normalizarConMapa(texto)
      for (const buscado of buscados) {
        let desde = 0
        for (let i = norm.indexOf(buscado, desde); i >= 0 && rangos.length < tope; i = norm.indexOf(buscado, desde)) {
          const rango = document.createRange()
          rango.setStart(n, mapa[i])
          rango.setEnd(n, mapa[i + buscado.length - 1] + 1)
          rangos.push(rango)
          desde = i + buscado.length
        }
      }
    }
    return rangos
  }
  const frase = palabras.length > 1 ? recorrer([palabras.join(' ')]) : []
  return frase.length > 0 ? frase : recorrer([...new Set(palabras)])
}

let temporizadores: number[] = []
const limpiarTemporizadores = () => {
  temporizadores.forEach((id) => window.clearTimeout(id))
  temporizadores = []
}

interface OpcionesResaltado {
  /** Marcar todas las apariciones (por defecto solo la primera). */
  todas?: boolean
  /** Si se indica, la marca se desvanece sola pasado ese tiempo (ms): un último tramo más suave y se quita. */
  duracionMs?: number
}

/** Marca la coincidencia y la centra en pantalla. Si el navegador no tiene la Highlight API, la deja
 *  seleccionada. Devuelve si la encontró. */
export function resaltarCoincidencia(raiz: HTMLElement, consulta: string, opciones: OpcionesResaltado = {}): boolean {
  limpiarTemporizadores()
  const rangos = opciones.todas ? rangosDeCoincidencias(raiz, consulta) : [rangoDeCoincidencia(raiz, consulta)].filter((r): r is Range => !!r)
  if (rangos.length === 0) return false
  ;(rangos[0].startContainer.parentElement ?? raiz).scrollIntoView({ block: 'center' })
  const api = (globalThis as { CSS?: ApiResaltado }).CSS?.highlights
  const Resaltado = (globalThis as { Highlight?: ConstructorResaltado }).Highlight
  if (api && Resaltado) {
    api.set('prima-busqueda', new Resaltado(...rangos))
    api.delete('prima-busqueda-suave')
    if (opciones.duracionMs) {
      const suave = Math.min(1200, opciones.duracionMs / 3)
      // el color intenso pasa a uno tenue antes de apagarse, para que no desaparezca de golpe
      temporizadores.push(
        window.setTimeout(() => {
          api.delete('prima-busqueda')
          api.set('prima-busqueda-suave', new Resaltado(...rangos))
        }, opciones.duracionMs - suave),
        window.setTimeout(() => api.delete('prima-busqueda-suave'), opciones.duracionMs)
      )
    }
  } else {
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(rangos[0])
  }
  return true
}

export function quitarResaltado() {
  limpiarTemporizadores()
  const api = (globalThis as { CSS?: ApiResaltado }).CSS?.highlights
  api?.delete('prima-busqueda')
  api?.delete('prima-busqueda-suave')
}

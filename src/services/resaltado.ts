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

/** Incisos (párrafos) que hoy llevan la marca de bloque, para poder quitársela. */
let incisosMarcados: HTMLElement[] = []
const quitarMarcaIncisos = () => {
  incisosMarcados.forEach((el) => el.classList.remove('inciso-buscado', 'inciso-buscado-fuera'))
  incisosMarcados = []
}

/** Marca el inciso completo donde aparece la búsqueda (barra y fondo suaves): en un artículo largo, la palabra
 *  suelta se pierde, pero el bloque se ve de lejos y dice en qué inciso estás. */
function marcarIncisos(rangos: Range[]): HTMLElement[] {
  quitarMarcaIncisos()
  for (const r of rangos) {
    const nodo = r.startContainer
    const el = (nodo instanceof Element ? nodo : nodo.parentElement)?.closest('p')
    if (el instanceof HTMLElement && !incisosMarcados.includes(el)) {
      el.classList.add('inciso-buscado')
      incisosMarcados.push(el)
    }
  }
  return incisosMarcados
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
  quitarMarcaIncisos()
  const rangos = opciones.todas ? rangosDeCoincidencias(raiz, consulta) : [rangoDeCoincidencia(raiz, consulta)].filter((r): r is Range => !!r)
  if (rangos.length === 0) return false
  // la marca de inciso va solo cuando la marca es pasajera (Explorador); en los apuntes no se toca el bloque
  const incisos = opciones.duracionMs ? marcarIncisos(rangos) : []
  ;(incisos[0] ?? rangos[0].startContainer.parentElement ?? raiz).scrollIntoView({ block: 'center' })
  const api = (globalThis as { CSS?: ApiResaltado }).CSS?.highlights
  const Resaltado = (globalThis as { Highlight?: ConstructorResaltado }).Highlight
  const conApi = !!(api && Resaltado)
  if (api && Resaltado) {
    api.set('prima-busqueda', new Resaltado(...rangos))
    api.delete('prima-busqueda-suave')
  } else {
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(rangos[0])
  }
  if (opciones.duracionMs) {
    const total = opciones.duracionMs
    const suave = Math.min(1200, total / 3)
    // primero el bloque del inciso empieza a apagarse; luego el amarillo intenso pasa a uno tenue; al final todo se quita
    temporizadores.push(
      window.setTimeout(() => incisos.forEach((el) => el.classList.add('inciso-buscado-fuera')), total - suave - 400),
      window.setTimeout(() => {
        if (conApi) {
          api!.delete('prima-busqueda')
          api!.set('prima-busqueda-suave', new Resaltado!(...rangos))
        }
      }, total - suave),
      window.setTimeout(() => {
        if (conApi) api!.delete('prima-busqueda-suave')
        quitarMarcaIncisos()
      }, total)
    )
  }
  return true
}

export function quitarResaltado() {
  limpiarTemporizadores()
  quitarMarcaIncisos()
  const api = (globalThis as { CSS?: ApiResaltado }).CSS?.highlights
  api?.delete('prima-busqueda')
  api?.delete('prima-busqueda-suave')
}

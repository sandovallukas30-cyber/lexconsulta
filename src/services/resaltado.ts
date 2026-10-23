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

/** Capa de marcas dibujada a mano: un rectángulo amarillo por cada línea donde aparece la búsqueda, detrás del texto.
 *  Se usa en vez de la CSS Highlight API (`::highlight`), que en Safari de iPhone/iPad puede existir sin llegar a pintar. */
let capaMarcas: { capa: HTMLElement; base: HTMLElement; posicion: string; aislamiento: string } | null = null
const quitarCapa = () => {
  if (!capaMarcas) return
  capaMarcas.capa.remove()
  capaMarcas.base.style.position = capaMarcas.posicion
  capaMarcas.base.style.isolation = capaMarcas.aislamiento
  capaMarcas = null
}

function dibujarCapa(base: HTMLElement, rangos: Range[]) {
  quitarCapa()
  const posicion = base.style.position
  const aislamiento = base.style.isolation
  // la capa va por detrás del texto pero por delante del fondo de la tarjeta: la base crea su propio contexto de apilado
  if (getComputedStyle(base).position === 'static') base.style.position = 'relative'
  base.style.isolation = 'isolate'
  const capa = document.createElement('div')
  capa.setAttribute('aria-hidden', 'true')
  capa.className = 'capa-marcas-busqueda'
  const caja = base.getBoundingClientRect()
  for (const r of rangos) {
    for (const rc of Array.from(r.getClientRects())) {
      if (rc.width < 1 || rc.height < 1) continue
      const m = document.createElement('span')
      m.className = 'marca-busqueda'
      m.style.left = `${rc.left - caja.left - base.clientLeft - 1}px`
      m.style.top = `${rc.top - caja.top - base.clientTop}px`
      m.style.width = `${rc.width + 2}px`
      m.style.height = `${rc.height}px`
      capa.appendChild(m)
    }
  }
  base.prepend(capa)
  capaMarcas = { capa, base, posicion, aislamiento }
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
  quitarCapa()
  const rangos = opciones.todas ? rangosDeCoincidencias(raiz, consulta) : [rangoDeCoincidencia(raiz, consulta)].filter((r): r is Range => !!r)
  if (rangos.length === 0) return false
  const pasajera = !!opciones.duracionMs
  // la marca de inciso va solo cuando la marca es pasajera (Explorador); en los apuntes no se toca el bloque
  const incisos = pasajera ? marcarIncisos(rangos) : []
  ;(incisos[0] ?? rangos[0].startContainer.parentElement ?? raiz).scrollIntoView({ block: 'center' })

  if (pasajera) {
    // las medidas se toman después de centrar el inciso: el scroll no las cambia (son relativas a la tarjeta), pero sí el layout
    dibujarCapa(raiz, rangos)
    const total = opciones.duracionMs as number
    const suave = Math.min(1200, total / 3)
    // primero el bloque del inciso empieza a apagarse; luego las marcas de las palabras; al final todo se quita
    temporizadores.push(
      window.setTimeout(() => incisos.forEach((el) => el.classList.add('inciso-buscado-fuera')), total - suave - 400),
      window.setTimeout(() => capaMarcas?.capa.classList.add('fuera'), total - suave),
      window.setTimeout(() => {
        quitarCapa()
        quitarMarcaIncisos()
      }, total)
    )
    return true
  }

  const api = (globalThis as { CSS?: ApiResaltado }).CSS?.highlights
  const Resaltado = (globalThis as { Highlight?: ConstructorResaltado }).Highlight
  if (api && Resaltado) {
    api.set('prima-busqueda', new Resaltado(...rangos))
    api.delete('prima-busqueda-suave')
  } else {
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(rangos[0])
  }
  return true
}

export function quitarResaltado() {
  limpiarTemporizadores()
  quitarMarcaIncisos()
  quitarCapa()
  const api = (globalThis as { CSS?: ApiResaltado }).CSS?.highlights
  api?.delete('prima-busqueda')
  api?.delete('prima-busqueda-suave')
}

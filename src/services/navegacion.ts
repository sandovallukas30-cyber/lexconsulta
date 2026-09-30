import { create } from 'zustand'
import { useStore } from '../store/useStore'
import { MODULOS } from '../data/modulos'
import { nombreCortoMetadata } from '../data/codigosMetadata'
import { confirmarSalida } from './guardiaCambios'
import type { CodigoTipo, VistaId } from '../types'

/** Navegación (C7): historial para "Volver" y memoria del scroll por vista.
 *
 *  Se engancha con `useStore.subscribe`, no dentro de cada acción: la vista
 *  cambia desde muchos lugares (setVistaActiva, abrirArticuloEnExplorador,
 *  abrirApunte, cargarConsulta…) y todos quedan cubiertos. El callback corre
 *  SINCRÓNICAMENTE al cambiar el store, antes de que React pinte la vista
 *  nueva: el DOM todavía es el de la vista que se deja y su scroll se puede
 *  leer. */

export interface Lugar {
  vista: VistaId
  moduloActivoId: string | null
  codigoExploradorActivo: CodigoTipo | null
}

const MAX_PILA = 20
export const useNavegacion = create<{ pila: Lugar[] }>(() => ({ pila: [] }))

const NOMBRES_VISTA: Partial<Record<VistaId, string>> = {
  consultar: 'Consultar',
  situacion: 'Situación',
  modulos: 'Módulos',
  mapasmentales: 'Mapas mentales',
  canvas: 'Canvas',
  mapa: 'Mapa',
  explorador: 'Explorador',
  colecciones: 'Colecciones',
  historial: 'Historial',
  practica: 'Práctica',
  plazos: 'Plazos',
}

/** "Derecho Civil I", "Explorador · Código Civil", "Colecciones". */
export function etiquetaLugar(l: Lugar): string {
  if (l.vista === 'modulos' && l.moduloActivoId) {
    const id = l.moduloActivoId
    return MODULOS.find((m) => m.id === id)?.nombre ?? useStore.getState().ramos.find((r) => r.id === id)?.nombre ?? 'Módulos'
  }
  if (l.vista === 'explorador' && l.codigoExploradorActivo) return `Explorador · ${nombreCortoMetadata(l.codigoExploradorActivo)}`
  return NOMBRES_VISTA[l.vista] ?? l.vista
}

function claveLugar(l: Pick<Lugar, 'vista' | 'moduloActivoId' | 'codigoExploradorActivo'>): string {
  if (l.vista === 'modulos') return `modulos:${l.moduloActivoId ?? ''}`
  if (l.vista === 'explorador') return `explorador:${l.codigoExploradorActivo ?? ''}`
  return l.vista
}

// ---------------------------------------------------------------------------
// Scroll por vista
// ---------------------------------------------------------------------------

/** Posiciones [ruta de índices desde <main>, scrollTop] de los contenedores
 *  desplazados de cada vista. En sessionStorage: sobrevive a recargar la
 *  pestaña, no a cerrarla. */
type Posiciones = [number[], number][]
const CLAVE_SESION = 'prima-lex-scroll-vistas'
let scrolls: Record<string, Posiciones> = {}
try {
  scrolls = JSON.parse(sessionStorage.getItem(CLAVE_SESION) ?? '{}') as Record<string, Posiciones>
} catch {
  scrolls = {}
}

function rutaDesde(raiz: Element, el: Element): number[] {
  const ruta: number[] = []
  for (let n: Element | null = el; n && n !== raiz; n = n.parentElement) {
    const padre: Element | null = n.parentElement
    if (!padre) break
    ruta.unshift(Array.prototype.indexOf.call(padre.children, n))
  }
  return ruta
}

function resolverRuta(raiz: Element, ruta: number[]): Element | null {
  let n: Element | null = raiz
  for (const i of ruta) n = n?.children[i] ?? null
  return n
}

function capturarScroll(clave: string) {
  const main = document.querySelector('main')
  if (!main) return
  const pos: Posiciones = []
  const candidatos = [main, ...main.querySelectorAll('*')]
  for (const el of candidatos) {
    if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) pos.push([rutaDesde(main, el), Math.round(el.scrollTop)])
    if (pos.length >= 4) break
  }
  if (pos.length) scrolls[clave] = pos
  else delete scrolls[clave]
  try {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(scrolls))
  } catch {
    // sin sessionStorage: solo en memoria
  }
}

/** Restaura con reintentos: el contenido puede llegar después (un código
 *  que se descarga, una lista que se arma en el primer efecto). */
function restaurarScroll(clave: string) {
  const pos = scrolls[clave]
  if (!pos?.length) return
  let intentos = 0
  const intentar = () => {
    const main = document.querySelector('main')
    let pendientes = 0
    if (main) {
      for (const [ruta, top] of pos) {
        const el = resolverRuta(main, ruta)
        if (!el) {
          pendientes++
          continue
        }
        el.scrollTop = top
        if (Math.abs(el.scrollTop - top) > 2) pendientes++
      }
    }
    if (pendientes > 0 && ++intentos < 8) window.setTimeout(intentar, 120)
  }
  requestAnimationFrame(() => requestAnimationFrame(intentar))
}

// ---------------------------------------------------------------------------

let volviendo = false

useStore.subscribe((s, prev) => {
  const cambio =
    s.vistaActiva !== prev.vistaActiva ||
    (s.vistaActiva === 'modulos' && s.moduloActivoId !== prev.moduloActivoId) ||
    (s.vistaActiva === 'explorador' && s.codigoExploradorActivo !== prev.codigoExploradorActivo)
  if (!cambio) return
  capturarScroll(claveLugar({ ...prev, vista: prev.vistaActiva }))
  if (!volviendo) {
    const lugar: Lugar = {
      vista: prev.vistaActiva,
      moduloActivoId: prev.moduloActivoId,
      codigoExploradorActivo: prev.codigoExploradorActivo,
    }
    useNavegacion.setState(({ pila }) => ({ pila: [...pila, lugar].slice(-MAX_PILA) }))
  }
  restaurarScroll(claveLugar({ ...s, vista: s.vistaActiva }))
})

/** Vuelve al lugar anterior (vista + módulo o código abierto). */
export function volverAtras() {
  const { pila } = useNavegacion.getState()
  const destino = pila[pila.length - 1]
  if (!destino || !confirmarSalida()) return
  useNavegacion.setState({ pila: pila.slice(0, -1) })
  volviendo = true
  try {
    useStore.setState({
      vistaActiva: destino.vista,
      moduloActivoId: destino.moduloActivoId,
      codigoExploradorActivo: destino.codigoExploradorActivo,
    })
  } finally {
    volviendo = false
  }
}

import type { PersistStorage, StorageValue } from 'zustand/middleware'
import { create } from 'zustand'

/** Estado de la escritura del store en localStorage -- lo consume el
 *  indicador "Guardando… / Guardado" del editor (C3) y cualquier vista que
 *  quiera avisar que algo NO quedó guardado. */
export const useEstadoGuardado = create<{ pendiente: boolean; error: string | null; ultimoGuardado: number | null }>()(() => ({
  pendiente: false,
  error: null,
  ultimoGuardado: null,
}))

let ultimoAvisoError = 0

/** Para quien ya muestra su propio mensaje de error más específico (ej.
 *  importar un respaldo): evita el aviso genérico duplicado. */
export function silenciarAvisoGuardado() {
  ultimoAvisoError = Date.now()
}

/** Espera antes de escribir. Cada cambio del store (el autoguardado del
 *  editor, arrastrar un nodo de un mapa) serializaba y escribía TODO el
 *  estado persistido -- con muchos apuntes largos, varios MB por cambio. Se
 *  agrupan los cambios y se serializa y escribe una sola vez; al ocultar o
 *  cerrar la página (o con Ctrl+S) se escribe de inmediato. */
const ESPERA_ESCRITURA_MS = 400

let pendiente: { nombre: string; valor: StorageValue<unknown> } | null = null
let temporizador: number | undefined

function escribir(nombre: string, valor: StorageValue<unknown>) {
  try {
    localStorage.setItem(nombre, JSON.stringify(valor))
    useEstadoGuardado.setState({ pendiente: false, error: null, ultimoGuardado: Date.now() })
  } catch (e) {
    // El middleware de zustand no captura este error: con la cuota llena
    // (~5 MB; un par de apuntes enormes pegados desde Notion alcanzan) el
    // usuario seguía viendo su cambio en pantalla pero se perdía al recargar,
    // sin aviso. Acá se registra (con un aviso visible) y NO se relanza, para
    // no romper a quien hizo el cambio; quien necesite revertir (ver
    // aplicarRespaldo en respaldo.ts) consulta useEstadoGuardado.
    const lleno = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
    const mensaje = lleno
      ? 'No se pudo guardar: el almacenamiento del navegador está lleno. Descarga un respaldo y elimina apuntes o mapas que ya no uses.'
      : 'No se pudo guardar en este navegador (¿ventana privada o almacenamiento bloqueado?).'
    useEstadoGuardado.setState({ pendiente: false, error: mensaje })
    // import dinámico: evita un ciclo useStore → almacenamiento → useAvisos
    if (Date.now() - ultimoAvisoError > 10_000) {
      ultimoAvisoError = Date.now()
      void import('./useAvisos').then(({ avisar }) => avisar.error(mensaje))
    }
  }
}

/** Escribe YA lo que esté pendiente (sincrónico). Devuelve el error de la
 *  escritura, si lo hubo. */
export function vaciarEscrituraPendiente(): string | null {
  window.clearTimeout(temporizador)
  if (pendiente) {
    const { nombre, valor } = pendiente
    pendiente = null
    escribir(nombre, valor)
  }
  return useEstadoGuardado.getState().error
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => vaciarEscrituraPendiente())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') vaciarEscrituraPendiente()
  })
}

/** Almacenamiento para `persist`: localStorage con escritura agrupada y a
 *  prueba de cuota llena (ver arriba). */
export function crearAlmacenamiento<S>(): PersistStorage<S> {
  return {
    getItem: (nombre) => {
      // si hay una escritura esperando, esa es la versión vigente
      if (pendiente?.nombre === nombre) return pendiente.valor as StorageValue<S>
      try {
        const crudo = localStorage.getItem(nombre)
        return crudo ? (JSON.parse(crudo) as StorageValue<S>) : null
      } catch {
        return null
      }
    },
    setItem: (nombre, valor) => {
      pendiente = { nombre, valor }
      if (!useEstadoGuardado.getState().pendiente) useEstadoGuardado.setState({ pendiente: true })
      window.clearTimeout(temporizador)
      temporizador = window.setTimeout(vaciarEscrituraPendiente, ESPERA_ESCRITURA_MS)
    },
    removeItem: (nombre) => {
      if (pendiente?.nombre === nombre) pendiente = null
      try {
        localStorage.removeItem(nombre)
      } catch {
        // nada que hacer
      }
    },
  }
}

import { createJSONStorage, type StateStorage } from 'zustand/middleware'
import { create } from 'zustand'

/** Estado de la última escritura del store en localStorage -- lo consume el
 *  indicador "Guardando… / Guardado" del editor (C3) y cualquier vista que
 *  quiera avisar que algo NO quedó guardado. */
export const useEstadoGuardado = create<{ error: string | null; ultimoGuardado: number | null }>()(() => ({
  error: null,
  ultimoGuardado: null,
}))

let ultimoAvisoError = 0

/** Para quien ya muestra su propio mensaje de error más específico (ej.
 *  importar un respaldo): evita el aviso genérico duplicado. */
export function silenciarAvisoGuardado() {
  ultimoAvisoError = Date.now()
}

/** localStorage para `persist` que NO revienta si la cuota se llena.
 *
 *  El middleware de zustand cambia el estado en memoria y DESPUÉS escribe en
 *  localStorage, sin capturar el error: con la cuota llena (~5 MB; un par de
 *  apuntes enormes pegados desde Notion alcanzan) el usuario seguía viendo su
 *  cambio en pantalla, pero se perdía al recargar, sin ningún aviso. Acá se
 *  captura y se registra en useEstadoGuardado (con un aviso visible); NO se
 *  relanza, para no romper el handler que hizo el cambio -- quien necesite
 *  revertir (ver aplicarRespaldo en respaldo.ts) consulta ese estado. */
const localStorageSeguro: StateStorage = {
  getItem: (nombre) => {
    try {
      return localStorage.getItem(nombre)
    } catch {
      return null
    }
  },
  setItem: (nombre, valor) => {
    try {
      localStorage.setItem(nombre, valor)
      useEstadoGuardado.setState({ error: null, ultimoGuardado: Date.now() })
    } catch (e) {
      const lleno = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
      const mensaje = lleno
        ? 'No se pudo guardar: el almacenamiento del navegador está lleno. Descarga un respaldo y elimina apuntes o mapas que ya no uses.'
        : 'No se pudo guardar en este navegador (¿ventana privada o almacenamiento bloqueado?).'
      useEstadoGuardado.setState({ error: mensaje })
      // import dinámico: evita un ciclo useStore → almacenamiento → useAvisos
      if (Date.now() - ultimoAvisoError > 10_000) {
        ultimoAvisoError = Date.now()
        void import('./useAvisos').then(({ avisar }) => avisar.error(mensaje))
      }
    }
  },
  removeItem: (nombre) => {
    try {
      localStorage.removeItem(nombre)
    } catch {
      // nada que hacer
    }
  },
}

export const almacenamientoPersistente = createJSONStorage(() => localStorageSeguro)

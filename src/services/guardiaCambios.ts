/** Cambios sin guardar (C3): un formulario abierto con cambios registra una
 *  "guardia"; cambiar de vista, de módulo o de pestaña, o cerrar la página,
 *  pregunta antes de descartarlos. Sin dependencias del store (el store la
 *  usa en setVistaActiva/setModuloActivo). */

import { confirmar } from './confirmar'

type Guardia = () => string | null

const guardias = new Set<Guardia>()

/** Devuelve la función para quitar la guardia (usar en el cleanup de un efecto). */
export function registrarGuardia(guardia: Guardia): () => void {
  guardias.add(guardia)
  return () => {
    guardias.delete(guardia)
  }
}

export function cambiosSinGuardar(): string | null {
  for (const g of guardias) {
    const mensaje = g()
    if (mensaje) return mensaje
  }
  return null
}

/** Con el diálogo aceptado, la acción se repite una vez sin volver a preguntar. */
let descartando = false

/** true si se puede salir ya (no hay cambios pendientes). Si los hay, devuelve false y abre la
 *  confirmación propia de Prima Lex; si la persona acepta descartarlos, se llama a `reintentar`
 *  (la misma acción que se quería hacer), que esta vez pasa sin preguntar. */
export function confirmarSalida(reintentar: () => void): boolean {
  const mensaje = cambiosSinGuardar()
  if (!mensaje || descartando) return true
  void confirmar({ titulo: '¿Descartar los cambios?', mensaje, etiquetaConfirmar: 'Descartar', etiquetaCancelar: 'Seguir editando', peligro: true }).then((ok) => {
    if (!ok) return
    descartando = true
    try {
      reintentar()
    } finally {
      descartando = false
    }
  })
  return false
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (cambiosSinGuardar()) e.preventDefault()
  })
}

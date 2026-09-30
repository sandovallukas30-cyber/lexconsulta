/** Cambios sin guardar (C3): un formulario abierto con cambios registra una
 *  "guardia"; cambiar de vista, de módulo o de pestaña, o cerrar la página,
 *  pregunta antes de descartarlos. Sin dependencias del store (el store la
 *  usa en setVistaActiva/setModuloActivo). */

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

/** true si se puede salir: no hay cambios pendientes o el usuario acepta descartarlos. */
export function confirmarSalida(): boolean {
  const mensaje = cambiosSinGuardar()
  return !mensaje || window.confirm(mensaje)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (cambiosSinGuardar()) e.preventDefault()
  })
}

import type { VistaId } from '../types'

export interface DestinoNavegacion {
  id: VistaId
  icono: string
  /** Nombre corto para la barra inferior. */
  corto: string
  /** Nombre completo, como en el menú lateral. */
  largo: string
}

/** Todas las pantallas a las que se puede ir desde la barra inferior del celular, en el orden del menú lateral. */
export const DESTINOS_NAVEGACION: DestinoNavegacion[] = [
  { id: 'hoy', icono: 'ti-sun', corto: 'Hoy', largo: 'Hoy' },
  { id: 'tareas', icono: 'ti-checkbox', corto: 'Tareas', largo: 'Tareas' },
  { id: 'calendario', icono: 'ti-calendar', corto: 'Calendario', largo: 'Calendario' },
  { id: 'enfoque', icono: 'ti-hourglass-high', corto: 'Enfoque', largo: 'Enfoque' },
  { id: 'modulos', icono: 'ti-layout-grid', corto: 'Ramos', largo: 'Mis ramos' },
  { id: 'explorador', icono: 'ti-book-2', corto: 'Explorar', largo: 'Explorador' },
  { id: 'colecciones', icono: 'ti-stack-2', corto: 'Colecciones', largo: 'Colecciones' },
  { id: 'mapasmentales', icono: 'ti-hierarchy-2', corto: 'Mapas', largo: 'Mapas mentales' },
  { id: 'practica', icono: 'ti-puzzle', corto: 'Práctica', largo: 'Práctica' },
]

export const BARRA_INFERIOR_DEFECTO: VistaId[] = ['hoy', 'tareas', 'enfoque', 'explorador']
export const BARRA_INFERIOR_MAX = 4

/** Deja solo destinos válidos y sin repetir (un valor viejo o dañado en el almacenamiento no debe romper la barra). */
export function barraInferiorValida(ids: unknown): VistaId[] {
  if (!Array.isArray(ids)) return BARRA_INFERIOR_DEFECTO
  const validos = new Set(DESTINOS_NAVEGACION.map((d) => d.id))
  const limpios = [...new Set(ids)].filter((i): i is VistaId => validos.has(i as VistaId)).slice(0, BARRA_INFERIOR_MAX)
  return limpios.length > 0 ? limpios : BARRA_INFERIOR_DEFECTO
}

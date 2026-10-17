import { lazy, type ComponentType } from 'react'
import type { VistaId } from './types'

/** Vistas cargadas bajo demanda (C8). Antes App.tsx importaba todas las vistas
 *  de una vez y el bundle inicial pesaba ~1,7 MB (475 KB comprimido): la
 *  primera pantalla esperaba a Canvas, Mapas mentales, Práctica… que quizá
 *  no se abren nunca. Ahora cada vista es un chunk aparte y se precarga al
 *  pasar el cursor (o el foco, o el dedo) por su ítem del menú. */

type Cargador = () => Promise<{ default: ComponentType }>

const cargadores: Record<VistaId, Cargador> = {
  modulos: () => import('./components/views/ModulosView').then((m) => ({ default: m.ModulosView })),
  explorador: () => import('./components/views/ExploradorView').then((m) => ({ default: m.ExploradorView })),
  colecciones: () => import('./components/views/ColeccionesView').then((m) => ({ default: m.ColeccionesView })),
  mapasmentales: () => import('./components/views/MapasMentalesView').then((m) => ({ default: m.MapasMentalesView })),
  admin: () => import('./components/views/AdminView').then((m) => ({ default: m.AdminView })),
  practica: () => import('./components/views/PracticaView').then((m) => ({ default: m.PracticaView })),
}

export const vistas = Object.fromEntries(
  Object.entries(cargadores).map(([id, c]) => [id, lazy(c)])
) as unknown as Record<VistaId, ComponentType>

const precargadas = new Set<VistaId>()
/** Descarga el chunk de una vista sin mostrarla (hover/foco en el menú). */
export function precargarVista(id: VistaId) {
  if (precargadas.has(id)) return
  precargadas.add(id)
  cargadores[id]().catch(() => precargadas.delete(id))
}

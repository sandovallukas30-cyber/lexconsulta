import { lazy, type ComponentType } from 'react'
import type { VistaActiva, VistaId } from './types'
import { resolverVista } from './store/vistaLegada'

/** Vistas cargadas bajo demanda (C8). Antes App.tsx importaba las 12 vistas
 *  de una vez y el bundle inicial pesaba ~1,7 MB (475 KB comprimido): la
 *  primera pantalla esperaba a Canvas, Mapas mentales, Práctica… que quizá
 *  no se abren nunca. Ahora cada vista es un chunk aparte y se precarga al
 *  pasar el cursor (o el foco, o el dedo) por su ítem del menú. */

type Cargador = () => Promise<{ default: ComponentType }>

const cargadores: Record<VistaActiva, Cargador> = {
  hoy: () => import('./components/views/HoyView').then((m) => ({ default: m.HoyView })),
  consultar: () => import('./components/views/ConsultarView').then((m) => ({ default: m.ConsultarView })),
  situacion: () => import('./components/views/SituacionView').then((m) => ({ default: m.SituacionView })),
  modulos: () => import('./components/views/ModulosView').then((m) => ({ default: m.ModulosView })),
  canvas: () => import('./components/views/CanvasView').then((m) => ({ default: m.CanvasView })),
  mapa: () => import('./components/views/MapaView').then((m) => ({ default: m.MapaView })),
  explorador: () => import('./components/views/ExploradorView').then((m) => ({ default: m.ExploradorView })),
  colecciones: () => import('./components/views/ColeccionesView').then((m) => ({ default: m.ColeccionesView })),
  mapasmentales: () => import('./components/views/MapasMentalesView').then((m) => ({ default: m.MapasMentalesView })),
  historial: () => import('./components/views/HistorialView').then((m) => ({ default: m.HistorialView })),
  admin: () => import('./components/views/AdminView').then((m) => ({ default: m.AdminView })),
  repasar: () => import('./components/views/RepasarView').then((m) => ({ default: m.RepasarView })),
  plazos: () => import('./components/views/PlazosView').then((m) => ({ default: m.PlazosView })),
}

export const vistas = Object.fromEntries(
  Object.entries(cargadores).map(([id, c]) => [id, lazy(c)])
) as unknown as Record<VistaActiva, ComponentType>

const precargadas = new Set<VistaActiva>()
/** Descarga el chunk de una vista sin mostrarla (hover/foco en el menú). */
export function precargarVista(vista: VistaId) {
  const id = resolverVista(vista).vista
  if (precargadas.has(id)) return
  precargadas.add(id)
  cargadores[id]().catch(() => precargadas.delete(id))
}

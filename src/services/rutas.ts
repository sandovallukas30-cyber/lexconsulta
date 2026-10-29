import type { VistaId } from '../types'

/** Dirección de cada sección. «/» (sin sección) deja la última sección que se estaba usando. */
export const RUTAS: Record<VistaId, string> = {
  hoy: '/hoy',
  tareas: '/tareas',
  enfoque: '/enfoque',
  calendario: '/calendario',
  modulos: '/mis-asignaturas',
  explorador: '/explorador',
  colecciones: '/colecciones',
  mapasmentales: '/mapas-mentales',
  practica: '/practica',
}

const TITULOS: Record<VistaId, string> = {
  hoy: 'Hoy',
  tareas: 'Tareas',
  enfoque: 'Enfoque',
  calendario: 'Calendario',
  modulos: 'Mis asignaturas',
  explorador: 'Explorador de códigos',
  colecciones: 'Colecciones',
  mapasmentales: 'Mapas mentales',
  practica: 'Práctica',
}

export const TITULO_APP = 'Prima Lex — tu semestre de Derecho, ordenado'

function normalizar(ruta: string): string {
  return ruta.replace(/\/+$/, '').toLowerCase() || '/'
}

/** Direcciones antiguas que siguen funcionando (enlaces guardados). */
const ALIAS: Record<string, VistaId> = { '/modulos': 'modulos', '/mis-ramos': 'modulos' }

/** La sección que pide la dirección, o null si no es una sección. */
export function vistaDeRuta(ruta: string): VistaId | null {
  const r = normalizar(ruta)
  if (ALIAS[r]) return ALIAS[r]
  for (const [vista, rutaVista] of Object.entries(RUTAS)) if (rutaVista === r) return vista as VistaId
  return null
}

/** ¿La dirección es algo que la app conoce? («/» o una sección). Lo demás es una página que no existe. */
export function rutaConocida(ruta: string): boolean {
  return normalizar(ruta) === '/' || vistaDeRuta(ruta) !== null
}

export function tituloDeVista(vista: VistaId): string {
  return `${TITULOS[vista]} · Prima Lex`
}

import type { VistaActiva, VistaId } from '../types'

/** Reestructura del área académica: varias pantallas se fundieron en otras.
 *  Esta tabla es la ÚNICA que sabe adónde va cada id viejo, para que ningún
 *  llamador ni dato guardado se rompa (`setVistaActiva('practica')`, una
 *  vista persistida de una versión anterior…). */
export interface DestinoVista {
  vista: VistaActiva
  /** Pestaña de Repasar a mostrar (solo cuando vista === 'repasar'). */
  repasarTab?: 'cola' | 'juegos'
}

export function resolverVista(id: VistaId | string): DestinoVista {
  switch (id) {
    case 'practica':
      return { vista: 'repasar', repasarTab: 'juegos' }
    case 'hoy': case 'consultar': case 'situacion': case 'modulos': case 'canvas': case 'mapa':
    case 'explorador': case 'colecciones': case 'mapasmentales': case 'historial':
    case 'admin': case 'repasar': case 'plazos':
      return { vista: id }
    default:
      return { vista: 'hoy' }
  }
}

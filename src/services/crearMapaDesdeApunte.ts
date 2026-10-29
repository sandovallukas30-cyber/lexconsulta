import { useStore } from '../store/useStore'
import { avisar } from '../store/useAvisos'
import { apunteAEsquema } from './apunteMapa'
import { registrarUso } from './uso'
import { crearMapaDesdeEsquema } from './mapaDesdeEsquema'
import type { ApunteModulo } from '../types'

/** «Crear mapa mental desde este apunte»: arma el esquema por reglas, lo posiciona con el organizador del mapa y
 *  deja el mapa abierto, vinculado a la asignatura. */
export function crearMapaDesdeApunte(apunte: Pick<ApunteModulo, 'titulo' | 'contenido'>, moduloId: string): boolean {
  const esquema = apunteAEsquema(apunte)
  if (esquema.nodos.length < 2) {
    avisar.info('Este apunte aún no tiene títulos ni viñetas para armar un mapa.')
    return false
  }
  crearMapaDesdeEsquema({ ...esquema, moduloId })
  registrarUso('apunte.mapa')
  useStore.getState().setVistaActiva('mapasmentales')
  avisar.exito(
    esquema.omitidos > 0
      ? `Mapa creado con ${esquema.nodos.length} nodos; ${esquema.omitidos} elementos del apunte no entraron para que se lea bien.`
      : `Mapa creado con ${esquema.nodos.length} nodos`
  )
  return true
}

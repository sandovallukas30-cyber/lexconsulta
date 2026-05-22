import codigoTrabajo from '../data/codigoTrabajo.json'
import constitucion from '../data/constitucion.json'
import type { CodigoData, CodigoTipo } from '../types'

export const CODIGOS_DATA: Partial<Record<CodigoTipo, CodigoData>> = {
  con: constitucion as CodigoData,
  lab: codigoTrabajo as CodigoData,
}

export function obtenerCodigo(tipo: CodigoTipo): CodigoData | null {
  return CODIGOS_DATA[tipo] ?? null
}

export function codigosCargados(): CodigoTipo[] {
  return Object.keys(CODIGOS_DATA) as CodigoTipo[]
}

import { obtenerCodigo, codigosCargados } from '../services/codigos'
import type { CodigoData, CodigoTipo } from '../types'

export function useCodigo(tipo: CodigoTipo): CodigoData | null {
  return obtenerCodigo(tipo)
}

export function listarCodigosCargados(): CodigoTipo[] {
  return codigosCargados()
}

import type { CodigoData, CodigoTipo } from '../types'

// Registry de loaders dinámicos. Vite hace code-splitting automático por cada import().
// El JSON solo se descarga cuando se llama el loader correspondiente.
const LOADERS: Partial<Record<CodigoTipo, () => Promise<{ default: CodigoData }>>> = {
  con: () => import('../data/constitucion.json') as Promise<{ default: CodigoData }>,
  civ: () => import('../data/codigoCivil.json') as Promise<{ default: CodigoData }>,
  lab: () => import('../data/codigoTrabajo.json') as Promise<{ default: CodigoData }>,
  pen: () => import('../data/codigoPenal.json') as Promise<{ default: CodigoData }>,
  tri: () => import('../data/codigoTributario.json') as Promise<{ default: CodigoData }>,
  com: () => import('../data/codigoComercio.json') as Promise<{ default: CodigoData }>,
  pci: () => import('../data/codigoProcCivil.json') as Promise<{ default: CodigoData }>,
  ppe: () => import('../data/codigoProcPenal.json') as Promise<{ default: CodigoData }>,
  cot: () => import('../data/codigoOrgTrib.json') as Promise<{ default: CodigoData }>,
  min: () => import('../data/codigoMineria.json') as Promise<{ default: CodigoData }>,
  agu: () => import('../data/codigoAguas.json') as Promise<{ default: CodigoData }>,
  pad: () => import('../data/leyProcAdministrativo.json') as Promise<{ default: CodigoData }>,
  acc: () => import('../data/leyAccidentesTrabajo.json') as Promise<{ default: CodigoData }>,
  dro: () => import('../data/leyDrogas.json') as Promise<{ default: CodigoData }>,
}

const cache = new Map<CodigoTipo, CodigoData>()
const enCurso = new Map<CodigoTipo, Promise<CodigoData>>()

/** Carga el JSON del código de forma async. Cachea para llamadas subsiguientes. */
export async function cargarCodigo(tipo: CodigoTipo): Promise<CodigoData | null> {
  const enCache = cache.get(tipo)
  if (enCache) return enCache
  const loader = LOADERS[tipo]
  if (!loader) return null
  const promesaExistente = enCurso.get(tipo)
  if (promesaExistente) return promesaExistente
  const p = loader()
    .then((mod) => {
      cache.set(tipo, mod.default)
      enCurso.delete(tipo)
      return mod.default
    })
    .catch((err) => {
      enCurso.delete(tipo)
      throw err
    })
  enCurso.set(tipo, p)
  return p
}

/** Versión sincrónica: solo retorna el código si ya está en cache. */
export function obtenerCodigo(tipo: CodigoTipo): CodigoData | null {
  return cache.get(tipo) ?? null
}

/** Códigos cuyo loader está registrado (disponibles para cargar). */
export function codigosCargados(): CodigoTipo[] {
  return Object.keys(LOADERS) as CodigoTipo[]
}

/** ¿Este código ya fue cargado a memoria? */
export function estaCargado(tipo: CodigoTipo): boolean {
  return cache.has(tipo)
}

/** Precarga varios códigos en paralelo. Útil antes de hacer búsquedas. */
export async function precargar(tipos: CodigoTipo[]): Promise<void> {
  await Promise.all(tipos.map((t) => cargarCodigo(t)))
}

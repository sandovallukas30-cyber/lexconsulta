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
  kar: () => import('../data/leyKarin.json') as Promise<{ default: CodigoData }>,
  mil: () => import('../data/codigoJusticiaMilitar.json') as Promise<{ default: CodigoData }>,
  san: () => import('../data/codigoSanitario.json') as Promise<{ default: CodigoData }>,
  ins: () => import('../data/leyInsolvencia.json') as Promise<{ default: CodigoData }>,
  fam: () => import('../data/leyTribFamilia.json') as Promise<{ default: CodigoData }>,
  trn: () => import('../data/leyTransparencia.json') as Promise<{ default: CodigoData }>,
  rpa: () => import('../data/leyRPA.json') as Promise<{ default: CodigoData }>,
  pdc: () => import('../data/pactoDerechosCiviles.json') as Promise<{ default: CodigoData }>,
  pde: () => import('../data/pactoDerechosESC.json') as Promise<{ default: CodigoData }>,
  aap: () => import('../data/autoAcordadoProteccion.json') as Promise<{ default: CodigoData }>,
  cns: () => import('../data/leyConsumidor.json') as Promise<{ default: CodigoData }>,
  mat: () => import('../data/leyMatrimonioCivil.json') as Promise<{ default: CodigoData }>,
  ali: () => import('../data/leyPensionesAlimentos.json') as Promise<{ default: CodigoData }>,
  vif: () => import('../data/leyViolenciaIntrafamiliar.json') as Promise<{ default: CodigoData }>,
  fil: () => import('../data/leyFiliacion.json') as Promise<{ default: CodigoData }>,
  soc: () => import('../data/leySociedadesAnonimas.json') as Promise<{ default: CodigoData }>,
  mvl: () => import('../data/leyMercadoValores.json') as Promise<{ default: CodigoData }>,
  pvp: () => import('../data/leyVidaPrivada.json') as Promise<{ default: CodigoData }>,
  rpj: () => import('../data/leyRespPenalPersonasJuridicas.json') as Promise<{ default: CodigoData }>,
  dec: () => import('../data/leyDelitosEconomicos.json') as Promise<{ default: CodigoData }>,
  pns: () => import('../data/leyPenasSustitutivas.json') as Promise<{ default: CodigoData }>,
  dsc: () => import('../data/leyAntidiscriminacion.json') as Promise<{ default: CodigoData }>,
  mas: () => import('../data/leyTenenciaResponsable.json') as Promise<{ default: CodigoData }>,
  soa: () => import('../data/leySOAP.json') as Promise<{ default: CodigoData }>,
  trt: () => import('../data/leyTransito.json') as Promise<{ default: CodigoData }>,
  amb: () => import('../data/leyMedioAmbiente.json') as Promise<{ default: CodigoData }>,
  tam: () => import('../data/leyTribunalesAmbientales.json') as Promise<{ default: CodigoData }>,
  bga: () => import('../data/leyBasesAdministracion.json') as Promise<{ default: CodigoData }>,
  est: () => import('../data/leyEstatutoAdministrativo.json') as Promise<{ default: CodigoData }>,
  emu: () => import('../data/leyEstatutoMunicipal.json') as Promise<{ default: CodigoData }>,
  mun: () => import('../data/leyMunicipalidades.json') as Promise<{ default: CodigoData }>,
  arr: () => import('../data/leyArrendamientoUrbano.json') as Promise<{ default: CodigoData }>,
  cop: () => import('../data/leyCopropiedad.json') as Promise<{ default: CodigoData }>,
  pin: () => import('../data/leyPropiedadIntelectual.json') as Promise<{ default: CodigoData }>,
  pid: () => import('../data/leyPropiedadIndustrial.json') as Promise<{ default: CodigoData }>,
  dis: () => import('../data/leyInclusionDiscapacidad.json') as Promise<{ default: CodigoData }>,
  fel: () => import('../data/leyFirmaElectronica.json') as Promise<{ default: CodigoData }>,
  tde: () => import('../data/leyTransformacionDigital.json') as Promise<{ default: CodigoData }>,
  ind: () => import('../data/leyIndigena.json') as Promise<{ default: CodigoData }>,
  cng: () => import('../data/leyCongresoNacional.json') as Promise<{ default: CodigoData }>,
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

import type { CodigoData, CodigoTipo } from '../types'

// URL de cada JSON de src/data (Vite los publica tal cual como assets con
// hash; acá solo quedan las URLs, unos pocos bytes). El JSON solo se descarga
// cuando se llama el loader correspondiente.
//
// Antes cada código era un `import()` dinámico. Problema (C4): si la red
// fallaba al abrir un código, el navegador deja el módulo fallido en caché y
// un nuevo import() de la MISMA URL falla al instante sin volver a pedirlo --
// "Reintentar" no servía hasta recargar la página. Un fetch sí se reintenta.
const URLS = import.meta.glob<string>('../data/*.json', { query: '?url', import: 'default', eager: true })

function desde(archivo: string): () => Promise<{ default: CodigoData }> {
  return async () => {
    const url = URLS[`../data/${archivo}.json`]
    if (!url) throw new Error(`No existe el archivo ${archivo}.json`)
    // fetch rechaza con un TypeError en inglés ("Failed to fetch") que
    // Consultar mostraría tal cual
    const r = await fetch(url).catch(() => {
      throw new Error('Sin conexión: no se pudieron descargar los códigos. Revisa tu internet y reintenta.')
    })
    if (!r.ok) throw new Error(`No se pudo descargar ${archivo}.json (HTTP ${r.status})`)
    return { default: (await r.json()) as CodigoData }
  }
}

// Registry de loaders.
const LOADERS: Partial<Record<CodigoTipo, () => Promise<{ default: CodigoData }>>> = {
  con: desde('constitucion'),
  civ: desde('codigoCivil'),
  lab: desde('codigoTrabajo'),
  pen: desde('codigoPenal'),
  tri: desde('codigoTributario'),
  com: desde('codigoComercio'),
  pci: desde('codigoProcCivil'),
  ppe: desde('codigoProcPenal'),
  cot: desde('codigoOrgTrib'),
  min: desde('codigoMineria'),
  agu: desde('codigoAguas'),
  pad: desde('leyProcAdministrativo'),
  acc: desde('leyAccidentesTrabajo'),
  dro: desde('leyDrogas'),
  kar: desde('leyKarin'),
  mil: desde('codigoJusticiaMilitar'),
  san: desde('codigoSanitario'),
  ins: desde('leyInsolvencia'),
  fam: desde('leyTribFamilia'),
  trn: desde('leyTransparencia'),
  rpa: desde('leyRPA'),
  pdc: desde('pactoDerechosCiviles'),
  pde: desde('pactoDerechosESC'),
  aap: desde('autoAcordadoProteccion'),
  cns: desde('leyConsumidor'),
  mat: desde('leyMatrimonioCivil'),
  ali: desde('leyPensionesAlimentos'),
  vif: desde('leyViolenciaIntrafamiliar'),
  fil: desde('leyFiliacion'),
  soc: desde('leySociedadesAnonimas'),
  mvl: desde('leyMercadoValores'),
  pvp: desde('leyVidaPrivada'),
  rpj: desde('leyRespPenalPersonasJuridicas'),
  dec: desde('leyDelitosEconomicos'),
  pns: desde('leyPenasSustitutivas'),
  dsc: desde('leyAntidiscriminacion'),
  mas: desde('leyTenenciaResponsable'),
  soa: desde('leySOAP'),
  trt: desde('leyTransito'),
  amb: desde('leyMedioAmbiente'),
  tam: desde('leyTribunalesAmbientales'),
  bga: desde('leyBasesAdministracion'),
  est: desde('leyEstatutoAdministrativo'),
  emu: desde('leyEstatutoMunicipal'),
  mun: desde('leyMunicipalidades'),
  arr: desde('leyArrendamientoUrbano'),
  cop: desde('leyCopropiedad'),
  pin: desde('leyPropiedadIntelectual'),
  pid: desde('leyPropiedadIndustrial'),
  dis: desde('leyInclusionDiscapacidad'),
  fel: desde('leyFirmaElectronica'),
  tde: desde('leyTransformacionDigital'),
  ind: desde('leyIndigena'),
  cng: desde('leyCongresoNacional'),
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

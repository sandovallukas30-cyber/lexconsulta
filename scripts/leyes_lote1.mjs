// Lote 1 de leyes especiales (sept. 2026): genera los 30 JSON de src/data a
// partir de los XML oficiales de la BCN.
//
// 1. Descargar cada XML (la BCN limita la tasa: ~10 s entre descargas):
//      curl -A "Mozilla/5.0" -o <carpeta>/<idNorma>.xml \
//        "https://www.bcn.cl/leychile/consulta/obtxml?opt=7&idNorma=<idNorma>"
// 2. node scripts/leyes_lote1.mjs <carpeta-con-los-xml> [fechaHoy YYYY-MM-DD]
// 3. node scripts/verificar_leyes.mjs src/data
//
// El idNorma es el del TEXTO VIGENTE: cuando la ley tiene texto refundido por
// DFL se usa el del DFL (ej. Ley 18.575 → DFL 1/19.653), porque la ficha de
// la ley original deja de actualizarse.
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export const LEYES_LOTE1 = [
  { tipo: 'cns', sinEnvoltorio: true, archivo: 'leyConsumidor', ley: '19.496', idNorma: 1160403, nombre: 'Ley 19.496 - Protección de los Derechos de los Consumidores', fuente: 'Ley N.º 19.496 (texto refundido por DFL 3 de 2019, Economía), publicado {pub}, última versión {ver}' },
  { tipo: 'mat', archivo: 'leyMatrimonioCivil', ley: '19.947', idNorma: 225128, nombre: 'Ley 19.947 - Nueva Ley de Matrimonio Civil', fuente: 'Ley N.º 19.947, publicada {pub}, última versión {ver}' },
  { tipo: 'ali', archivo: 'leyPensionesAlimentos', ley: '14.908', idNorma: 172986, doble: 'del Artículo 7', nombre: 'Ley 14.908 - Abandono de Familia y Pago de Pensiones Alimenticias', fuente: 'Ley N.º 14.908 (texto refundido por DFL 1 de 2000, Justicia, art. 7°), publicado {pub}, última versión {ver}' },
  { tipo: 'vif', archivo: 'leyViolenciaIntrafamiliar', ley: '20.066', idNorma: 242648, nombre: 'Ley 20.066 - Violencia Intrafamiliar', fuente: 'Ley N.º 20.066, publicada {pub}, última versión {ver}' },
  { tipo: 'fil', archivo: 'leyFiliacion', ley: '19.585', idNorma: 126366, nombre: 'Ley 19.585 - Modifica el Código Civil en materia de Filiación', fuente: 'Ley N.º 19.585, publicada {pub}, última versión {ver}' },
  { tipo: 'soc', archivo: 'leySociedadesAnonimas', ley: '18.046', idNorma: 29473, nombre: 'Ley 18.046 - Sociedades Anónimas', fuente: 'Ley N.º 18.046, publicada {pub}, última versión {ver}' },
  { tipo: 'mvl', archivo: 'leyMercadoValores', ley: '18.045', idNorma: 29472, nombre: 'Ley 18.045 - Mercado de Valores', fuente: 'Ley N.º 18.045, publicada {pub}, última versión {ver}' },
  { tipo: 'pvp', archivo: 'leyVidaPrivada', ley: '19.628', idNorma: 141599, nombre: 'Ley 19.628 - Protección de la Vida Privada (datos personales)', fuente: 'Ley N.º 19.628, publicada {pub}, última versión {ver} (texto vigente; NO incorpora la reforma de la Ley 21.719 de 2024, de vigencia diferida)' },
  { tipo: 'rpj', archivo: 'leyRespPenalPersonasJuridicas', ley: '20.393', idNorma: 1008668, nombre: 'Ley 20.393 - Responsabilidad Penal de las Personas Jurídicas', fuente: 'Ley N.º 20.393, publicada {pub}, última versión {ver}' },
  { tipo: 'dec', archivo: 'leyDelitosEconomicos', ley: '21.595', idNorma: 1195119, nombre: 'Ley 21.595 - Delitos Económicos', fuente: 'Ley N.º 21.595, publicada {pub}, última versión {ver}' },
  { tipo: 'pns', archivo: 'leyPenasSustitutivas', ley: '18.216', idNorma: 29636, nombre: 'Ley 18.216 - Penas Sustitutivas', fuente: 'Ley N.º 18.216, publicada {pub}, última versión {ver}' },
  { tipo: 'dsc', archivo: 'leyAntidiscriminacion', ley: '20.609', idNorma: 1042092, nombre: 'Ley 20.609 - Medidas contra la Discriminación', fuente: 'Ley N.º 20.609, publicada {pub}, última versión {ver}' },
  { tipo: 'mas', archivo: 'leyTenenciaResponsable', ley: '21.020', idNorma: 1106037, nombre: 'Ley 21.020 - Tenencia Responsable de Mascotas y Animales de Compañía', fuente: 'Ley N.º 21.020, publicada {pub}, última versión {ver}' },
  { tipo: 'soa', archivo: 'leySOAP', ley: '18.490', idNorma: 29893, nombre: 'Ley 18.490 - Seguro Obligatorio de Accidentes Personales (SOAP)', fuente: 'Ley N.º 18.490, publicada {pub}, última versión {ver}' },
  { tipo: 'trt', sinEnvoltorio: true, archivo: 'leyTransito', ley: '18.290', idNorma: 1007469, nombre: 'Ley 18.290 - Ley de Tránsito', fuente: 'Ley N.º 18.290 (texto refundido por DFL 1 de 2007, Transportes y Justicia), publicado {pub}, última versión {ver}' },
  { tipo: 'amb', archivo: 'leyMedioAmbiente', ley: '19.300', idNorma: 30667, nombre: 'Ley 19.300 - Bases Generales del Medio Ambiente', fuente: 'Ley N.º 19.300, publicada {pub}, última versión {ver}' },
  { tipo: 'tam', archivo: 'leyTribunalesAmbientales', ley: '20.600', idNorma: 1041361, nombre: 'Ley 20.600 - Tribunales Ambientales', fuente: 'Ley N.º 20.600, publicada {pub}, última versión {ver}' },
  { tipo: 'bga', archivo: 'leyBasesAdministracion', ley: '18.575', idNorma: 191865, nombre: 'Ley 18.575 - LOC de Bases Generales de la Administración del Estado', fuente: 'Ley N.º 18.575 (texto refundido por DFL 1/19.653 de 2000, Segpres), publicado {pub}, última versión {ver}' },
  { tipo: 'est', archivo: 'leyEstatutoAdministrativo', ley: '18.834', idNorma: 236392, nombre: 'Ley 18.834 - Estatuto Administrativo', fuente: 'Ley N.º 18.834 (texto refundido por DFL 29 de 2004, Hacienda), publicado {pub}, última versión {ver}' },
  { tipo: 'emu', archivo: 'leyEstatutoMunicipal', ley: '18.883', idNorma: 30256, nombre: 'Ley 18.883 - Estatuto Administrativo de Funcionarios Municipales', fuente: 'Ley N.º 18.883, publicada {pub}, última versión {ver}' },
  { tipo: 'mun', archivo: 'leyMunicipalidades', ley: '18.695', idNorma: 251693, nombre: 'Ley 18.695 - LOC de Municipalidades', fuente: 'Ley N.º 18.695 (texto refundido por DFL 1 de 2006, Interior), publicado {pub}, última versión {ver}' },
  { tipo: 'arr', archivo: 'leyArrendamientoUrbano', ley: '18.101', idNorma: 29526, nombre: 'Ley 18.101 - Arrendamiento de Predios Urbanos', fuente: 'Ley N.º 18.101, publicada {pub}, última versión {ver}' },
  { tipo: 'cop', archivo: 'leyCopropiedad', ley: '21.442', idNorma: 1174663, nombre: 'Ley 21.442 - Nueva Ley de Copropiedad Inmobiliaria', fuente: 'Ley N.º 21.442, publicada {pub}, última versión {ver}' },
  { tipo: 'pin', archivo: 'leyPropiedadIntelectual', ley: '17.336', idNorma: 28933, nombre: 'Ley 17.336 - Propiedad Intelectual', fuente: 'Ley N.º 17.336, publicada {pub}, última versión {ver}' },
  { tipo: 'pid', sinEnvoltorio: true, archivo: 'leyPropiedadIndustrial', ley: '19.039', idNorma: 1179684, nombre: 'Ley 19.039 - Propiedad Industrial', fuente: 'Ley N.º 19.039 (texto refundido por DFL 4 de 2022, Economía), publicado {pub}, última versión {ver}' },
  { tipo: 'dis', archivo: 'leyInclusionDiscapacidad', ley: '20.422', idNorma: 1010903, nombre: 'Ley 20.422 - Igualdad de Oportunidades e Inclusión Social de Personas con Discapacidad', fuente: 'Ley N.º 20.422, publicada {pub}, última versión {ver}' },
  { tipo: 'fel', archivo: 'leyFirmaElectronica', ley: '19.799', idNorma: 196640, nombre: 'Ley 19.799 - Documentos Electrónicos y Firma Electrónica', fuente: 'Ley N.º 19.799, publicada {pub}, última versión {ver}' },
  { tipo: 'tde', archivo: 'leyTransformacionDigital', ley: '21.180', idNorma: 1138479, nombre: 'Ley 21.180 - Transformación Digital del Estado', fuente: 'Ley N.º 21.180, publicada {pub}, última versión {ver}' },
  { tipo: 'ind', archivo: 'leyIndigena', ley: '19.253', idNorma: 30620, nombre: 'Ley 19.253 - Protección, Fomento y Desarrollo de los Indígenas', fuente: 'Ley N.º 19.253, publicada {pub}, última versión {ver}' },
  // Reserva 1 (reemplaza a la Ley 19.913 UAF: la BCN no entrega su XML, ver informe)
  { tipo: 'cng', archivo: 'leyCongresoNacional', ley: '18.918', idNorma: 30289, nombre: 'Ley 18.918 - LOC del Congreso Nacional', fuente: 'Ley N.º 18.918, publicada {pub}, última versión {ver}' },
]

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , carpeta, hoy = new Date().toISOString().slice(0, 10)] = process.argv
  if (!carpeta) {
    console.error('Uso: node scripts/leyes_lote1.mjs <carpeta-xml> [fechaHoy]')
    process.exit(1)
  }
  const script = new URL('./bcn_xml_a_json.mjs', import.meta.url).pathname
  for (const l of LEYES_LOTE1) {
    const xml = path.join(carpeta, `${l.idNorma}.xml`)
    if (!fs.existsSync(xml)) {
      console.error(`FALTA ${xml} (${l.nombre})`)
      continue
    }
    const salida = path.join('src/data', `${l.archivo}.json`)
    const args = [script, xml, salida, l.nombre, l.tipo, l.fuente, hoy]
    if (l.doble) args.push(`--doble=${l.doble}`)
    if (l.sinEnvoltorio) args.push('--sin-envoltorio')
    execFileSync(process.execPath, args, { stdio: 'inherit' })
  }
}

import type { ArticuloColeccion, RefArticuloColeccion, TipoRelacion } from '../types'

// Plantillas de colecciones para temas clásicos de Derecho Civil chileno —
// los que casi todo estudiante arma en algún momento de la carrera. Al usar
// una plantilla se crea una colección propia e independiente (una copia),
// no un vínculo compartido: el estudiante puede editarla libremente después.
//
// Los números de artículo son los de referencia habitual en la enseñanza
// del Código Civil. Si alguno no calza exactamente con el texto vigente
// indexado, la ficha correspondiente simplemente se muestra como "no
// encontrada" (comportamiento ya previsto en TarjetaArticulo) — nunca se
// inventa contenido.
export interface ColeccionPlantilla {
  id: string
  titulo: string
  descripcion: string
  articulos: ArticuloColeccion[]
  /** EXPERIMENTAL: conexiones tipadas a crear junto con la colección (sin
   * `id` — se genera al instanciarla, igual que si el usuario las hubiera
   * dibujado a mano en la pizarra). Opcional: las plantillas de Civil de
   * arriba no la usan y siguen funcionando igual que siempre. */
  conexiones?: { desde: RefArticuloColeccion; hasta: RefArticuloColeccion; tipo: TipoRelacion }[]
  /** EXPERIMENTAL: agrupaciones visuales a crear junto con la colección. */
  grupos?: { titulo: string; articulos: RefArticuloColeccion[] }[]
}

export const COLECCIONES_PLANTILLA: ColeccionPlantilla[] = [
  {
    id: 'plantilla-extincion-obligaciones',
    titulo: 'Extinción de las obligaciones',
    descripcion: 'Fuerza obligatoria, modos de extinguir y prescripción',
    articulos: [
      { codigo: 'civ', articulo: 'Art. 1545' },
      { codigo: 'civ', articulo: 'Art. 1567' },
      { codigo: 'civ', articulo: 'Art. 1698' },
      { codigo: 'civ', articulo: 'Art. 2492' },
    ],
  },
  {
    id: 'plantilla-vicios-consentimiento',
    titulo: 'Vicios del consentimiento',
    descripcion: 'Error, fuerza y dolo',
    articulos: [
      { codigo: 'civ', articulo: 'Art. 1451' },
      { codigo: 'civ', articulo: 'Art. 1452' },
      { codigo: 'civ', articulo: 'Art. 1456' },
      { codigo: 'civ', articulo: 'Art. 1458' },
    ],
  },
  {
    id: 'plantilla-nulidad',
    titulo: 'Nulidad y rescisión',
    descripcion: 'Nulidad absoluta, relativa y sus efectos',
    articulos: [
      { codigo: 'civ', articulo: 'Art. 1681' },
      { codigo: 'civ', articulo: 'Art. 1682' },
      { codigo: 'civ', articulo: 'Art. 1683' },
      { codigo: 'civ', articulo: 'Art. 1687' },
    ],
  },
  {
    id: 'plantilla-clasificacion-contratos',
    titulo: 'Clasificación de los contratos',
    descripcion: 'Unilateral/bilateral, gratuito/oneroso, principal/accesorio',
    articulos: [
      { codigo: 'civ', articulo: 'Art. 1439' },
      { codigo: 'civ', articulo: 'Art. 1440' },
      { codigo: 'civ', articulo: 'Art. 1441' },
      { codigo: 'civ', articulo: 'Art. 1442' },
      { codigo: 'civ', articulo: 'Art. 1443' },
    ],
  },
  {
    id: 'plantilla-responsabilidad-extracontractual',
    titulo: 'Responsabilidad extracontractual',
    descripcion: 'Delitos y cuasidelitos civiles, presunciones de culpa',
    articulos: [
      { codigo: 'civ', articulo: 'Art. 2314' },
      { codigo: 'civ', articulo: 'Art. 2320' },
      { codigo: 'civ', articulo: 'Art. 2329' },
    ],
  },
  {
    id: 'plantilla-posesion-prescripcion',
    titulo: 'Posesión y prescripción adquisitiva',
    descripcion: 'Concepto de posesión, mera tenencia y usucapión',
    articulos: [
      { codigo: 'civ', articulo: 'Art. 700' },
      { codigo: 'civ', articulo: 'Art. 715' },
      { codigo: 'civ', articulo: 'Art. 2492' },
      { codigo: 'civ', articulo: 'Art. 2498' },
    ],
  },
  // Plantilla "demo": a diferencia de las de arriba (solo artículos), esta
  // trae además conexiones tipadas, función jurídica por artículo y grupos
  // ya armados — para mostrar de una vez qué tan lejos puede llegar la
  // función completa de Colecciones (pizarra + árbol), con un tema real y
  // denso en relaciones: la terminación del contrato de trabajo. Los 16
  // artículos y las citas cruzadas entre ellos están verificados contra el
  // Código del Trabajo indexado (src/data/codigoTrabajo.json), no inventados.
  {
    id: 'plantilla-demo-terminacion-contrato-trabajo',
    titulo: 'Terminación del contrato de trabajo',
    descripcion: 'Demo: causales, aviso, indemnizaciones, fuero y finiquito — 16 artículos y 22 conexiones',
    articulos: [
      { codigo: 'lab', articulo: 'Art. 159', funcion: 'regla_general' },
      { codigo: 'lab', articulo: 'Art. 160', funcion: 'regla_general' },
      { codigo: 'lab', articulo: 'Art. 161', funcion: 'regla_general' },
      { codigo: 'lab', articulo: 'Art. 162', funcion: 'procedimiento' },
      { codigo: 'lab', articulo: 'Art. 163', funcion: 'concepto' },
      { codigo: 'lab', articulo: 'Art. 163 bis', funcion: 'excepcion' },
      { codigo: 'lab', articulo: 'Art. 168', funcion: 'sancion' },
      { codigo: 'lab', articulo: 'Art. 169', funcion: 'procedimiento' },
      { codigo: 'lab', articulo: 'Art. 170', funcion: 'procedimiento' },
      { codigo: 'lab', articulo: 'Art. 171', funcion: 'excepcion' },
      { codigo: 'lab', articulo: 'Art. 172', funcion: 'concepto' },
      { codigo: 'lab', articulo: 'Art. 173', funcion: 'complementaria' },
      { codigo: 'lab', articulo: 'Art. 174', funcion: 'excepcion' },
      { codigo: 'lab', articulo: 'Art. 177', funcion: 'procedimiento' },
      { codigo: 'lab', articulo: 'Art. 178', funcion: 'complementaria' },
      { codigo: 'lab', articulo: 'Art. 201', funcion: 'excepcion' },
    ],
    conexiones: [
      { desde: { codigo: 'lab', articulo: 'Art. 159' }, hasta: { codigo: 'lab', articulo: 'Art. 162' }, tipo: 'desarrolla' },
      { desde: { codigo: 'lab', articulo: 'Art. 160' }, hasta: { codigo: 'lab', articulo: 'Art. 162' }, tipo: 'desarrolla' },
      { desde: { codigo: 'lab', articulo: 'Art. 161' }, hasta: { codigo: 'lab', articulo: 'Art. 162' }, tipo: 'desarrolla' },
      { desde: { codigo: 'lab', articulo: 'Art. 162' }, hasta: { codigo: 'lab', articulo: 'Art. 163' }, tipo: 'remite_a' },
      { desde: { codigo: 'lab', articulo: 'Art. 161' }, hasta: { codigo: 'lab', articulo: 'Art. 163' }, tipo: 'remite_a' },
      { desde: { codigo: 'lab', articulo: 'Art. 163' }, hasta: { codigo: 'lab', articulo: 'Art. 172' }, tipo: 'remite_a' },
      { desde: { codigo: 'lab', articulo: 'Art. 163' }, hasta: { codigo: 'lab', articulo: 'Art. 173' }, tipo: 'complementa' },
      { desde: { codigo: 'lab', articulo: 'Art. 168' }, hasta: { codigo: 'lab', articulo: 'Art. 172' }, tipo: 'remite_a' },
      { desde: { codigo: 'lab', articulo: 'Art. 161' }, hasta: { codigo: 'lab', articulo: 'Art. 169' }, tipo: 'desarrolla' },
      { desde: { codigo: 'lab', articulo: 'Art. 169' }, hasta: { codigo: 'lab', articulo: 'Art. 170' }, tipo: 'consecuencia' },
      { desde: { codigo: 'lab', articulo: 'Art. 163 bis' }, hasta: { codigo: 'lab', articulo: 'Art. 163' }, tipo: 'remite_a' },
      { desde: { codigo: 'lab', articulo: 'Art. 163 bis' }, hasta: { codigo: 'lab', articulo: 'Art. 162' }, tipo: 'excepcion' },
      { desde: { codigo: 'lab', articulo: 'Art. 174' }, hasta: { codigo: 'lab', articulo: 'Art. 159' }, tipo: 'limita' },
      { desde: { codigo: 'lab', articulo: 'Art. 174' }, hasta: { codigo: 'lab', articulo: 'Art. 160' }, tipo: 'limita' },
      { desde: { codigo: 'lab', articulo: 'Art. 174' }, hasta: { codigo: 'lab', articulo: 'Art. 201' }, tipo: 'desarrolla' },
      { desde: { codigo: 'lab', articulo: 'Art. 171' }, hasta: { codigo: 'lab', articulo: 'Art. 160' }, tipo: 'contradice' },
      { desde: { codigo: 'lab', articulo: 'Art. 160' }, hasta: { codigo: 'lab', articulo: 'Art. 168' }, tipo: 'consecuencia' },
      { desde: { codigo: 'lab', articulo: 'Art. 159' }, hasta: { codigo: 'lab', articulo: 'Art. 168' }, tipo: 'consecuencia' },
      { desde: { codigo: 'lab', articulo: 'Art. 168' }, hasta: { codigo: 'lab', articulo: 'Art. 161' }, tipo: 'excepcion' },
      { desde: { codigo: 'lab', articulo: 'Art. 162' }, hasta: { codigo: 'lab', articulo: 'Art. 177' }, tipo: 'relacionado_con' },
      { desde: { codigo: 'lab', articulo: 'Art. 177' }, hasta: { codigo: 'lab', articulo: 'Art. 178' }, tipo: 'relacionado_con' },
      { desde: { codigo: 'lab', articulo: 'Art. 163' }, hasta: { codigo: 'lab', articulo: 'Art. 178' }, tipo: 'mismo_concepto' },
    ],
    grupos: [
      {
        titulo: 'Causales de término',
        articulos: [
          { codigo: 'lab', articulo: 'Art. 159' },
          { codigo: 'lab', articulo: 'Art. 160' },
        ],
      },
      {
        titulo: 'Cálculo de la indemnización',
        articulos: [
          { codigo: 'lab', articulo: 'Art. 172' },
          { codigo: 'lab', articulo: 'Art. 173' },
          { codigo: 'lab', articulo: 'Art. 178' },
        ],
      },
      {
        titulo: 'Situaciones excepcionales',
        articulos: [
          { codigo: 'lab', articulo: 'Art. 171' },
          { codigo: 'lab', articulo: 'Art. 174' },
          { codigo: 'lab', articulo: 'Art. 163 bis' },
        ],
      },
    ],
  },
]

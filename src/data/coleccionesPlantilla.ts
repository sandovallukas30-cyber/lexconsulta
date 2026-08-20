import type { ArticuloColeccion } from '../types'

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
]

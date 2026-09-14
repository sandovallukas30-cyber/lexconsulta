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
  // Primera plantilla de Derecho Constitucional: la base constitucional del
  // recurso de protección. Pensada para el trabajo típico de primer año
  // (redactar un recurso a partir de un caso), donde el problema no es
  // conocer el art. 20 aislado, sino ver de qué depende: el catálogo del
  // art. 19, el principio de juridicidad de los arts. 6 y 7 (que es lo que
  // permite calificar un acto de "ilegal"), y las reglas de tribunal y
  // tramitación. Los 10 artículos constitucionales y las relaciones entre
  // ellos están verificados contra la Constitución indexada
  // (src/data/constitucion.json).
  //
  // Se agregaron además los numerales del Auto Acordado (Acta N° 94-2015 de
  // la Corte Suprema, con las modificaciones de la Acta 173-2018): la
  // tramitación del recurso NO está en la Constitución (su anclaje
  // constitucional es el art. 82, superintendencia económica, y el art. 93
  // N° 2 le da al Tribunal Constitucional el control de constitucionalidad
  // de los autos acordados) — es un instrumento propio, indexado como
  // código 'aap' (src/data/autoAcordadoProteccion.json). Sin esto, la
  // colección solo respondía CUÁNDO procede el recurso, no CÓMO se tramita
  // — y la evaluación E01 exige manejar ambas cosas con el Auto Acordado
  // impreso en la mano. El texto de cada numeral 'aap' es un resumen
  // funcional verificado, no una transcripción literal (ver notas en
  // src/data/codigosMetadata.ts).
  {
    id: 'plantilla-recurso-proteccion',
    titulo: 'Recurso de protección (art. 20)',
    descripcion:
      'Base constitucional de la acción (garantías protegidas, juridicidad del acto, tribunal competente) + tramitación según el Auto Acordado: plazo, admisibilidad, informe, prueba, fallo y apelación',
    articulos: [
      { codigo: 'con', articulo: 'Art. 20', funcion: 'regla_general' },
      { codigo: 'con', articulo: 'Art. 19', funcion: 'concepto' },
      { codigo: 'con', articulo: 'Art. 6', funcion: 'regla_general' },
      { codigo: 'con', articulo: 'Art. 7', funcion: 'regla_general' },
      { codigo: 'con', articulo: 'Art. 5', funcion: 'complementaria' },
      { codigo: 'con', articulo: 'Art. 21', funcion: 'complementaria' },
      { codigo: 'con', articulo: 'Art. 38', funcion: 'procedimiento' },
      { codigo: 'con', articulo: 'Art. 76', funcion: 'procedimiento' },
      { codigo: 'con', articulo: 'Art. 82', funcion: 'complementaria' },
      { codigo: 'con', articulo: 'Art. 93', funcion: 'complementaria' },
      // Se agregan acá los numerales del Auto Acordado (Acta 94-2015): la
      // plantilla original solo cubría la base CONSTITUCIONAL (cuándo
      // procede el recurso) — para la evaluación E01 (redactar el escrito a
      // mano, con el Auto Acordado impreso como material permitido) hace
      // falta también CÓMO se tramita, que es lo que fijan estos numerales,
      // no la Constitución. Ver src/data/autoAcordadoProteccion.json — es un
      // resumen funcional verificado, no transcripción literal.
      { codigo: 'aap', articulo: 'N° 1', funcion: 'procedimiento' },
      { codigo: 'aap', articulo: 'N° 2', funcion: 'procedimiento' },
      { codigo: 'aap', articulo: 'N° 3', funcion: 'procedimiento' },
      { codigo: 'aap', articulo: 'N° 4', funcion: 'procedimiento' },
      { codigo: 'aap', articulo: 'N° 5', funcion: 'procedimiento' },
      { codigo: 'aap', articulo: 'N° 6', funcion: 'procedimiento' },
      { codigo: 'aap', articulo: 'N° 10', funcion: 'procedimiento' },
      { codigo: 'aap', articulo: 'N° 12', funcion: 'complementaria' },
      { codigo: 'aap', articulo: 'N° 13', funcion: 'complementaria' },
      { codigo: 'aap', articulo: 'N° 15', funcion: 'sancion' },
    ],
    conexiones: [
      // El art. 20 enumera expresamente los numerales del art. 19 que ampara.
      { desde: { codigo: 'con', articulo: 'Art. 20' }, hasta: { codigo: 'con', articulo: 'Art. 19' }, tipo: 'remite_a' },
      // La protección es la vía que hace exigible el deber de sujeción de los
      // órganos del Estado a la Constitución.
      { desde: { codigo: 'con', articulo: 'Art. 20' }, hasta: { codigo: 'con', articulo: 'Art. 6' }, tipo: 'desarrolla' },
      // "Ilegal" se mide contra la actuación válida: investidura, competencia y forma.
      { desde: { codigo: 'con', articulo: 'Art. 7' }, hasta: { codigo: 'con', articulo: 'Art. 20' }, tipo: 'relacionado_con' },
      { desde: { codigo: 'con', articulo: 'Art. 7' }, hasta: { codigo: 'con', articulo: 'Art. 6' }, tipo: 'complementa' },
      { desde: { codigo: 'con', articulo: 'Art. 5' }, hasta: { codigo: 'con', articulo: 'Art. 6' }, tipo: 'complementa' },
      { desde: { codigo: 'con', articulo: 'Art. 19' }, hasta: { codigo: 'con', articulo: 'Art. 5' }, tipo: 'relacionado_con' },
      // Amparo y protección comparten la fórmula "restablecer el imperio del
      // derecho y asegurar la debida protección del afectado".
      { desde: { codigo: 'con', articulo: 'Art. 21' }, hasta: { codigo: 'con', articulo: 'Art. 20' }, tipo: 'mismo_concepto' },
      // Vía general de reclamo frente a la Administración, junto a la protección.
      { desde: { codigo: 'con', articulo: 'Art. 38' }, hasta: { codigo: 'con', articulo: 'Art. 20' }, tipo: 'complementa' },
      { desde: { codigo: 'con', articulo: 'Art. 38' }, hasta: { codigo: 'con', articulo: 'Art. 76' }, tipo: 'remite_a' },
      // Jurisdicción e inexcusabilidad de los tribunales que conocen del recurso.
      { desde: { codigo: 'con', articulo: 'Art. 76' }, hasta: { codigo: 'con', articulo: 'Art. 20' }, tipo: 'complementa' },
      // Superintendencia económica: fundamento de los autos acordados que regulan la tramitación.
      { desde: { codigo: 'con', articulo: 'Art. 82' }, hasta: { codigo: 'con', articulo: 'Art. 20' }, tipo: 'relacionado_con' },
      // El TC controla la constitucionalidad de esos autos acordados.
      { desde: { codigo: 'con', articulo: 'Art. 93' }, hasta: { codigo: 'con', articulo: 'Art. 82' }, tipo: 'limita' },

      // Puente Constitución ↔ Auto Acordado.
      // La admisibilidad (N° 2) exige mencionar hechos que vulneren las garantías del art. 20.
      { desde: { codigo: 'aap', articulo: 'N° 2' }, hasta: { codigo: 'con', articulo: 'Art. 20' }, tipo: 'remite_a' },
      // La potestad de la Corte Suprema para fijar tribunal y plazo por auto acordado nace del art. 82.
      { desde: { codigo: 'con', articulo: 'Art. 82' }, hasta: { codigo: 'aap', articulo: 'N° 1' }, tipo: 'desarrolla' },
      // El plazo de fallo (N° 10) se acorta para ciertas garantías del art. 19.
      { desde: { codigo: 'aap', articulo: 'N° 10' }, hasta: { codigo: 'con', articulo: 'Art. 19' }, tipo: 'relacionado_con' },

      // Secuencia interna del Auto Acordado (el orden real de la tramitación).
      { desde: { codigo: 'aap', articulo: 'N° 1' }, hasta: { codigo: 'aap', articulo: 'N° 2' }, tipo: 'consecuencia' },
      { desde: { codigo: 'aap', articulo: 'N° 2' }, hasta: { codigo: 'aap', articulo: 'N° 3' }, tipo: 'consecuencia' },
      { desde: { codigo: 'aap', articulo: 'N° 3' }, hasta: { codigo: 'aap', articulo: 'N° 4' }, tipo: 'relacionado_con' },
      { desde: { codigo: 'aap', articulo: 'N° 3' }, hasta: { codigo: 'aap', articulo: 'N° 5' }, tipo: 'relacionado_con' },
      { desde: { codigo: 'aap', articulo: 'N° 3' }, hasta: { codigo: 'aap', articulo: 'N° 6' }, tipo: 'relacionado_con' },
      { desde: { codigo: 'aap', articulo: 'N° 6' }, hasta: { codigo: 'aap', articulo: 'N° 10' }, tipo: 'relacionado_con' },
      { desde: { codigo: 'aap', articulo: 'N° 6' }, hasta: { codigo: 'aap', articulo: 'N° 12' }, tipo: 'complementa' },
      { desde: { codigo: 'aap', articulo: 'N° 3' }, hasta: { codigo: 'aap', articulo: 'N° 13' }, tipo: 'complementa' },
      { desde: { codigo: 'aap', articulo: 'N° 6' }, hasta: { codigo: 'aap', articulo: 'N° 15' }, tipo: 'consecuencia' },
    ],
    grupos: [
      {
        titulo: 'La acción y los derechos que ampara',
        articulos: [
          { codigo: 'con', articulo: 'Art. 20' },
          { codigo: 'con', articulo: 'Art. 19' },
        ],
      },
      {
        titulo: 'Por qué un acto es ilegal o arbitrario',
        articulos: [
          { codigo: 'con', articulo: 'Art. 6' },
          { codigo: 'con', articulo: 'Art. 7' },
          { codigo: 'con', articulo: 'Art. 5' },
        ],
      },
      {
        titulo: 'Tribunal y tramitación',
        articulos: [
          { codigo: 'con', articulo: 'Art. 76' },
          { codigo: 'con', articulo: 'Art. 82' },
          { codigo: 'con', articulo: 'Art. 93' },
        ],
      },
      {
        titulo: 'Vías paralelas',
        articulos: [
          { codigo: 'con', articulo: 'Art. 21' },
          { codigo: 'con', articulo: 'Art. 38' },
        ],
      },
      {
        titulo: 'Tramitación (Auto Acordado, Acta 94-2015)',
        articulos: [
          { codigo: 'aap', articulo: 'N° 1' },
          { codigo: 'aap', articulo: 'N° 2' },
          { codigo: 'aap', articulo: 'N° 3' },
          { codigo: 'aap', articulo: 'N° 4' },
          { codigo: 'aap', articulo: 'N° 5' },
          { codigo: 'aap', articulo: 'N° 6' },
          { codigo: 'aap', articulo: 'N° 10' },
          { codigo: 'aap', articulo: 'N° 12' },
          { codigo: 'aap', articulo: 'N° 13' },
          { codigo: 'aap', articulo: 'N° 15' },
        ],
      },
    ],
  },
]

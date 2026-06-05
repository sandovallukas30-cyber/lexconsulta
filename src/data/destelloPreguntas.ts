import type { PreguntaDestello } from '../types'

export const PREGUNTAS_DESTELLO: PreguntaDestello[] = [
  // ============ CONSTITUCIÓN POLÍTICA (con) ============
  {
    id: 'con-art19-1',
    articulo: 'Art. 19 CPR',
    pregunta: '¿Qué derecho se menciona en el artículo 19 número 1 de la Constitución?',
    descripcionBreve: 'Garantías constitucionales fundamentales',
    opciones: [
      'Derecho a la vida y a la integridad física y psíquica',
      'Derecho a la educación y a la cultura',
      'Derecho a la seguridad social',
      'Derecho al trabajo y a la libre elección de profesión',
    ],
    respuestaCorrecta: 0,
    codigo: 'con',
    dificultad: 'facil',
    explicacion:
      'El artículo 19 nº 1 establece que la Constitución asegura a todas las personas el derecho a la vida y a la integridad física y psíquica. Es el derecho fundamental más básico.',
  },

  {
    id: 'con-art19-2',
    articulo: 'Art. 19 nº 2 CPR',
    pregunta: '¿Cuál es el contenido del artículo 19 número 2 sobre nacionalidad?',
    descripcionBreve: 'Nacionalidad y derechos políticos',
    opciones: [
      'Son chilenos los que viven en territorio nacional',
      'Son chilenos los que han obtenido naturalización legal',
      'Solo son chilenos los nacidos en Chile',
      'La nacionalidad es un derecho irrenunciable',
    ],
    respuestaCorrecta: 1,
    codigo: 'con',
    dificultad: 'normal',
    explicacion:
      'El artículo 19 nº 2 contempla que son chilenos quienes cumplen con los requisitos establecidos en la ley, incluyendo la naturalización.',
  },

  {
    id: 'con-art19-9',
    articulo: 'Art. 19 nº 9 CPR',
    pregunta:
      '¿Qué garantiza el artículo 19 número 9 de la Constitución sobre la propiedad?',
    descripcionBreve: 'Derecho de propiedad y función social',
    opciones: [
      'Derecho absoluto sin limitaciones',
      'El derecho de propiedad sin función social',
      'El derecho de propiedad con obligaciones que impone su naturaleza',
      'Que la propiedad es colectiva en zonas urbanas',
    ],
    respuestaCorrecta: 2,
    codigo: 'con',
    dificultad: 'normal',
    explicacion:
      'La Constitución asegura el derecho de propiedad, pero este derecho tiene una función social. No es un derecho absoluto, sino limitado por obligaciones inherentes.',
  },

  {
    id: 'con-art20',
    articulo: 'Art. 20 CPR',
    pregunta: '¿Qué acción tutela los derechos fundamentales cuando son infringidos?',
    descripcionBreve: 'Recurso de amparo y protección',
    opciones: [
      'Solo apelación ante tribunal superior',
      'Acción de protección o recurso de amparo',
      'Demanda ordinaria civil',
      'Denuncia ante la policía',
    ],
    respuestaCorrecta: 1,
    codigo: 'con',
    dificultad: 'facil',
    explicacion:
      'El artículo 20 de la CPR establece dos acciones: la de protección (Art. 20 inciso primero) y el amparo (Art. 21) para resguardar derechos fundamentales.',
  },

  // ============ CÓDIGO CIVIL (civ) ============
  {
    id: 'civ-art1',
    articulo: 'Art. 1 CC',
    pregunta: '¿A quién se entiende por persona según el Código Civil?',
    descripcionBreve: 'Concepto de persona natural',
    opciones: [
      'Solo a quienes tienen capacidad contractual',
      'A los seres humanos desde el nacimiento',
      'Solo a mayores de edad',
      'A quienes tienen derechos políticos',
    ],
    respuestaCorrecta: 1,
    codigo: 'civ',
    dificultad: 'facil',
    explicacion:
      'El artículo 1 CC establece que "La ley considera personas a todos los individuos de la especie humana", desde su nacimiento.',
  },

  {
    id: 'civ-art1446',
    articulo: 'Art. 1446 CC',
    pregunta: '¿Cuándo es requisito esencial la capacidad en un contrato?',
    descripcionBreve: 'Requisitos de validez del contrato',
    opciones: [
      'Solo en contratos de gran cuantía',
      'En todos los contratos, sin excepción',
      'Solo en contratos inmobiliarios',
      'No es un requisito esencial',
    ],
    respuestaCorrecta: 1,
    codigo: 'civ',
    dificultad: 'normal',
    explicacion:
      'La capacidad es un requisito esencial para la validez de todo contrato. Sin capacidad, el contrato es nulo.',
  },

  {
    id: 'civ-art2506',
    articulo: 'Art. 2506 CC',
    pregunta: '¿Cuál es el plazo de prescripción ordinaria para deudas?',
    descripcionBreve: 'Prescripción de acciones ordinarias',
    opciones: ['3 años', '5 años', '10 años', '15 años'],
    respuestaCorrecta: 2,
    codigo: 'civ',
    dificultad: 'normal',
    explicacion:
      'El artículo 2506 CC establece que el plazo ordinario de prescripción para la mayoría de las acciones es de 10 años.',
  },

  {
    id: 'civ-art1667',
    articulo: 'Art. 1667 CC',
    pregunta: '¿Qué establece el Código Civil sobre la forma de los contratos?',
    descripcionBreve: 'Libertad de forma de los contratos',
    opciones: [
      'Los contratos deben ser siempre por escrito',
      'Los contratos deben ser autenticados',
      'Los contratos pueden tomar cualquier forma no prohibida por ley',
      'Los contratos deben tener testigos',
    ],
    respuestaCorrecta: 2,
    codigo: 'civ',
    dificultad: 'normal',
    explicacion:
      'El artículo 1667 CC establece que "la forma de los contratos no será solemne, sino aquella que las partes acuerden, menos en los casos en que la ley prescriba una forma especial para el valor de ciertos actos o contratos."',
  },

  // ============ CÓDIGO PENAL (pen) ============
  {
    id: 'pen-art1',
    articulo: 'Art. 1 CP',
    pregunta:
      '¿Cuál es el principio de aplicación territorial del Código Penal chileno?',
    descripcionBreve: 'Ámbito de aplicación territorial',
    opciones: [
      'Se aplica solo dentro de Chile',
      'Se aplica a delitos cometidos en territorio chileno',
      'Se aplica a delitos de chilenos en el extranjero',
      'Opciones B y C son correctas',
    ],
    respuestaCorrecta: 3,
    codigo: 'pen',
    dificultad: 'normal',
    explicacion:
      'El Código Penal se aplica tanto a delitos cometidos en territorio nacional como a delitos cometidos por chilenos en el extranjero.',
  },

  {
    id: 'pen-art10',
    articulo: 'Art. 10 CP',
    pregunta: '¿A partir de qué edad comienza la responsabilidad penal en Chile?',
    descripcionBreve: 'Edad de imputabilidad penal',
    opciones: [
      'A los 14 años',
      'A los 16 años',
      'A los 18 años',
      'A los 21 años',
    ],
    respuestaCorrecta: 0,
    codigo: 'pen',
    dificultad: 'facil',
    explicacion:
      'El artículo 10 CP establece que no es punible el menor de 14 años. Desde los 14 años comienza la responsabilidad penal, aunque con limitaciones hasta los 18.',
  },

  {
    id: 'pen-art43',
    articulo: 'Art. 43 CP',
    pregunta: '¿Qué tipos de penas establece el Código Penal?',
    descripcionBreve: 'Clasificación de penas',
    opciones: [
      'Solo penas privativas de libertad',
      'Penas aflictivas, infamantes y correccionales',
      'Solo multas',
      'Solo privación de derechos',
    ],
    respuestaCorrecta: 1,
    codigo: 'pen',
    dificultad: 'normal',
    explicacion:
      'El artículo 43 CP clasifica las penas en aflictivas (pena de muerte, presidio, penitenciaría), infamantes (inhabilitación) y correccionales (destierro, presidio menor, confinamiento, etc.).',
  },

  // ============ CÓDIGO DEL TRABAJO (tra) ============
  {
    id: 'tra-art1',
    articulo: 'Art. 1 CT',
    pregunta:
      '¿Cuál es el objetivo del Código del Trabajo según su artículo 1?',
    descripcionBreve: 'Objeto y aplicación del Código del Trabajo',
    opciones: [
      'Proteger solo a los empleadores',
      'Regular relaciones entre capital y trabajo',
      'Establecer salarios únicos',
      'Prohibir huelgas',
    ],
    respuestaCorrecta: 1,
    codigo: 'tra',
    dificultad: 'facil',
    explicacion:
      'El Código del Trabajo tiene como objeto fundamental "normar las relaciones entre los empleadores y trabajadores de carácter individual y colectivo."',
  },

  {
    id: 'tra-art5',
    articulo: 'Art. 5 CT',
    pregunta:
      '¿Qué prohibe el artículo 5 del Código del Trabajo a los empleadores?',
    descripcionBreve: 'Prohibiciones de discriminación laboral',
    opciones: [
      'Despedir trabajadores sin motivo',
      'Discriminar arbitrariamente en relación al trabajo',
      'Pagar menos del sueldo mínimo',
      'Todas las anteriores',
    ],
    respuestaCorrecta: 1,
    codigo: 'tra',
    dificultad: 'facil',
    explicacion:
      'El artículo 5 CT prohibe al empleador realizar discriminaciones arbitrariamente en relación al trabajo, especialmente por motivos de raza, sexo, edad, religión, opinión política, etc.',
  },

  {
    id: 'tra-art160',
    articulo: 'Art. 160 CT',
    pregunta:
      '¿Cuál es el período máximo de prueba en un contrato de trabajo?',
    descripcionBreve: 'Plazo de contrato a prueba',
    opciones: [
      '15 días',
      '30 días',
      '60 días',
      '90 días',
    ],
    respuestaCorrecta: 2,
    codigo: 'tra',
    dificultad: 'normal',
    explicacion:
      'El artículo 160 CT establece que el contrato a prueba tiene una duración máxima de 60 días. Superado este plazo, el contrato se entenderá de duración indefinida.',
  },

  // ============ CÓDIGO DE FAMILIA (fam) ============
  {
    id: 'fam-art15',
    articulo: 'Art. 15 Ley 19.947',
    pregunta: '¿A partir de qué edad se puede contraer matrimonio en Chile?',
    descripcionBreve: 'Edad mínima para matrimonio',
    opciones: [
      'A los 16 años',
      'A los 18 años',
      'A los 21 años',
      'Sin límite de edad',
    ],
    respuestaCorrecta: 1,
    codigo: 'fam',
    dificultad: 'facil',
    explicacion:
      'La Ley de Matrimonio Civil (19.947) establece en su artículo 5 que pueden casarse quienes hayan cumplido 18 años. Excepcionalmente, menores de 18 pueden casarse con autorización judicial.',
  },

  {
    id: 'fam-pension-alimentos',
    articulo: 'Art. 203 Código Civil',
    pregunta:
      '¿Cuáles son los obligados a proporcionar alimentos según el Código Civil?',
    descripcionBreve: 'Obligados a dar alimentos',
    opciones: [
      'Solo los padres',
      'Padres, abuelos, hermanos en ciertos casos',
      'Solo el Estado',
      'Cualquier persona',
    ],
    respuestaCorrecta: 1,
    codigo: 'fam',
    dificultad: 'normal',
    explicacion:
      'El Código Civil establece en artículos sobre alimentos que están obligados: ascendientes, descendientes, cónyuge, conviviente civil.',
  },

  {
    id: 'fam-divorcio-causal',
    articulo: 'Art. 54 Ley 19.947',
    pregunta: '¿Cuál de estos es un causal de divorcio en la ley chilena?',
    descripcionBreve: 'Causales de divorcio',
    opciones: [
      'Solo infidelidad',
      'Culpa de uno de los cónyuges u otro hecho que lo justifique',
      'Solo abandono del hogar',
      'Solo incompatibilidad de caracteres',
    ],
    respuestaCorrecta: 1,
    codigo: 'fam',
    dificultad: 'normal',
    explicacion:
      'La Ley 19.947 establece causales de divorcio que incluyen tanto causales de culpa como causales no contenciosas basadas en el mutuo acuerdo o presentación unilateral después de plazos determinados.',
  },

  // ============ CÓDIGO PROCESAL CIVIL (cpc) ============
  {
    id: 'civ-art1-proc',
    articulo: 'Art. 1 CPC',
    pregunta: '¿Cuáles son los objetivos del Código de Procedimiento Civil?',
    descripcionBreve: 'Objeto del Código Procesal Civil',
    opciones: [
      'Solo cobrar deudas',
      'Determinar con certeza los derechos de las partes',
      'Proteger al demandante siempre',
      'Prohibir demandas en contra del Estado',
    ],
    respuestaCorrecta: 1,
    codigo: 'civ',
    dificultad: 'facil',
    explicacion:
      'El Código de Procedimiento Civil tiene como objeto fundamental "determinar con certeza los derechos que corresponden a cada uno en las cuestiones en que interese el bien público o privado de los súbditos."',
  },

  {
    id: 'civ-art78',
    articulo: 'Art. 78 CPC',
    pregunta: '¿Cuál es el plazo para contestar una demanda?',
    descripcionBreve: 'Plazo de contestación de demanda',
    opciones: [
      '5 días',
      '10 días',
      '15 días',
      '30 días',
    ],
    respuestaCorrecta: 2,
    codigo: 'civ',
    dificultad: 'normal',
    explicacion:
      'El artículo 78 CPC establece que el demandado tiene 15 días para contestar la demanda, contados desde la notificación de la misma.',
  },

  // ============ CÓDIGO PENAL PROCESAL (cpp) ============
  {
    id: 'pen-art1-proc',
    articulo: 'Art. 1 CPP',
    pregunta:
      '¿Cuál es el objeto del Código Procesal Penal chileno según su artículo 1?',
    descripcionBreve: 'Objetivo del proceso penal',
    opciones: [
      'Perseguir al imputado a toda costa',
      'Determinar si la conducta investigada constituye delito y sancionar',
      'Proteger solo a las víctimas',
      'Absolver a todos los imputados',
    ],
    respuestaCorrecta: 1,
    codigo: 'pen',
    dificultad: 'normal',
    explicacion:
      'El Código Procesal Penal establece en su artículo 1 que el proceso penal tiene como objeto "determinar si la conducta investigada constituye un delito o simple falta y, en su caso, sancionar al culpable."',
  },

  {
    id: 'pen-art96',
    articulo: 'Art. 96 CPP',
    pregunta: '¿Quién es el fiscal en el sistema penal chileno?',
    descripcionBreve: 'Rol del fiscal en el proceso',
    opciones: [
      'Un juez que condenará al imputado',
      'Titular de la acción penal pública que dirige la investigación',
      'Un funcionario administrativo sin poder decisorio',
      'El abogado de la parte civil',
    ],
    respuestaCorrecta: 1,
    codigo: 'pen',
    dificultad: 'facil',
    explicacion:
      'El artículo 96 CPP establece que el Fiscal es el titular de la acción penal pública y de la investigación de los hechos constitutivos de delito.',
  },

  // ============ CÓDIGO TRIBUTARIO (tri) ============
  {
    id: 'tri-art1',
    articulo: 'Art. 1 CT',
    pregunta:
      '¿A qué se refiere el principio de igualdad en materia tributaria?',
    descripcionBreve: 'Principios tributarios',
    opciones: [
      'Todos deben pagar exactamente lo mismo',
      'Todos deben contribuir equitativamente a los gastos públicos según su capacidad',
      'Los ricos no pagan impuestos',
      'Solo los asalariados pagan impuestos',
    ],
    respuestaCorrecta: 1,
    codigo: 'tri',
    dificultad: 'normal',
    explicacion:
      'El principio de igualdad tributaria establece que todos los contribuyentes en situaciones similares deben tributar de manera equitativa según su capacidad de pago.',
  },

  {
    id: 'tri-art97',
    articulo: 'Art. 97 Código Tributario',
    pregunta:
      '¿Cuál es el plazo de prescripción para que la administración cobre impuestos adeudados?',
    descripcionBreve: 'Prescripción de acciones tributarias',
    opciones: ['2 años', '3 años', '5 años', '10 años'],
    respuestaCorrecta: 2,
    codigo: 'tri',
    dificultad: 'dificil',
    explicacion:
      'El artículo 97 del Código Tributario establece que la administración tiene 5 años para cobrar los impuestos que determine estén adeudados.',
  },

  // Agregar más preguntas para otros códigos...
]

/**
 * Obtiene preguntas filtradas por código
 */
export function obtenerPreguntasPorCodigo(codigo: string): PreguntaDestello[] {
  return PREGUNTAS_DESTELLO.filter((p) => p.codigo === codigo)
}

/**
 * Obtiene una pregunta aleatoria (para spaced repetition)
 */
export function obtenerPreguntaAleatoria(codigo?: string): PreguntaDestello {
  const preguntas = codigo
    ? obtenerPreguntasPorCodigo(codigo)
    : PREGUNTAS_DESTELLO
  const random = Math.floor(Math.random() * preguntas.length)
  return preguntas[random]
}

/**
 * Obtiene N preguntas aleatorias
 */
export function obtenerVariasPreguntasAleatorias(
  cantidad: number,
  codigo?: string
): PreguntaDestello[] {
  const preguntas = codigo
    ? obtenerPreguntasPorCodigo(codigo)
    : PREGUNTAS_DESTELLO
  const resultado: PreguntaDestello[] = []
  const ids = new Set<string>()

  while (resultado.length < Math.min(cantidad, preguntas.length)) {
    const random = Math.floor(Math.random() * preguntas.length)
    const pregunta = preguntas[random]
    if (!ids.has(pregunta.id)) {
      resultado.push(pregunta)
      ids.add(pregunta.id)
    }
  }

  return resultado
}

/**
 * Obtiene los códigos que tienen preguntas disponibles
 */
export function obtenerCodigosConPreguntas(): string[] {
  const codigosSet = new Set(PREGUNTAS_DESTELLO.map((p) => p.codigo))
  return Array.from(codigosSet).sort()
}

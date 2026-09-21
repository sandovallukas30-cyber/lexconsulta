// Metadata de cada código indexado: fuente oficial, decreto/ley original,
// fecha de la última indexación local y advertencia sobre vigencia.
//
// La fecha de indexación es la fecha en que se procesó el PDF oficial de la
// Biblioteca del Congreso Nacional (BCN) y se generó el JSON usado por la
// aplicación. **No** es la fecha de la última reforma legal — eso depende del
// PDF descargado y de las reformas posteriores que la BCN haya incorporado.

import type { CodigoTipo } from '../types'

export interface CodigoMetadata {
  /** Identificador interno del código en la app. */
  tipo: CodigoTipo
  /** Nombre oficial completo. */
  nombreOficial: string
  /** Norma de origen (DFL, DL, Ley, DTO con número y año). */
  norma: string
  /** URL al texto oficial en la Biblioteca del Congreso Nacional. */
  fuenteUrl: string
  /** Fecha local en que el PDF fue procesado y se generó el JSON (ISO YYYY-MM-DD). */
  fechaIndexacion: string
  /** Notas relevantes para el usuario sobre vigencia o particularidades. */
  notas?: string
  /** Otras normas indexadas con las que esta tiene una conexión jurídica fuerte
   * (regula la misma materia, es procedimiento aplicable, ley especial que la
   * desplaza, etc.). Se muestran como enlaces clickeables en la ficha. */
  relacionadas?: CodigoTipo[]
  /** false SOLO para el puñado de códigos cuyo `articulos[].t` es un RESUMEN
   * funcional propio, no la transcripción literal del texto oficial (hoy:
   * el Auto Acordado del recurso de protección — ver su `notas`). Sin
   * valor = true (texto oficial verbatim, que es el caso normal). Existe
   * como campo estructurado — no bastaba con la advertencia en `notas`,
   * que hay que abrir la ficha para leer — para poder mostrar un aviso
   * visible en Colecciones/Mapas mentales cuando corresponda, sin tener
   * que parsear texto libre buscando la palabra "resumen". */
  esTextoOficial?: boolean
  /** Contexto histórico breve: cuándo y por qué se dictó, quién lo redactó
   * (cuando se conoce con certeza razonable) -- no un tratado, solo
   * ubicación rápida. Ausente cuando no hay dato de autoría o contexto
   * suficientemente firme para incluirlo sin arriesgar precisión. */
  historia?: string
}

export const CODIGOS_METADATA: Record<string, CodigoMetadata> = {
  con: {
    tipo: 'con',
    nombreOficial: 'Constitución Política de la República de Chile',
    norma: 'DTO 100 (texto refundido, coordinado y sistematizado)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=242302',
    fechaIndexacion: '2026-05-22',
    historia:
      'Aprobada en el plebiscito de 1980 bajo el régimen militar de Augusto Pinochet y en vigencia desde 1981. Ha tenido numerosas reformas; la de 2005 (gobierno de Ricardo Lagos) fue la más profunda, eliminando senadores designados y vitalicios, la inamovilidad de los comandantes en jefe y otros llamados "enclaves autoritarios". El DTO 100 es el texto refundido tras esa reforma.',
    relacionadas: ['cot', 'pad', 'trn', 'pdc'],
  },
  civ: {
    tipo: 'civ',
    nombreOficial: 'Código Civil',
    norma: 'DFL 1 de 2000 (texto refundido)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=172986',
    fechaIndexacion: '2026-05-23',
    notas: 'Texto refundido por DFL 1 / 2000. Incorpora múltiples leyes posteriores hasta esa fecha.',
    historia:
      'Redactado casi en solitario por Andrés Bello a lo largo de unos 30 años de trabajo. Aprobado por ley el 14 de diciembre de 1855 y en vigencia desde el 1 de enero de 1857. Se apoyó fuertemente en el Código Civil francés de 1804 y el derecho romano, con soluciones propias de Bello en materias como la posesión y la prescripción, y sirvió de modelo a los códigos civiles de otros países latinoamericanos (Ecuador, Colombia, entre otros).',
    relacionadas: ['com', 'pci', 'agu', 'min', 'fam'],
  },
  lab: {
    tipo: 'lab',
    nombreOficial: 'Código del Trabajo',
    norma: 'DFL 1 de 2002 (texto refundido)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=207436',
    fechaIndexacion: '2026-05-22',
    notas: 'Puede no incluir reformas muy recientes (por ej. ajustes a Ley Karin posteriores a la indexación).',
    historia:
      'El primer Código del Trabajo chileno es de 1931 (gobierno de Carlos Ibáñez del Campo), que unificó leyes laborales dispersas desde comienzos del siglo XX. El texto actual proviene de las reformas laborales del primer gobierno de la vuelta a la democracia (Patricio Aylwin, 1990-1994), que modernizaron las relaciones laborales heredadas del Plan Laboral de 1979 dictado durante el régimen militar.',
    relacionadas: ['acc', 'kar', 'pci'],
  },
  pen: {
    tipo: 'pen',
    nombreOficial: 'Código Penal',
    norma: 'Promulgado en 1874',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1984',
    fechaIndexacion: '2026-05-22',
    notas: 'Texto histórico con lenguaje del siglo XIX. Reformado por múltiples leyes especiales posteriores.',
    historia:
      'Promulgado el 12 de noviembre de 1874 y vigente desde 1875, bajo el gobierno de Federico Errázuriz Zañartu. Se inspiró fuertemente en el Código Penal español de 1848-1850. Es, junto al Código de Comercio, uno de los cuerpos legales más antiguos todavía en vigor en Chile, lo que explica su lenguaje decimonónico.',
    relacionadas: ['ppe', 'dro', 'mil', 'rpa'],
  },
  tri: {
    tipo: 'tri',
    nombreOficial: 'Código Tributario',
    norma: 'DL 830',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=6374',
    fechaIndexacion: '2026-05-22',
    historia:
      'Dictado en 1974 por la Junta Militar, en el contexto de la reorganización institucional posterior al golpe de 1973. Reemplazó normas tributarias dispersas por un cuerpo sistemático de derecho tributario sustantivo y procedimental, y sentó las bases de las facultades actuales del Servicio de Impuestos Internos (SII).',
    relacionadas: ['pad', 'pci'],
  },
  com: {
    tipo: 'com',
    nombreOficial: 'Código de Comercio',
    norma: 'Promulgado en 1865',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1974',
    fechaIndexacion: '2026-05-23',
    notas: 'Texto histórico. Muchas materias hoy reguladas por leyes especiales (sociedades, quiebras, mercado de valores).',
    historia:
      'Redactado por el jurista José Gabriel Ocampo (argentino radicado en Chile), promulgado el 23 de noviembre de 1865 y vigente desde 1867. Es, junto al Código Penal, uno de los cuerpos legales más antiguos todavía en vigor en el país.',
    relacionadas: ['civ', 'pci', 'ins'],
  },
  pci: {
    tipo: 'pci',
    nombreOficial: 'Código de Procedimiento Civil',
    norma: 'Ley 1.552 (1902)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=22740',
    fechaIndexacion: '2026-05-23',
    notas: 'Texto del siglo XIX-XX. La app ofrece modernización opcional del lenguaje (i → y, lei → ley, etc.).',
    historia:
      'Resultado de un largo proceso de comisiones redactoras que se extendió por buena parte del siglo XIX. Aprobado como Ley 1.552 el 28 de agosto de 1902 y en vigencia desde 1903, sigue rigiendo hoy el procedimiento civil chileno pese a su lenguaje decimonónico.',
    relacionadas: ['cot', 'civ', 'com'],
  },
  ppe: {
    tipo: 'ppe',
    nombreOficial: 'Código Procesal Penal',
    norma: 'Ley 19.696 (2000)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=176595',
    fechaIndexacion: '2026-05-23',
    historia:
      'Fruto de la Reforma Procesal Penal de fines de los 90, que reemplazó el antiguo sistema inquisitivo (escrito, con juez instructor) por uno acusatorio y oral, y creó el Ministerio Público como órgano autónomo. Entró en vigencia de forma gradual por regiones entre 2000 y 2005 (la Región Metropolitana fue la última en incorporarse), una de las reformas judiciales más profundas de la historia reciente del país.',
    relacionadas: ['pen', 'cot', 'mil', 'dro'],
  },
  cot: {
    tipo: 'cot',
    nombreOficial: 'Código Orgánico de Tribunales',
    norma: 'Ley 7.421',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=25563',
    fechaIndexacion: '2026-05-23',
    historia:
      'Dictado en 1943, reemplazando a la antigua Ley de Organización y Atribuciones de los Tribunales de 1875. Regula la estructura, competencia y funcionamiento del Poder Judicial chileno.',
    relacionadas: ['pci', 'ppe', 'mil'],
  },
  min: {
    tipo: 'min',
    nombreOficial: 'Código de Minería',
    norma: 'Ley 18.248',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=29668',
    fechaIndexacion: '2026-05-23',
    historia:
      'Chile ha tenido varios códigos mineros sucesivos dada la importancia histórica de la minería en su economía (códigos previos de 1874, 1888 y 1930/1932). El texto actual, de 1983, se dictó bajo el régimen militar en concordancia con el tratamiento especial que la Constitución de 1980 da a la concesión minera como derecho real distinto del dominio del Estado sobre las minas.',
    relacionadas: ['civ', 'agu', 'pad'],
  },
  agu: {
    tipo: 'agu',
    nombreOficial: 'Código de Aguas',
    norma: 'DFL 1.122',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=5605',
    fechaIndexacion: '2026-05-23',
    notas: 'Reformado significativamente por Ley 21.435 (2022). Verificar contra texto vigente para materias modificadas.',
    historia:
      'El texto actual data de 1981, dictado durante el régimen militar. Estableció un sistema de derechos de aprovechamiento de aguas transferibles y separados de la propiedad de la tierra -- un modelo de mercado de aguas pionero e influyente (y muy discutido) a nivel internacional. La Ley 21.435 de 2022 reformuló el agua como bien nacional de uso público con prioridades de uso (consumo humano, saneamiento, subsistencia por sobre otros usos).',
    relacionadas: ['civ', 'min', 'pad'],
  },
  pad: {
    tipo: 'pad',
    nombreOficial: 'Ley 19.880 — Bases de los Procedimientos Administrativos',
    norma: 'Ley 19.880, publicada el 29 de mayo de 2003',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=210676',
    fechaIndexacion: '2026-05-25',
    notas: 'Ley supletoria: rige todo procedimiento administrativo que no tenga regla especial. Cubre plazos, notificaciones, silencio administrativo, recursos (reposición, jerárquico, revisión).',
    historia:
      'Dictada en 2003, durante el gobierno de Ricardo Lagos, para llenar un vacío histórico: Chile no tenía hasta entonces una ley general de procedimiento administrativo. Estableció por primera vez reglas comunes para todos los órganos de la Administración del Estado.',
    relacionadas: ['con', 'tri', 'san'],
  },
  acc: {
    tipo: 'acc',
    nombreOficial: 'Ley 16.744 — Seguro social contra riesgos de accidentes del trabajo y enfermedades profesionales',
    norma: 'Ley 16.744, publicada el 1 de febrero de 1968',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=28650',
    fechaIndexacion: '2026-05-25',
    notas: 'Seguro obligatorio administrado por mutualidades (ACHS, IST, Mutual) e ISL. Cubre prestaciones médicas, subsidios, indemnizaciones y pensiones por accidentes y enfermedades profesionales.',
    historia:
      'De 1968, en el contexto de la consolidación del sistema de seguridad social chileno de mediados del siglo XX. Creó el seguro social obligatorio contra accidentes del trabajo y enfermedades profesionales, financiado por cotización patronal, y dio origen al sistema de mutualidades de empleadores (ACHS, IST, Mutual de Seguridad).',
    relacionadas: ['lab', 'civ', 'kar'],
  },
  dro: {
    tipo: 'dro',
    nombreOficial: 'Ley 20.000 — Sanciona el tráfico ilícito de estupefacientes y sustancias sicotrópicas',
    norma: 'Ley 20.000, publicada el 16 de febrero de 2005',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=235507',
    fechaIndexacion: '2026-05-25',
    notas: 'Reemplaza para todos los efectos a la antigua Ley 19.366. Distingue tráfico, microtráfico, porte y consumo. Incluye técnicas especiales de investigación y atenuante por cooperación eficaz.',
    historia:
      'De 2005, reemplazó a la antigua Ley 19.366 de 1995 en respuesta a la evolución del narcotráfico y el microtráfico en Chile desde los años 90. Incorporó técnicas especiales de investigación (agente encubierto, entregas vigiladas) inexistentes en la ley anterior.',
    relacionadas: ['pen', 'ppe'],
  },
  kar: {
    tipo: 'kar',
    nombreOficial: 'Ley 21.643 — "Ley Karin": regula y sanciona acoso laboral, sexual y violencia en el trabajo',
    norma: 'Ley 21.643, publicada el 15 de enero de 2024, vigente desde el 1 de agosto de 2024',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1201219',
    fechaIndexacion: '2026-05-25',
    notas: 'LEY MODIFICATORIA. Sus 6 artículos no contienen regulación autónoma sino que insertan o sustituyen artículos en: Código del Trabajo (Art. 211-A a 211-E), Ley 18.575 (Bases de la Administración), Ley 18.834 (Estatuto Administrativo), Ley 18.883 (Municipalidades) y Ley 18.695 (Orgánica de Municipalidades). El texto vigente del Código del Trabajo indexado en Prima Lex ya debería contener estos cambios.',
    historia:
      'Publicada en enero de 2024 y vigente desde agosto del mismo año. Lleva su nombre en memoria de Karin Salgado, trabajadora de la salud que puso fin a su vida en 2019 tras sufrir acoso laboral, caso que se convirtió en un símbolo del debate público chileno sobre el acoso en el trabajo e impulsó la tramitación de esta ley.',
    relacionadas: ['lab', 'acc'],
  },
  mil: {
    tipo: 'mil',
    nombreOficial: 'Código de Justicia Militar',
    norma: 'DTO 2.226, publicado el 19 de diciembre de 1944',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=18914',
    fechaIndexacion: '2026-05-25',
    notas: 'Cuerpo histórico (1944) sustancialmente modificado por la Ley 20.477 (2010), que restringió la competencia de los tribunales militares respecto de civiles. Su aplicación práctica se concentra hoy en delitos cometidos por militares en servicio.',
    historia:
      'Dictado en 1944, bajo el gobierno de Juan Antonio Ríos. Fue objeto de fuertes críticas en las últimas décadas por juzgar a civiles como víctimas de delitos cometidos por militares (comúnmente carabineros), práctica cuestionada por la Corte Interamericana de Derechos Humanos en varios fallos contra Chile. La Ley 20.477 de 2010 excluyó a los civiles, tanto como imputados como víctimas, de la jurisdicción militar.',
    relacionadas: ['pen', 'ppe', 'cot'],
  },
  san: {
    tipo: 'san',
    nombreOficial: 'Código Sanitario',
    norma: 'DFL 725, publicado el 31 de enero de 1968',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=5595',
    fechaIndexacion: '2026-05-25',
    notas: 'Regula prácticamente toda la actividad relacionada con salud pública en Chile: alimentos, medicamentos, ejercicio profesional, profilaxis, residuos, cementerios y donación de órganos. Fuertemente complementado por reglamentos del Ministerio de Salud (DTO).',
    historia:
      'De 1967-1968, dictado durante el gobierno de Eduardo Frei Montalva, en el contexto de la creación del Servicio Nacional de Salud y las políticas de salud pública de mediados del siglo XX en Chile.',
    relacionadas: ['pad', 'pen'],
  },
  ins: {
    tipo: 'ins',
    nombreOficial: 'Ley 20.720 — Reorganización y Liquidación de Activos de Empresas y Personas Deudoras',
    norma: 'Ley 20.720, publicada el 9 de enero de 2014',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1058072',
    fechaIndexacion: '2026-05-25',
    notas: 'Reemplazó el antiguo Libro IV del Código de Comercio sobre quiebras. Crea la Superintendencia de Insolvencia y Reemprendimiento y los procedimientos de reorganización y liquidación tanto para empresas como para personas naturales.',
    historia:
      'De 2014, modernizó el derecho concursal chileno reemplazando el antiguo régimen de quiebras del Código de Comercio. Su novedad principal fue extender el acceso a procedimientos de liquidación de deudas a personas naturales, no solo a empresas, bajo un enfoque de "reemprendimiento" en vez de solo liquidación.',
    relacionadas: ['com', 'civ', 'pci'],
  },
  fam: {
    tipo: 'fam',
    nombreOficial: 'Ley 19.968 — Crea los Tribunales de Familia',
    norma: 'Ley 19.968, publicada el 30 de agosto de 2004',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=229557',
    fechaIndexacion: '2026-05-25',
    notas: 'Crea la judicatura especializada de familia y regula el procedimiento aplicable a divorcio, cuidado personal, alimentos, violencia intrafamiliar, adopción y demás materias del derecho de familia. Modificada por Ley 20.286 y otras.',
    historia:
      'De 2004, creó los Tribunales de Familia como judicatura especializada, separando estas materias de los juzgados civiles ordinarios. Su entrada en funcionamiento en 2005 fue muy accidentada por el colapso de los tribunales ante una demanda muy superior a la proyectada, lo que motivó la reforma rápida de la Ley 20.286 (2008).',
    relacionadas: ['civ', 'pci', 'cot'],
  },
  trn: {
    tipo: 'trn',
    nombreOficial: 'Ley 20.285 — Sobre Acceso a la Información Pública',
    norma: 'Ley 20.285, publicada el 20 de agosto de 2008',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=276363',
    fechaIndexacion: '2026-05-25',
    notas: 'Conocida como "Ley de Transparencia". Consagra el derecho de acceso a la información pública, establece el principio de transparencia activa y crea el Consejo para la Transparencia (CPLT) como órgano garante. Causales tasadas de reserva en el artículo 21.',
    historia:
      'De 2008, impulsada durante el gobierno de Michelle Bachelet en un contexto de creciente exigencia pública de probidad y control del gasto estatal tras diversos escándalos de corrupción de la década anterior. Creó el Consejo para la Transparencia como órgano garante autónomo del derecho de acceso a la información pública.',
    relacionadas: ['con', 'pad'],
  },
  rpa: {
    tipo: 'rpa',
    nombreOficial: 'Ley 20.084 — Establece un sistema de responsabilidad penal de los adolescentes',
    norma: 'Ley 20.084, publicada el 7 de diciembre de 2005',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=244803',
    fechaIndexacion: '2026-05-25',
    notas: 'Sistema penal especial para adolescentes mayores de 14 y menores de 18 años. Sustituye penas del Código Penal por sanciones específicas (régimen cerrado, semicerrado, libertad asistida, servicios en beneficio de la comunidad). Modificada por Ley 21.527 y otras.',
    historia:
      'De 2005, creó el sistema de responsabilidad penal adolescente en cumplimiento del mandato de la Convención sobre los Derechos del Niño (ratificada por Chile en 1990), que exige un sistema penal diferenciado y con garantías para los menores de edad, reemplazando el antiguo modelo tutelar que los trataba como "en situación irregular" sin un estatuto de garantías propio.',
    relacionadas: ['pen', 'ppe', 'fam'],
  },
  pdc: {
    tipo: 'pdc',
    nombreOficial: 'Pacto Internacional de Derechos Civiles y Políticos',
    norma: 'Adoptado por la ONU en 1966; ratificado por Chile y promulgado por DTO 778 (RREE), publicado el 29 de abril de 1989',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=15406',
    fechaIndexacion: '2026-05-27',
    notas: 'Tratado internacional de derechos humanos. En virtud del artículo 5° inciso 2° de la Constitución Política, los derechos esenciales contenidos en tratados ratificados y vigentes constituyen un límite al ejercicio de la soberanía. La doctrina mayoritaria le reconoce rango supralegal y de bloque de constitucionalidad.',
    historia:
      'Adoptado por la Asamblea General de la ONU en 1966 como desarrollo de la Declaración Universal de Derechos Humanos de 1948, dividido en dos pactos (este y el PIDESC) por las tensiones de la Guerra Fría entre el bloque occidental y el soviético sobre qué derechos priorizar. Chile lo ratificó en 1989, en el tramo final del régimen militar, coincidiendo con el retorno a la democracia.',
    relacionadas: ['con', 'pde'],
  },
  pde: {
    tipo: 'pde',
    nombreOficial: 'Pacto Internacional de Derechos Económicos, Sociales y Culturales',
    norma: 'Adoptado por la ONU en 1966; ratificado por Chile y promulgado por DTO 326 (RREE), publicado el 27 de mayo de 1989',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=15410',
    fechaIndexacion: '2026-05-27',
    notas: 'Conocido como PIDESC. Reconoce los derechos al trabajo digno, sindicación, seguridad social, protección de la familia, alimentación, vivienda, salud, educación y participación cultural. Mismo rango que el PIDCP en el bloque de constitucionalidad chileno.',
    historia:
      'Adoptado por la ONU en 1966 junto con el PIDCP, como el "pacto gemelo" enfocado en los derechos sociales, económicos y culturales que el bloque soviético impulsaba con más fuerza durante la Guerra Fría. Chile lo ratificó en 1989, en el tramo final del régimen militar.',
    relacionadas: ['con', 'pdc'],
  },
  aap: {
    tipo: 'aap',
    nombreOficial: 'Auto Acordado sobre Tramitación y Fallo del Recurso de Protección de las Garantías Constitucionales',
    norma: 'Acta N° 94-2015 de la Corte Suprema, de 17 de julio de 2015 (reemplazó el auto acordado de 1977); modificada por el Acta N° 173-2018',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1080916',
    fechaIndexacion: '2026-09-09',
    notas:
      'Distinto de un "código": es un reglamento interno de la Corte Suprema sobre CÓMO se tramita el recurso de protección (competencia, plazo, admisibilidad, informe, prueba, fallo, apelación), no sobre cuándo procede (eso lo fija el art. 20 de la Constitución). El texto de cada numeral acá es un RESUMEN funcional para ubicarse rápido, no una transcripción literal — para la redacción de un escrito real, verificar siempre contra el ejemplar del Auto Acordado que corresponda usar (impreso, en la evaluación E01). Cubre los numerales 1° a 6°, 10°, 12°, 13° y 15° — los más relevantes para interponer y seguir el recurso; el instrumento completo tiene más numerales de detalle administrativo no incluidos acá.',
    historia:
      'El recurso de protección fue creado por el Acta Constitucional N° 3 de 1976, durante el régimen militar, y confirmado por la Constitución de 1980 (artículo 20). La Corte Suprema dictó ese mismo año su primer auto acordado regulándolo, reemplazado en 1977 y luego, tras casi cuatro décadas de vigencia, por el Acta 94-2015 que rige hoy.',
    relacionadas: ['con', 'cot'],
    esTextoOficial: false,
  },
}

/** Devuelve el nombre corto (3-4 palabras) usado en enlaces de la ficha. */
export function nombreCortoMetadata(tipo: CodigoTipo): string {
  const nombres: Partial<Record<CodigoTipo, string>> = {
    con: 'Constitución',
    civ: 'Código Civil',
    lab: 'Código del Trabajo',
    pen: 'Código Penal',
    tri: 'Código Tributario',
    com: 'Código de Comercio',
    pci: 'Proc. Civil',
    ppe: 'Proc. Penal',
    cot: 'Orgánico de Tribunales',
    min: 'Código de Minería',
    agu: 'Código de Aguas',
    san: 'Código Sanitario',
    mil: 'Justicia Militar',
    pad: 'Ley 19.880 (Proc. Admin.)',
    acc: 'Ley 16.744 (Accidentes)',
    dro: 'Ley 20.000 (Drogas)',
    kar: 'Ley 21.643 (Karin)',
    ins: 'Ley 20.720 (Insolvencia)',
    fam: 'Ley 19.968 (Trib. Familia)',
    trn: 'Ley 20.285 (Transparencia)',
    rpa: 'Ley 20.084 (RPA)',
    pdc: 'Pacto DCP',
    pde: 'Pacto DESC',
    aap: 'Auto Ac. Protección',
  }
  return nombres[tipo] ?? tipo
}

export function obtenerMetadata(tipo: CodigoTipo): CodigoMetadata | null {
  return CODIGOS_METADATA[tipo] ?? null
}

export function formatearFechaIndexacion(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

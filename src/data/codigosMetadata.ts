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
}

export const CODIGOS_METADATA: Record<string, CodigoMetadata> = {
  con: {
    tipo: 'con',
    nombreOficial: 'Constitución Política de la República de Chile',
    norma: 'DTO 100 (texto refundido, coordinado y sistematizado)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=242302',
    fechaIndexacion: '2026-05-22',
    relacionadas: ['cot', 'pad'],
  },
  civ: {
    tipo: 'civ',
    nombreOficial: 'Código Civil',
    norma: 'DFL 1 de 2000 (texto refundido)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=172986',
    fechaIndexacion: '2026-05-23',
    notas: 'Texto refundido por DFL 1 / 2000. Incorpora múltiples leyes posteriores hasta esa fecha.',
    relacionadas: ['com', 'pci', 'agu', 'min', 'fam'],
  },
  lab: {
    tipo: 'lab',
    nombreOficial: 'Código del Trabajo',
    norma: 'DFL 1 de 2002 (texto refundido)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=207436',
    fechaIndexacion: '2026-05-22',
    notas: 'Puede no incluir reformas muy recientes (por ej. ajustes a Ley Karin posteriores a la indexación).',
    relacionadas: ['acc', 'kar', 'pci'],
  },
  pen: {
    tipo: 'pen',
    nombreOficial: 'Código Penal',
    norma: 'Promulgado en 1874',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1984',
    fechaIndexacion: '2026-05-22',
    notas: 'Texto histórico con lenguaje del siglo XIX. Reformado por múltiples leyes especiales posteriores.',
    relacionadas: ['ppe', 'dro', 'mil'],
  },
  tri: {
    tipo: 'tri',
    nombreOficial: 'Código Tributario',
    norma: 'DL 830',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=6374',
    fechaIndexacion: '2026-05-22',
    relacionadas: ['pad', 'pci'],
  },
  com: {
    tipo: 'com',
    nombreOficial: 'Código de Comercio',
    norma: 'Promulgado en 1865',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1974',
    fechaIndexacion: '2026-05-23',
    notas: 'Texto histórico. Muchas materias hoy reguladas por leyes especiales (sociedades, quiebras, mercado de valores).',
    relacionadas: ['civ', 'pci', 'ins'],
  },
  pci: {
    tipo: 'pci',
    nombreOficial: 'Código de Procedimiento Civil',
    norma: 'Ley 1.552 (1902)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=22740',
    fechaIndexacion: '2026-05-23',
    notas: 'Texto del siglo XIX-XX. La app ofrece modernización opcional del lenguaje (i → y, lei → ley, etc.).',
    relacionadas: ['cot', 'civ', 'com'],
  },
  ppe: {
    tipo: 'ppe',
    nombreOficial: 'Código Procesal Penal',
    norma: 'Ley 19.696 (2000)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=176595',
    fechaIndexacion: '2026-05-23',
    relacionadas: ['pen', 'cot', 'mil', 'dro'],
  },
  cot: {
    tipo: 'cot',
    nombreOficial: 'Código Orgánico de Tribunales',
    norma: 'Ley 7.421',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=25563',
    fechaIndexacion: '2026-05-23',
    relacionadas: ['pci', 'ppe', 'mil'],
  },
  min: {
    tipo: 'min',
    nombreOficial: 'Código de Minería',
    norma: 'Ley 18.248',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=29668',
    fechaIndexacion: '2026-05-23',
    relacionadas: ['civ', 'agu', 'pad'],
  },
  agu: {
    tipo: 'agu',
    nombreOficial: 'Código de Aguas',
    norma: 'DFL 1.122',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=5605',
    fechaIndexacion: '2026-05-23',
    notas: 'Reformado significativamente por Ley 21.435 (2022). Verificar contra texto vigente para materias modificadas.',
    relacionadas: ['civ', 'min', 'pad'],
  },
  pad: {
    tipo: 'pad',
    nombreOficial: 'Ley 19.880 — Bases de los Procedimientos Administrativos',
    norma: 'Ley 19.880, publicada el 29 de mayo de 2003',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=210676',
    fechaIndexacion: '2026-05-25',
    notas: 'Ley supletoria: rige todo procedimiento administrativo que no tenga regla especial. Cubre plazos, notificaciones, silencio administrativo, recursos (reposición, jerárquico, revisión).',
    relacionadas: ['con', 'tri', 'san'],
  },
  acc: {
    tipo: 'acc',
    nombreOficial: 'Ley 16.744 — Seguro social contra riesgos de accidentes del trabajo y enfermedades profesionales',
    norma: 'Ley 16.744, publicada el 1 de febrero de 1968',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=28650',
    fechaIndexacion: '2026-05-25',
    notas: 'Seguro obligatorio administrado por mutualidades (ACHS, IST, Mutual) e ISL. Cubre prestaciones médicas, subsidios, indemnizaciones y pensiones por accidentes y enfermedades profesionales.',
    relacionadas: ['lab', 'civ', 'kar'],
  },
  dro: {
    tipo: 'dro',
    nombreOficial: 'Ley 20.000 — Sanciona el tráfico ilícito de estupefacientes y sustancias sicotrópicas',
    norma: 'Ley 20.000, publicada el 16 de febrero de 2005',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=235507',
    fechaIndexacion: '2026-05-25',
    notas: 'Reemplaza para todos los efectos a la antigua Ley 19.366. Distingue tráfico, microtráfico, porte y consumo. Incluye técnicas especiales de investigación y atenuante por cooperación eficaz.',
    relacionadas: ['pen', 'ppe'],
  },
  kar: {
    tipo: 'kar',
    nombreOficial: 'Ley 21.643 — "Ley Karin": regula y sanciona acoso laboral, sexual y violencia en el trabajo',
    norma: 'Ley 21.643, publicada el 15 de enero de 2024, vigente desde el 1 de agosto de 2024',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1201219',
    fechaIndexacion: '2026-05-25',
    notas: 'LEY MODIFICATORIA. Sus 6 artículos no contienen regulación autónoma sino que insertan o sustituyen artículos en: Código del Trabajo (Art. 211-A a 211-E), Ley 18.575 (Bases de la Administración), Ley 18.834 (Estatuto Administrativo), Ley 18.883 (Municipalidades) y Ley 18.695 (Orgánica de Municipalidades). El texto vigente del Código del Trabajo indexado en Prima Lex ya debería contener estos cambios.',
    relacionadas: ['lab', 'acc'],
  },
  mil: {
    tipo: 'mil',
    nombreOficial: 'Código de Justicia Militar',
    norma: 'DTO 2.226, publicado el 19 de diciembre de 1944',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=18914',
    fechaIndexacion: '2026-05-25',
    notas: 'Cuerpo histórico (1944) sustancialmente modificado por la Ley 20.477 (2010), que restringió la competencia de los tribunales militares respecto de civiles. Su aplicación práctica se concentra hoy en delitos cometidos por militares en servicio.',
    relacionadas: ['pen', 'ppe', 'cot'],
  },
  san: {
    tipo: 'san',
    nombreOficial: 'Código Sanitario',
    norma: 'DFL 725, publicado el 31 de enero de 1968',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=5595',
    fechaIndexacion: '2026-05-25',
    notas: 'Regula prácticamente toda la actividad relacionada con salud pública en Chile: alimentos, medicamentos, ejercicio profesional, profilaxis, residuos, cementerios y donación de órganos. Fuertemente complementado por reglamentos del Ministerio de Salud (DTO).',
    relacionadas: ['pad', 'pen'],
  },
  ins: {
    tipo: 'ins',
    nombreOficial: 'Ley 20.720 — Reorganización y Liquidación de Activos de Empresas y Personas Deudoras',
    norma: 'Ley 20.720, publicada el 9 de enero de 2014',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1058072',
    fechaIndexacion: '2026-05-25',
    notas: 'Reemplazó el antiguo Libro IV del Código de Comercio sobre quiebras. Crea la Superintendencia de Insolvencia y Reemprendimiento y los procedimientos de reorganización y liquidación tanto para empresas como para personas naturales.',
    relacionadas: ['com', 'civ', 'pci'],
  },
  fam: {
    tipo: 'fam',
    nombreOficial: 'Ley 19.968 — Crea los Tribunales de Familia',
    norma: 'Ley 19.968, publicada el 30 de agosto de 2004',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=229557',
    fechaIndexacion: '2026-05-25',
    notas: 'Crea la judicatura especializada de familia y regula el procedimiento aplicable a divorcio, cuidado personal, alimentos, violencia intrafamiliar, adopción y demás materias del derecho de familia. Modificada por Ley 20.286 y otras.',
    relacionadas: ['civ', 'pci', 'cot'],
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

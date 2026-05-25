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
}

export const CODIGOS_METADATA: Record<string, CodigoMetadata> = {
  con: {
    tipo: 'con',
    nombreOficial: 'Constitución Política de la República de Chile',
    norma: 'DTO 100 (texto refundido, coordinado y sistematizado)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=242302',
    fechaIndexacion: '2026-05-22',
  },
  civ: {
    tipo: 'civ',
    nombreOficial: 'Código Civil',
    norma: 'DFL 1 de 2000 (texto refundido)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=172986',
    fechaIndexacion: '2026-05-23',
    notas: 'Texto refundido por DFL 1 / 2000. Incorpora múltiples leyes posteriores hasta esa fecha.',
  },
  lab: {
    tipo: 'lab',
    nombreOficial: 'Código del Trabajo',
    norma: 'DFL 1 de 2002 (texto refundido)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=207436',
    fechaIndexacion: '2026-05-22',
    notas: 'Puede no incluir reformas muy recientes (por ej. ajustes a Ley Karin posteriores a la indexación).',
  },
  pen: {
    tipo: 'pen',
    nombreOficial: 'Código Penal',
    norma: 'Promulgado en 1874',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1984',
    fechaIndexacion: '2026-05-22',
    notas: 'Texto histórico con lenguaje del siglo XIX. Reformado por múltiples leyes especiales posteriores.',
  },
  tri: {
    tipo: 'tri',
    nombreOficial: 'Código Tributario',
    norma: 'DL 830',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=6374',
    fechaIndexacion: '2026-05-22',
  },
  com: {
    tipo: 'com',
    nombreOficial: 'Código de Comercio',
    norma: 'Promulgado en 1865',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1974',
    fechaIndexacion: '2026-05-23',
    notas: 'Texto histórico. Muchas materias hoy reguladas por leyes especiales (sociedades, quiebras, mercado de valores).',
  },
  pci: {
    tipo: 'pci',
    nombreOficial: 'Código de Procedimiento Civil',
    norma: 'Ley 1.552 (1902)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=22740',
    fechaIndexacion: '2026-05-23',
    notas: 'Texto del siglo XIX-XX. La app ofrece modernización opcional del lenguaje (i → y, lei → ley, etc.).',
  },
  ppe: {
    tipo: 'ppe',
    nombreOficial: 'Código Procesal Penal',
    norma: 'Ley 19.696 (2000)',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=176595',
    fechaIndexacion: '2026-05-23',
  },
  cot: {
    tipo: 'cot',
    nombreOficial: 'Código Orgánico de Tribunales',
    norma: 'Ley 7.421',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=25563',
    fechaIndexacion: '2026-05-23',
  },
  min: {
    tipo: 'min',
    nombreOficial: 'Código de Minería',
    norma: 'Ley 18.248',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=29668',
    fechaIndexacion: '2026-05-23',
  },
  agu: {
    tipo: 'agu',
    nombreOficial: 'Código de Aguas',
    norma: 'DFL 1.122',
    fuenteUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=5605',
    fechaIndexacion: '2026-05-23',
    notas: 'Reformado significativamente por Ley 21.435 (2022). Verificar contra texto vigente para materias modificadas.',
  },
}

export function obtenerMetadata(tipo: CodigoTipo): CodigoMetadata | null {
  return CODIGOS_METADATA[tipo] ?? null
}

export function formatearFechaIndexacion(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

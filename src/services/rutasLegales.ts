export type DocumentoLegal = 'privacidad' | 'terminos' | 'aviso-legal'

/** Qué documento pide la dirección (`/privacidad`, `/terminos`, `/aviso-legal`), o null. */
export function documentoLegalDe(ruta: string): DocumentoLegal | null {
  const r = ruta.replace(/\/+$/, '').toLowerCase()
  if (r === '/privacidad') return 'privacidad'
  if (r === '/terminos') return 'terminos'
  if (r === '/aviso-legal') return 'aviso-legal'
  return null
}

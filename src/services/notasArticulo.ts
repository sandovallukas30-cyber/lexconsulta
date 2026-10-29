/** Notas propias sobre un artículo de un código («Mi nota»): una por artículo,
 *  guardadas con el resto de los datos (respaldo y sincronización). Lógica pura. */

export interface NotaArticulo {
  texto: string
  /** epoch ms de la última edición: en la sincronización gana la más reciente. */
  fecha: number
}

export const MAX_NOTA_ARTICULO = 4000

export const claveNotaArticulo = (codigo: string, articulo: string): string => `${codigo}:${articulo}`

/** Lo que se acepta de un respaldo: solo notas con texto y fecha; recorta las exageradas. */
export function notasArticuloValidas(v: unknown): Record<string, NotaArticulo> {
  const salida: Record<string, NotaArticulo> = {}
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return salida
  for (const [clave, n] of Object.entries(v as Record<string, unknown>)) {
    if (typeof n !== 'object' || n === null) continue
    const { texto, fecha } = n as { texto?: unknown; fecha?: unknown }
    if (typeof texto !== 'string' || typeof fecha !== 'number' || !Number.isFinite(fecha) || !texto.trim()) continue
    salida[clave] = { texto: texto.slice(0, MAX_NOTA_ARTICULO), fecha }
  }
  return salida
}

/** Une dos conjuntos de notas: gana la más reciente de cada artículo. */
export function unirNotasArticulo(local: Record<string, NotaArticulo>, otras: Record<string, NotaArticulo>): Record<string, NotaArticulo> {
  const salida = { ...local }
  for (const [clave, n] of Object.entries(otras)) {
    const l = salida[clave]
    if (!l || n.fecha > l.fecha) salida[clave] = n
  }
  return salida
}

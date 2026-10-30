/** Marca con la hora actual (`actualizada`) los elementos de una lista que cambiaron respecto de la lista anterior
 *  (otro objeto con el mismo id, o uno nuevo). Los que siguen siendo el mismo objeto no se tocan.
 *  Existe para que la sincronización entre dispositivos pueda quedarse con la copia más reciente de cada clase,
 *  evaluación o texto en vez de la local siempre. */
export function sellarCambios<T extends { id: string; actualizada?: number }>(previas: T[] | undefined, nuevas: T[], ahora = Date.now()): T[] {
  const antes = new Map((previas ?? []).map((x) => [x.id, x]))
  return nuevas.map((x) => (antes.get(x.id) === x ? x : { ...x, actualizada: ahora }))
}

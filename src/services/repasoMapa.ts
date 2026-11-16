/** Repasar un mapa mental de memoria: las ramas quedan tapadas (menos las ideas centrales), las destapas de a una y
 *  marcas si te las sabías. Funciones puras sobre ids de nodos y conexiones. */

export interface EstadoRepasoMapa {
  revelados: Set<string>
  /** true = la sabía, false = no la sabía. */
  marcas: Map<string, boolean>
}

/** Ideas centrales: nodos a los que no llega ninguna conexión (quedan siempre a la vista, son la pregunta). */
export function raicesDe(ids: string[], conexiones: { source: string; target: string }[]): Set<string> {
  const conPadre = new Set(conexiones.map((c) => c.target))
  return new Set(ids.filter((id) => !conPadre.has(id)))
}

export function iniciarRepaso(ids: string[], conexiones: { source: string; target: string }[]): EstadoRepasoMapa {
  return { revelados: raicesDe(ids, conexiones), marcas: new Map() }
}

/** Vuelve a tapar solo lo que no sabías (para una segunda vuelta). */
export function repetirFalladas(e: EstadoRepasoMapa): EstadoRepasoMapa {
  const revelados = new Set(e.revelados)
  const marcas = new Map<string, boolean>()
  for (const [id, sabia] of e.marcas) {
    if (sabia) marcas.set(id, true)
    else revelados.delete(id)
  }
  return { revelados, marcas }
}

export interface AvanceRepaso {
  /** Nodos que hay que recordar (sin las ideas centrales). */
  total: number
  revisados: number
  sabidas: number
  noSabidas: number
}

export function avanceRepaso(e: EstadoRepasoMapa, ids: string[], raices: Set<string>): AvanceRepaso {
  const aRecordar = ids.filter((id) => !raices.has(id))
  let sabidas = 0
  let noSabidas = 0
  for (const id of aRecordar) {
    const m = e.marcas.get(id)
    if (m === true) sabidas++
    else if (m === false) noSabidas++
  }
  return { total: aRecordar.length, revisados: sabidas + noSabidas, sabidas, noSabidas }
}

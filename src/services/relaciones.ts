import { obtenerCodigo } from './codigos'
import type { Articulo, CodigoTipo } from '../types'

export type TipoRelacion = 'remite' | 'sub-articulo'

export interface Relacion {
  desde: string
  hasta: string
  tipo: TipoRelacion
}

export interface GrafoCodigo {
  codigo: CodigoTipo
  articulos: Map<string, Articulo>
  relaciones: Relacion[]
  /** outgoing: para cada nodo, las relaciones que salen de él */
  outgoing: Map<string, Relacion[]>
  /** incoming: para cada nodo, las relaciones que entran a él */
  incoming: Map<string, Relacion[]>
}

const cache = new Map<CodigoTipo, GrafoCodigo>()

const RE_MENCION = /(?:Art(?:[íi]culo)?\.?)\s*(\d+(?:\s*-\s*[A-ZÑ]{1,2})?(?:\s+(?:bis|ter|qu[áa]ter|quinquies|sexies))?(?:\s+[A-ZÑ](?![a-z]))?(?:\s+(?:bis|ter|qu[áa]ter|quinquies))?)/gi

export function getGrafo(tipo: CodigoTipo): GrafoCodigo | null {
  if (cache.has(tipo)) return cache.get(tipo)!
  const codigo = obtenerCodigo(tipo)
  if (!codigo) return null
  const g = construirGrafo(tipo, codigo.articulos)
  cache.set(tipo, g)
  return g
}

function construirGrafo(codigo: CodigoTipo, arts: Articulo[]): GrafoCodigo {
  const articulos = new Map<string, Articulo>()
  for (const a of arts) articulos.set(a.a, a)

  const relaciones: Relacion[] = []
  const vistos = new Set<string>()

  function agregar(desde: string, hasta: string, tipo: TipoRelacion) {
    if (desde === hasta) return
    const key = `${desde}::${hasta}::${tipo}`
    if (vistos.has(key)) return
    vistos.add(key)
    relaciones.push({ desde, hasta, tipo })
  }

  for (const a of arts) {
    // Sub-artículo: hijo → padre
    const padre = extraerPadre(a.a)
    if (padre && articulos.has(padre)) {
      agregar(a.a, padre, 'sub-articulo')
    }

    // Remisiones: cada mención de Art. N en el texto
    for (const m of a.t.matchAll(RE_MENCION)) {
      const num = m[1].trim().replace(/\s+/g, ' ')
      const candidato = `Art. ${num}`
      const referenciado = matchearArticulo(candidato, articulos)
      if (referenciado) {
        agregar(a.a, referenciado, 'remite')
      }
    }
  }

  const outgoing = new Map<string, Relacion[]>()
  const incoming = new Map<string, Relacion[]>()
  for (const r of relaciones) {
    if (!outgoing.has(r.desde)) outgoing.set(r.desde, [])
    outgoing.get(r.desde)!.push(r)
    if (!incoming.has(r.hasta)) incoming.set(r.hasta, [])
    incoming.get(r.hasta)!.push(r)
  }

  return { codigo, articulos, relaciones, outgoing, incoming }
}

function extraerPadre(id: string): string | null {
  // "Art. 161-A" → "Art. 161"
  // "Art. 183 bis" → "Art. 183"
  // "Art. 152 quáter O bis" → "Art. 152"
  const m = id.match(/^Art\.\s+(\d+)(?:[\s-]+(?:[A-ZÑ]{1,2}|bis|ter|qu[áa]ter|quinquies|sexies))/i)
  if (!m) return null
  return `Art. ${m[1]}`
}

function matchearArticulo(candidato: string, articulos: Map<string, Articulo>): string | null {
  if (articulos.has(candidato)) return candidato
  // Normalize spacing variations
  const normalizado = candidato.replace(/\s+/g, ' ').trim()
  if (articulos.has(normalizado)) return normalizado
  // Try without "Art. " prefix duplicate or different spacing
  return null
}

export interface SubgrafoNodo {
  id: string
  nivel: number
  articulo: Articulo
}

export interface Subgrafo {
  nodos: SubgrafoNodo[]
  relaciones: Relacion[]
}

/**
 * Returns subgraph: root + nodes reachable within `profundidad` hops
 * (following both outgoing and incoming relations).
 */
export function obtenerSubgrafo(
  grafo: GrafoCodigo,
  raiz: string,
  profundidad: number,
  tipos: TipoRelacion[]
): Subgrafo {
  if (!grafo.articulos.has(raiz)) {
    return { nodos: [], relaciones: [] }
  }

  const visitados = new Map<string, number>()
  visitados.set(raiz, 0)
  const cola: { id: string; nivel: number }[] = [{ id: raiz, nivel: 0 }]
  const relacionesIncluidas: Relacion[] = []
  const vistos = new Set<string>()

  function pushRel(r: Relacion) {
    const k = `${r.desde}::${r.hasta}::${r.tipo}`
    if (vistos.has(k)) return
    vistos.add(k)
    relacionesIncluidas.push(r)
  }

  while (cola.length > 0) {
    const { id, nivel } = cola.shift()!
    if (nivel >= profundidad) continue

    const out = grafo.outgoing.get(id) ?? []
    for (const r of out) {
      if (!tipos.includes(r.tipo)) continue
      pushRel(r)
      if (!visitados.has(r.hasta)) {
        visitados.set(r.hasta, nivel + 1)
        cola.push({ id: r.hasta, nivel: nivel + 1 })
      }
    }

    const inc = grafo.incoming.get(id) ?? []
    for (const r of inc) {
      if (!tipos.includes(r.tipo)) continue
      pushRel(r)
      if (!visitados.has(r.desde)) {
        visitados.set(r.desde, nivel + 1)
        cola.push({ id: r.desde, nivel: nivel + 1 })
      }
    }
  }

  const nodos: SubgrafoNodo[] = [...visitados.entries()].map(([id, nivel]) => ({
    id,
    nivel,
    articulo: grafo.articulos.get(id)!,
  }))

  return { nodos, relaciones: relacionesIncluidas }
}

/**
 * Radial layout: root at origin, level-1 nodes on a circle, level-2 on a bigger circle, etc.
 */
export function layoutRadial(
  nodos: SubgrafoNodo[],
  radioBase = 280
): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>()
  const porNivel = new Map<number, string[]>()
  for (const n of nodos) {
    if (!porNivel.has(n.nivel)) porNivel.set(n.nivel, [])
    porNivel.get(n.nivel)!.push(n.id)
  }

  for (const [nivel, ids] of porNivel) {
    if (nivel === 0) {
      pos.set(ids[0], { x: 0, y: 0 })
      continue
    }
    const radio = nivel * radioBase
    const paso = (2 * Math.PI) / ids.length
    // Offset to start at top (-π/2) and avoid stacking with parent levels
    const offset = -Math.PI / 2 + (nivel % 2 === 0 ? paso / 2 : 0)
    for (let i = 0; i < ids.length; i++) {
      pos.set(ids[i], {
        x: Math.cos(i * paso + offset) * radio,
        y: Math.sin(i * paso + offset) * radio,
      })
    }
  }

  return pos
}

/** Quick stats for the active code's graph (useful for UI). */
export function estadisticasGrafo(tipo: CodigoTipo): { totalArticulos: number; totalRelaciones: number; porTipo: Record<TipoRelacion, number> } | null {
  const g = getGrafo(tipo)
  if (!g) return null
  const porTipo: Record<TipoRelacion, number> = { remite: 0, 'sub-articulo': 0 }
  for (const r of g.relaciones) porTipo[r.tipo]++
  return {
    totalArticulos: g.articulos.size,
    totalRelaciones: g.relaciones.length,
    porTipo,
  }
}

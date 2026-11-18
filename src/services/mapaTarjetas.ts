import type { MapaMental } from '../types'
import { tituloSinFecha } from './mapaApunte'

/** Mapa mental → tarjetas de repaso, sin IA. Cada nodo que tiene ramas se vuelve una tarjeta: al frente el nodo (con
 *  su nodo padre para dar contexto) y atrás sus ramas. Los nodos con nota al margen también: al frente el nodo y
 *  atrás la nota. Se escribe como un apunte con el formato «- **Frente:** reverso», el mismo que el repaso ya
 *  convierte en tarjetas: así entran al repaso espaciado, al simulacro sin nada aparte. */

type Nodo = MapaMental['nodos'][number]

/** Texto de un nodo en una línea, sin las marcas del mapa (*negrita*, _subrayado_) ni asteriscos que rompan el formato. */
const plano = (t: string): string =>
  t
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/[*]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[:\s]+$/, '')
    .trim()

export interface TarjetasDeMapa {
  titulo: string
  contenido: string
  cantidad: number
}

export function mapaATarjetas(mapa: Pick<MapaMental, 'titulo' | 'nodos' | 'conexiones'>): TarjetasDeMapa {
  const titulo = `${tituloSinFecha(mapa.titulo) || 'Mapa mental'} (tarjetas)`
  const nodos = new Map<string, Nodo>(mapa.nodos.map((n) => [n.id, n]))
  const hijos = new Map<string, string[]>()
  const padre = new Map<string, string>()
  for (const c of mapa.conexiones) {
    if (c.desde === c.hasta || !nodos.has(c.desde) || !nodos.has(c.hasta)) continue
    const lista = hijos.get(c.desde) ?? []
    if (!lista.includes(c.hasta)) lista.push(c.hasta)
    hijos.set(c.desde, lista)
    if (!padre.has(c.hasta)) padre.set(c.hasta, c.desde)
  }
  const lectura = (a: string, b: string) => {
    const x = nodos.get(a)!.posicion
    const y = nodos.get(b)!.posicion
    return x.y - y.y || x.x - y.x
  }
  for (const l of hijos.values()) l.sort(lectura)

  // de la idea central hacia afuera, en orden de lectura
  const raices = mapa.nodos.map((n) => n.id).filter((id) => !padre.has(id)).sort(lectura)
  const orden: string[] = []
  const visto = new Set<string>()
  const cola = [...raices]
  while (cola.length > 0) {
    const id = cola.shift()!
    if (visto.has(id)) continue
    visto.add(id)
    orden.push(id)
    cola.push(...(hijos.get(id) ?? []))
  }
  for (const n of mapa.nodos) if (!visto.has(n.id)) orden.push(n.id)

  const lineas: string[] = []
  const frentes = new Set<string>()
  for (const id of orden) {
    const n = nodos.get(id)!
    const texto = plano(n.texto)
    if (!texto) continue
    const p = padre.get(id)
    const contexto = p ? plano(nodos.get(p)!.texto) : ''
    let frente = contexto && contexto.length <= 60 ? `${contexto} › ${texto}` : texto
    if (frente.length > 140) frente = `${frente.slice(0, 137)}…`
    const ramas = (hijos.get(id) ?? []).map((h) => plano(nodos.get(h)!.texto)).filter(Boolean)
    const nota = plano(n.nota ?? '')
    const reverso = [ramas.join(' · '), nota].filter(Boolean).join(' — ')
    if (!reverso || frentes.has(frente.toLowerCase())) continue
    frentes.add(frente.toLowerCase())
    lineas.push(`- **${frente}:** ${reverso}`)
  }

  const cabecera = `# ${tituloSinFecha(mapa.titulo) || 'Mapa mental'}\n\n> 📝 Tarjetas creadas desde el mapa mental: al frente cada idea y atrás sus ramas.\n`
  return { titulo, contenido: lineas.length > 0 ? `${cabecera}\n${lineas.join('\n')}\n` : '', cantidad: lineas.length }
}

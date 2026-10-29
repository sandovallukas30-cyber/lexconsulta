import { useStore } from '../store/useStore'
import type { ConexionMapaMental, NodoMapaMental } from '../types'
import { calcularLayoutMapaMental, calcularLayoutRadial, elegirLadosConexion } from './layoutMapaMental'

/** Crea un mapa propio desde un esquema (nodos y conexiones sin posición): una plantilla o un apunte. Se posiciona
 *  solo con el mismo organizador del botón «Organizar» y queda abierto. Devuelve el id del mapa nuevo. */
export function crearMapaDesdeEsquema(esquema: {
  titulo: string
  nodos: { id: string; texto: string; forma: NodoMapaMental['forma']; tamanoTexto: NodoMapaMental['tamanoTexto']; color?: string; nota?: string }[]
  conexiones: { desde: string; hasta: string; etiqueta?: string }[]
  layout?: 'arbol' | 'radial'
  moduloId?: string
}): string {
  const { crearMapaMental, actualizarMapaMental, setMapaMentalActivo } = useStore.getState()
  // Los ids del esquema son legibles ("raiz", "gub-1"...) pero no únicos entre distintos mapas guardados — se
  // resuelven a UUIDs reales recién acá, al crear la copia propia (copia independiente, no un vínculo).
  const idsReales = new Map(esquema.nodos.map((n) => [n.id, crypto.randomUUID()]))
  const calcularLayout = esquema.layout === 'radial' ? calcularLayoutRadial : calcularLayoutMapaMental
  const posiciones = calcularLayout(
    esquema.nodos.map((n) => n.id),
    esquema.conexiones
  )
  const nodos: NodoMapaMental[] = esquema.nodos.map((n) => ({
    id: idsReales.get(n.id)!,
    posicion: posiciones.get(n.id) ?? { x: 40, y: 40 },
    texto: n.texto,
    forma: n.forma,
    tamanoTexto: n.tamanoTexto,
    color: n.color,
    nota: n.nota,
    // Más ancho para los nodos "título" (normalmente la raíz): antes este extra dependía de la forma (nube), ahora
    // de la jerarquía tipográfica, que es lo que en realidad predecía "esto va a llevar más texto".
    ancho: n.tamanoTexto === 'titulo' ? 200 : 155,
  }))
  const conexiones: ConexionMapaMental[] = esquema.conexiones.map((c) => {
    const lados = elegirLadosConexion(posiciones.get(c.desde) ?? { x: 0, y: 0 }, posiciones.get(c.hasta) ?? { x: 0, y: 0 })
    return {
      id: crypto.randomUUID(),
      desde: idsReales.get(c.desde)!,
      hasta: idsReales.get(c.hasta)!,
      etiqueta: c.etiqueta,
      desdeHandle: lados.desdeHandle,
      hastaHandle: lados.hastaHandle,
    }
  })
  const id = crearMapaMental(esquema.titulo)
  actualizarMapaMental(id, { nodos, conexiones, ...(esquema.moduloId ? { moduloId: esquema.moduloId } : {}) })
  setMapaMentalActivo(id)
  return id
}

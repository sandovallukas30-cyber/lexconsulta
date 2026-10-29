import type { FormaNodoMental, TamanoTextoMental } from '../types'
import { parsearApunte, quitarMarcas, type Bloque, type ItemLista } from './apunteFormato'

/** De un apunte a un mapa mental, sin IA: el título del apunte es la raíz, cada
 *  «#», «##» o «###» una rama, y las viñetas (con su sangría) las hojas.
 *  - «- **Término:** definición» queda como un nodo «Término» con la definición como nota al margen.
 *  - Un recuadro (> 📝, 🎯, ⚠️…) queda como una nota ovalada bajo su título.
 *  - Párrafos largos, tablas y columnas no se llevan al mapa (no caben en un nodo).
 *  Hay un tope de nodos para que el mapa siga siendo legible. */

export interface NodoEsquema {
  id: string
  texto: string
  forma: FormaNodoMental
  tamanoTexto: TamanoTextoMental
  nota?: string
  color?: string
}

export interface EsquemaMapa {
  titulo: string
  nodos: NodoEsquema[]
  conexiones: { desde: string; hasta: string; etiqueta?: string }[]
  layout?: 'arbol' | 'radial'
  /** Cuántos elementos del apunte no entraron por el tope. */
  omitidos: number
}

export const MAX_NODOS_MAPA = 80
const MAX_TEXTO_NODO = 110
const MAX_NOTA_NODO = 220

const RE_TERMINO_NEGRITA = /^\*\*([^*\n]+?)\*\*\s*:?\s*(.+)$/

function recortar(t: string, max: number): string {
  const s = t.replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  const corte = s.lastIndexOf(' ', max - 1)
  return `${s.slice(0, corte > max / 2 ? corte : max - 1)}…`
}

export function apunteAEsquema(apunte: { titulo: string; contenido: string }, maxNodos: number = MAX_NODOS_MAPA): EsquemaMapa {
  const nodos: NodoEsquema[] = []
  const conexiones: EsquemaMapa['conexiones'] = []
  let omitidos = 0
  let n = 0

  const nuevo = (nodo: Omit<NodoEsquema, 'id'>, padre: string | null): string | null => {
    if (nodos.length >= maxNodos) {
      omitidos++
      return null
    }
    const id = `n${++n}`
    nodos.push({ id, ...nodo })
    if (padre) conexiones.push({ desde: padre, hasta: id })
    return id
  }

  const raiz = nuevo({ texto: recortar(quitarMarcas(apunte.titulo) || 'Apunte', 90), forma: 'ovalo', tamanoTexto: 'titulo' }, null)!

  /** Una viñeta (y lo que cuelga de ella) como nodos. */
  const item = (it: ItemLista, padre: string) => {
    const crudo = it.texto.trim()
    if (!crudo) return
    const m = RE_TERMINO_NEGRITA.exec(crudo)
    const id = m
      ? nuevo({ texto: recortar(quitarMarcas(m[1]).replace(/:\s*$/, ''), MAX_TEXTO_NODO), forma: 'rectangulo', tamanoTexto: 'texto', nota: recortar(quitarMarcas(m[2]), MAX_NOTA_NODO) }, padre)
      : nuevo({ texto: recortar(quitarMarcas(crudo), MAX_TEXTO_NODO), forma: 'ovalo', tamanoTexto: 'texto' }, padre)
    if (id) bloques(it.hijos, id)
    else omitidos += contarItems(it.hijos)
  }

  const cita = (b: Extract<Bloque, { t: 'cita' }>, padre: string) => {
    const t = quitarMarcas(textoDe(b.hijos)).trim()
    if (!t) return
    nuevo({ texto: recortar(`${b.icono} ${t}`.trim(), MAX_TEXTO_NODO), forma: 'ovalo', tamanoTexto: 'texto' }, padre)
  }

  /** Bloques bajo un padre (los títulos reordenan el padre; las viñetas y recuadros cuelgan del actual). */
  function bloques(lista: Bloque[], padre: string) {
    for (const b of lista) {
      if (b.t === 'lista') for (const it of b.items) item(it, padre)
      else if (b.t === 'cita') cita(b, padre)
    }
  }

  // los títulos arman la jerarquía: pila de (nivel, id) con la raíz en el nivel 0
  const pila: { nivel: number; id: string | null }[] = [{ nivel: 0, id: raiz }]
  for (const b of parsearApunte(apunte.contenido)) {
    if (b.t === 'h') {
      while (pila.length > 1 && pila[pila.length - 1].nivel >= b.n) pila.pop()
      const padre = pila[pila.length - 1].id
      const id = padre ? nuevo({ texto: recortar(quitarMarcas(b.texto), MAX_TEXTO_NODO), forma: 'rectangulo', tamanoTexto: b.n === 1 ? 'titulo' : 'subtitulo' }, padre) : null
      pila.push({ nivel: b.n, id })
    } else {
      const padre = pila[pila.length - 1].id
      if (!padre) {
        if (b.t === 'lista') omitidos += contarItems([b])
        continue
      }
      if (b.t === 'lista') for (const it of b.items) item(it, padre)
      else if (b.t === 'cita') cita(b, padre)
    }
  }

  return { titulo: apunte.titulo.trim() || 'Mapa desde un apunte', nodos, conexiones, layout: 'arbol', omitidos }
}

function textoDe(bloques: Bloque[]): string {
  return bloques
    .map((b) => {
      if (b.t === 'p') return b.texto
      if (b.t === 'lista') return b.items.map((i) => i.texto).join('; ')
      if (b.t === 'cita') return textoDe(b.hijos)
      return ''
    })
    .filter(Boolean)
    .join(' ')
}

function contarItems(bloques: Bloque[]): number {
  let c = 0
  for (const b of bloques) if (b.t === 'lista') for (const it of b.items) c += 1 + contarItems(it.hijos)
  return c
}

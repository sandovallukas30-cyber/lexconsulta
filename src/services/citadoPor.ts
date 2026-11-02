import type { CodigoData, CodigoTipo } from '../types'
import { detectarReferencias } from './referencias'

/** Referencias inversas dentro de un mismo código: qué artículos mencionan a uno dado
 *  ("el 1698 aparece en los arts. 1700 y 1702"). Sale de las mismas citas que ya se
 *  detectan para los enlaces del texto, solo que al revés.
 *
 *  Solo cuenta las citas con número ("artículo 1698", "artículos 44 y 45"), no las
 *  relativas ("el artículo anterior"): esas las tendría cualquier artículo vecino y
 *  no dicen nada de cuánto se usa la norma. El índice se arma una vez por código
 *  cargado (unos pocos ms en el Código Civil) y queda en memoria. */
const indices = new WeakMap<CodigoData, Map<string, string[]>>()

function construirIndice(datos: CodigoData, tipo: CodigoTipo): Map<string, string[]> {
  const existentes = new Set(datos.articulos.map((a) => a.a))
  const indice = new Map<string, string[]>()
  for (const art of datos.articulos) {
    const vistos = new Set<string>()
    for (const c of detectarReferencias(art.t, tipo, art.a)) {
      const destino = c.referencia.articulo
      if (c.referencia.codigo !== tipo || !existentes.has(destino) || vistos.has(destino)) continue
      if (!/\d/.test(art.t.slice(c.inicio, c.fin))) continue // relativa: "anterior" / "siguiente"
      vistos.add(destino)
      const lista = indice.get(destino)
      if (lista) lista.push(art.a)
      else indice.set(destino, [art.a])
    }
  }
  return indice
}

/** Artículos del mismo código que citan a `articulo`, en el orden en que aparecen en el código. */
export function citadoPor(datos: CodigoData, tipo: CodigoTipo, articulo: string): string[] {
  let indice = indices.get(datos)
  if (!indice) {
    indice = construirIndice(datos, tipo)
    indices.set(datos, indice)
  }
  return indice.get(articulo) ?? []
}

// Compartir una Colección con un link o un archivo, sin backend: todo el
// estado vive en el propio link/archivo, y quien lo recibe lo decodifica en
// su propio navegador. No incluye el TEXTO de cada artículo — eso ya lo
// tiene localmente cualquier instalación de Prima Lex (es el mismo código
// indexado, viene con la app) — solo referencias (código + número) más las
// anotaciones propias del que compartió (nota, estado, función, conexiones,
// grupos). Esto mantiene el link corto incluso para una colección grande.

import type { ColeccionCompartida, Coleccion } from '../types'

/** Nombre del parámetro de URL que dispara la importación al abrir un link
 * compartido — ver el efecto que lo lee en ColeccionesView.tsx. */
export const PARAM_IMPORTAR = 'colImportar'

/** Recorta una Coleccion a solo lo que tiene sentido compartir — sin id ni
 * fechas propias (se generan de nuevo al importar) y sin `posicion` (son
 * coordenadas de la pizarra de quien la creó, no significan nada para
 * quien la recibe). */
function aCompartida(coleccion: Coleccion): ColeccionCompartida {
  return {
    titulo: coleccion.titulo,
    articulos: coleccion.articulos.map((a) => ({
      codigo: a.codigo,
      articulo: a.articulo,
      estado: a.estado,
      nota: a.nota,
      funcion: a.funcion,
    })),
    conexiones: coleccion.conexiones,
    grupos: coleccion.grupos,
  }
}

/** JSON tal cual, sin comprimir — es liviano (solo referencias, no el texto
 * completo de cada artículo) así que no hace falta. Quien arma la URL con
 * esto (generarLinkColeccion, vía URLSearchParams) se encarga del
 * percent-encoding; este string es el valor "sin codificar" del parámetro. */
export function codificarColeccion(coleccion: Coleccion): string {
  return JSON.stringify(aCompartida(coleccion))
}

/** Arma el link completo para compartir — mismo origen/ruta en la que se
 * está parado ahora mismo, más el parámetro de importación. URLSearchParams
 * hace el percent-encoding solo; no hay que codificar el JSON a mano. */
export function generarLinkColeccion(coleccion: Coleccion): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set(PARAM_IMPORTAR, codificarColeccion(coleccion))
  return url.toString()
}

/** Para el botón "Descargar archivo" — mismo contenido que el link, como
 * .json descargable (útil si el destinatario prefiere mandar un archivo,
 * o el link queda demasiado largo para el medio por el que lo va a mandar). */
export function generarArchivoColeccion(coleccion: Coleccion): { nombre: string; contenido: string } {
  const slug = coleccion.titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return {
    nombre: `coleccion-${slug || 'compartida'}.json`,
    contenido: JSON.stringify(aCompartida(coleccion), null, 2),
  }
}

/** Valida la forma mínima esperada antes de dársela por buena — un link o
 * archivo tocado a mano (o corrupto) no debería poder crashear la app ni
 * crear una "colección" con basura adentro. */
function esColeccionCompartidaValida(valor: unknown): valor is ColeccionCompartida {
  if (!valor || typeof valor !== 'object') return false
  const v = valor as Record<string, unknown>
  if (typeof v.titulo !== 'string' || !v.titulo.trim()) return false
  if (!Array.isArray(v.articulos)) return false
  return v.articulos.every((a) => {
    if (!a || typeof a !== 'object') return false
    const art = a as Record<string, unknown>
    return typeof art.codigo === 'string' && typeof art.articulo === 'string'
  })
}

/** Decodifica JSON ya en texto plano — el valor de un parámetro de URL leído
 * vía URLSearchParams.get() (ese ya viene decodificado solo) o el contenido
 * crudo de un archivo .json. Devuelve null ante cualquier problema (link
 * roto, archivo que no es de acá) en vez de lanzar, para que quien llama
 * solo tenga que chequear "¿se pudo?" antes de ofrecer importar. */
export function decodificarColeccion(json: string): ColeccionCompartida | null {
  try {
    const valor = JSON.parse(json)
    return esColeccionCompartidaValida(valor) ? valor : null
  } catch {
    return null
  }
}

// Compartir una Colección con un link o un archivo, sin backend: todo el
// estado vive en el propio link/archivo, y quien lo recibe lo decodifica en
// su propio navegador. No incluye el TEXTO de cada artículo — eso ya lo
// tiene localmente cualquier instalación de Prima Lex (es el mismo código
// indexado, viene con la app) — solo referencias (código + número) más las
// anotaciones propias del que compartió (nota, estado, función, conexiones,
// grupos). Esto mantiene el link corto incluso para una colección grande.

import type {
  ArticuloColeccion,
  CodigoTipo,
  ColeccionCompartida,
  Coleccion,
  ConexionColeccion,
  EstadoRepaso,
  FuncionJuridica,
  GrupoColeccion,
  PublicacionColeccion,
  RefArticuloColeccion,
  TipoRelacion,
} from '../types'
import { CODIGOS_METADATA } from '../data/codigosMetadata'

/** Nombre del parámetro de URL que dispara la importación al abrir un link
 * compartido — ver el efecto que lo lee en ColeccionesView.tsx. */
export const PARAM_IMPORTAR = 'colImportar'

/** Recorta una Coleccion a solo lo que tiene sentido compartir — sin id ni
 * fechas propias (se generan de nuevo al importar) y sin `posicion` (son
 * coordenadas de la pizarra de quien la creó, no significan nada para
 * quien la recibe). */
function aCompartida(coleccion: Coleccion): ColeccionCompartida {
  const oficial = coleccion.oficial
  return {
    titulo: coleccion.titulo,
    articulos: coleccion.articulos.map((a) => ({
      codigo: a.codigo,
      articulo: a.articulo,
      // lo que el autor marcó como «dominado» es de él: en una del curso no viaja
      ...(oficial ? {} : { estado: a.estado }),
      nota: a.nota,
      funcion: a.funcion,
    })),
    conexiones: coleccion.conexiones,
    grupos: coleccion.grupos,
    ...(oficial ? { oficial } : {}),
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

// Lo que llega en un link o archivo lo escribió otra persona (o alguien con
// malas intenciones): se revisa campo por campo y se reconstruye con SOLO lo
// válido. Antes bastaba con que `codigo` y `articulo` fueran texto, y un
// `estado` o un código inexistente, o `conexiones` que no fueran una lista,
// rompían la sección Colecciones al importarse; como la colección queda
// guardada y se sincroniza, la sección no volvía a abrir en ningún dispositivo.
const ESTADOS: readonly EstadoRepaso[] = ['pendiente', 'repasando', 'dominado']
const FUNCIONES: readonly FuncionJuridica[] = ['regla_general', 'excepcion', 'concepto', 'procedimiento', 'sancion', 'complementaria']
const RELACIONES: readonly TipoRelacion[] = [
  'desarrolla', 'complementa', 'limita', 'excepcion', 'consecuencia', 'remite_a', 'relacionado_con', 'contradice', 'mismo_concepto',
]
const MAX_ARTICULOS = 500
const MAX_CONEXIONES = 1000
const MAX_GRUPOS = 100

const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const textoHasta = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined)
const unoDe = <T extends string>(v: unknown, validos: readonly T[]): T | undefined => (validos.includes(v as T) ? (v as T) : undefined)
const claveRef = (r: RefArticuloColeccion) => `${r.codigo}|${r.articulo}`

function refValida(v: unknown): RefArticuloColeccion | null {
  if (!esObjeto(v)) return null
  const codigo = v.codigo
  const articulo = textoHasta(v.articulo, 40)
  if (typeof codigo !== 'string' || !Object.hasOwn(CODIGOS_METADATA, codigo) || !articulo) return null
  return { codigo: codigo as CodigoTipo, articulo }
}

/** Reconstruye la colección recibida con solo lo válido; null si no es una colección o si ninguno de sus artículos sirve. */
export function sanearCompartida(valor: unknown): ColeccionCompartida | null {
  if (!esObjeto(valor) || !Array.isArray(valor.articulos)) return null
  const titulo = textoHasta(valor.titulo, 120)?.trim()
  if (!titulo) return null

  const vistos = new Set<string>()
  const articulos: ArticuloColeccion[] = []
  for (const crudo of valor.articulos.slice(0, MAX_ARTICULOS)) {
    const ref = refValida(crudo)
    if (!ref || vistos.has(claveRef(ref))) continue
    vistos.add(claveRef(ref))
    const a = crudo as Record<string, unknown>
    const estado = unoDe(a.estado, ESTADOS)
    const nota = textoHasta(a.nota, 5000)
    const funcion = unoDe(a.funcion, FUNCIONES)
    articulos.push({ ...ref, ...(estado ? { estado } : {}), ...(nota ? { nota } : {}), ...(funcion ? { funcion } : {}) })
  }
  // una colección vacía se puede compartir; una que traía artículos y no quedó ninguno válido, no
  if (articulos.length === 0 && valor.articulos.length > 0) return null

  // conexiones y grupos solo pueden apuntar a artículos que sí vienen en la colección
  const refEnColeccion = (v: unknown) => {
    const r = refValida(v)
    return r && vistos.has(claveRef(r)) ? r : null
  }
  const conexiones: ConexionColeccion[] = []
  for (const c of Array.isArray(valor.conexiones) ? valor.conexiones.slice(0, MAX_CONEXIONES) : []) {
    if (!esObjeto(c)) continue
    const id = textoHasta(c.id, 64)
    const desde = refEnColeccion(c.desde)
    const hasta = refEnColeccion(c.hasta)
    const tipo = unoDe(c.tipo, RELACIONES)
    if (id && desde && hasta && tipo) conexiones.push({ id, desde, hasta, tipo })
  }
  const grupos: GrupoColeccion[] = []
  for (const g of Array.isArray(valor.grupos) ? valor.grupos.slice(0, MAX_GRUPOS) : []) {
    if (!esObjeto(g) || !Array.isArray(g.articulos)) continue
    const id = textoHasta(g.id, 64)
    const tituloGrupo = textoHasta(g.titulo, 80)
    const miembros = g.articulos.slice(0, MAX_ARTICULOS).map(refEnColeccion).filter((r): r is RefArticuloColeccion => r !== null)
    if (id && tituloGrupo && miembros.length > 0) grupos.push({ id, titulo: tituloGrupo, articulos: miembros })
  }

  const oficial = publicacionValida(valor.oficial)
  return {
    titulo,
    articulos,
    ...(conexiones.length > 0 ? { conexiones } : {}),
    ...(grupos.length > 0 ? { grupos } : {}),
    ...(oficial ? { oficial } : {}),
  }
}

/** Decodifica JSON ya en texto plano — el valor de un parámetro de URL leído
 * vía URLSearchParams.get() (ese ya viene decodificado solo) o el contenido
 * crudo de un archivo .json. Devuelve null ante cualquier problema (link
 * roto, archivo que no es de acá) en vez de lanzar, para que quien llama
 * solo tenga que chequear "¿se pudo?" antes de ofrecer importar. */
export function decodificarColeccion(json: string): ColeccionCompartida | null {
  try {
    return sanearCompartida(JSON.parse(json))
  } catch {
    return null
  }
}

/** Los datos de «colección del curso» que llegan en un link se revisan campo por campo: lo que no cuadra se
 *  descarta y la colección se importa como una normal. */
export function publicacionValida(v: unknown): PublicacionColeccion | null {
  if (!v || typeof v !== 'object') return null
  const { origenId, curso, autor, version } = v as Record<string, unknown>
  if (typeof origenId !== 'string' || !origenId.trim() || origenId.length > 64) return null
  if (typeof curso !== 'string' || !curso.trim() || curso.length > 80) return null
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 9999) return null
  const resultado: PublicacionColeccion = { origenId, curso: curso.trim(), version }
  if (typeof autor === 'string' && autor.trim() && autor.length <= 60) resultado.autor = autor.trim()
  return resultado
}

/** La colección que ya tienes de la misma publicación (mismo origen), si hay. */
export function coleccionDeOrigen(colecciones: Coleccion[], compartida: ColeccionCompartida): Coleccion | undefined {
  const id = compartida.oficial?.origenId
  return id ? colecciones.find((c) => c.oficial?.origenId === id) : undefined
}

/** Pone al día una colección del curso con una versión nueva, sin perder lo tuyo: tu progreso de repaso (estado,
 *  caja y próximo repaso) y tu vínculo con un mapa mental se conservan; la lista de artículos, las funciones, las
 *  conexiones y los grupos pasan a ser los del autor. Si ambos anotaron un artículo, queda la nota del autor; si
 *  solo anotaste tú, se conserva la tuya. */
export function fusionarOficial(local: Coleccion, nueva: ColeccionCompartida, ahora: number = Date.now()): Coleccion {
  const articulos: ArticuloColeccion[] = nueva.articulos.map((a) => {
    const mio = local.articulos.find((x) => x.codigo === a.codigo && x.articulo === a.articulo)
    return {
      codigo: a.codigo,
      articulo: a.articulo,
      ...(a.funcion ? { funcion: a.funcion } : mio?.funcion ? { funcion: mio.funcion } : {}),
      ...(a.nota ? { nota: a.nota } : mio?.nota ? { nota: mio.nota } : {}),
      ...(mio?.estado ? { estado: mio.estado } : {}),
      ...(mio?.caja !== undefined ? { caja: mio.caja } : {}),
      ...(mio?.proximoRepaso !== undefined ? { proximoRepaso: mio.proximoRepaso } : {}),
    }
  })
  return {
    ...local,
    titulo: nueva.titulo,
    articulos,
    conexiones: nueva.conexiones,
    grupos: nueva.grupos,
    oficial: nueva.oficial,
    fechaModificacion: ahora,
  }
}

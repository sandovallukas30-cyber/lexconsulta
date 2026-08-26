// Construye el árbol jerárquico (Libro → Título → Capítulo → Párrafo → Artículos)
// que usa la vista "Esquema de estudio" del Explorador.
//
// Distinto del árbol que ya usa ModalIndice (src/components/views/ExploradorView.tsx):
// ese agrupa por VALOR ÚNICO de cada campo usando un Map, lo que funciona casi
// siempre pero puede fusionar por error dos secciones no relacionadas si el
// parser del PDF dejó el mismo texto de título en dos puntos distintos y no
// contiguos del código (ocurre: "VIII" y "XVII" se repiten en codigoCivil.json
// en tramos de artículos separados, artefacto conocido de la extracción). Acá
// agrupamos por CORRIDAS CONTIGUAS: un cambio de valor siempre abre un nodo
// nuevo, aunque el texto ya se haya visto antes. Además soporta el nivel
// "párrafo", que el árbol del Índice no muestra y que sí trae datos reales en
// varios códigos (Trabajo, Sanitario, Tributario, Minería, Orgánico de
// Tribunales, entre otros).

import type { Articulo } from '../types'

export type CampoNivel = 'libro' | 'titulo' | 'capitulo' | 'parrafo'

const NIVELES: CampoNivel[] = ['libro', 'titulo', 'capitulo', 'parrafo']

export const ETIQUETAS_NIVEL: Record<CampoNivel, string> = {
  libro: 'LIBRO',
  titulo: 'TÍTULO',
  capitulo: 'CAPÍTULO',
  parrafo: 'PÁRRAFO',
}

export interface NodoEsquema {
  /** Campo real que generó este nodo. No depende de la profundidad: un código
   *  puede tener capítulos dentro de un título y no dentro de otro. */
  campo: CampoNivel
  /** Valor crudo de ese campo para este nodo. */
  clave: string | null
  /** Todos los artículos que caen bajo este nodo (incluye los de sus hijos). */
  articulos: Articulo[]
  hijos: NodoEsquema[]
}

function agruparPorCorridas(articulos: Articulo[], campo: CampoNivel): { clave: string | null; articulos: Articulo[] }[] {
  const grupos: { clave: string | null; articulos: Articulo[] }[] = []
  for (const art of articulos) {
    const clave = art[campo] ?? null
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.clave === clave) {
      ultimo.articulos.push(art)
    } else {
      grupos.push({ clave, articulos: [art] })
    }
  }
  return grupos
}

function construirNivel(articulos: Articulo[], campos: CampoNivel[]): NodoEsquema[] {
  if (campos.length === 0 || articulos.length === 0) return []
  const [campo, ...resto] = campos
  const grupos = agruparPorCorridas(articulos, campo)

  // Si ningún artículo usa este campo, no tiene sentido crear un nivel vacío:
  // saltamos directo al siguiente (ej. la mayoría de los 24 códigos no tiene
  // "libro"; algunos títulos no tienen "capítulo" aunque otros del mismo
  // código sí — por eso el salto se decide por rama, no de forma global).
  if (grupos.length === 1 && grupos[0].clave === null) {
    return construirNivel(articulos, resto)
  }

  return grupos.map((g) => ({
    campo,
    clave: g.clave,
    articulos: g.articulos,
    hijos: construirNivel(g.articulos, resto),
  }))
}

/**
 * Colapsa una cadena de nodos donde un nodo tiene un único hijo que abarca
 * EXACTAMENTE el mismo rango de artículos (no agrega ninguna subdivisión
 * real). Pasa siempre en el Preliminar de Código Civil: el nivel superior
 * (libro=null, sintetizado como "PRELIMINAR" en el componente) tiene un solo
 * título hijo que repite el 100% de sus artículos ("PRELIMINAR — § 1. De la
 * ley") — sin esto se veían dos filas seguidas diciendo básicamente lo mismo.
 * Se queda con los datos del descendiente más específico (más informativo)
 * en vez del nodo sintético de arriba.
 */
function colapsarPasoUnico(nodo: NodoEsquema): NodoEsquema {
  let actual = nodo
  while (actual.hijos.length === 1 && actual.hijos[0].articulos.length === actual.articulos.length) {
    actual = actual.hijos[0]
  }
  // Siempre bajamos a revisar los hijos, colapse o no este nivel: una cadena
  // redundante puede aparecer en cualquier profundidad, no solo en la raíz.
  return { ...actual, hijos: actual.hijos.map(colapsarPasoUnico) }
}

/** Árbol completo para la pestaña "Lista". */
export function construirEsquema(articulos: Articulo[]): NodoEsquema[] {
  return construirNivel(articulos, NIVELES).map(colapsarPasoUnico)
}

/**
 * Nivel superior para la pestaña "Diagrama": el primer campo (Libro → Título
 * → Capítulo → Párrafo) que de verdad separa la mayoría del código en 2 o más
 * secciones, en vez de asumir que siempre es "Libro" o siempre "Título".
 *
 * Ambos son necesarios: la mayoría de los 24 códigos no usa "libro" (cae a
 * "título"), pero además algunos tampoco usan realmente "título" para su
 * cuerpo principal. La Constitución es el caso que lo deja claro: su "título"
 * solo cubre las disposiciones transitorias (22,5% de los artículos) — el
 * cuerpo permanente completo, con los 15 capítulos históricos (Bases de la
 * Institucionalidad, Congreso Nacional, Poder Judicial...), vive en el campo
 * "capítulo". Sin este chequeo, el diagrama mostraría un solo bloque enorme
 * sin dividir y un puñado de cajas sueltas con las disposiciones finales.
 */
export function primerNivelParaDiagrama(articulos: Articulo[]): NodoEsquema[] {
  for (const campo of NIVELES) {
    const grupos = agruparPorCorridas(articulos, campo)
    const distintos = new Set(grupos.filter((g) => g.clave !== null).map((g) => g.clave))
    const conValor = articulos.length - grupos.filter((g) => g.clave === null).reduce((s, g) => s + g.articulos.length, 0)
    if (distintos.size >= 2 && conValor / articulos.length >= 0.5) {
      return construirNivel(articulos, [campo])
    }
  }
  // Ningún campo separa bien la mayoría del contenido (código sin subdivisión
  // real, ej. una ley corta): usar título de todas formas, mejor una sola
  // sección que nada.
  return construirNivel(articulos, ['titulo'])
}

/** Cuántos títulos distintos (por corridas) hay dentro de un nodo de nivel "Libro". */
export function contarTitulos(nodo: NodoEsquema): number {
  return construirNivel(nodo.articulos, ['titulo']).length
}

/**
 * Hijos directos de un nodo YA CONSTRUIDO, calculados bajo demanda (para el
 * Diagrama, que solo pide un nivel a la vez y expande el que el usuario haya
 * tocado, en vez de construir el árbol completo de una). Mira el campo propio
 * del nodo para saber cuál es "el siguiente" (Libro→Título→Capítulo→Párrafo),
 * no la profundidad, por la misma razón que NodoEsquema guarda `campo`: un
 * código puede saltarse niveles según la rama.
 */
export function hijosDe(nodo: NodoEsquema): NodoEsquema[] {
  const idx = NIVELES.indexOf(nodo.campo)
  const siguientes = idx === -1 ? [] : NIVELES.slice(idx + 1)
  return construirNivel(nodo.articulos, siguientes).map(colapsarPasoUnico)
}

/**
 * Detecta un título que el parser del PDF dejó reducido a un numeral romano
 * suelto (p. ej. "VIII", "XVII"), sin el texto descriptivo real — artefacto
 * conocido de la extracción (ver codigoCivil.json y leyAccidentesTrabajo.json).
 * Se usa para no mostrarlo como si fuera un título completo y legible.
 */
export function esClaveSinTexto(clave: string | null): boolean {
  if (!clave) return false
  return /^[ivxlcdm]+$/i.test(clave.trim())
}

/** Primer y último artículo de un nodo, para mostrar el rango "Art. X–Y". */
export function rangoArticulos(nodo: NodoEsquema): string {
  const primero = nodo.articulos[0]?.a
  const ultimo = nodo.articulos[nodo.articulos.length - 1]?.a
  if (!primero) return ''
  if (primero === ultimo) return primero
  return `${primero} – ${ultimo}`
}

const VALORES_ROMANOS: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

/** Numeral romano para el badge de orden de cada rama del diagrama (Libro I, Libro II...). */
export function numeroRomano(n: number): string {
  let resto = n
  let resultado = ''
  for (const [valor, simbolo] of VALORES_ROMANOS) {
    while (resto >= valor) {
      resultado += simbolo
      resto -= valor
    }
  }
  return resultado || String(n)
}

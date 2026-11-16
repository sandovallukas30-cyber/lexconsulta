import type { ApunteModulo, EvaluacionModulo, UnidadRamo } from '../types'

/** Temario de un ramo (el programa del curso): unidades, qué apuntes son de cada una y qué entra en cada evaluación.
 *  Funciones puras, sin IA. */

export const MAX_UNIDADES = 40
export const MAX_NOMBRE_UNIDAD = 120

/** Id especial para los apuntes que no tienen unidad. */
export const SIN_UNIDAD = '__sin__'

/** Convierte una lista pegada (una unidad por línea) en nombres limpios: quita viñetas y numeración («1.», «1)», «-», «•»),
 *  espacios sobrantes y líneas repetidas. «Unidad 3: Los actos» se conserva tal cual (es el nombre que la persona conoce). */
export function parsearTemario(texto: string): string[] {
  const vistos = new Set<string>()
  const salida: string[] = []
  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda
      .replace(/^\s*(?:[-*•·–—]|\d{1,2}\s*[.)](?=\s))\s*/u, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_NOMBRE_UNIDAD)
    if (!linea) continue
    const clave = linea.toLowerCase()
    if (vistos.has(clave)) continue
    vistos.add(clave)
    salida.push(linea)
  }
  return salida.slice(0, MAX_UNIDADES)
}

/** Unidades nuevas a partir de nombres, sin repetir las que ya existen (compara sin mayúsculas). */
export function agregarUnidades(existentes: UnidadRamo[], nombres: string[], nuevoId: () => string = () => crypto.randomUUID()): UnidadRamo[] {
  const tiene = new Set(existentes.map((u) => u.nombre.toLowerCase()))
  const nuevas: UnidadRamo[] = []
  for (const n of nombres) {
    if (existentes.length + nuevas.length >= MAX_UNIDADES) break
    if (tiene.has(n.toLowerCase())) continue
    tiene.add(n.toLowerCase())
    nuevas.push({ id: nuevoId(), nombre: n })
  }
  return [...existentes, ...nuevas]
}

/** Apuntes de las unidades pedidas (`SIN_UNIDAD` incluye los que no tienen). Lista vacía = todos. */
export function apuntesDeUnidades(apuntes: ApunteModulo[], ids: string[]): ApunteModulo[] {
  if (ids.length === 0) return apuntes
  const set = new Set(ids)
  return apuntes.filter((a) => set.has(a.unidadId ?? SIN_UNIDAD))
}

/** Cuántos apuntes tiene cada unidad (incluye `SIN_UNIDAD`). */
export function apuntesPorUnidad(apuntes: ApunteModulo[], unidades: UnidadRamo[]): Map<string, number> {
  const validas = new Set(unidades.map((u) => u.id))
  const m = new Map<string, number>()
  for (const a of apuntes) {
    const k = a.unidadId && validas.has(a.unidadId) ? a.unidadId : SIN_UNIDAD
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

/** Quita de las evaluaciones y apuntes las unidades que ya no existen. */
export function limpiarUnidadesBorradas(unidades: UnidadRamo[], evaluaciones: EvaluacionModulo[], apuntes: ApunteModulo[]) {
  const validas = new Set(unidades.map((u) => u.id))
  return {
    evaluaciones: evaluaciones.map((e) => (e.unidadIds && e.unidadIds.some((i) => !validas.has(i)) ? { ...e, unidadIds: e.unidadIds.filter((i) => validas.has(i)) } : e)),
    apuntes: apuntes.map((a) => {
      if (!a.unidadId || validas.has(a.unidadId)) return a
      const resto = { ...a }
      delete resto.unidadId
      return resto
    }),
  }
}

/** Evaluaciones sin nota (ordenadas por fecha) que ya tienen unidades marcadas: sirven de atajo en el simulacro. */
export function evaluacionesConTemario(evaluaciones: EvaluacionModulo[]): EvaluacionModulo[] {
  return evaluaciones.filter((e) => e.nota === null && (e.unidadIds?.length ?? 0) > 0).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

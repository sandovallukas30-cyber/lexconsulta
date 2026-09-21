import type { AreaPractica, CodigoTipo, ProgresoModulo } from '../types'
import { MODULOS } from '../data/modulos'

/** A qué Módulo(s) aporta dominio un resultado de Práctica en cada área.
 *  'penal' no distingue sustantivo/procesal en Práctica, así que un
 *  acierto ahí aporta a ambos módulos penales. 'general' y
 *  'recursos_naturales' no tienen módulo propio en el catálogo -- sus
 *  resultados no se pierden (siguen contando para récords/rachas de
 *  Práctica), simplemente no mueven ningún dominio. */
const AREA_A_MODULOS: Partial<Record<AreaPractica, string[]>> = {
  civil: ['civil'],
  penal: ['penal-sustantivo', 'penal-procesal'],
  laboral: ['laboral'],
  procesal: ['procesal-civil'],
  constitucional: ['constitucional'],
  comercial: ['comercial'],
  tributario: ['tributario'],
  administrativo: ['administrativo'],
}

export function modulosDeArea(area: AreaPractica): string[] {
  return AREA_A_MODULOS[area] ?? []
}

/** El Quiz Jurídico elige un CodigoTipo (no un AreaPractica) por ronda --
 *  cada Módulo tiene a lo más un `codigoRelacionado`, así que el mapeo acá
 *  es directo y sin ambigüedad (a diferencia de 'penal' en Práctica). */
export function moduloDeCodigo(codigo: CodigoTipo): string[] {
  const modulo = MODULOS.find((m) => m.codigoRelacionado === codigo)
  return modulo ? [modulo.id] : []
}

/** Con pocos ejercicios, el % de dominio no debería saltar a 100% con solo
 *  un par de aciertos -- se pondera la tasa de acierto por qué tan cerca
 *  se está de este umbral de ejercicios resueltos (acumulado). */
const UMBRAL_CONFIANZA_EJERCICIOS = 20

/** Combina el resultado de una partida de Práctica con el progreso previo
 *  de un módulo, para pasarle el resultado a `registrarProgresoModulo`.
 *  `temasCompletados` no se toca acá -- eso es curricular, no de
 *  ejercicios de práctica. */
export function combinarProgresoPractica(
  progresoActual: ProgresoModulo | undefined,
  ejerciciosNuevos: number,
  aciertosNuevos: number
): Partial<Omit<ProgresoModulo, 'moduloId'>> {
  const ejerciciosPrevios = progresoActual?.ejerciciosResueltos ?? 0
  const aciertosPrevios = Math.round(((progresoActual?.tasaAcierto ?? 0) / 100) * ejerciciosPrevios)

  const ejerciciosResueltos = ejerciciosPrevios + ejerciciosNuevos
  const aciertosTotales = aciertosPrevios + aciertosNuevos
  const tasaAcierto = ejerciciosResueltos > 0 ? Math.round((aciertosTotales / ejerciciosResueltos) * 100) : 0
  const factorConfianza = Math.min(1, ejerciciosResueltos / UMBRAL_CONFIANZA_EJERCICIOS)
  const porcentajeDominio = Math.round(tasaAcierto * factorConfianza)

  return { ejerciciosResueltos, tasaAcierto, porcentajeDominio }
}

/** Aplica un resultado de ejercicios a los módulos indicados, devolviendo el
 *  mapa completo de progreso actualizado -- para asignar directo a
 *  `progresoModulos` en el store, sin ir módulo por módulo. */
function aplicarResultadoAModulos(
  progresoModulos: Record<string, ProgresoModulo>,
  moduloIds: string[],
  ejerciciosNuevos: number,
  aciertosNuevos: number
): Record<string, ProgresoModulo> {
  if (moduloIds.length === 0) return progresoModulos
  const actualizado = { ...progresoModulos }
  const ahora = Date.now()
  for (const moduloId of moduloIds) {
    const base: ProgresoModulo = actualizado[moduloId] ?? {
      moduloId,
      porcentajeDominio: 0,
      temasCompletados: 0,
      ultimaActividad: null,
      ejerciciosResueltos: 0,
      tasaAcierto: 0,
    }
    const cambios = combinarProgresoPractica(base, ejerciciosNuevos, aciertosNuevos)
    actualizado[moduloId] = { ...base, ...cambios, ultimaActividad: ahora }
  }
  return actualizado
}

/** Resultado de Pasapalabra o Ahorcado (filtrados por AreaPractica). */
export function aplicarResultadoPracticaATodos(
  progresoModulos: Record<string, ProgresoModulo>,
  area: AreaPractica,
  ejerciciosNuevos: number,
  aciertosNuevos: number
): Record<string, ProgresoModulo> {
  return aplicarResultadoAModulos(progresoModulos, modulosDeArea(area), ejerciciosNuevos, aciertosNuevos)
}

/** Resultado de una ronda de Quiz Jurídico (filtrado por CodigoTipo). */
export function aplicarResultadoQuizATodos(
  progresoModulos: Record<string, ProgresoModulo>,
  codigo: CodigoTipo,
  ejerciciosNuevos: number,
  aciertosNuevos: number
): Record<string, ProgresoModulo> {
  return aplicarResultadoAModulos(progresoModulos, moduloDeCodigo(codigo), ejerciciosNuevos, aciertosNuevos)
}

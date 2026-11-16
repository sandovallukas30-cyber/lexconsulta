import type { RegistroPrueba, TipoPrueba } from '../types'

/** Registro de errores del modo prueba: por cada pregunta (o tema de desarrollo) cuántas veces se acertó, cuántas se
 *  falló y cómo salió la última vez. Permite repasar solo lo que sigue fallando y ver en qué tipo de pregunta te
 *  equivocas más (por ejemplo, los plazos y quórums). Funciones puras. */

export interface ResultadoPrueba {
  /** Id de la pregunta (`<tarjeta>:<tipo>`) o del tema de desarrollo. */
  id: string
  tipo: TipoPrueba
  etiqueta: string
  /** Id de la tarjeta (alternativas) o del tema (desarrollo). */
  origen: string
  ramoId?: string
  unidadId?: string
  ok: boolean
  /** Desarrollo: lo que faltó en la respuesta. */
  faltaron?: string[]
}

export const MAX_REGISTROS = 800

export const NOMBRE_TIPO_PRUEBA: Record<TipoPrueba, string> = {
  definicion: 'Definiciones',
  termino: 'Conceptos',
  hueco: 'Palabras clave',
  numero: 'Plazos y quórums',
  desarrollo: 'Desarrollo',
}

/** Suma los resultados de un intento al registro. Si se pasa de `MAX_REGISTROS`, se sueltan primero los más antiguos que ya salieron bien. */
export function aplicarResultados(registro: Record<string, RegistroPrueba>, items: ResultadoPrueba[], ahora: number): Record<string, RegistroPrueba> {
  const salida = { ...registro }
  for (const r of items) {
    const previo = salida[r.id]
    const faltaron = r.ok ? undefined : r.faltaron?.slice(0, 6)
    salida[r.id] = {
      tipo: r.tipo,
      etiqueta: r.etiqueta.slice(0, 160),
      origen: r.origen,
      ...(r.ramoId ? { ramoId: r.ramoId } : {}),
      ...(r.unidadId ? { unidadId: r.unidadId } : {}),
      aciertos: (previo?.aciertos ?? 0) + (r.ok ? 1 : 0),
      fallos: (previo?.fallos ?? 0) + (r.ok ? 0 : 1),
      ultimo: ahora,
      ok: r.ok,
      ...(faltaron && faltaron.length > 0 ? { faltaron } : {}),
    }
  }
  const ids = Object.keys(salida)
  if (ids.length <= MAX_REGISTROS) return salida
  // primero se sueltan los que ya están bien, del más antiguo al más reciente; si no alcanza, los más antiguos
  const orden = ids.sort((a, b) => Number(salida[b].ok) - Number(salida[a].ok) || salida[a].ultimo - salida[b].ultimo)
  for (const id of orden.slice(0, ids.length - MAX_REGISTROS)) delete salida[id]
  return salida
}

export interface FiltroRegistro {
  ramoId?: string
  /** Unidades (vacío o ausente = todas). */
  unidadIds?: string[]
}

const pasa = (r: RegistroPrueba, f?: FiltroRegistro) => {
  if (f?.ramoId && r.ramoId !== f.ramoId) return false
  if (f?.unidadIds && f.unidadIds.length > 0 && !f.unidadIds.includes(r.unidadId ?? '__sin__')) return false
  return true
}

/** Lo que falló la última vez que se preguntó, lo que más falla primero. */
export function pendientes(registro: Record<string, RegistroPrueba>, filtro?: FiltroRegistro): [string, RegistroPrueba][] {
  return Object.entries(registro)
    .filter(([, r]) => !r.ok && pasa(r, filtro))
    .sort((a, b) => b[1].fallos - a[1].fallos || b[1].ultimo - a[1].ultimo)
}

export interface ResumenTipo {
  tipo: TipoPrueba
  aciertos: number
  fallos: number
  /** Cuántas siguen mal desde la última vez. */
  pendientes: number
}

/** Aciertos y fallos por tipo de pregunta, del que más falla (en proporción) al que menos. Solo tipos con intentos. */
export function resumenPorTipo(registro: Record<string, RegistroPrueba>, filtro?: FiltroRegistro): ResumenTipo[] {
  const m = new Map<TipoPrueba, ResumenTipo>()
  for (const r of Object.values(registro)) {
    if (!pasa(r, filtro)) continue
    const x = m.get(r.tipo) ?? { tipo: r.tipo, aciertos: 0, fallos: 0, pendientes: 0 }
    x.aciertos += r.aciertos
    x.fallos += r.fallos
    if (!r.ok) x.pendientes++
    m.set(r.tipo, x)
  }
  const tasa = (x: ResumenTipo) => x.fallos / Math.max(1, x.fallos + x.aciertos)
  return [...m.values()].filter((x) => x.aciertos + x.fallos > 0).sort((a, b) => tasa(b) - tasa(a) || b.fallos - a.fallos)
}

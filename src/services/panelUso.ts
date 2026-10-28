/** Lectura del panel de estadísticas de uso. Solo funciona para las cuentas que figuran en la tabla `administradores`
 *  (docs/supabase/uso.sql): la base rechaza a cualquier otra, aunque alguien llame a estas funciones a mano. */

import { supabase } from './supabase'
import type { FilaUso } from './resumenUso'

/** ¿La cuenta con sesión iniciada es administradora? Ante cualquier error (sin sesión, sin SQL cargado, sin red): false. */
export async function esAdministrador(): Promise<boolean> {
  if (!supabase) return false
  try {
    const { data, error } = await supabase.rpc('es_administrador')
    return !error && data === true
  } catch {
    return false
  }
}

/** AAAA-MM-DD en hora de Chile (los contadores se agrupan por día chileno). */
export function fechaChile(fecha: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha)
}

/** Rango de `dias` días que termina hoy (hora de Chile), ambos extremos incluidos. */
export function rangoUltimosDias(dias: number, ahora = new Date()): { desde: string; hasta: string } {
  const hasta = fechaChile(ahora)
  const fin = new Date(`${hasta}T12:00:00Z`).getTime()
  return { desde: fechaChile(new Date(fin - (dias - 1) * 86_400_000)), hasta }
}

export async function cargarFilasUso(desde: string, hasta: string): Promise<FilaUso[]> {
  if (!supabase) throw new Error('Las cuentas no están configuradas en este despliegue.')
  const { data, error } = await supabase.rpc('uso_resumen', { p_desde: desde, p_hasta: hasta })
  if (error) throw new Error(error.message || 'No se pudieron leer las estadísticas.')
  return ((data ?? []) as FilaUso[]).map((f) => ({ ...f, cantidad: Number(f.cantidad) || 0, segundos: Number(f.segundos) || 0 }))
}

import type { Coleccion } from '../types'

export function fechaLocalISO(d: Date): string {
  const anio = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** Agrega el día de hoy al registro de actividad si no estaba ya --
 *  idempotente: si hoy ya está, devuelve la MISMA referencia (para que
 *  llamadas repetidas en el mismo día no disparen renders de más). */
export function agregarActividadHoy(dias: string[]): string[] {
  const hoy = fechaLocalISO(new Date())
  return dias.includes(hoy) ? dias : [...dias, hoy]
}

/** Días consecutivos de actividad hasta hoy. Si todavía no hay actividad
 *  registrada HOY, la racha se cuenta desde ayer hacia atrás -- no se
 *  quiere mostrar "racha rota" solo porque el usuario aún no abrió la app
 *  en el día de hoy. */
export function calcularRachaEstudio(diasActividad: string[]): number {
  const set = new Set(diasActividad)
  const cursor = new Date()
  if (!set.has(fechaLocalISO(cursor))) cursor.setDate(cursor.getDate() - 1)
  let racha = 0
  while (set.has(fechaLocalISO(cursor))) {
    racha++
    cursor.setDate(cursor.getDate() - 1)
  }
  return racha
}

/** Tarjetas de repetición espaciada (Leitner, ver registrarRepaso en
 *  useStore.ts) listas para repasar hoy, sumando TODAS las Colecciones --
 *  sin proximoRepaso asignado (nunca repasada) cuenta como vencida. */
export function contarTarjetasVencidas(colecciones: Coleccion[]): number {
  const ahora = Date.now()
  let total = 0
  for (const c of colecciones) {
    for (const a of c.articulos) {
      if (!a.proximoRepaso || a.proximoRepaso <= ahora) total++
    }
  }
  return total
}

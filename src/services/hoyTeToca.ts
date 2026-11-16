import type { Coleccion, DatosAcademicosModulo, EstadoTarjetaRepaso, RegistroPrueba } from '../types'
import { tarjetasDe } from './tarjetasApunte'
import { pendientes } from './registroPrueba'
import { contarTarjetasVencidas } from './actividadEstudio'

/** «Hoy te toca»: lo que conviene estudiar hoy, armado solo con lo que ya hay en la app (sin IA), con un tiempo
 *  estimado para cada cosa. Orden: lo que tiene fecha cerca primero, después lo que fallaste y al final el repaso. */

export type AccionHoy =
  | { juego: 'simulacro'; ramoId?: string; unidadIds?: string[]; soloErrores?: boolean }
  | { juego: 'mazo' }
  | { juego: 'repaso' }

export interface ItemHoy {
  id: string
  icono: string
  titulo: string
  detalle: string
  minutos: number
  accion: AccionHoy
}

export interface DatosHoy {
  academico: Record<string, DatosAcademicosModulo>
  colecciones: Coleccion[]
  repasoApuntes: Record<string, EstadoTarjetaRepaso>
  erroresPrueba: Record<string, RegistroPrueba>
  nombreRamo: (id: string) => string
  /** YYYY-MM-DD */
  hoy: string
  ahora: number
}

/** Hasta cuántos días antes de una evaluación aparece su simulacro. */
export const DIAS_AVISO_EVALUACION = 14

const diasEntre = (desde: string, hasta: string) => {
  const [a, b] = [desde, hasta].map((d) => {
    const [y, m, dd] = d.split('-').map(Number)
    return Date.UTC(y, m - 1, dd)
  })
  return Math.round((b - a) / 86_400_000)
}

const redondear = (min: number) => Math.max(2, Math.round(min / 5) * 5 || Math.ceil(min))

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`
}

export function hoyTeToca(d: DatosHoy): ItemHoy[] {
  const items: ItemHoy[] = []

  // 1. Evaluaciones que se acercan: simulacro de lo que entra (o del ramo entero)
  const proximas: { ramoId: string; nombre: string; dias: number; unidadIds?: string[] }[] = []
  for (const [ramoId, datos] of Object.entries(d.academico)) {
    for (const e of datos.evaluaciones ?? []) {
      if (e.nota !== null) continue
      const dias = diasEntre(d.hoy, e.fecha)
      if (dias < 0 || dias > DIAS_AVISO_EVALUACION) continue
      proximas.push({ ramoId, nombre: e.nombre, dias, ...(e.unidadIds?.length ? { unidadIds: e.unidadIds } : {}) })
    }
  }
  proximas.sort((a, b) => a.dias - b.dias)
  for (const p of proximas.slice(0, 2)) {
    const cuando = p.dias === 0 ? 'es hoy' : p.dias === 1 ? 'es mañana' : `en ${p.dias} días`
    items.push({
      id: `eval:${p.ramoId}:${p.nombre}`,
      icono: 'ti-clipboard-check',
      titulo: `Simulacro: ${p.nombre}`,
      detalle: `${d.nombreRamo(p.ramoId)} · ${cuando}${p.unidadIds ? ' · solo lo que entra' : ''}`,
      minutos: 10,
      accion: { juego: 'simulacro', ramoId: p.ramoId, ...(p.unidadIds ? { unidadIds: p.unidadIds } : {}) },
    })
  }

  // 2. Lo que fallaste en el modo prueba y sigue mal
  const errores = pendientes(d.erroresPrueba)
  if (errores.length > 0) {
    const ramosErr = new Set(errores.map(([, r]) => r.ramoId).filter(Boolean))
    const unRamo = ramosErr.size === 1 ? [...ramosErr][0] : undefined
    const numericos = errores.filter(([, r]) => r.tipo === 'numero').length
    items.push({
      id: 'errores',
      icono: 'ti-target-arrow',
      titulo: `Corregir ${plural(errores.length, 'error', 'errores')}`,
      detalle: numericos > 0 ? `${plural(numericos, 'es de plazos o quórums', 'son de plazos o quórums')}` : 'Lo que fallaste la última vez',
      minutos: redondear(Math.min(errores.length, 20) * 0.6),
      accion: { juego: 'simulacro', ...(unRamo ? { ramoId: unRamo } : {}), soloErrores: true },
    })
  }

  // 3. Tarjetas de los apuntes que vencen (solo las ya estudiadas: las nuevas no se cuentan como deuda)
  let vencidas = 0
  for (const datos of Object.values(d.academico)) {
    for (const a of datos.apuntes ?? []) {
      for (const t of tarjetasDe(a)) {
        const e = d.repasoApuntes[t.id]
        if (e && e.proximo <= d.ahora) vencidas++
      }
    }
  }
  if (vencidas > 0) {
    items.push({
      id: 'tarjetas',
      icono: 'ti-cards',
      titulo: `Repasar ${plural(vencidas, 'tarjeta', 'tarjetas')}`,
      detalle: 'De tus apuntes, con repaso espaciado',
      minutos: redondear(vencidas * 0.3),
      accion: { juego: 'mazo' },
    })
  }

  // 4. Artículos de las colecciones
  const articulos = contarTarjetasVencidas(d.colecciones)
  if (articulos > 0) {
    items.push({
      id: 'colecciones',
      icono: 'ti-books',
      titulo: `Repasar ${plural(articulos, 'artículo', 'artículos')}`,
      detalle: 'De tus colecciones',
      minutos: redondear(Math.min(articulos, 20) * 0.5),
      accion: { juego: 'repaso' },
    })
  }

  return items
}

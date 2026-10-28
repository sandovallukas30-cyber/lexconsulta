/** Convierte las filas de contadores diarios (tabla uso_diario, vía la función uso_resumen) en lo que muestra el panel de uso.
 *  Pura (sin red ni pantalla) para poder probarla. «Visita» = una apertura de la app; NO es una persona: no hay identificadores, así
 *  que la misma persona que entra tres veces cuenta tres visitas. */

import { CLAVES_FUNCIONES, DISPOSITIVOS_USO, FUNCIONES_USO, VISTAS_USO, type DispositivoUso, type FuncionUso, type VistaUso } from '../../api/_catalogoUso'

export interface FilaUso {
  dia: string // AAAA-MM-DD
  tipo: 'sesion' | 'evento' | 'vista'
  clave: string
  dispositivo: DispositivoUso
  cantidad: number
  segundos: number
}

export interface ResumenUso {
  visitas: { total: number; nuevas: number; regresos: number }
  /** Una entrada por cada día del rango (con 0 si no hubo visitas). */
  porDia: { dia: string; visitas: number }[]
  porDispositivo: Record<DispositivoUso, number>
  /** Todas las pantallas, de más a menos tiempo (las que no se usaron salen con 0). */
  vistas: { vista: VistaUso; segundos: number; porcentaje: number }[]
  /** Todas las funciones del catálogo, de más a menos usadas (las que no se usaron salen con 0). */
  funciones: { clave: FuncionUso; etiqueta: string; veces: number }[]
  sinUso: { clave: FuncionUso; etiqueta: string }[]
  /** Segundos de uso activo por visita (promedio). */
  segundosPorVisita: number
  totalSegundos: number
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Días AAAA-MM-DD desde `desde` hasta `hasta`, ambos incluidos. */
export function diasDelRango(desde: string, hasta: string): string[] {
  const dias: string[] = []
  const fin = new Date(`${hasta}T00:00:00Z`).getTime()
  for (let t = new Date(`${desde}T00:00:00Z`).getTime(); t <= fin && dias.length < 400; t += 86_400_000) {
    dias.push(new Date(t).toISOString().slice(0, 10))
  }
  return dias
}

export function resumirUso(filas: FilaUso[], desde: string, hasta: string): ResumenUso {
  const visitasPorDia = new Map(diasDelRango(desde, hasta).map((d) => [d, 0]))
  const porDispositivo = Object.fromEntries(DISPOSITIVOS_USO.map((d) => [d, 0])) as Record<DispositivoUso, number>
  let nuevas = 0
  let regresos = 0
  const segundosPorVista = new Map<VistaUso, number>(VISTAS_USO.map((v) => [v, 0]))
  const vecesPorFuncion = new Map<FuncionUso, number>(CLAVES_FUNCIONES.map((c) => [c, 0]))

  for (const f of filas) {
    if (f.tipo === 'sesion') {
      const n = num(f.cantidad)
      if (f.clave === 'nueva') nuevas += n
      else regresos += n
      if (visitasPorDia.has(f.dia)) visitasPorDia.set(f.dia, (visitasPorDia.get(f.dia) ?? 0) + n)
      if (f.dispositivo in porDispositivo) porDispositivo[f.dispositivo] += n
    } else if (f.tipo === 'vista') {
      const v = f.clave as VistaUso
      if (segundosPorVista.has(v)) segundosPorVista.set(v, (segundosPorVista.get(v) ?? 0) + num(f.segundos))
    } else if (f.tipo === 'evento') {
      const c = f.clave as FuncionUso
      if (vecesPorFuncion.has(c)) vecesPorFuncion.set(c, (vecesPorFuncion.get(c) ?? 0) + num(f.cantidad))
    }
  }

  const total = nuevas + regresos
  const totalSegundos = [...segundosPorVista.values()].reduce((a, b) => a + b, 0)
  const vistas = [...segundosPorVista.entries()]
    .map(([vista, segundos]) => ({ vista, segundos, porcentaje: totalSegundos > 0 ? (segundos / totalSegundos) * 100 : 0 }))
    .sort((a, b) => b.segundos - a.segundos || VISTAS_USO.indexOf(a.vista) - VISTAS_USO.indexOf(b.vista))
  const funciones = [...vecesPorFuncion.entries()]
    .map(([clave, veces]) => ({ clave, etiqueta: FUNCIONES_USO[clave], veces }))
    .sort((a, b) => b.veces - a.veces || CLAVES_FUNCIONES.indexOf(a.clave) - CLAVES_FUNCIONES.indexOf(b.clave))

  return {
    visitas: { total, nuevas, regresos },
    porDia: [...visitasPorDia.entries()].map(([dia, visitas]) => ({ dia, visitas })),
    porDispositivo,
    vistas,
    funciones,
    sinUso: funciones.filter((f) => f.veces === 0).map(({ clave, etiqueta }) => ({ clave, etiqueta })),
    segundosPorVisita: total > 0 ? Math.round(totalSegundos / total) : 0,
    totalSegundos,
  }
}

/** «1 h 20 min», «45 min», «30 s». */
export function formatoDuracion(segundos: number): string {
  const s = Math.round(segundos)
  if (s < 60) return `${s} s`
  const min = Math.round(s / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const resto = min % 60
  return resto === 0 ? `${h} h` : `${h} h ${resto} min`
}

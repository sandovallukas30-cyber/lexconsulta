import { lunesDe, minutosEnFecha, type SesionFoco } from './enfoque'
import { sumarDiasISO } from './tareasPlan'

/** Estadísticas y patrones de las sesiones de enfoque (portados de Orbis).
 *  Lógica pura: con pocos datos no inventa nada. */

export const totalMinutos = (l: SesionFoco[]) => l.reduce((s, x) => s + x.minutos, 0)

const parsear = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}
const diasEntre = (a: string, b: string) => Math.round((parsear(a).getTime() - parsear(b).getTime()) / 86_400_000)

/** Minutos de las últimas `n` semanas (lunes a domingo), de la más antigua a la actual. */
export function serieSemanas(sesiones: SesionFoco[], hoy: string, n: number): { fecha: string; minutos: number }[] {
  const porFecha = new Map<string, number>()
  for (const s of sesiones) porFecha.set(s.fecha, (porFecha.get(s.fecha) ?? 0) + s.minutos)
  const lunes = lunesDe(hoy)
  return Array.from({ length: n }, (_, i) => {
    const inicio = sumarDiasISO(lunes, (i - (n - 1)) * 7)
    let minutos = 0
    for (let k = 0; k < 7; k++) minutos += porFecha.get(sumarDiasISO(inicio, k)) ?? 0
    return { fecha: inicio, minutos }
  })
}

export interface ResumenFoco {
  hoy: number
  semana: number
  mes: number
  total: number
  sesiones: number
  promedio: number
  masLarga: number
  /** Cambio de los últimos 7 días contra los 7 anteriores (null si antes no había nada). */
  tendencia: number | null
}

export function resumenFoco(sesiones: SesionFoco[], hoy: string): ResumenFoco {
  const desde = (n: number) => sumarDiasISO(hoy, -(n - 1))
  const suma = (n: number) => totalMinutos(sesiones.filter((s) => s.fecha >= desde(n)))
  const previos = totalMinutos(sesiones.filter((s) => s.fecha >= sumarDiasISO(hoy, -13) && s.fecha < desde(7)))
  const ult7 = suma(7)
  return {
    hoy: minutosEnFecha(sesiones, hoy),
    semana: ult7,
    mes: suma(30),
    total: totalMinutos(sesiones),
    sesiones: sesiones.length,
    promedio: sesiones.length ? totalMinutos(sesiones) / sesiones.length : 0,
    masLarga: sesiones.reduce((m, s) => Math.max(m, s.minutos), 0),
    tendencia: previos > 0 ? (ult7 - previos) / previos : null,
  }
}

/** Mejor racha de días seguidos con la meta cumplida. */
export function mejorRacha(sesiones: SesionFoco[], meta: number): number {
  if (meta <= 0) return 0
  const porFecha = new Map<string, number>()
  for (const s of sesiones) porFecha.set(s.fecha, (porFecha.get(s.fecha) ?? 0) + s.minutos)
  let mejor = 0
  let corrida = 0
  let previa: string | null = null
  for (const f of [...porFecha.keys()].sort()) {
    if ((porFecha.get(f) ?? 0) < meta) {
      corrida = 0
      previa = f
      continue
    }
    corrida = previa && diasEntre(f, previa) === 1 && corrida > 0 ? corrida + 1 : 1
    previa = f
    mejor = Math.max(mejor, corrida)
  }
  return mejor
}

/** Reparte los minutos de una sesión entre las horas del reloj que ocupó. */
function repartir(s: SesionFoco, f: (dia: number, hora: number, minutos: number) => void) {
  let restante = s.minutos
  let t = s.inicio
  for (let i = 0; i < 50 && restante > 0.01; i++) {
    const d = new Date(t)
    const hastaHora = 60 - d.getMinutes() - d.getSeconds() / 60
    const m = Math.min(restante, hastaHora)
    f((d.getDay() + 6) % 7, d.getHours(), m)
    restante -= m
    t += m * 60_000
  }
}

/** Minutos acumulados por hora del día (0 a 23). */
export function porHora(sesiones: SesionFoco[]): number[] {
  const out = Array(24).fill(0) as number[]
  for (const s of sesiones) repartir(s, (_d, h, m) => { out[h] += m })
  return out
}

/** Minutos por día de la semana (filas, lunes primero) y hora (columnas). */
export function mapaSemanaHora(sesiones: SesionFoco[]): number[][] {
  const out = Array.from({ length: 7 }, () => Array(24).fill(0) as number[])
  for (const s of sesiones) repartir(s, (d, h, m) => { out[d][h] += m })
  return out
}

export interface Hallazgo {
  titulo: string
  texto: string
}

const NOMBRE_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const franjaDe = (h: number) => (h < 5 ? 'madrugada' : h < 12 ? 'mañana' : h < 18 ? 'tarde' : 'noche')
const prom = (l: number[]) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0)
const dec = (n: number) => n.toFixed(1).replace('.', ',')
const pad2 = (n: number) => String(n).padStart(2, '0')

/** Qué se puede decir de tus hábitos de estudio (necesita al menos 8 sesiones). */
export function patrones(sesiones: SesionFoco[], hoy: string): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  if (sesiones.length < 8) return hallazgos

  // Mejor franja de 3 horas seguidas
  const horas = porHora(sesiones)
  let mejorI = 0
  let mejorM = -1
  for (let i = 0; i <= 21; i++) {
    const m = horas[i] + horas[i + 1] + horas[i + 2]
    if (m > mejorM) {
      mejorM = m
      mejorI = i
    }
  }
  const sumaHoras = horas.reduce((a, b) => a + b, 0)
  if (mejorM > 0) {
    hallazgos.push({
      titulo: 'Tu mejor franja',
      texto: `Estudias más entre las ${pad2(mejorI)}:00 y las ${pad2(mejorI + 3)}:00: ${Math.round((mejorM / sumaHoras) * 100)} % de tu tiempo.`,
    })
  }

  // Concentración según la franja del día y según la duración
  const calificadas = sesiones.filter((s) => s.calidad !== undefined)
  if (calificadas.length >= 8) {
    const porFranja = new Map<string, number[]>()
    for (const s of calificadas) {
      const f = franjaDe(new Date(s.inicio).getHours())
      porFranja.set(f, [...(porFranja.get(f) ?? []), s.calidad as number])
    }
    const ranking = [...porFranja.entries()].filter(([, l]) => l.length >= 3).map(([f, l]) => ({ f, c: prom(l) })).sort((a, b) => b.c - a.c)
    if (ranking.length >= 2) {
      hallazgos.push({
        titulo: 'Cuándo te concentras mejor',
        texto: `En la ${ranking[0].f} calificas tu concentración con ${dec(ranking[0].c)} de 5; en la ${ranking[ranking.length - 1].f}, con ${dec(ranking[ranking.length - 1].c)}.`,
      })
    }
    const tramos: [string, (m: number) => boolean][] = [
      ['hasta 25 min', (m) => m <= 25],
      ['26 a 45 min', (m) => m > 25 && m <= 45],
      ['46 a 70 min', (m) => m > 45 && m <= 70],
      ['más de 70 min', (m) => m > 70],
    ]
    const porTramo = tramos
      .map(([nombre, ok]) => ({ nombre, l: calificadas.filter((s) => ok(s.minutos)).map((s) => s.calidad as number) }))
      .filter((t) => t.l.length >= 3)
      .map((t) => ({ nombre: t.nombre, c: prom(t.l) }))
      .sort((a, b) => b.c - a.c)
    if (porTramo.length >= 2 && porTramo[0].c - porTramo[porTramo.length - 1].c >= 0.4) {
      hallazgos.push({
        titulo: 'Duración ideal',
        texto: `Las sesiones de ${porTramo[0].nombre} te salen mejor (${dec(porTramo[0].c)} de 5) que las de ${porTramo[porTramo.length - 1].nombre} (${dec(porTramo[porTramo.length - 1].c)}).`,
      })
    }
  }

  // Distracciones por franja
  const porFranjaDistr = new Map<string, number[]>()
  for (const s of sesiones) {
    const f = franjaDe(new Date(s.inicio).getHours())
    porFranjaDistr.set(f, [...(porFranjaDistr.get(f) ?? []), s.distracciones ?? 0])
  }
  const r = [...porFranjaDistr.entries()].filter(([, l]) => l.length >= 3).map(([f, l]) => ({ f, d: prom(l) })).sort((a, b) => b.d - a.d)
  if (r.length >= 2 && r[0].d - r[r.length - 1].d >= 0.8) {
    hallazgos.push({
      titulo: 'Dónde te distraes más',
      texto: `En la ${r[0].f} anotas ${dec(r[0].d)} distracciones por sesión; en la ${r[r.length - 1].f}, ${dec(r[r.length - 1].d)}.`,
    })
  }

  // Mejor día de la semana (promedio por día calendario, últimas 8 semanas)
  const desde = sumarDiasISO(hoy, -55)
  const porDia = Array(7).fill(0) as number[]
  const veces = Array(7).fill(0) as number[]
  for (let i = 0; i < 56; i++) veces[(parsear(sumarDiasISO(desde, i)).getDay() + 6) % 7]++
  for (const s of sesiones) if (s.fecha >= desde) porDia[(parsear(s.fecha).getDay() + 6) % 7] += s.minutos
  const medias = porDia.map((m, i) => ({ i, m: m / veces[i] })).sort((a, b) => b.m - a.m)
  if (medias[0].m > 0 && medias[0].m > medias[6].m * 1.3) {
    hallazgos.push({
      titulo: 'Tu mejor día',
      texto: `Los ${NOMBRE_DIA[medias[0].i]} estudias en promedio ${Math.round(medias[0].m)} min; los ${NOMBRE_DIA[medias[6].i]}, ${Math.round(medias[6].m)} min.`,
    })
  }

  // Tendencia
  const res = resumenFoco(sesiones, hoy)
  if (res.tendencia !== null && Math.abs(res.tendencia) >= 0.1) {
    hallazgos.push({
      titulo: 'Esta semana',
      texto: res.tendencia > 0 ? `Vas ${Math.round(res.tendencia * 100)} % por encima de la semana pasada.` : `Vas ${Math.round(-res.tendencia * 100)} % por debajo de la semana pasada.`,
    })
  }
  return hallazgos
}

export function calidadPromedio(sesiones: SesionFoco[]): number | null {
  const l = sesiones.filter((s) => s.calidad !== undefined).map((s) => s.calidad as number)
  return l.length ? prom(l) : null
}

export interface FilaAmbiente {
  clave: string
  n: number
  calidad: number
  minutos: number
  distracciones: number
}

export const MIN_AMBIENTE = 3

/** Con tus sesiones calificadas: con qué fondo y con qué sonido te concentras mejor. */
export function ambienteQueFunciona(sesiones: SesionFoco[]): { calificadas: number; fondos: FilaAmbiente[]; sonidos: FilaAmbiente[]; base: number | null } {
  const cal = sesiones.filter((s) => s.calidad)
  const agrupar = (clave: (s: SesionFoco) => string | undefined): FilaAmbiente[] => {
    const m = new Map<string, SesionFoco[]>()
    for (const s of cal) {
      const c = clave(s)
      if (c) m.set(c, [...(m.get(c) ?? []), s])
    }
    return [...m.entries()]
      .map(([c, l]) => ({
        clave: c,
        n: l.length,
        calidad: prom(l.map((s) => s.calidad ?? 0)),
        minutos: prom(l.map((s) => s.minutos)),
        distracciones: prom(l.map((s) => s.distracciones ?? 0)),
      }))
      .filter((f) => f.n >= MIN_AMBIENTE)
      .sort((a, b) => b.calidad - a.calidad)
  }
  const sinFondo = cal.filter((s) => !s.fondo)
  return {
    calificadas: cal.length,
    fondos: agrupar((s) => s.fondo),
    sonidos: agrupar((s) => s.sonido),
    base: sinFondo.length >= MIN_AMBIENTE ? prom(sinFondo.map((s) => s.calidad ?? 0)) : null,
  }
}

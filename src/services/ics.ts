import type { Ramo } from '../types'
import { nombreRamo, sumarDiasISO } from './tareasPlan'
import type { EstadoCalendario, ItemCalendario } from './calendario'
import { itemsPorFecha } from './calendario'
import { diaSemanaISO } from './horario'

/** Exporta a un archivo .ics (iCalendar, RFC 5545) para llevar clases,
 *  evaluaciones y tareas al calendario del celular (Google, Apple, Outlook).
 *  Las horas van "flotantes" (sin zona): cada calendario las toma como hora
 *  local, que es lo que se espera de un horario de clases. */

const escapar = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Líneas de más de 75 octetos se parten con CRLF + espacio. */
function doblar(linea: string): string {
  const enc = new TextEncoder()
  if (enc.encode(linea).length <= 75) return linea
  const partes: string[] = []
  let actual = ''
  for (const ch of linea) {
    if (enc.encode(actual + ch).length > (partes.length === 0 ? 75 : 74)) {
      partes.push(actual)
      actual = ch
    } else actual += ch
  }
  partes.push(actual)
  return partes.join('\r\n ')
}

const sinGuiones = (iso: string) => iso.replace(/-/g, '')
const horaICS = (hhmm: string) => hhmm.replace(':', '') + '00'

function finDeClase(it: ItemCalendario, ramos: Ramo[]): string | undefined {
  const ramo = ramos.find((r) => r.id === it.ramoId)
  const dia = diaSemanaISO(it.fecha)
  return ramo?.bloques?.find((b) => b.dia === dia && b.inicio === it.hora)?.fin
}

function sumarMinutos(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const t = Math.min(23 * 60 + 59, h * 60 + m + min)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function crearICS(estado: EstadoCalendario, desde: string, hasta: string, ahora = new Date()): { texto: string; cantidad: number } {
  const todos = new Set<'clase' | 'evaluacion' | 'tarea'>(['clase', 'evaluacion', 'tarea'])
  const mapa = itemsPorFecha(estado, desde, hasta, todos)
  const sello = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lineas: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prima Lex//Calendario//ES', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Prima Lex']
  let cantidad = 0
  for (const [fecha, items] of [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    for (const it of items) {
      const ramo = nombreRamo(it.ramoId, estado.ramos)
      const prefijo = it.tipo === 'evaluacion' ? 'Evaluación: ' : it.tipo === 'tarea' ? 'Tarea: ' : ''
      const titulo = `${prefijo}${it.titulo}${ramo && it.tipo !== 'clase' ? ` (${ramo})` : ''}`
      lineas.push('BEGIN:VEVENT', `UID:${it.id}@prima-lex`, `DTSTAMP:${sello}`)
      if (it.hora) {
        const fin = it.tipo === 'clase' ? finDeClase(it, estado.ramos) ?? sumarMinutos(it.hora, 80) : sumarMinutos(it.hora, 60)
        lineas.push(`DTSTART:${sinGuiones(fecha)}T${horaICS(it.hora)}`, `DTEND:${sinGuiones(fecha)}T${horaICS(fin)}`)
      } else {
        lineas.push(`DTSTART;VALUE=DATE:${sinGuiones(fecha)}`, `DTEND;VALUE=DATE:${sinGuiones(sumarDiasISO(fecha, 1))}`)
      }
      lineas.push(`SUMMARY:${escapar(it.tipo === 'clase' && ramo ? `${ramo}: ${it.titulo}` : titulo)}`)
      if (it.detalle) lineas.push(it.tipo === 'clase' ? `LOCATION:${escapar(it.detalle)}` : `DESCRIPTION:${escapar(it.detalle)}`)
      if (it.tipo === 'evaluacion') lineas.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapar(titulo)}`, 'TRIGGER:-P1D', 'END:VALARM')
      lineas.push('END:VEVENT')
      cantidad++
    }
  }
  lineas.push('END:VCALENDAR')
  return { texto: lineas.map(doblar).join('\r\n') + '\r\n', cantidad }
}

export function descargarICS(texto: string, nombre = 'prima-lex-calendario.ics') {
  const blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

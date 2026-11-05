import type { EvaluacionModulo, Ramo } from '../types'

/** Importar fechas desde un archivo .ics (el calendario de pruebas que manda el
 *  curso, o uno exportado de Google/Apple) como evaluaciones de cada
 *  asignatura. Solo reglas: se lee el archivo y se sugiere la asignatura por su
 *  nombre o su sigla; la persona confirma antes de guardar. */

export interface EventoICS {
  titulo: string
  /** YYYY-MM-DD del primer día. */
  fecha: string
  /** Último día (incluido) si el evento dura más de uno. */
  fechaFin?: string
  descripcion?: string
}

const desescapar = (t: string) => t.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1')

function fechaDe(valor: string): string | null {
  const m = valor.match(/^(\d{4})(\d{2})(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function diaAntes(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  const f = new Date(a, m - 1, d - 1)
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

export function leerICS(texto: string): EventoICS[] {
  // líneas dobladas (RFC 5545): una línea que empieza con espacio o tab sigue a la anterior
  const lineas = texto.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const eventos: EventoICS[] = []
  let actual: Record<string, string> | null = null
  let profundidad = 0 // VALARM y otros bloques dentro del VEVENT
  for (const linea of lineas) {
    if (linea === 'BEGIN:VEVENT') {
      actual = {}
      profundidad = 0
      continue
    }
    if (!actual) continue
    if (linea.startsWith('BEGIN:')) {
      profundidad++
      continue
    }
    if (linea === 'END:VEVENT') {
      const fecha = fechaDe(actual.DTSTART ?? '')
      const titulo = desescapar(actual.SUMMARY ?? '').trim()
      if (fecha && titulo) {
        const ev: EventoICS = { titulo, fecha }
        const finExclusivo = fechaDe(actual.DTEND ?? '')
        // en un evento de día completo DTEND es el día siguiente al último
        if (finExclusivo && !/T/.test(actual.DTEND ?? '')) {
          const ultimo = diaAntes(finExclusivo)
          if (ultimo > fecha) ev.fechaFin = ultimo
        }
        const desc = desescapar(actual.DESCRIPTION ?? '').trim()
        if (desc) ev.descripcion = desc
        eventos.push(ev)
      }
      actual = null
      continue
    }
    if (linea.startsWith('END:')) {
      profundidad = Math.max(0, profundidad - 1)
      continue
    }
    if (profundidad > 0) continue
    const dosPuntos = linea.indexOf(':')
    if (dosPuntos < 0) continue
    const clave = linea.slice(0, dosPuntos).split(';')[0].toUpperCase()
    if (!(clave in actual)) actual[clave] = linea.slice(dosPuntos + 1)
  }
  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'a', 'en', 'al', 'para', 'por', 'con'])
// lo que dice qué tipo de prueba es, no de qué asignatura
const DE_PRUEBA = /^(?:sustitutiva|sustitutivo|susti|examen|examenes|ex|prueba|solemne|control|certamen|interrogacion|oral|escrito|escrita|parcial|final|recuperativa|e\d|p\d|c\d|\d+|[ivx]+|primera|segunda|convocatoria)$/

function palabras(t: string): string[] {
  return normalizar(t).split(/[^a-z0-9ñ]+/).filter((p) => p && !VACIAS.has(p))
}

function sigla(nombre: string): string {
  return palabras(nombre).map((p) => p[0]).join('')
}

const coincide = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)))

/** La asignatura que mejor calza con el título del evento, o null si no hay
 *  una clara (ninguna o empate). */
export function sugerirRamo(titulo: string, ramos: Ramo[]): string | null {
  // «derecho» está en casi todos los ramos: no sirve para distinguir (sí para la sigla)
  const consulta = palabras(titulo).filter((p) => !DE_PRUEBA.test(p) && p !== 'derecho')
  if (consulta.length === 0) return null
  let mejor: { id: string; puntaje: number } | null = null
  let empate = false
  for (const r of ramos) {
    const delRamo = palabras(r.nombre).filter((p) => p !== 'derecho')
    const codigo = r.codigoCurso ? normalizar(r.codigoCurso).replace(/\s+/g, '') : ''
    let puntaje: number
    // sigla («DCO» → Derecho Constitucional Orgánico) o código del curso
    if (consulta.length === 1 && (consulta[0] === sigla(r.nombre) || (codigo && consulta[0] === codigo))) puntaje = 2
    else {
      const enComun = consulta.filter((p) => delRamo.some((q) => coincide(p, q))).length
      if (enComun === 0) continue
      // todas las palabras del evento están en el ramo; se desempata por cuánto del ramo se cubre
      puntaje = enComun / consulta.length + (enComun / delRamo.length) * 0.01
    }
    if (puntaje < 0.5) continue
    if (!mejor || puntaje > mejor.puntaje + 1e-9) {
      mejor = { id: r.id, puntaje }
      empate = false
    } else if (Math.abs(puntaje - mejor.puntaje) < 1e-9) empate = true
  }
  return mejor && !empate ? mejor.id : null
}

/** Nombre con que se guarda: el título, y si el evento abarca dos días, el otro día posible. */
export function nombreEvaluacion(ev: EventoICS): string {
  if (!ev.fechaFin) return ev.titulo
  const dia = (iso: string) => String(Number(iso.slice(8)))
  return `${ev.titulo} (${dia(ev.fecha)} o ${dia(ev.fechaFin)})`
}

/** ¿Ya existe en la asignatura una evaluación con ese nombre y fecha? */
export function yaExiste(evaluaciones: EvaluacionModulo[], nombre: string, fecha: string): boolean {
  const n = normalizar(nombre).trim()
  return evaluaciones.some((e) => e.fecha === fecha && normalizar(e.nombre).trim() === n)
}

import type { DatosAcademicosModulo, Ramo } from '../types'
import { diaSemanaISO } from './horario'

/** Textos y cálculos de la tarjeta «Lo que sigue» y del modo clase de Hoy.
 *  Lógica pura: recibe la hora, no la lee. */

const DURACION_CLASE_POR_DEFECTO = 80

const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const deMin = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** 200 → «3 h 20 min», 45 → «45 min», 60 → «1 h». */
export function duracionLarga(min: number): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h} h` : `${h} h ${r} min`
}

/** Elige una frase de la lista de forma estable durante el día (no cambia en cada render). */
export function variante<T>(lista: T[], semilla: string): T {
  let h = 0
  for (let i = 0; i < semilla.length; i++) h = (h * 31 + semilla.charCodeAt(i)) >>> 0
  return lista[h % lista.length]
}

export interface ClaseEnCurso {
  moduloId: string
  claseId: string
  sala?: string
  hora: string
  /** HH:MM en que termina. */
  fin: string
  minutosRestantes: number
  asistio?: boolean
}

/** La clase de hoy en la que estás ahora mismo (ya empezó y no ha terminado), o null.
 *  El fin sale del bloque del horario del ramo; sin él se asumen 80 minutos. */
export function claseEnCurso(
  academico: Record<string, DatosAcademicosModulo>,
  ramos: Ramo[],
  hoy: string,
  ahora: Date
): ClaseEnCurso | null {
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes()
  const dia = diaSemanaISO(hoy)
  for (const [moduloId, d] of Object.entries(academico)) {
    for (const c of d.clases) {
      if (c.fecha !== hoy || !c.hora) continue
      const ini = aMin(c.hora)
      const bloque = ramos.find((r) => r.id === moduloId)?.bloques?.find((b) => b.dia === dia && b.inicio === c.hora)
      const fin = bloque?.fin ? aMin(bloque.fin) : ini + DURACION_CLASE_POR_DEFECTO
      // se avisa desde 5 minutos antes (ya estás llegando a la sala)
      if (minAhora >= ini - 5 && minAhora < fin) {
        return { moduloId, claseId: c.id, sala: c.sala, hora: c.hora, fin: deMin(fin), minutosRestantes: fin - minAhora, asistio: c.asistio }
      }
    }
  }
  return null
}

export interface EntradaSiguiente {
  tipo: 'clase' | 'examen'
  ramo: string
  /** Nombre de la evaluación o tema de la clase. */
  titulo: string
  fecha: string
  hora?: string
  sala?: string
  /** Días de calendario hasta la fecha (0 = hoy). */
  dias: number
}

export interface TextoSiguiente {
  titulo: string
  detalle: string
  /** Una frase corta y amable que acompaña. */
  animo: string
}

const fraseDia = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** El texto de «Lo que sigue», con la voz cercana de Prima Lex. `ahora` solo importa si es hoy. */
export function textoSiguiente(e: EntradaSiguiente, ahora: Date, semilla: string): TextoSiguiente {
  const lugar = e.sala ? ` · ${e.sala}` : ''

  if (e.tipo === 'examen') {
    const detalle = `${e.ramo}${e.dias === 0 && e.hora ? ` · ${e.hora}` : ''}`
    if (e.dias === 0) {
      return { titulo: `Hoy es ${e.titulo}`, detalle, animo: variante(['Respira hondo: ya hiciste lo que podías.', 'A confiar en lo estudiado. ¡Éxito!', 'Un último vistazo a lo esencial y a rendir.'], semilla) }
    }
    if (e.dias === 1) {
      return { titulo: `Mañana es ${e.titulo}`, detalle, animo: variante(['Último repaso liviano y a dormir bien.', 'Hoy toca repasar lo clave, no aprender todo de nuevo.'], semilla) }
    }
    if (e.dias <= 3) {
      return { titulo: `${e.titulo} en ${fraseDia(e.dias, 'día', 'días')}`, detalle, animo: variante(['Hora de apretar el repaso.', 'Un bloque de enfoque al día y llegas tranquilo.'], semilla) }
    }
    return { titulo: `${e.titulo} en ${fraseDia(e.dias, 'día', 'días')}`, detalle, animo: variante(['Todavía hay tiempo: ordénate con calma.', 'Mientras antes empieces, menos se acumula.'], semilla) }
  }

  const nombre = e.titulo && e.titulo !== e.ramo ? `${e.ramo} · ${e.titulo}` : e.ramo
  if (e.dias === 0 && e.hora) {
    const min = aMin(e.hora) - (ahora.getHours() * 60 + ahora.getMinutes())
    if (min <= 0) return { titulo: `${e.ramo} ya empezó`, detalle: `${e.hora}${lugar}`, animo: 'Todavía llegas: entra sin hacer ruido.' }
    if (min <= 30) {
      return { titulo: `${e.ramo} empieza en ${duracionLarga(min)}`, detalle: `${e.hora}${lugar}`, animo: variante(['Ve yendo para la sala.', 'Agarra tus cosas, ya casi.', 'Un último vistazo a tus apuntes en el camino.'], semilla) }
    }
    return {
      titulo: `${e.ramo} en ${duracionLarga(min)}`,
      detalle: `${e.hora}${lugar}`,
      animo: min >= 90 ? variante(['Da tiempo de repasar un poco antes.', 'Buen momento para un bloque de enfoque.', 'Aprovecha: un repaso corto y llegas afiladx.'], semilla) : 'Justo para repasar 10 minutos.',
    }
  }
  if (e.dias === 1) {
    return { titulo: `Mañana: ${e.ramo}`, detalle: `${e.hora ?? ''}${lugar}`.replace(/^ · /, '') || nombre, animo: variante(['Deja lo que necesites listo hoy.', 'Si alcanzas, repasa lo de la última clase.'], semilla) }
  }
  return { titulo: `${e.ramo} en ${fraseDia(e.dias, 'día', 'días')}`, detalle: `${e.hora ?? ''}${lugar}`.replace(/^ · /, '') || nombre, animo: 'Tu próxima clase.' }
}

/** Texto del modo clase: qué decir mientras estás en la sala. */
export function textoEnClase(c: { ramo: string; minutosRestantes: number; sala?: string }, semilla: string): { titulo: string; detalle: string; animo: string } {
  return {
    titulo: `Estás en clase de ${c.ramo}`,
    detalle: `${c.sala ? `${c.sala} · ` : ''}termina en ${duracionLarga(c.minutosRestantes)}`,
    animo: variante(['Anota lo que te llame la atención; después lo ordenas.', 'Con una idea por línea basta, el resto va después.', 'Si el profe dice «esto cae», márcalo.'], semilla),
  }
}

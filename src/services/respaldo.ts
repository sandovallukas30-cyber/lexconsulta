import { useStore } from '../store/useStore'
import { silenciarAvisoGuardado, useEstadoGuardado, vaciarEscrituraPendiente } from '../store/almacenamiento'
import type {
  ApunteModulo,
  Coleccion,
  DatosAcademicosModulo,
  EstadoTarjetaRepaso,
  MapaMental,
  ProgresoModulo,
  Ramo,
} from '../types'

/** Respaldo de los datos PROPIOS del usuario (lo académico y lo de estudio)
 *  en un archivo JSON. Todo vive en localStorage: si el usuario borra los
 *  datos del navegador o cambia de equipo, sin esto lo pierde todo.
 *
 *  Lo que NO va: códigos, jurisprudencia de fábrica, historial de consultas
 *  a la IA, preferencias visuales -- no son "trabajo" del usuario o se
 *  regeneran solos. */

export const VERSION_RESPALDO = 1
const MARCA_APP = 'prima-lex'

export interface DatosRespaldo {
  ramos: Ramo[]
  academicoModulos: Record<string, DatosAcademicosModulo>
  progresoModulos: Record<string, ProgresoModulo>
  diasActividadEstudio: string[]
  colecciones: Coleccion[]
  subrayados: Record<string, string[]>
  mapasMentales: MapaMental[]
  /** Progreso del repaso de tarjetas de apuntes (desde persist v30). */
  repasoApuntes: Record<string, EstadoTarjetaRepaso>
  /** Hasta dónde se leyó cada apunte (desde persist v31). */
  posicionLectura: Record<string, { ratio: number; fecha: number }>
  /** Progreso de las preguntas del repaso unificado (desde persist v33). */
  repasoPreguntas: Record<string, EstadoTarjetaRepaso>
}

export interface ArchivoRespaldo {
  app: typeof MARCA_APP
  version: number
  fecha: string
  datos: DatosRespaldo
}

export type ModoImportacion = 'reemplazar' | 'combinar'

export interface ResumenRespaldo {
  ramos: number
  modulosConDatos: number
  apuntes: number
  clases: number
  evaluaciones: number
  casos: number
  colecciones: number
  mapasMentales: number
  subrayados: number
  diasActividad: number
}

// ---------------------------------------------------------------------------
// Exportar
// ---------------------------------------------------------------------------

export function crearRespaldo(): ArchivoRespaldo {
  const s = useStore.getState()
  return {
    app: MARCA_APP,
    version: VERSION_RESPALDO,
    fecha: new Date().toISOString(),
    datos: {
      ramos: s.ramos,
      academicoModulos: s.academicoModulos,
      progresoModulos: s.progresoModulos,
      diasActividadEstudio: s.diasActividadEstudio,
      colecciones: s.colecciones,
      subrayados: s.subrayados,
      mapasMentales: s.mapasMentales,
      repasoApuntes: s.repasoApuntes,
      posicionLectura: s.posicionLectura,
      repasoPreguntas: s.repasoPreguntas,
    },
  }
}

export function nombreArchivoRespaldo(fecha = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `prima-lex-respaldo-${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}.json`
}

export function descargarRespaldo(): ResumenRespaldo {
  const respaldo = crearRespaldo()
  const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivoRespaldo()
  document.body.appendChild(a)
  a.click()
  a.remove()
  // revocar en el siguiente tick: algunos navegadores cancelan la descarga
  // si la URL se revoca en el mismo ciclo del click
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  registrarRespaldo()
  return resumirRespaldo(respaldo.datos)
}

// ---------------------------------------------------------------------------
// Validar (el archivo viene de afuera: no confiar en nada)
// ---------------------------------------------------------------------------

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const esTexto = (v: unknown): v is string => typeof v === 'string'
const conId = (v: unknown): boolean => esObjeto(v) && esTexto(v.id) && v.id.length > 0

function listaValida(v: unknown, item: (x: unknown) => boolean): boolean {
  return Array.isArray(v) && v.every(item)
}

const ramoValido = (r: unknown) => conId(r) && esTexto((r as Ramo).nombre) && Array.isArray((r as Ramo).modulosVinculados)
const apunteValido = (a: unknown) => conId(a) && esTexto((a as ApunteModulo).titulo) && esTexto((a as ApunteModulo).contenido)
const coleccionValida = (c: unknown) => conId(c) && esTexto((c as Coleccion).titulo) && Array.isArray((c as Coleccion).articulos)
const mapaValido = (m: unknown) =>
  conId(m) && esTexto((m as MapaMental).titulo) && Array.isArray((m as MapaMental).nodos) && Array.isArray((m as MapaMental).conexiones)

function datosAcademicosValidos(d: unknown): boolean {
  if (!esObjeto(d)) return false
  const listas = ['clases', 'evaluaciones', 'textos', 'apuntes'] as const
  if (!listas.every((k) => listaValida(d[k], conId))) return false
  if (!(d.apuntes as unknown[]).every(apunteValido)) return false
  // cuadernos/briefs llegaron después (v25/v26 del store): pueden faltar
  if (d.cuadernos !== undefined && !listaValida(d.cuadernos, conId)) return false
  if (d.briefs !== undefined && !listaValida(d.briefs, conId)) return false
  return true
}

export type ResultadoValidacion =
  | { ok: true; respaldo: ArchivoRespaldo; resumen: ResumenRespaldo }
  | { ok: false; error: string }

export function validarRespaldo(texto: string): ResultadoValidacion {
  let crudo: unknown
  try {
    crudo = JSON.parse(texto.replace(/^\uFEFF/, ''))
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' }
  }
  if (!esObjeto(crudo) || crudo.app !== MARCA_APP || !esObjeto(crudo.datos)) {
    return { ok: false, error: 'El archivo no es un respaldo de Prima Lex.' }
  }
  if (typeof crudo.version !== 'number' || crudo.version > VERSION_RESPALDO) {
    return { ok: false, error: 'El respaldo es de una versión más nueva de Prima Lex. Actualiza la página e intenta de nuevo.' }
  }
  const d = crudo.datos
  const problemas: string[] = []
  if (d.ramos !== undefined && !listaValida(d.ramos, ramoValido)) problemas.push('ramos')
  if (d.academicoModulos !== undefined && !(esObjeto(d.academicoModulos) && Object.values(d.academicoModulos).every(datosAcademicosValidos)))
    problemas.push('apuntes y datos de los módulos')
  if (d.progresoModulos !== undefined && !esObjeto(d.progresoModulos)) problemas.push('progreso')
  if (d.diasActividadEstudio !== undefined && !listaValida(d.diasActividadEstudio, (x) => esTexto(x) && /^\d{4}-\d{2}-\d{2}$/.test(x)))
    problemas.push('días de estudio')
  if (d.colecciones !== undefined && !listaValida(d.colecciones, coleccionValida)) problemas.push('colecciones')
  if (d.subrayados !== undefined && !(esObjeto(d.subrayados) && Object.values(d.subrayados).every((v) => listaValida(v, esTexto))))
    problemas.push('subrayados')
  if (d.mapasMentales !== undefined && !listaValida(d.mapasMentales, mapaValido)) problemas.push('mapas mentales')
  if (d.repasoApuntes !== undefined && !(esObjeto(d.repasoApuntes) && Object.values(d.repasoApuntes).every((e) => esObjeto(e) && typeof e.caja === 'number' && typeof e.proximo === 'number')))
    problemas.push('repaso de tarjetas')
  if (d.repasoPreguntas !== undefined && !(esObjeto(d.repasoPreguntas) && Object.values(d.repasoPreguntas).every((e) => esObjeto(e) && typeof e.caja === 'number' && typeof e.proximo === 'number')))
    problemas.push('repaso de preguntas')
  if (problemas.length > 0) {
    return { ok: false, error: `El respaldo está dañado o incompleto (${problemas.join(', ')}). No se importó nada.` }
  }

  const academicos: Record<string, DatosAcademicosModulo> = {}
  for (const [id, datos] of Object.entries((d.academicoModulos ?? {}) as Record<string, Partial<DatosAcademicosModulo>>)) {
    academicos[id] = {
      clases: datos.clases ?? [],
      evaluaciones: datos.evaluaciones ?? [],
      textos: datos.textos ?? [],
      apuntes: datos.apuntes ?? [],
      cuadernos: datos.cuadernos ?? [],
      briefs: datos.briefs ?? [],
    }
  }
  const datos: DatosRespaldo = {
    ramos: (d.ramos as Ramo[]) ?? [],
    academicoModulos: academicos,
    progresoModulos: (d.progresoModulos as Record<string, ProgresoModulo>) ?? {},
    diasActividadEstudio: (d.diasActividadEstudio as string[]) ?? [],
    colecciones: (d.colecciones as Coleccion[]) ?? [],
    subrayados: (d.subrayados as Record<string, string[]>) ?? {},
    mapasMentales: (d.mapasMentales as MapaMental[]) ?? [],
    repasoApuntes: (d.repasoApuntes as Record<string, EstadoTarjetaRepaso>) ?? {},
    posicionLectura: esObjeto(d.posicionLectura) ? (d.posicionLectura as Record<string, { ratio: number; fecha: number }>) : {},
    repasoPreguntas: (d.repasoPreguntas as Record<string, EstadoTarjetaRepaso>) ?? {},
  }
  const respaldo: ArchivoRespaldo = { app: MARCA_APP, version: crudo.version, fecha: esTexto(crudo.fecha) ? crudo.fecha : '', datos }
  return { ok: true, respaldo, resumen: resumirRespaldo(datos) }
}

export function resumirRespaldo(d: DatosRespaldo): ResumenRespaldo {
  const modulos = Object.values(d.academicoModulos)
  const suma = (f: (m: DatosAcademicosModulo) => number) => modulos.reduce((n, m) => n + f(m), 0)
  return {
    ramos: d.ramos.length,
    modulosConDatos: modulos.filter((m) => m.apuntes.length + m.clases.length + m.evaluaciones.length + m.textos.length + m.briefs.length > 0).length,
    apuntes: suma((m) => m.apuntes.length),
    clases: suma((m) => m.clases.length),
    evaluaciones: suma((m) => m.evaluaciones.length),
    casos: suma((m) => m.briefs.length),
    colecciones: d.colecciones.length,
    mapasMentales: d.mapasMentales.length,
    subrayados: Object.values(d.subrayados).reduce((n, l) => n + l.length, 0),
    diasActividad: d.diasActividadEstudio.length,
  }
}

export function resumenActual(): ResumenRespaldo {
  return resumirRespaldo(crearRespaldo().datos)
}

// ---------------------------------------------------------------------------
// Aplicar
// ---------------------------------------------------------------------------

/** Une dos listas por id: se conservan TODOS los elementos locales tal cual
 *  y se agregan del respaldo solo los que no existen localmente -- combinar
 *  nunca pisa algo que el usuario ya tiene en este equipo. */
function unirPorId<T extends { id: string }>(locales: T[], entrantes: T[]): T[] {
  const ids = new Set(locales.map((x) => x.id))
  return [...locales, ...entrantes.filter((x) => !ids.has(x.id))]
}

function combinarAcademicos(
  locales: Record<string, DatosAcademicosModulo>,
  entrantes: Record<string, DatosAcademicosModulo>
): Record<string, DatosAcademicosModulo> {
  const out: Record<string, DatosAcademicosModulo> = { ...locales }
  for (const [id, e] of Object.entries(entrantes)) {
    const l = out[id]
    out[id] = l
      ? {
          clases: unirPorId(l.clases, e.clases),
          evaluaciones: unirPorId(l.evaluaciones, e.evaluaciones),
          textos: unirPorId(l.textos, e.textos),
          apuntes: unirPorId(l.apuntes, e.apuntes),
          cuadernos: unirPorId(l.cuadernos ?? [], e.cuadernos),
          briefs: unirPorId(l.briefs ?? [], e.briefs),
        }
      : e
  }
  return out
}

const CLAVE_ULTIMO_RESPALDO = 'prima-lex-ultimo-respaldo'

/** Fecha (epoch ms) de la última descarga de respaldo en este navegador. */
export function fechaUltimoRespaldo(): number | null {
  try {
    const n = Number(localStorage.getItem(CLAVE_ULTIMO_RESPALDO))
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function registrarRespaldo() {
  try {
    localStorage.setItem(CLAVE_ULTIMO_RESPALDO, String(Date.now()))
  } catch {
    // sin almacenamiento: solo se pierde el recordatorio
  }
}

/** Aplica el respaldo. Si la escritura en localStorage falla (cuota llena),
 *  restaura lo que había en memoria y lanza: así "no cambió nada" es verdad
 *  y no queda una versión en pantalla que se perdería al recargar. */
export function aplicarRespaldo(respaldo: ArchivoRespaldo, modo: ModoImportacion) {
  const s = useStore.getState()
  const previo = {
    ramos: s.ramos,
    academicoModulos: s.academicoModulos,
    progresoModulos: s.progresoModulos,
    diasActividadEstudio: s.diasActividadEstudio,
    colecciones: s.colecciones,
    subrayados: s.subrayados,
    mapasMentales: s.mapasMentales,
    repasoApuntes: s.repasoApuntes,
    posicionLectura: s.posicionLectura,
    repasoPreguntas: s.repasoPreguntas,
  }
  useEstadoGuardado.setState({ error: null })
  silenciarAvisoGuardado()
  aplicarSinVerificar(respaldo, modo)
  // la escritura normal va agrupada (400 ms): acá hay que saber YA si cupo
  if (vaciarEscrituraPendiente()) {
    useStore.setState(previo)
    vaciarEscrituraPendiente()
    throw new Error('almacenamiento lleno')
  }
}

function aplicarSinVerificar(respaldo: ArchivoRespaldo, modo: ModoImportacion) {
  const d = respaldo.datos
  if (modo === 'reemplazar') {
    useStore.setState({
      ramos: d.ramos,
      academicoModulos: d.academicoModulos,
      progresoModulos: d.progresoModulos,
      diasActividadEstudio: d.diasActividadEstudio,
      colecciones: d.colecciones,
      subrayados: d.subrayados,
      mapasMentales: d.mapasMentales,
      repasoApuntes: d.repasoApuntes,
      posicionLectura: d.posicionLectura,
      repasoPreguntas: d.repasoPreguntas,
      moduloActivoId: null,
      coleccionActivaId: null,
      mapaMentalActivoId: null,
    })
    return
  }
  const s = useStore.getState()
  const subrayados: Record<string, string[]> = { ...s.subrayados }
  for (const [clave, frases] of Object.entries(d.subrayados)) {
    subrayados[clave] = Array.from(new Set([...(subrayados[clave] ?? []), ...frases]))
  }
  const progresoModulos = { ...d.progresoModulos, ...s.progresoModulos }
  useStore.setState({
    ramos: unirPorId(s.ramos, d.ramos),
    academicoModulos: combinarAcademicos(s.academicoModulos, d.academicoModulos),
    progresoModulos,
    diasActividadEstudio: Array.from(new Set([...s.diasActividadEstudio, ...d.diasActividadEstudio])).sort(),
    colecciones: unirPorId(s.colecciones, d.colecciones),
    subrayados,
    mapasMentales: unirPorId(s.mapasMentales, d.mapasMentales),
    repasoApuntes: { ...d.repasoApuntes, ...s.repasoApuntes },
    posicionLectura: { ...d.posicionLectura, ...s.posicionLectura },
    repasoPreguntas: { ...d.repasoPreguntas, ...s.repasoPreguntas },
  })
}

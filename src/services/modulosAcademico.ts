import type { Coleccion, CodigoTipo, DatosAcademicosModulo, EvaluacionModulo, Modulo, Ramo } from '../types'
import { MODULOS } from '../data/modulos'

const VERDE = 'var(--accent-base)'
export const ICONO_RAMO_DEFECTO = 'ti-school'

/** input[type=date] entrega "YYYY-MM-DD"; parsearlo con `new Date(string)` lo
 *  interpreta como UTC medianoche y puede correr un día en la fecha local
 *  según el huso horario -- se arma con el constructor (año, mes, día) local,
 *  igual que en services/plazos.ts. */
function parsearFechaLocal(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

function inicioDeHoy(): Date {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return hoy
}

/** Días de calendario entre hoy y `fechaIso` (negativo si ya pasó). */
export function diasHasta(fechaIso: string): number {
  const fecha = parsearFechaLocal(fechaIso)
  fecha.setHours(0, 0, 0, 0)
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((fecha.getTime() - inicioDeHoy().getTime()) / msPorDia)
}

export function formatearCountdown(dias: number): string {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias === -1) return 'Ayer'
  if (dias > 1) return `En ${dias} días`
  return `Hace ${-dias} días`
}

export type Urgencia = 'vencido' | 'urgente' | 'proximo' | 'normal'

/** Categoría de urgencia según cuántos días faltan -- el componente decide
 *  el color exacto (y el tema claro/oscuro), esto solo clasifica. */
export function urgenciaDe(dias: number): Urgencia {
  if (dias < 0) return 'vencido'
  if (dias <= 2) return 'urgente'
  if (dias <= 7) return 'proximo'
  return 'normal'
}

/** Suma de ponderaciones ya cargadas, excluyendo (si corresponde) la
 *  evaluación que se está editando -- para validar contra el 100% sin
 *  contarla dos veces. */
export function calcularPonderacionTotal(evaluaciones: EvaluacionModulo[], excluirId?: string): number {
  return evaluaciones
    .filter((e) => e.id !== excluirId)
    .reduce((suma, e) => suma + e.ponderacion, 0)
}

export interface EventoProximo {
  tipo: 'clase' | 'examen'
  moduloId: string
  fecha: string
  titulo: string
  detalle?: string
}

/** Junta clases pendientes y evaluaciones sin nota de TODOS los módulos,
 *  ordenadas por fecha -- para responder "¿qué tengo esta semana en mis
 *  ramos?" sin tener que entrar módulo por módulo. */
export function obtenerProximosEventos(academicoModulos: Record<string, DatosAcademicosModulo>): EventoProximo[] {
  const eventos: EventoProximo[] = []
  for (const [moduloId, datos] of Object.entries(academicoModulos)) {
    for (const c of datos.clases) {
      if (!c.completada) eventos.push({ tipo: 'clase', moduloId, fecha: c.fecha, titulo: c.tema })
    }
    for (const e of datos.evaluaciones) {
      if (e.nota === null) eventos.push({ tipo: 'examen', moduloId, fecha: e.fecha, titulo: e.nombre, detalle: `${e.ponderacion}% de la nota` })
    }
  }
  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/** Colecciones que tocan un código dado -- una Colección no declara a qué
 *  Módulo pertenece (es una entidad libre, no académica-por-módulo), así que
 *  se infiere por si alguno de sus artículos es de ese código. Recibe el
 *  código ya resuelto (no un moduloId): así funciona igual para un Módulo
 *  fijo del catálogo que para un Ramo propio vinculado a uno (ver
 *  moduloDesdeRamo) -- antes buscaba el módulo por id en MODULOS, que
 *  siempre fallaba para un Ramo (su id no está en ese catálogo). */
export function coleccionesDeModulo(colecciones: Coleccion[], codigoRelacionado: CodigoTipo | null): Coleccion[] {
  if (!codigoRelacionado) return []
  return colecciones.filter((c) => c.articulos.some((a) => a.codigo === codigoRelacionado))
}

/** Arma un Modulo "virtual" a partir de un Ramo propio, para poder abrir
 *  ModuloDetalle con él sin duplicar sus ~1300 líneas de pestañas
 *  (Clases/Exámenes/Textos/Apuntes/Casos): ese componente solo lee
 *  id/nombre/descripcion/icono/color/codigoRelacionado de su prop `modulo`
 *  (nunca `orden` ni `temasIncluidos`, que quedan en 0 acá porque no
 *  aplican). El id del Ramo se reutiliza tal cual como id del módulo
 *  virtual: es lo que hace que academicoModulos[ramo.id] (clases,
 *  evaluaciones, apuntes...) funcione para un Ramo exactamente igual que
 *  para un Módulo del catálogo, sin ningún cambio en useStore. Si el Ramo
 *  está vinculado a uno o más Módulos del catálogo, toma el código del
 *  primero para habilitar el botón "Ver código" y las colecciones
 *  relacionadas -- un Ramo sin ningún vínculo (como uno que no calza con
 *  ningún área existente) simplemente no los tiene, igual que pasaría con
 *  un Módulo sin codigoRelacionado. */
export function moduloDesdeRamo(ramo: Ramo, modulosVinculados: Modulo[]): Modulo {
  const primero = modulosVinculados[0]
  const detalle = [ramo.profesor, ramo.horario].filter(Boolean).join(' · ')
  return {
    id: ramo.id,
    nombre: ramo.nombre,
    descripcion: detalle || ramo.semestre || 'Ramo propio',
    icono: ramo.icono ?? ICONO_RAMO_DEFECTO,
    color: ramo.color ?? VERDE,
    orden: 0,
    temasIncluidos: 0,
    codigoRelacionado: primero?.codigoRelacionado ?? null,
  }
}

export interface VinculoArticulo {
  tipo: 'apunte' | 'texto' | 'caso'
  moduloId: string
  titulo: string
}

/** Apuntes, Textos y Casos de CUALQUIER módulo que se refieran a este
 *  artículo puntual -- el código en sí determina el (único) módulo
 *  candidato, así que solo se busca ahí, no en todos los módulos. */
export function buscarVinculosArticulo(
  academicoModulos: Record<string, DatosAcademicosModulo>,
  codigo: CodigoTipo,
  articulo: string
): VinculoArticulo[] {
  const modulo = MODULOS.find((m) => m.codigoRelacionado === codigo)
  if (!modulo) return []
  const datos = academicoModulos[modulo.id]
  if (!datos) return []
  const vinculos: VinculoArticulo[] = []
  for (const a of datos.apuntes) {
    if (a.articuloRelacionado === articulo) vinculos.push({ tipo: 'apunte', moduloId: modulo.id, titulo: a.titulo })
  }
  for (const t of datos.textos) {
    if (t.articuloRelacionado === articulo) vinculos.push({ tipo: 'texto', moduloId: modulo.id, titulo: t.titulo })
  }
  for (const b of datos.briefs) {
    if (b.articuloRelacionado === articulo) vinculos.push({ tipo: 'caso', moduloId: modulo.id, titulo: b.caratula })
  }
  return vinculos
}

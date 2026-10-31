import { notasArticuloValidas, unirNotasArticulo, type NotaArticulo } from './notasArticulo'
import { sanearColeccionPropia } from './compartirColeccion'
import { useStore } from '../store/useStore'
import { useEnfoque } from '../store/useEnfoque'
import type { SesionFoco } from './enfoque'
import { silenciarAvisoGuardado, useEstadoGuardado, vaciarEscrituraPendiente } from '../store/almacenamiento'
import type {
  ApunteModulo,
  Coleccion,
  DatosAcademicosModulo,
  EstadoTarjetaRepaso,
  ConexionMapaMental,
  MapaMental,
  NodoMapaMental,
  ProgresoModulo,
  Ramo,
  SesionClase,
  TareaPlan,
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
  /** Notas propias sobre artículos de los códigos. Faltan en respaldos antiguos. */
  notasArticulo: Record<string, NotaArticulo>
  /** Tareas del plan personal (persist v35). Faltan en respaldos antiguos. */
  tareasPlan: TareaPlan[]
  /** Sesiones del temporizador Enfoque. Faltan en respaldos antiguos. */
  sesionesFoco: SesionFoco[]
}

export interface ArchivoRespaldo {
  app: typeof MARCA_APP
  version: number
  fecha: string
  datos: DatosRespaldo
}

/** `nube`: como combinar, pero entre dos versiones del mismo elemento gana la
 *  más reciente (tareas, apuntes, colecciones, mapas, repaso). Lo usa la
 *  sincronización de la cuenta. */
export type ModoImportacion = 'reemplazar' | 'combinar' | 'nube'

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
  tareas: number
  sesionesFoco: number
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
      notasArticulo: s.notasArticulo,
      tareasPlan: s.tareasPlan,
      sesionesFoco: useEnfoque.getState().sesiones,
    },
  }
}

/** Deja los datos de este dispositivo como los de una instalación nueva. */
export function vaciarDatosLocales() {
  const ini = useStore.getInitialState()
  const base = crearRespaldo()
  aplicarRespaldo(
    {
      ...base,
      datos: {
        ramos: ini.ramos,
        academicoModulos: ini.academicoModulos,
        progresoModulos: ini.progresoModulos,
        diasActividadEstudio: ini.diasActividadEstudio,
        colecciones: ini.colecciones,
        subrayados: ini.subrayados,
        mapasMentales: ini.mapasMentales,
        repasoApuntes: ini.repasoApuntes,
        posicionLectura: ini.posicionLectura,
        notasArticulo: ini.notasArticulo,
        tareasPlan: ini.tareasPlan,
        sesionesFoco: useEnfoque.getInitialState().sesiones,
      },
    },
    'reemplazar'
  )
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
// Colecciones y mapas se revisan pieza por pieza (ver sanearColeccionPropia y sanearMapa): un artículo de un código
// inexistente, un estado raro o un nodo sin posición rompían la sección entera, y como el respaldo también es la copia
// de la nube, el error volvía en cada dispositivo. Lo dañado se descarta y lo demás se conserva.
const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const FORMAS = ['rectangulo', 'ovalo', 'ninguna', 'nube', 'rombo'] // nube y rombo: antiguas, el mapa las migra al abrirse
const TAMANOS = ['titulo', 'subtitulo', 'texto']

function sanearNodo(v: unknown): NodoMapaMental | null {
  if (!conId(v)) return null
  const n = v as Record<string, unknown>
  const pos = esObjeto(n.posicion) && finito(n.posicion.x) && finito(n.posicion.y) ? { x: n.posicion.x, y: n.posicion.y } : null
  if (!pos) return null
  return {
    id: (n.id as string).slice(0, 64),
    posicion: pos,
    texto: esTexto(n.texto) ? n.texto.slice(0, 20000) : '',
    forma: (FORMAS.includes(n.forma as string) ? n.forma : 'rectangulo') as NodoMapaMental['forma'],
    tamanoTexto: (TAMANOS.includes(n.tamanoTexto as string) ? n.tamanoTexto : 'texto') as NodoMapaMental['tamanoTexto'],
    ...(esTexto(n.color) && n.color.length <= 40 ? { color: n.color } : {}),
    ...(finito(n.ancho) && n.ancho > 0 ? { ancho: n.ancho } : {}),
    ...(finito(n.alto) && n.alto > 0 ? { alto: n.alto } : {}),
    ...(esTexto(n.nota) && n.nota ? { nota: n.nota.slice(0, 2000) } : {}),
    ...(esTexto(n.articulo) && n.articulo ? { articulo: n.articulo.slice(0, 120) } : {}),
  }
}

export function sanearMapa(v: unknown, ahora = Date.now()): MapaMental | null {
  if (!conId(v)) return null
  const m = v as Record<string, unknown>
  if (!esTexto(m.titulo) || !Array.isArray(m.nodos)) return null
  const nodos: NodoMapaMental[] = []
  const ids = new Set<string>()
  for (const crudo of m.nodos.slice(0, 5000)) {
    const n = sanearNodo(crudo)
    if (n && !ids.has(n.id)) {
      ids.add(n.id)
      nodos.push(n)
    }
  }
  const conexiones: ConexionMapaMental[] = []
  for (const crudo of Array.isArray(m.conexiones) ? m.conexiones.slice(0, 10000) : []) {
    if (!conId(crudo)) continue
    const c = crudo as Record<string, unknown>
    if (!esTexto(c.desde) || !esTexto(c.hasta) || !ids.has(c.desde) || !ids.has(c.hasta)) continue
    conexiones.push({
      id: (c.id as string).slice(0, 64),
      desde: c.desde,
      hasta: c.hasta,
      ...(esTexto(c.desdeHandle) ? { desdeHandle: c.desdeHandle.slice(0, 20) } : {}),
      ...(esTexto(c.hastaHandle) ? { hastaHandle: c.hastaHandle.slice(0, 20) } : {}),
      ...(esTexto(c.etiqueta) && c.etiqueta ? { etiqueta: c.etiqueta.slice(0, 200) } : {}),
    })
  }
  return {
    id: (m.id as string).slice(0, 64),
    titulo: m.titulo.slice(0, 200),
    nodos,
    conexiones,
    fechaCreacion: finito(m.fechaCreacion) ? m.fechaCreacion : ahora,
    fechaModificacion: finito(m.fechaModificacion) ? m.fechaModificacion : ahora,
    ...(esTexto(m.moduloId) && m.moduloId ? { moduloId: m.moduloId.slice(0, 64) } : {}),
  }
}

/** Saca de la lista lo que no se pudo reconstruir. */
function sanearLista<T>(v: unknown, sanear: (x: unknown) => T | null): T[] {
  return Array.isArray(v) ? v.map((x) => sanear(x)).filter((x): x is T => x !== null) : []
}

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
  if (d.ramos !== undefined && !listaValida(d.ramos, ramoValido)) problemas.push('asignaturas')
  if (d.academicoModulos !== undefined && !(esObjeto(d.academicoModulos) && Object.values(d.academicoModulos).every(datosAcademicosValidos)))
    problemas.push('apuntes y datos de los módulos')
  if (d.progresoModulos !== undefined && !esObjeto(d.progresoModulos)) problemas.push('progreso')
  if (d.diasActividadEstudio !== undefined && !listaValida(d.diasActividadEstudio, (x) => esTexto(x) && /^\d{4}-\d{2}-\d{2}$/.test(x)))
    problemas.push('días de estudio')
  if (d.colecciones !== undefined && !Array.isArray(d.colecciones)) problemas.push('colecciones')
  if (d.subrayados !== undefined && !(esObjeto(d.subrayados) && Object.values(d.subrayados).every((v) => listaValida(v, esTexto))))
    problemas.push('subrayados')
  if (d.mapasMentales !== undefined && !Array.isArray(d.mapasMentales)) problemas.push('mapas mentales')
  if (d.repasoApuntes !== undefined && !(esObjeto(d.repasoApuntes) && Object.values(d.repasoApuntes).every((e) => esObjeto(e) && typeof e.caja === 'number' && typeof e.proximo === 'number')))
    problemas.push('repaso de tarjetas')
  if (d.tareasPlan !== undefined && !listaValida(d.tareasPlan, (t) => conId(t) && esTexto((t as TareaPlan).titulo))) problemas.push('tareas')
  if (d.sesionesFoco !== undefined && !listaValida(d.sesionesFoco, (x) => conId(x) && typeof (x as SesionFoco).minutos === 'number'))
    problemas.push('sesiones de enfoque')
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
    colecciones: sanearLista(d.colecciones, (c) => sanearColeccionPropia(c)),
    subrayados: (d.subrayados as Record<string, string[]>) ?? {},
    mapasMentales: sanearLista(d.mapasMentales, (m) => sanearMapa(m)),
    repasoApuntes: (d.repasoApuntes as Record<string, EstadoTarjetaRepaso>) ?? {},
    posicionLectura: esObjeto(d.posicionLectura) ? (d.posicionLectura as Record<string, { ratio: number; fecha: number }>) : {},
    notasArticulo: notasArticuloValidas(d.notasArticulo),
    tareasPlan: (d.tareasPlan as TareaPlan[]) ?? [],
    sesionesFoco: (d.sesionesFoco as SesionFoco[]) ?? [],
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
    tareas: d.tareasPlan.length,
    sesionesFoco: d.sesionesFoco.length,
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

/** Cuándo se tocó por última vez un elemento (0 si no guarda fecha). */
const tocado = (x: object): number => {
  const o = x as { actualizada?: number; fechaModificacion?: number }
  return o.actualizada ?? o.fechaModificacion ?? 0
}

/** Como unirPorId, pero si el elemento está en los dos lados se queda con el
 *  tocado más recientemente (empate: el local). */
export function unirPorIdReciente<T extends { id: string }>(locales: T[], entrantes: T[]): T[] {
  const entrantePorId = new Map(entrantes.map((x) => [x.id, x]))
  const ids = new Set(locales.map((x) => x.id))
  const base = locales.map((l) => {
    const e = entrantePorId.get(l.id)
    return e && tocado(e) > tocado(l) ? e : l
  })
  return [...base, ...entrantes.filter((x) => !ids.has(x.id))]
}

/** Clases: como unirPorIdReciente, pero si ninguna de las dos copias guarda fecha (datos de antes de que existiera
 *  `actualizada`) se queda con la que tiene asistencia registrada: así lo que marcaste en un dispositivo no se pierde. */
function unirClases(locales: SesionClase[], entrantes: SesionClase[]): SesionClase[] {
  const entrantePorId = new Map(entrantes.map((x) => [x.id, x]))
  const ids = new Set(locales.map((x) => x.id))
  const base = locales.map((l) => {
    const e = entrantePorId.get(l.id)
    if (!e) return l
    if (tocado(e) !== tocado(l)) return tocado(e) > tocado(l) ? e : l
    return l.asistio === undefined && e.asistio !== undefined ? e : l
  })
  return [...base, ...entrantes.filter((x) => !ids.has(x.id))]
}

export function combinarAcademicos(
  locales: Record<string, DatosAcademicosModulo>,
  entrantes: Record<string, DatosAcademicosModulo>,
  reciente = false
): Record<string, DatosAcademicosModulo> {
  const unirNotas = reciente ? unirPorIdReciente : unirPorId
  const out: Record<string, DatosAcademicosModulo> = { ...locales }
  for (const [id, e] of Object.entries(entrantes)) {
    const l = out[id]
    out[id] = l
      ? {
          clases: reciente ? unirClases(l.clases, e.clases) : unirPorId(l.clases, e.clases),
          evaluaciones: unirNotas(l.evaluaciones, e.evaluaciones),
          textos: unirNotas(l.textos, e.textos),
          apuntes: unirNotas(l.apuntes, e.apuntes),
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
    notasArticulo: s.notasArticulo,
    tareasPlan: s.tareasPlan,
  }
  const sesionesPrevias = useEnfoque.getState().sesiones
  useEstadoGuardado.setState({ error: null })
  silenciarAvisoGuardado()
  aplicarSinVerificar(respaldo, modo)
  // la escritura normal va agrupada (400 ms): acá hay que saber YA si cupo
  if (vaciarEscrituraPendiente()) {
    useStore.setState(previo)
    useEnfoque.setState({ sesiones: sesionesPrevias })
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
      notasArticulo: d.notasArticulo,
      tareasPlan: d.tareasPlan,
      moduloActivoId: null,
      coleccionActivaId: null,
      mapaMentalActivoId: null,
    })
    useEnfoque.setState({ sesiones: d.sesionesFoco })
    return
  }
  const s = useStore.getState()
  const subrayados: Record<string, string[]> = { ...s.subrayados }
  for (const [clave, frases] of Object.entries(d.subrayados)) {
    subrayados[clave] = Array.from(new Set([...(subrayados[clave] ?? []), ...frases]))
  }
  const progresoModulos = { ...d.progresoModulos, ...s.progresoModulos }
  const nube = modo === 'nube'
  const unir = nube ? unirPorIdReciente : unirPorId
  // repaso y posición de lectura: en la nube gana lo más reciente de cada tarjeta/apunte
  const repasoApuntes = { ...d.repasoApuntes, ...s.repasoApuntes }
  const posicionLectura = { ...d.posicionLectura, ...s.posicionLectura }
  // notas de artículos: en la nube gana la más reciente; al importar un archivo, lo que ya tienes aquí
  const notasArticulo = nube ? unirNotasArticulo(s.notasArticulo, d.notasArticulo) : { ...d.notasArticulo, ...s.notasArticulo }
  if (nube) {
    for (const [id, e] of Object.entries(d.repasoApuntes)) {
      const l = s.repasoApuntes[id]
      if (l && e.ultimo > l.ultimo) repasoApuntes[id] = e
    }
    for (const [id, e] of Object.entries(d.posicionLectura)) {
      const l = s.posicionLectura[id]
      if (l && e.fecha > l.fecha) posicionLectura[id] = e
    }
  }
  useStore.setState({
    ramos: unirPorId(s.ramos, d.ramos),
    academicoModulos: combinarAcademicos(s.academicoModulos, d.academicoModulos, nube),
    progresoModulos,
    diasActividadEstudio: Array.from(new Set([...s.diasActividadEstudio, ...d.diasActividadEstudio])).sort(),
    colecciones: unir(s.colecciones, d.colecciones),
    subrayados,
    mapasMentales: unir(s.mapasMentales, d.mapasMentales),
    repasoApuntes,
    posicionLectura,
    notasArticulo,
    tareasPlan: unir(s.tareasPlan, d.tareasPlan),
  })
  useEnfoque.setState((e) => ({ sesiones: unirPorId(e.sesiones, d.sesionesFoco).sort((x, y) => y.inicio - x.inicio) }))
}

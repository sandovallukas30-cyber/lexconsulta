import { MODULOS } from '../data/modulos'
import { PREGUNTAS_DESTELLO } from '../data/destelloPreguntas'
import { nombreCortoMetadata } from '../data/codigosMetadata'
import { useStore } from '../store/useStore'
import { cargarCodigo, obtenerCodigo } from './codigos'
import { citaArticulo } from './citas'
import { tarjetasDe } from './tarjetasApunte'
import type { ApunteModulo, Coleccion, CodigoTipo, DatosAcademicosModulo, EstadoTarjetaRepaso, Ramo } from '../types'

/** Repaso unificado. Tres cosas se repasan en Prima Lex -- las tarjetas de
 *  los apuntes, los artículos guardados en colecciones y las preguntas de
 *  práctica -- y antes cada una tenía su propia pantalla, su propio estado y
 *  su propia cola. Acá se unen en UNA cola diaria con un solo criterio de
 *  prioridad; cada fuente conserva su estado donde ya vivía (sin migrar
 *  datos) y `registrarRespuesta` lo escribe donde corresponde. */

export type OrigenRepaso = 'apunte' | 'articulo' | 'pregunta'

export interface ItemRepaso {
  /** Único entre orígenes: el id de la tarjeta, "art:civ:Art. 1545" o el de la pregunta. */
  id: string
  origen: OrigenRepaso
  /** Ramo o módulo al que pertenece (para filtrar la cola); null = sin ramo. */
  ramoId: string | null
  frente: string
  /** Vacío en los artículos hasta `completarTextos` (hay que bajar el código). */
  reverso: string
  /** Línea de contexto sobre la tarjeta: "Término · Sección", "Artículo · Código Civil". */
  etiqueta: string
  caja: number
  fallos: number
  /** Cuándo vuelve a tocar; null = nunca repasado (toca ya). */
  proximo: number | null
  ultimo: number | null
  apunteId?: string
  codigo?: CodigoTipo
  articulo?: string
  /** Colecciones donde está guardado el artículo (el estado vive en cada una). */
  colecciones?: string[]
  opciones?: string[]
  correcta?: number
  explicacion?: string
}

export interface FuentesRepaso {
  academicoModulos: Record<string, DatosAcademicosModulo>
  ramos: Ramo[]
  colecciones: Coleccion[]
  repasoApuntes: Record<string, EstadoTarjetaRepaso>
  repasoPreguntas: Record<string, EstadoTarjetaRepaso>
}

/** Preguntas nuevas o vencidas por día: el banco es corto y mezclarlo todo
 *  en una sola sesión lo agotaría en dos días. */
export const PREGUNTAS_POR_DIA = 3
/** Sesiones cortas: 80 tarjetas seguidas cansan y se abandona a la mitad. */
export const TARJETAS_POR_SESION = 20
const SEG_POR_TARJETA = 30
const SEG_POR_PREGUNTA = 45

function esPendiente(i: ItemRepaso, ahora: number): boolean {
  return i.proximo === null || i.proximo <= ahora
}

// ---------------------------------------------------------------------------
// Ramo de cada cosa
// ---------------------------------------------------------------------------

/** Ramo (propio) o módulo del catálogo cuyo código es `codigo`. Los
 *  artículos y las preguntas no declaran ramo: se infiere por su código. */
export function ramoDeCodigo(codigo: CodigoTipo, ramos: Ramo[]): string | null {
  for (const r of ramos) {
    if (r.modulosVinculados.some((id) => MODULOS.find((m) => m.id === id)?.codigoRelacionado === codigo)) return r.id
  }
  return MODULOS.find((m) => m.codigoRelacionado === codigo)?.id ?? null
}

export function nombreRamo(id: string | null, ramos: Ramo[]): string {
  if (!id) return 'Sin ramo'
  return MODULOS.find((m) => m.id === id)?.nombre ?? ramos.find((r) => r.id === id)?.nombre ?? 'Sin ramo'
}

// ---------------------------------------------------------------------------
// Items por fuente
// ---------------------------------------------------------------------------

export function itemsDeApunte(apunte: ApunteModulo, ramoId: string | null, estados: Record<string, EstadoTarjetaRepaso>): ItemRepaso[] {
  return tarjetasDe(apunte).map((t) => {
    const e = estados[t.id]
    return {
      id: t.id,
      origen: 'apunte' as const,
      ramoId,
      frente: t.frente,
      reverso: t.reverso,
      etiqueta: [t.tipo === 'idea' ? 'Idea clave' : 'Término', apunte.titulo].join(' · '),
      caja: e?.caja ?? 0,
      fallos: e?.fallos ?? 0,
      proximo: e?.proximo ?? null,
      ultimo: e?.ultimo ?? null,
      apunteId: apunte.id,
    }
  })
}

function itemsDeArticulos(f: FuentesRepaso): ItemRepaso[] {
  const porClave = new Map<string, ItemRepaso>()
  for (const c of f.colecciones) {
    for (const a of c.articulos) {
      const clave = `art:${a.codigo}:${a.articulo}`
      const proximo = a.proximoRepaso ?? null
      const previo = porClave.get(clave)
      if (!previo) {
        porClave.set(clave, {
          id: clave,
          origen: 'articulo',
          ramoId: ramoDeCodigo(a.codigo, f.ramos),
          frente: citaArticulo(a.codigo, a.articulo),
          reverso: a.nota ? `\n\nTu nota: ${a.nota}` : '',
          etiqueta: `Artículo · ${nombreCortoMetadata(a.codigo)}`,
          caja: a.caja ?? 0,
          fallos: 0,
          proximo,
          ultimo: null,
          codigo: a.codigo,
          articulo: a.articulo,
          colecciones: [c.id],
        })
      } else {
        // el mismo artículo en otra colección: se repasa UNA vez y se anota en todas
        previo.colecciones!.push(c.id)
        if ((proximo ?? 0) < (previo.proximo ?? 0)) {
          previo.proximo = proximo
          previo.caja = a.caja ?? 0
        }
        if (a.nota && !previo.reverso.includes(a.nota)) previo.reverso += `${previo.reverso ? '\n' : '\n\n'}Tu nota: ${a.nota}`
      }
    }
  }
  return [...porClave.values()]
}

function itemsDePreguntas(f: FuentesRepaso): ItemRepaso[] {
  return PREGUNTAS_DESTELLO.map((p) => {
    const e = f.repasoPreguntas[p.id]
    return {
      id: p.id,
      origen: 'pregunta' as const,
      ramoId: ramoDeCodigo(p.codigo, f.ramos),
      frente: p.pregunta,
      reverso: p.explicacion,
      etiqueta: `Pregunta · ${p.articulo}`,
      caja: e?.caja ?? 0,
      fallos: e?.fallos ?? 0,
      proximo: e?.proximo ?? null,
      ultimo: e?.ultimo ?? null,
      codigo: p.codigo,
      opciones: p.opciones,
      correcta: p.respuestaCorrecta,
      explicacion: p.explicacion,
    }
  })
}

export function listarItems(f: FuentesRepaso): ItemRepaso[] {
  const items: ItemRepaso[] = []
  for (const [moduloId, datos] of Object.entries(f.academicoModulos)) {
    for (const a of datos.apuntes) items.push(...itemsDeApunte(a, moduloId, f.repasoApuntes))
  }
  items.push(...itemsDeArticulos(f), ...itemsDePreguntas(f))
  return items
}

// ---------------------------------------------------------------------------
// Cola
// ---------------------------------------------------------------------------

/** Más fallada primero, luego la de caja más baja, luego la más atrasada. */
function porPrioridad(a: ItemRepaso, b: ItemRepaso): number {
  return b.fallos - a.fallos || a.caja - b.caja || (a.proximo ?? 0) - (b.proximo ?? 0)
}

function esDeHoy(ts: number | null, ahora: number): boolean {
  if (ts === null) return false
  const a = new Date(ahora)
  const b = new Date(ts)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export interface OpcionesCola {
  /** Solo este ramo (id de ramo o de módulo); undefined = todos. */
  ramoId?: string | null
  /** Modo examen: todo lo del ramo, vencido o no (lo vencido primero). */
  intensivo?: boolean
  limite?: number
  ahora?: number
}

/** Cola de hoy: lo pendiente de las tres fuentes, mezclado de a una por
 *  origen (apunte, artículo, pregunta, apunte…) para que una sesión no sea
 *  veinte tarjetas seguidas del mismo apunte. */
export function construirCola(items: ItemRepaso[], opts: OpcionesCola = {}): ItemRepaso[] {
  const ahora = opts.ahora ?? Date.now()
  const limite = opts.limite ?? Infinity
  let base = opts.ramoId === undefined ? items : items.filter((i) => i.ramoId === opts.ramoId)

  const porOrigen: Record<OrigenRepaso, ItemRepaso[]> = { apunte: [], articulo: [], pregunta: [] }
  if (opts.intensivo) {
    // pendientes primero, después el resto; y las preguntas sin cuota
    base = [...base].sort((a, b) => Number(esPendiente(b, ahora)) - Number(esPendiente(a, ahora)) || porPrioridad(a, b))
    for (const i of base) porOrigen[i.origen].push(i)
  } else {
    for (const i of [...base].sort(porPrioridad)) if (esPendiente(i, ahora)) porOrigen[i.origen].push(i)
    const hechasHoy = items.filter((i) => i.origen === 'pregunta' && esDeHoy(i.ultimo, ahora)).length
    porOrigen.pregunta = porOrigen.pregunta.slice(0, Math.max(0, PREGUNTAS_POR_DIA - hechasHoy))
  }

  const cola: ItemRepaso[] = []
  const orden: OrigenRepaso[] = ['apunte', 'articulo', 'pregunta']
  const idx: Record<OrigenRepaso, number> = { apunte: 0, articulo: 0, pregunta: 0 }
  while (cola.length < limite) {
    let agregado = false
    for (const o of orden) {
      if (cola.length >= limite) break
      const item = porOrigen[o][idx[o]]
      if (item) {
        cola.push(item)
        idx[o]++
        agregado = true
      }
    }
    if (!agregado) break
  }
  return cola
}

export interface ResumenRepaso {
  total: number
  porOrigen: Record<OrigenRepaso, number>
  /** Pendientes por ramo (clave "" = sin ramo). */
  porRamo: Record<string, number>
  minutos: number
  /** Cuántas cosas repasables existen en total (aunque no toquen hoy). */
  existentes: number
}

export function resumirCola(items: ItemRepaso[], ahora = Date.now()): ResumenRepaso {
  const cola = construirCola(items, { ahora })
  const porOrigen: Record<OrigenRepaso, number> = { apunte: 0, articulo: 0, pregunta: 0 }
  const porRamo: Record<string, number> = {}
  let seg = 0
  for (const i of cola) {
    porOrigen[i.origen]++
    porRamo[i.ramoId ?? ''] = (porRamo[i.ramoId ?? ''] ?? 0) + 1
    seg += i.origen === 'pregunta' ? SEG_POR_PREGUNTA : SEG_POR_TARJETA
  }
  return { total: cola.length, porOrigen, porRamo, minutos: cola.length === 0 ? 0 : Math.max(1, Math.round(seg / 60)), existentes: items.length }
}

/** Las fuentes del repaso, tomadas del estado del store. */
export function fuentesDe(s: ReturnType<typeof useStore.getState>): FuentesRepaso {
  return {
    academicoModulos: s.academicoModulos,
    ramos: s.ramos,
    colecciones: s.colecciones,
    repasoApuntes: s.repasoApuntes,
    repasoPreguntas: s.repasoPreguntas,
  }
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

/** Baja los códigos de los artículos de la cola y completa el reverso. */
export async function completarTextos(items: ItemRepaso[]): Promise<ItemRepaso[]> {
  const codigos = [...new Set(items.filter((i) => i.origen === 'articulo' && i.codigo).map((i) => i.codigo!))]
  await Promise.all(codigos.map((c) => cargarCodigo(c).catch(() => null)))
  return items.map((i) => {
    if (i.origen !== 'articulo' || !i.codigo || !i.articulo) return i
    const texto = obtenerCodigo(i.codigo)?.articulos.find((a) => a.a === i.articulo)?.t
    return { ...i, reverso: (texto ?? '(No se pudo cargar el texto de este artículo.)') + i.reverso }
  })
}

/** Lo que sigue tocando AHORA (con el estado ya actualizado por las
 *  respuestas de la sesión): cuántas faltan y el próximo lote, con textos. */
export async function pendientesAhora(opts: OpcionesCola & { lote: number }): Promise<{ total: number; lote: ItemRepaso[] }> {
  const items = listarItems(fuentesDe(useStore.getState()))
  const cola = construirCola(items, { ...opts, limite: undefined })
  return { total: cola.length, lote: await completarTextos(cola.slice(0, opts.lote)) }
}

export function registrarRespuesta(item: ItemRepaso, resultado: 'sabia' | 'no_sabia') {
  const s = useStore.getState()
  if (item.origen === 'apunte') s.registrarRepasoTarjeta(item.id, resultado)
  else if (item.origen === 'pregunta') s.registrarRepasoPregunta(item.id, resultado)
  else if (item.codigo && item.articulo) {
    for (const c of item.colecciones ?? []) s.registrarRepaso(c, { codigo: item.codigo, articulo: item.articulo }, resultado)
  }
}


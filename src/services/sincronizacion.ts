import type { SupabaseClient } from '@supabase/supabase-js'
import { aplicarRespaldo, crearRespaldo, validarRespaldo, type ArchivoRespaldo } from './respaldo'

/** Sincronización con la cuenta: el respaldo completo viaja a una fila por
 *  usuario (`datos_usuario`, clave `respaldo`). Al sincronizar se baja lo que
 *  cambió en otro dispositivo, se une con lo local (gana lo tocado más
 *  recientemente) y se sube el resultado.
 *
 *  Límite conocido: no hay «lápidas» de borrado. Si borras algo en un
 *  dispositivo y otro aún lo tiene, puede volver a aparecer. */

const CLAVE = 'respaldo'
const LS_DISPOSITIVO = 'prima-lex-dispositivo'
const LS_ESTADO = 'prima-lex-sync'

export interface EstadoSync {
  /** `actualizado` de la fila de la nube que ya se aplicó aquí. */
  versionNube: string | null
  /** Huella de lo último que subió este dispositivo. */
  huellaSubida: string | null
  /** epoch ms de la última sincronización correcta. */
  ultimaSync: number | null
}

export interface FilaNube {
  actualizado: string
  dispositivo: string
}

/** Hash corto y estable de lo que hay en el respaldo (sin la fecha de creación). */
export function huella(archivo: ArchivoRespaldo): string {
  const texto = JSON.stringify(archivo.datos)
  let h = 5381
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0
  return `${(h >>> 0).toString(36)}:${texto.length}`
}

/** Qué hacer: bajar lo de la nube (otro dispositivo la actualizó) y/o subir lo local. */
export function decidir(
  nube: FilaNube | null,
  estado: EstadoSync,
  dispositivo: string,
  huellaActual: string
): { bajar: boolean; subir: boolean } {
  const bajar = nube !== null && nube.actualizado !== estado.versionNube && (nube.dispositivo !== dispositivo || estado.versionNube === null)
  // tras bajar y unir, lo local cambia casi siempre: se sube si difiere de lo último subido
  const subir = nube === null || estado.huellaSubida !== huellaActual || bajar
  return { bajar, subir }
}

export function idDispositivo(): string {
  try {
    let id = localStorage.getItem(LS_DISPOSITIVO)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(LS_DISPOSITIVO, id)
    }
    return id
  } catch {
    return 'sin-almacenamiento'
  }
}

export function leerEstado(userId: string): EstadoSync {
  try {
    const crudo = JSON.parse(localStorage.getItem(`${LS_ESTADO}:${userId}`) ?? '{}') as Partial<EstadoSync>
    return { versionNube: crudo.versionNube ?? null, huellaSubida: crudo.huellaSubida ?? null, ultimaSync: crudo.ultimaSync ?? null }
  } catch {
    return { versionNube: null, huellaSubida: null, ultimaSync: null }
  }
}

export function guardarEstado(userId: string, e: EstadoSync) {
  try {
    localStorage.setItem(`${LS_ESTADO}:${userId}`, JSON.stringify(e))
  } catch {
    /* sin almacenamiento: se repetirá la comparación */
  }
}

export function olvidarEstado(userId: string) {
  try {
    localStorage.removeItem(`${LS_ESTADO}:${userId}`)
  } catch {
    /* nada */
  }
}

export type ResultadoSync = 'subio' | 'bajo' | 'igual'

/** Una vuelta completa: bajar si corresponde, unir, subir si corresponde. Lanza si algo falla. */
export async function sincronizar(cliente: SupabaseClient, userId: string): Promise<{ resultado: ResultadoSync; fecha: number }> {
  const dispositivo = idDispositivo()
  const estado = leerEstado(userId)

  const { data: fila, error } = await cliente
    .from('datos_usuario')
    .select('contenido, actualizado, dispositivo')
    .eq('user_id', userId)
    .eq('clave', CLAVE)
    .maybeSingle()
  if (error) throw new Error(error.message)

  const nube: FilaNube | null = fila ? { actualizado: fila.actualizado as string, dispositivo: fila.dispositivo as string } : null
  const huellaAntes = huella(crearRespaldo())
  const d = decidir(nube, estado, dispositivo, huellaAntes)

  let bajo = false
  if (d.bajar && fila) {
    const v = validarRespaldo(JSON.stringify(fila.contenido))
    if (!v.ok) throw new Error(`La copia de la nube no es válida: ${v.error}`)
    aplicarRespaldo(v.respaldo, 'nube')
    bajo = true
  }

  const actual = crearRespaldo()
  const huellaDespues = huella(actual)
  // tras bajar, aunque lo local no cambie, hay que registrar la versión vista
  const hayQueSubir = nube === null || estado.huellaSubida !== huellaDespues
  let versionNube = nube?.actualizado ?? null
  let subio = false
  if (hayQueSubir) {
    const ahora = new Date().toISOString()
    const { data, error: errSubida } = await cliente
      .from('datos_usuario')
      .upsert({ user_id: userId, clave: CLAVE, contenido: actual, actualizado: ahora, dispositivo }, { onConflict: 'user_id,clave' })
      .select('actualizado')
      .single()
    if (errSubida) throw new Error(errSubida.message)
    versionNube = (data?.actualizado as string | undefined) ?? ahora
    subio = true
  }

  const fecha = Date.now()
  guardarEstado(userId, { versionNube, huellaSubida: subio ? huellaDespues : estado.huellaSubida ?? huellaDespues, ultimaSync: fecha })
  return { resultado: subio ? 'subio' : bajo ? 'bajo' : 'igual', fecha }
}

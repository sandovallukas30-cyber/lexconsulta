/** Archivos que tú adjuntas a un texto de la biblioteca (un PDF, un Word…): se guardan solo en ESTE dispositivo
 *  (IndexedDB), no en el respaldo ni en la sincronización de la cuenta, porque pesan mucho. En otro equipo el texto
 *  aparece con su título y autor, y puedes adjuntar el archivo de nuevo. */

const BD = 'prima-lex-archivos'
const ALMACEN = 'archivos'

/** Tope por archivo: un PDF de lectura rara vez pasa de unas decenas de MB. */
export const MAX_BYTES_ARCHIVO = 60 * 1024 * 1024

export function formatoTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0).replace('.', ',')} MB`
}

export const esPdf = (nombre: string, tipo?: string): boolean => tipo === 'application/pdf' || /\.pdf$/i.test(nombre)

/** Por qué no se puede adjuntar este archivo, o null si sirve. */
export function problemaArchivo(archivo: { name: string; size: number }): string | null {
  if (archivo.size === 0) return 'El archivo está vacío.'
  if (archivo.size > MAX_BYTES_ARCHIVO) return `El archivo pesa ${formatoTamano(archivo.size)}; el máximo es ${formatoTamano(MAX_BYTES_ARCHIVO)}.`
  return null
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(BD, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

async function operar<T>(modo: IDBTransactionMode, f: (a: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir()
  return new Promise((res, rej) => {
    const t = bd.transaction(ALMACEN, modo)
    const r = f(t.objectStore(ALMACEN))
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
    t.onabort = () => rej(t.error ?? new Error('No se pudo guardar el archivo.'))
    t.oncomplete = () => bd.close()
  })
}

export async function guardarArchivo(id: string, archivo: Blob): Promise<void> {
  try {
    await operar('readwrite', (a) => a.put(archivo, id))
  } catch {
    throw new Error('No se pudo guardar el archivo: puede que el dispositivo no tenga espacio.')
  }
}

export async function leerArchivo(id: string): Promise<Blob | null> {
  try {
    return ((await operar<Blob | undefined>('readonly', (a) => a.get(id) as IDBRequest<Blob | undefined>)) as Blob | undefined) ?? null
  } catch {
    return null
  }
}

export async function quitarArchivo(id: string): Promise<void> {
  try {
    await operar('readwrite', (a) => a.delete(id))
  } catch {
    /* sin almacenamiento: no hay nada que quitar */
  }
}

export async function idsGuardados(): Promise<string[]> {
  try {
    return (await operar<IDBValidKey[]>('readonly', (a) => a.getAllKeys())).map(String)
  } catch {
    return []
  }
}

/** Borra los archivos que ya ningún texto usa (por ejemplo, de textos eliminados). */
export async function limpiarArchivosHuerfanos(usados: Set<string>): Promise<void> {
  for (const id of await idsGuardados()) if (!usados.has(id)) await quitarArchivo(id)
}

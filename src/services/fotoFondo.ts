/** La foto de fondo propia se guarda solo en este dispositivo (IndexedDB), reducida para que no pese. */
const BD = "prima-lex-fondo-foto";
const ALMACEN = "fotos";
const CLAVE = "fondo";

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, f: (a: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir();
  return new Promise((res, rej) => {
    const t = bd.transaction(ALMACEN, modo);
    const r = f(t.objectStore(ALMACEN));
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    t.oncomplete = () => bd.close();
  });
}

/** Reduce la imagen a un máximo de 1600 px de ancho y la guarda como JPEG. */
export async function guardarFoto(archivo: File): Promise<void> {
  const bmp = await createImageBitmap(archivo);
  const k = Math.min(1, 1600 / bmp.width);
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo leer la imagen."))), "image/jpeg", 0.85));
  await operar("readwrite", (a) => a.put(blob, CLAVE));
}

export async function leerFoto(): Promise<string | null> {
  try {
    const b = await operar<Blob | undefined>("readonly", (a) => a.get(CLAVE) as IDBRequest<Blob | undefined>);
    return b ? URL.createObjectURL(b) : null;
  } catch {
    return null;
  }
}

export async function quitarFoto(): Promise<void> {
  try { await operar("readwrite", (a) => a.delete(CLAVE)); } catch { /* sin almacenamiento */ }
}

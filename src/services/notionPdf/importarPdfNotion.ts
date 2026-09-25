import type { RespuestaPdf } from './tiposPdf'

export interface ResultadoPdf {
  titulo: string | null
  md: string
  avisos: string[]
}

const LIMITE_BYTES = 30 * 1024 * 1024
const TIEMPO_MAXIMO_MS = 3 * 60 * 1000

let worker: Worker | null = null

function obtenerWorker(): Worker {
  if (!worker) worker = new Worker(new URL('./notionPdfWorker.ts', import.meta.url), { type: 'module' })
  return worker
}

function descartarWorker() {
  worker?.terminate()
  worker = null
}

/** Convierte un PDF exportado desde Notion a la sintaxis de Apuntes. Corre en
 *  un Web Worker (Pyodide + PyMuPDF, ver convertir_notion.py): la primera vez
 *  baja ~30 MB del CDN, después queda en la caché del navegador. */
export function convertirPdfNotion(archivo: File, alEstado: (texto: string) => void): Promise<ResultadoPdf> {
  if (archivo.size > LIMITE_BYTES) return Promise.reject(new Error('El PDF pesa más de 30 MB; es demasiado para un apunte.'))
  return new Promise((resolver, rechazar) => {
    const w = obtenerWorker()
    const cierre = window.setTimeout(() => {
      descartarWorker()
      rechazar(new Error('La conversión tardó demasiado y se canceló. Probá con un PDF más corto.'))
    }, TIEMPO_MAXIMO_MS)
    const terminar = () => {
      window.clearTimeout(cierre)
      w.onmessage = null
      w.onerror = null
    }
    w.onmessage = (e: MessageEvent<RespuestaPdf>) => {
      const m = e.data
      if (m.t === 'estado') alEstado(m.texto)
      else if (m.t === 'progreso') alEstado(`Convirtiendo… página ${m.pagina} de ${m.total}`)
      else if (m.t === 'listo') {
        terminar()
        resolver({ titulo: m.titulo, md: m.md, avisos: m.avisos })
      } else {
        terminar()
        descartarWorker()
        rechazar(new Error(m.mensaje))
      }
    }
    w.onerror = () => {
      terminar()
      descartarWorker()
      rechazar(new Error('No se pudo cargar el conversor de PDF. Revisá tu conexión a internet (la primera vez descarga el lector).'))
    }
    archivo
      .arrayBuffer()
      .then((pdf) => w.postMessage({ pdf }, [pdf]))
      .catch((err) => {
        terminar()
        rechazar(err instanceof Error ? err : new Error(String(err)))
      })
  })
}

import fuentePython from './convertir_notion.py?raw'
import type { PeticionPdf, RespuestaPdf } from './tiposPdf'

// Todo se pina a una versión exacta: el conversor depende de cómo PyMuPDF
// nombra las fuentes del PDF de Notion, y esto ejecuta código descargado.
const PYODIDE_VERSION = '0.29.5'
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
const WHEEL_PYMUPDF =
  'https://files.pythonhosted.org/packages/58/8c/d897dcd32a25b58186c968b15ce4324ca029e9d96460de12325314e390be/pymupdf-1.28.2-cp313-abi3-pyemscripten_2025_0_wasm32.whl'
const WHEEL_PYMUPDF_SHA256 = '2e1b574c0fd2cb238021033fd3c0f9c4388816638df064e4bfb56d9d81736dc8'

interface PyodideMin {
  FS: { writeFile: (ruta: string, datos: string | Uint8Array) => void }
  globals: { set: (nombre: string, valor: unknown) => void }
  unpackArchive: (datos: ArrayBuffer, formato: string) => void
  runPythonAsync: (codigo: string) => Promise<{ toJs: (opciones: unknown) => unknown; destroy?: () => void }>
}

const contexto = self as unknown as { postMessage: (m: RespuestaPdf) => void; onmessage: ((e: MessageEvent<PeticionPdf>) => void) | null }
const enviar = (m: RespuestaPdf) => contexto.postMessage(m)

async function sha256Hex(datos: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', datos)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

let preparado: Promise<PyodideMin> | null = null

function preparar(): Promise<PyodideMin> {
  if (!preparado) {
    preparado = (async () => {
      enviar({ t: 'estado', texto: 'Preparando el conversor (solo la primera vez, ~15 s)…' })
      const modulo = await import(/* @vite-ignore */ `${PYODIDE_URL}pyodide.mjs`)
      const py = (await modulo.loadPyodide({ indexURL: PYODIDE_URL })) as PyodideMin
      enviar({ t: 'estado', texto: 'Descargando el lector de PDF…' })
      const rueda = await (await fetch(WHEEL_PYMUPDF)).arrayBuffer()
      if ((await sha256Hex(rueda)) !== WHEEL_PYMUPDF_SHA256) throw new Error('El lector de PDF descargado no coincide con el esperado; se canceló por seguridad.')
      py.unpackArchive(rueda, 'wheel')
      py.FS.writeFile('/home/pyodide/convertir_notion.py', fuentePython)
      return py
    })().catch((e) => {
      preparado = null
      throw e
    })
  }
  return preparado
}

contexto.onmessage = async (e: MessageEvent<PeticionPdf>) => {
  try {
    const py = await preparar()
    enviar({ t: 'estado', texto: 'Leyendo el PDF…' })
    py.FS.writeFile('/entrada.pdf', new Uint8Array(e.data.pdf))
    py.globals.set('progreso_js', (pagina: number, total: number) => enviar({ t: 'progreso', pagina, total }))
    const resultado = await py.runPythonAsync(`
import convertir_notion
convertir_notion.convertir('/entrada.pdf', '', (), lambda p, t: progreso_js(p, t))
`)
    const datos = resultado.toJs({ dict_converter: Object.fromEntries }) as { titulo: string | null; md: string; avisos: string[] }
    resultado.destroy?.()
    enviar({ t: 'listo', titulo: datos.titulo ?? null, md: datos.md, avisos: [...datos.avisos] })
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err)
    const ilegible = /FileDataError|cannot open|not a PDF|EmptyFileError|password|encrypted/i.test(detalle)
    const ultimaLinea = detalle.split('\n').filter(Boolean).slice(-1)[0] ?? detalle
    enviar({ t: 'error', mensaje: ilegible ? 'No se pudo leer el PDF (¿está dañado o protegido con contraseña?).' : ultimaLinea })
  }
}

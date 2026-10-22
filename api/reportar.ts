import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Recibe avisos técnicos anónimos de la app (errores y velocidad de carga) y
 *  los deja en el registro de Vercel (`[reporte] {...}`), que se puede leer
 *  con `vercel logs` o desde el panel. No guarda nada en una base de datos y
 *  no recibe nombre, correo ni apuntes: el cliente ya filtra el contenido y
 *  aquí se vuelve a acotar por si llega algo de más. */

const MAX_BYTES = 2048
const POR_MINUTO = 30
const visitas = new Map<string, { n: number; hasta: number }>()

const num = (v: unknown, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v * 1000) / 1000 : undefined
const txt = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v ? v.slice(0, max) : undefined)
const uno = <T extends string>(v: unknown, validos: readonly T[]): T | undefined => (validos.includes(v as T) ? (v as T) : undefined)

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // solo desde la propia app
  const origen = req.headers.origin
  const host = req.headers.host
  if (origen && host) {
    let hostOrigen = ''
    try {
      hostOrigen = new URL(origen).host
    } catch {
      /* Origin: null o inválido: no es la propia app */
    }
    if (hostOrigen !== host) return res.status(403).end()
  }

  // freno básico por IP (en memoria; se reinicia con la instancia)
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'desconocida'
  const ahora = Date.now()
  const cuenta = visitas.get(ip)
  if (!cuenta || ahora > cuenta.hasta) visitas.set(ip, { n: 1, hasta: ahora + 60_000 })
  else if (++cuenta.n > POR_MINUTO) return res.status(429).end()
  if (visitas.size > 5000) for (const [k, v] of visitas) if (ahora > v.hasta) visitas.delete(k)

  const crudo = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  if (crudo.length > MAX_BYTES) return res.status(413).end()
  let d: Record<string, unknown>
  try {
    d = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>)
  } catch {
    return res.status(400).end()
  }
  if (!d || typeof d !== 'object') return res.status(400).end()

  const tipo = uno(d.tipo, ['error', 'rechazo', 'vitales'] as const)
  if (!tipo) return res.status(400).end()

  const reporte = {
    tipo,
    version: txt(d.version, 40),
    ruta: txt(d.ruta, 80),
    vista: txt(d.vista, 40),
    pantalla: uno(d.pantalla, ['movil', 'tablet', 'escritorio'] as const),
    instalada: typeof d.instalada === 'boolean' ? d.instalada : undefined,
    conexion: uno(d.conexion, ['slow-2g', '2g', '3g', '4g'] as const),
    mensaje: txt(d.mensaje, 200),
    archivo: txt(d.archivo, 120),
    lcp: num(d.lcp, 120_000),
    cls: num(d.cls, 100),
    inp: num(d.inp, 120_000),
    fcp: num(d.fcp, 120_000),
    ttfb: num(d.ttfb, 120_000),
  }
  console.log('[reporte]', JSON.stringify(reporte))
  return res.status(204).end()
}

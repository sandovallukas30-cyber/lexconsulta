import type { VercelRequest, VercelResponse } from './_tipos'
import { sanearUso } from './_catalogoUso'

/** Recibe las ESTADÍSTICAS DE USO anónimas de la app (qué pantallas se usan, cuánto tiempo y qué funciones se tocan) y las
 *  suma en contadores diarios de la base (tabla `uso_diario`, ver docs/supabase/uso.sql). No recibe ni guarda nombre, correo,
 *  apuntes ni ningún identificador: solo «esta función se usó N veces ese día».
 *
 *  Apagado por defecto: si faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no hace nada (responde 204 y descarta el envío).
 *  La clave service_role vive SOLO aquí, en el servidor; nunca va al navegador. */

const MAX_BYTES = 4096
const POR_MINUTO = 20
const visitas = new Map<string, { n: number; hasta: number }>()

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  // freno básico por IP (en memoria; la IP no se guarda en ningún lado)
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'desconocida'
  const ahora = Date.now()
  const cuenta = visitas.get(ip)
  if (!cuenta || ahora > cuenta.hasta) visitas.set(ip, { n: 1, hasta: ahora + 60_000 })
  else if (++cuenta.n > POR_MINUTO) return res.status(429).end()
  if (visitas.size > 5000) for (const [k, v] of visitas) if (ahora > v.hasta) visitas.delete(k)

  const crudo = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  if (crudo.length > MAX_BYTES) return res.status(413).end()
  let cuerpo: unknown
  try {
    cuerpo = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).end()
  }
  const envio = sanearUso(cuerpo)
  if (!envio) return res.status(400).end()

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !clave) return res.status(204).end() // apagado: nada que guardar

  try {
    const r = await fetch(`${url}/rest/v1/rpc/registrar_uso`, {
      method: 'POST',
      headers: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_dispositivo: envio.d, p_nueva: envio.nueva, p_sesion: envio.ses, p_eventos: envio.e, p_segundos: envio.t }),
      signal: AbortSignal.timeout(4000),
    })
    if (!r.ok) console.log('[uso] la base respondió', r.status)
  } catch (e) {
    console.log('[uso] no se pudo guardar:', e instanceof Error ? e.name : 'error')
  }
  // siempre 204: al navegador no le sirve (ni debe saber) si se guardó o no
  return res.status(204).end()
}

/** Avisos técnicos ANÓNIMOS a nuestro propio servidor (/api/reportar): errores
 *  de la app y velocidad de carga (Core Web Vitals) en dispositivos reales.
 *  Solo en producción. No lleva nombre, correo, apuntes ni identificador de
 *  persona; los mensajes de error se limpian antes de salir (ver `limpiar`).
 *  Declarado en la Política de privacidad (sección 7). */

const MAX_ERRORES = 5

export function limpiar(texto: string, max = 200): string {
  return texto
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[correo]') // correos
    .replace(/https?:\/\/[^\s)'"]+/g, (u) => {
      try {
        const x = new URL(u)
        return x.origin + x.pathname // sin ?consulta ni #hash
      } catch {
        return '[url]'
      }
    })
    .replace(/\b\d{7,}\b/g, '[n]') // números largos (RUT, teléfonos)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export function tipoPantalla(ancho: number): 'movil' | 'tablet' | 'escritorio' {
  return ancho < 700 ? 'movil' : ancho < 1100 ? 'tablet' : 'escritorio'
}

function contexto(obtenerVista: () => string | undefined) {
  const conexion = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType
  return {
    version: typeof __VERSION_APP__ === 'string' ? __VERSION_APP__ : undefined,
    ruta: location.pathname.slice(0, 80),
    vista: obtenerVista(),
    pantalla: tipoPantalla(window.innerWidth),
    instalada: window.matchMedia('(display-mode: standalone)').matches,
    conexion,
  }
}

function enviar(cuerpo: Record<string, unknown>) {
  try {
    const datos = JSON.stringify(cuerpo)
    const blob = new Blob([datos], { type: 'application/json' })
    if (!navigator.sendBeacon?.('/api/reportar', blob)) {
      void fetch('/api/reportar', { method: 'POST', body: datos, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
    }
  } catch {
    /* un aviso que falla nunca debe romper la app */
  }
}

/** Engancha errores y métricas. `obtenerVista` devuelve la sección abierta (p. ej. "tareas"). */
export function iniciarReporteTecnico(obtenerVista: () => string | undefined) {
  if (!import.meta.env.PROD) return
  const vistos = new Set<string>()

  const avisar = (tipo: 'error' | 'rechazo', mensaje: string, archivo?: string) => {
    const clave = `${tipo}:${mensaje}`
    if (vistos.has(clave) || vistos.size >= MAX_ERRORES) return
    vistos.add(clave)
    enviar({ tipo, ...contexto(obtenerVista), mensaje: limpiar(mensaje), archivo: archivo ? limpiar(archivo, 120) : undefined })
  }

  window.addEventListener('error', (e) => {
    if (!e.message || e.message === 'Script error.') return
    avisar('error', e.message, e.filename ? new URL(e.filename, location.href).pathname : undefined)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    avisar('rechazo', r instanceof Error ? `${r.name}: ${r.message}` : String(r ?? 'rechazo'))
  })

  // velocidad: se manda una sola vez, al ocultar la página, con los valores finales
  const vitales: Record<string, number> = {}
  void import('web-vitals').then(({ onLCP, onCLS, onINP, onFCP, onTTFB }) => {
    const guardar = (nombre: string) => (m: { value: number }) => {
      vitales[nombre] = m.value
    }
    onLCP(guardar('lcp'))
    onCLS(guardar('cls'))
    onINP(guardar('inp'))
    onFCP(guardar('fcp'))
    onTTFB(guardar('ttfb'))
  })
  let enviado = false
  const mandarVitales = () => {
    if (enviado || document.visibilityState !== 'hidden' || !Object.keys(vitales).length) return
    enviado = true
    enviar({ tipo: 'vitales', ...contexto(obtenerVista), ...vitales })
  }
  document.addEventListener('visibilitychange', mandarVitales)
  window.addEventListener('pagehide', mandarVitales)
}

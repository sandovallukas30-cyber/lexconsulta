/** Estadísticas de uso ANÓNIMAS: qué pantallas se usan, cuánto tiempo y qué funciones se tocan (api/uso.ts → tabla uso_diario).
 *
 *  Apagado por defecto: solo se activa en producción si el despliegue define VITE_USO_ACTIVO=1, y aun así respeta el
 *  interruptor «Compartir estadísticas de uso» de Configuración y la señal «No rastrear» del navegador.
 *  Lo que sale: contadores («esta función se usó N veces», «N segundos en esta pantalla»), el tipo de pantalla y si es la primera
 *  vez que ese navegador entra. No sale texto de apuntes, ni búsquedas, ni nombres, ni correos, ni ningún identificador. */

import { DISPOSITIVOS_USO, MAX_SEGUNDOS_POR_VISTA, MAX_VECES_POR_FUNCION, VISTAS_USO, type EnvioUso, type FuncionUso, type VistaUso } from '../../api/_catalogoUso'
import { useAjustes } from '../store/useAjustes'
import { tipoPantalla } from './reporteTecnico'

/** Lleva la cuenta entre envíos. Pura (sin DOM ni red) para poder probarla. */
export class AcumuladorUso {
  private eventos: Partial<Record<FuncionUso, number>> = {}
  private segundos: Partial<Record<VistaUso, number>> = {}
  private visitaContada = false

  contar(funcion: FuncionUso) {
    this.eventos[funcion] = Math.min((this.eventos[funcion] ?? 0) + 1, MAX_VECES_POR_FUNCION)
  }

  sumarTiempo(vista: string | undefined, segundos: number) {
    if (!vista || !(VISTAS_USO as readonly string[]).includes(vista) || !(segundos > 0)) return
    const v = vista as VistaUso
    this.segundos[v] = Math.min((this.segundos[v] ?? 0) + segundos, MAX_SEGUNDOS_POR_VISTA)
  }

  /** Saca lo acumulado y lo deja en cero. null si no hay nada que mandar. `primeraVez` = este navegador nunca había entrado. */
  vaciar(dispositivo: EnvioUso['d'], primeraVez: boolean): EnvioUso | null {
    const t: EnvioUso['t'] = {}
    for (const v of VISTAS_USO) {
      const s = Math.floor(this.segundos[v] ?? 0)
      if (s >= 1) t[v] = s
    }
    const e = { ...this.eventos }
    const ses = !this.visitaContada
    if (!ses && Object.keys(e).length === 0 && Object.keys(t).length === 0) return null
    this.visitaContada = true
    this.eventos = {}
    this.segundos = {}
    return { v: 1, d: dispositivo, nueva: primeraVez, ses, e, t }
  }
}

const acumulador = new AcumuladorUso()
let activo = false

/** ¿Hay que recolectar ahora mismo? Producción + despliegue habilitado + el usuario no lo apagó + sin «No rastrear». */
export function usoDisponible(): boolean {
  return import.meta.env.PROD && import.meta.env.VITE_USO_ACTIVO === '1'
}
function usoPermitido(): boolean {
  if (!usoDisponible()) return false
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return false
  return useAjustes.getState().compartirUso
}

/** Anota que se usó una función. Nunca lanza error ni frena la app. */
export function registrarUso(funcion: FuncionUso) {
  if (!activo || !usoPermitido()) return
  try {
    acumulador.contar(funcion)
  } catch {
    /* una estadística nunca debe romper la app */
  }
}

const CLAVE_VISTO = 'prima-lex-uso-visto'
function esPrimeraVez(): boolean {
  try {
    return localStorage.getItem(CLAVE_VISTO) === null
  } catch {
    return false
  }
}
function marcarVisto() {
  try {
    localStorage.setItem(CLAVE_VISTO, '1')
  } catch {
    /* sin almacenamiento: no se puede distinguir primera vez, no importa */
  }
}

function enviar(carga: EnvioUso) {
  try {
    const datos = JSON.stringify(carga)
    const blob = new Blob([datos], { type: 'application/json' })
    if (!navigator.sendBeacon?.('/api/uso', blob)) {
      void fetch('/api/uso', { method: 'POST', body: datos, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
    }
  } catch {
    /* un envío que falla nunca debe romper la app */
  }
}

const TICK_MS = 5000
const INACTIVO_MS = 60_000
const ENVIO_PERIODICO_MS = 5 * 60_000

/** Engancha el conteo de tiempo por pantalla y el envío. `obtenerVista` devuelve la pantalla abierta (p. ej. "tareas"). */
export function iniciarUso(obtenerVista: () => string | undefined) {
  if (!usoDisponible() || activo) return
  activo = true
  let ultimaActividad = Date.now()
  const actividad = () => {
    ultimaActividad = Date.now()
  }
  for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const) window.addEventListener(ev, actividad, { passive: true, capture: true })

  // tiempo ACTIVO: solo cuenta si la pestaña está a la vista y hubo uso en el último minuto
  window.setInterval(() => {
    if (!usoPermitido() || document.visibilityState !== 'visible') return
    if (Date.now() - ultimaActividad > INACTIVO_MS) return
    acumulador.sumarTiempo(obtenerVista(), TICK_MS / 1000)
  }, TICK_MS)

  const mandar = () => {
    if (!usoPermitido()) return
    const carga = acumulador.vaciar(tipoPantalla(window.innerWidth) as (typeof DISPOSITIVOS_USO)[number], esPrimeraVez())
    if (!carga) return
    enviar(carga)
    marcarVisto()
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') mandar()
  })
  window.addEventListener('pagehide', mandar)
  window.setInterval(mandar, ENVIO_PERIODICO_MS)
  // la visita cuenta desde que abre, aunque se cierre antes de los 5 minutos
  window.setTimeout(mandar, 15_000)
}

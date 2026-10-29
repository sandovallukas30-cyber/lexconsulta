import { useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useCuenta } from '../store/useCuenta'
import { useStore } from '../store/useStore'
import { useEnfoque } from '../store/useEnfoque'

const CADA_MS = 2 * 60_000
const ESPERA_CAMBIOS_MS = 8_000

/** Se monta una vez en App: lee la sesión, escucha entradas y salidas, y
 *  mantiene la sincronización al día (al entrar, al volver a la pestaña, al
 *  salir de ella, a los pocos segundos de cambiar algo y cada 2 minutos). Sin Supabase
 *  configurado no hace nada. */
export function useCuentaInit() {
  const perfilId = useCuenta((s) => s.perfil?.id)

  // sesión: al arrancar y cada vez que cambia (incluye el regreso del inicio con Google/Microsoft)
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => useCuenta.getState()._aplicarUsuario(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((evento, sesion) => {
      // no se llama a Supabase dentro del callback (puede bloquearse): se difiere
      window.setTimeout(() => void useCuenta.getState()._aplicarUsuario(sesion?.user ?? null), 0)
      if (evento === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // sincronización mientras haya sesión
  useEffect(() => {
    if (!supabase || !perfilId) return
    const sincronizar = () => void useCuenta.getState().sincronizarAhora(true)
    let temporizador: number | undefined
    const alCambiar = () => {
      window.clearTimeout(temporizador)
      temporizador = window.setTimeout(sincronizar, ESPERA_CAMBIOS_MS)
    }
    const a = useStore.subscribe(alCambiar)
    const b = useEnfoque.subscribe((s, prev) => {
      // el reloj cambia a cada rato: solo importan las sesiones
      if (s.sesiones !== prev.sesiones) alCambiar()
    })
    const intervalo = window.setInterval(sincronizar, CADA_MS)
    // al volver se baja lo nuevo; al irse (pantalla bloqueada, otra app) se sube lo pendiente sin esperar los 8 s:
    // iPadOS pausa los temporizadores de una app en segundo plano y el cambio se quedaba solo en ese equipo
    const alVolver = () => {
      if (document.visibilityState === 'visible') sincronizar()
      else {
        window.clearTimeout(temporizador)
        sincronizar()
      }
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('pagehide', sincronizar)
    return () => {
      a()
      b()
      window.clearTimeout(temporizador)
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('pagehide', sincronizar)
    }
  }, [perfilId])
}

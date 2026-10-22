import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { olvidarEstado, sincronizar, leerEstado, leerDueno, guardarDueno } from '../services/sincronizacion'
import { vaciarDatosLocales } from '../services/respaldo'
import { avisar } from './useAvisos'

/** Sesión de la cuenta (Google, Microsoft o enlace por correo) y estado de la
 *  sincronización. No se persiste aquí: la sesión la guarda el cliente de
 *  Supabase y el estado de la sincronización, services/sincronizacion. */

export type ProveedorCuenta = 'google' | 'azure'
export type Plan = 'gratis' | 'pro'
export type EstadoSync = 'inactivo' | 'sincronizando' | 'ok' | 'error'

export interface PerfilCuenta {
  id: string
  email: string
  nombre: string
  avatar: string | null
  proveedor: string
}

interface EstadoCuenta {
  /** Termina de leer la sesión guardada (evita parpadear «Iniciar sesión»). */
  listo: boolean
  perfil: PerfilCuenta | null
  plan: Plan
  sync: EstadoSync
  ultimaSync: number | null
  errorSync: string | null
  modalAbierto: boolean
  /** Este dispositivo tiene datos de otra cuenta: no se sincroniza hasta que la persona elija. */
  conflictoDispositivo: boolean
  resolverConflicto: (modo: 'empezar' | 'unir') => Promise<void>
  abrirModal: () => void
  cerrarModal: () => void
  iniciarSesion: (p: ProveedorCuenta) => Promise<string | null>
  enlaceCorreo: (email: string) => Promise<string | null>
  cerrarSesion: (borrarLocal?: boolean) => Promise<void>
  eliminarCuenta: () => Promise<string | null>
  sincronizarAhora: (silencioso?: boolean) => Promise<void>
  /** Uso interno: la sesión cambió (o se leyó al arrancar). */
  _aplicarUsuario: (u: User | null) => Promise<void>
}

export function perfilDe(u: User): PerfilCuenta {
  const m = (u.user_metadata ?? {}) as Record<string, unknown>
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const email = u.email ?? texto(m.email) ?? ''
  return {
    id: u.id,
    email,
    nombre: texto(m.full_name) ?? texto(m.name) ?? (email ? email.split('@')[0] : 'Tu cuenta'),
    avatar: texto(m.avatar_url) ?? texto(m.picture),
    proveedor: u.app_metadata?.provider ?? 'email',
  }
}

let enCurso = false

export const useCuenta = create<EstadoCuenta>((set, get) => ({
  listo: supabase === null,
  perfil: null,
  plan: 'gratis',
  sync: 'inactivo',
  ultimaSync: null,
  errorSync: null,
  modalAbierto: false,
  conflictoDispositivo: false,
  abrirModal: () => set({ modalAbierto: true }),
  cerrarModal: () => set({ modalAbierto: false }),

  iniciarSesion: async (proveedor) => {
    if (!supabase) return 'Las cuentas aún no están activadas.'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: proveedor,
      options: { redirectTo: window.location.origin, ...(proveedor === 'azure' ? { scopes: 'email' } : {}) },
    })
    return error ? error.message : null
  },

  enlaceCorreo: async (email) => {
    if (!supabase) return 'Las cuentas aún no están activadas.'
    const limpio = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio)) return 'Escribe un correo válido.'
    const { error } = await supabase.auth.signInWithOtp({ email: limpio, options: { emailRedirectTo: window.location.origin, shouldCreateUser: true } })
    return error ? error.message : null
  },

  cerrarSesion: async (borrarLocal = false) => {
    if (!supabase) return
    // última copia antes de salir: así borrar lo local o dejarlo para otra cuenta no pierde nada
    if (get().perfil && !get().conflictoDispositivo) await get().sincronizarAhora(true)
    if (borrarLocal && get().sync === 'error') {
      // no se pudo subir la última copia: borrar ahora perdería datos
      return
    }
    await supabase.auth.signOut()
    if (borrarLocal) {
      try {
        vaciarDatosLocales()
        localStorage.removeItem('prima-lex-dueno')
      } catch {
        /* almacenamiento lleno: no se borró */
      }
    }
  },

  resolverConflicto: async (modo) => {
    const p = get().perfil
    if (!p) return
    if (modo === 'empezar') {
      try {
        vaciarDatosLocales()
      } catch {
        set({ sync: 'error', errorSync: 'No se pudo limpiar este dispositivo (almacenamiento lleno).' })
        return
      }
      olvidarEstado(p.id) // sin versión vista: se baja todo lo de la nube
    }
    guardarDueno(p.id)
    set({ conflictoDispositivo: false })
    void get().sincronizarAhora(true)
  },

  eliminarCuenta: async () => {
    if (!supabase) return 'Las cuentas aún no están activadas.'
    const id = get().perfil?.id
    const { error } = await supabase.rpc('eliminar_mi_cuenta')
    if (error) return error.message
    if (id) olvidarEstado(id)
    await supabase.auth.signOut()
    return null
  },

  sincronizarAhora: async (silencioso = false) => {
    const p = get().perfil
    if (!supabase || !p || enCurso || get().conflictoDispositivo) return
    enCurso = true
    set({ sync: 'sincronizando', errorSync: null })
    try {
      const r = await sincronizar(supabase, p.id)
      set({ sync: 'ok', ultimaSync: r.fecha })
      if (!silencioso && r.resultado === 'bajo') avisar.info('Se trajeron cambios de tus otros dispositivos')
    } catch (e) {
      set({ sync: 'error', errorSync: e instanceof Error ? e.message : 'No se pudo sincronizar' })
    } finally {
      enCurso = false
    }
  },

  _aplicarUsuario: async (u) => {
    if (!u) {
      set({ listo: true, perfil: null, plan: 'gratis', sync: 'inactivo', ultimaSync: null, errorSync: null, conflictoDispositivo: false })
      return
    }
    const perfil = perfilDe(u)
    const dueno = leerDueno()
    const conflicto = dueno !== null && dueno !== u.id
    set({ listo: true, perfil, ultimaSync: leerEstado(u.id).ultimaSync, conflictoDispositivo: conflicto })
    if (conflicto) set({ modalAbierto: true })
    // el plan lo escribe el servidor (cobro); aquí solo se lee
    if (supabase) {
      const { data } = await supabase.from('perfiles').select('plan').eq('id', u.id).maybeSingle()
      set({ plan: data?.plan === 'pro' ? 'pro' : 'gratis' })
    }
    if (!conflicto) void get().sincronizarAhora(true)
  },
}))

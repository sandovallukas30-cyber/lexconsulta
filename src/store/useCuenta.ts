import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { olvidarEstado, sincronizar, leerEstado } from '../services/sincronizacion'
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
  abrirModal: () => void
  cerrarModal: () => void
  iniciarSesion: (p: ProveedorCuenta) => Promise<string | null>
  enlaceCorreo: (email: string) => Promise<string | null>
  cerrarSesion: () => Promise<void>
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

  cerrarSesion: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
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
    if (!supabase || !p || enCurso) return
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
      set({ listo: true, perfil: null, plan: 'gratis', sync: 'inactivo', ultimaSync: null, errorSync: null })
      return
    }
    const perfil = perfilDe(u)
    set({ listo: true, perfil, ultimaSync: leerEstado(u.id).ultimaSync })
    // el plan lo escribe el servidor (cobro); aquí solo se lee
    if (supabase) {
      const { data } = await supabase.from('perfiles').select('plan').eq('id', u.id).maybeSingle()
      set({ plan: data?.plan === 'pro' ? 'pro' : 'gratis' })
    }
    void get().sincronizarAhora(true)
  },
}))

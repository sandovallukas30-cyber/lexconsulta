import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Cliente de Supabase (cuentas y sincronización). Si faltan las variables de
 *  entorno —aún no se configuró el proyecto— vale null y la app funciona como
 *  siempre, sin cuentas: nada de esto aparece en pantalla. La «anon key» es
 *  pública por diseño (la seguridad la dan las reglas RLS de la base). */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && clave
    ? createClient(url, clave, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

export const cuentasDisponibles = supabase !== null

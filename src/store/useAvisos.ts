import { create } from 'zustand'

/** Sistema único de avisos (toasts) de la app: guardado, copiado, importado,
 *  errores y "Deshacer" tras eliminar. Store propio y SIN persistir -- un
 *  aviso no tiene sentido después de recargar -- separado de useStore para
 *  no inflar el estado persistido ni re-renderizar vistas al mostrar uno. */

export type TipoAviso = 'exito' | 'error' | 'info'

export interface Aviso {
  id: string
  tipo: TipoAviso
  mensaje: string
  /** Botón opcional (ej. "Deshacer"). Al pulsarlo el aviso se cierra. */
  accion?: { etiqueta: string; alPulsar: () => void }
  duracionMs: number
}

interface EstadoAvisos {
  avisos: Aviso[]
  mostrar: (aviso: Omit<Aviso, 'id' | 'duracionMs'> & { duracionMs?: number }) => string
  cerrar: (id: string) => void
}

const MAX_AVISOS = 4

export const useAvisos = create<EstadoAvisos>()((set) => ({
  avisos: [],
  mostrar: (aviso) => {
    const id = crypto.randomUUID()
    const duracionMs = aviso.duracionMs ?? (aviso.tipo === 'error' ? 6000 : 3500)
    set((s) => ({ avisos: [...s.avisos, { ...aviso, id, duracionMs }].slice(-MAX_AVISOS) }))
    return id
  },
  cerrar: (id) => set((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })),
}))

/** Atajos para usar fuera de componentes (o sin suscribirse al store). */
export const avisar = {
  exito: (mensaje: string) => useAvisos.getState().mostrar({ tipo: 'exito', mensaje }),
  error: (mensaje: string) => useAvisos.getState().mostrar({ tipo: 'error', mensaje }),
  info: (mensaje: string) => useAvisos.getState().mostrar({ tipo: 'info', mensaje }),
  /** Aviso con "Deshacer" durante 8 s: la acción ya se hizo; `deshacer`
   *  la revierte si el usuario alcanza a pulsar el botón. */
  conDeshacer: (mensaje: string, deshacer: () => void) =>
    useAvisos.getState().mostrar({
      tipo: 'info',
      mensaje,
      duracionMs: 8000,
      accion: { etiqueta: 'Deshacer', alPulsar: deshacer },
    }),
}

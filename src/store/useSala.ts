import { create } from 'zustand'
import { registrarUso } from '../services/uso'

/** Si la sala de estudio está abierta y, opcionalmente, qué video cargar al abrirla
 *  (cuando llegas desde un enlace compartido). No se guarda. */
interface EstadoSala {
  abierta: boolean
  videoInicial: string | null
  abrir: (video?: string | null) => void
  cerrar: () => void
}

export const useSala = create<EstadoSala>((set) => ({
  abierta: false,
  videoInicial: null,
  abrir: (video = null) => {
    registrarUso('enfoque.sala')
    set({ abierta: true, videoInicial: video })
  },
  cerrar: () => set({ abierta: false, videoInicial: null }),
}))

export const PARAM_SALA = 'sala'

/** Enlace que abre Prima Lex con la sala y este video (para estudiar con alguien). */
export function enlaceDeSala(video: string): string {
  const url = new URL(window.location.origin + '/')
  url.searchParams.set(PARAM_SALA, video)
  return url.toString()
}

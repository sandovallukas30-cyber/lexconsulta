import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Sonido } from '../services/ambiente'
import type { FondoId } from '../services/fondos'

/** Un video o transmisión favorito para la sala de estudio. */
export interface Emisora {
  id: string
  nombre: string
  url: string
}

export type DisposicionSala = 'lado' | 'abajo' | 'arriba' | 'flotante' | 'minimo' | 'ventana'
export type TamanoVideo = 'ajustado' | 'mediano' | 'pequeno'

/** Lo último que usaste en la sala de estudio. */
export interface PrefsSala {
  material: 'video' | 'apunte'
  video: string
  /** `ramoId:apunteId` */
  apunte: string
  disposicion: DisposicionSala
  tamano: TamanoVideo
  /** Dónde dejaste la ventana del temporizador: distancia al borde derecho e inferior, en px. */
  ventana?: { r: number; b: number }
}

/** Preferencias del ambiente de enfoque (fondo animado, sonido, sala de
 *  estudio). Propias de cada dispositivo: no van en el respaldo. El sonido
 *  sigue al temporizador desde cualquier pantalla (ver useMotorSonido). */
export interface EnfoqueLocal {
  sonido: Sonido
  /** 0 a 1 */
  volumen: number
  /** El sonido solo suena mientras corre un enfoque (no en descansos ni pausado). */
  soloEnfocando: boolean
  fondo: FondoId
  /** Al elegir un fondo, también pone su sonido. */
  sonidoDeFondo: boolean
  emisoras: Emisora[]
  sala: PrefsSala
  set: (p: Partial<Omit<EnfoqueLocal, 'set'>>) => void
}

export const useEnfoqueLocal = create<EnfoqueLocal>()(
  persist(
    (set) => ({
      sonido: 'apagado',
      volumen: 0.35,
      soloEnfocando: true,
      fondo: 'ninguno',
      sonidoDeFondo: true,
      emisoras: [],
      sala: { material: 'video', video: '', apunte: '', disposicion: 'ventana', tamano: 'ajustado' },
      set: (p) => set(p),
    }),
    {
      name: 'prima-lex-enfoque-local-v1',
      version: 2,
      // v1 → v2: el panel «al lado» era el valor de fábrica; pasa a la ventana pequeña (se puede volver desde la sala)
      migrate: (guardado, version) => {
        const g = guardado as Partial<EnfoqueLocal>
        if (version < 2 && g.sala?.disposicion === 'lado') g.sala = { ...g.sala, disposicion: 'ventana' }
        return g as EnfoqueLocal
      },
      partialize: (s) => ({
        sonido: s.sonido, volumen: s.volumen, soloEnfocando: s.soloEnfocando, fondo: s.fondo, sonidoDeFondo: s.sonidoDeFondo,
        emisoras: s.emisoras, sala: s.sala,
      }),
      // guardados de antes de la sala: se completan con los valores por defecto
      merge: (guardado, actual) => {
        const g = (guardado ?? {}) as Partial<EnfoqueLocal>
        return { ...actual, ...g, sala: { ...actual.sala, ...(g.sala ?? {}) }, emisoras: Array.isArray(g.emisoras) ? g.emisoras : [] }
      },
    }
  )
)

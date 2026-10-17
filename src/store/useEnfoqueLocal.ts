import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Sonido } from '../services/ambiente'
import type { FondoId } from '../services/fondos'

/** Preferencias del ambiente de enfoque (fondo animado y sonido). Propias de
 *  cada dispositivo: no van en el respaldo. El sonido sigue al temporizador
 *  desde cualquier pantalla (ver useMotorSonido). */
export interface EnfoqueLocal {
  sonido: Sonido
  /** 0 a 1 */
  volumen: number
  /** El sonido solo suena mientras corre un enfoque (no en descansos ni pausado). */
  soloEnfocando: boolean
  fondo: FondoId
  /** Al elegir un fondo, también pone su sonido. */
  sonidoDeFondo: boolean
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
      set: (p) => set(p),
    }),
    {
      name: 'prima-lex-enfoque-local-v1',
      partialize: (s) => ({ sonido: s.sonido, volumen: s.volumen, soloEnfocando: s.soloEnfocando, fondo: s.fondo, sonidoDeFondo: s.sonidoDeFondo }),
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Preferencias de la interfaz. Propias de cada dispositivo (no van en el
 *  respaldo ni se mezclan con los datos de estudio): el celular y el
 *  computador pueden tener tamaños distintos, como en Orbis. */

export const ZOOMS: [number, string][] = [
  [0.75, 'Muy pequeño'],
  [0.85, 'Pequeño'],
  [1, 'Normal'],
  [1.15, 'Grande'],
  [1.3, 'Muy grande'],
]

export type EstiloUI = 'neumo' | 'plano'

export interface AjustesUI {
  /** Escala de toda la interfaz (1 = normal). */
  zoom: number
  estilo: EstiloUI
  /** Sin relieve, con bordes y textos más fuertes. */
  contraste: boolean
  /** Animaciones suaves al cambiar de sección y abrir ventanas. */
  animaciones: boolean
  /** Pequeñas celebraciones al cumplir tareas y enfoques. */
  celebraciones: boolean
  /** Resumen diario y avisos de evaluaciones (mientras la app esté abierta). */
  recordatorios: boolean
  /** Hora del resumen (0-23). */
  horaResumen: number
  set: (p: Partial<Omit<AjustesUI, 'set'>>) => void
}

export const useAjustes = create<AjustesUI>()(
  persist(
    (set) => ({
      zoom: 1,
      estilo: 'neumo',
      contraste: false,
      animaciones: true,
      celebraciones: true,
      recordatorios: false,
      horaResumen: 8,
      set: (p) => set(p),
    }),
    {
      name: 'prima-lex-ajustes-v1',
      partialize: (s) => ({ zoom: s.zoom, estilo: s.estilo, contraste: s.contraste, animaciones: s.animaciones, celebraciones: s.celebraciones, recordatorios: s.recordatorios, horaResumen: s.horaResumen }),
    }
  )
)

/** El sistema pide menos movimiento: se respeta por encima de cualquier ajuste. */
export const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

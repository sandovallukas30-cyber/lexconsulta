import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VistaId } from '../types'
import { BARRA_INFERIOR_DEFECTO } from '../data/destinosNavegacion'
import { FUENTE_LECTURA_DEFECTO, type FuenteLectura } from '../services/fuentesLectura'

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


/** Tamaños del texto de los códigos: de 14 a 32 px, de 2 en 2 (17 es el de siempre). */
export const TAMANO_CODIGO_DEFECTO = 17
export const TAMANO_CODIGO_MIN = 14
export const TAMANO_CODIGO_MAX = 32
export const sumarTamanoCodigo = (actual: number, delta: number): number =>
  Math.min(TAMANO_CODIGO_MAX, Math.max(TAMANO_CODIGO_MIN, Math.round(actual) + delta * 2))

export interface AjustesUI {
  /** Escala de toda la interfaz (1 = normal). */
  zoom: number
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
  /** Tamaño del texto de los artículos en el Explorador (px). Propio de cada dispositivo y aparte del zoom general. */
  tamanoCodigo: number
  /** Áreas del derecho del catálogo en Módulos: null = automático (abiertas solo si aún no tienes ramos). */
  catalogoAbierto: boolean | null
  /** Animal elegido como foto de perfil (id de data/avataresAnimales); null = foto de la cuenta o inicial. */
  avatarAnimal: string | null
  /** Número pequeño y tenue al margen de cada inciso de los artículos. */
  numerarIncisos: boolean
  /** Destinos de la barra inferior del celular (hasta 4; «Más» siempre va al final). */
  barraInferior: VistaId[]
  /** Letra de los artículos y los apuntes. */
  fuenteLectura: FuenteLectura
  /** Pistas de gestos que ya se mostraron (cada una aparece una sola vez por dispositivo). */
  pistasVistas: string[]
  /** Contar de forma anónima qué pantallas y funciones se usan (solo hace algo si el despliegue lo habilita; ver services/uso.ts). */
  compartirUso: boolean
  /** Preguntas de «¿seguro?» que la persona pidió no volver a ver (claves de services/confirmar.ts). */
  confirmacionesOmitidas: string[]
  set: (p: Partial<Omit<AjustesUI, 'set'>>) => void
}

export const useAjustes = create<AjustesUI>()(
  persist(
    (set) => ({
      zoom: 1,
      contraste: false,
      animaciones: true,
      celebraciones: true,
      recordatorios: false,
      horaResumen: 8,
      tamanoCodigo: TAMANO_CODIGO_DEFECTO,
      catalogoAbierto: null,
      avatarAnimal: null,
      numerarIncisos: false,
      barraInferior: BARRA_INFERIOR_DEFECTO,
      fuenteLectura: FUENTE_LECTURA_DEFECTO,
      pistasVistas: [],
      compartirUso: true,
      confirmacionesOmitidas: [],
      set: (p) => set(p),
    }),
    {
      name: 'prima-lex-ajustes-v1',
      partialize: (s) => ({ zoom: s.zoom, contraste: s.contraste, animaciones: s.animaciones, celebraciones: s.celebraciones, recordatorios: s.recordatorios, horaResumen: s.horaResumen, tamanoCodigo: s.tamanoCodigo, catalogoAbierto: s.catalogoAbierto, avatarAnimal: s.avatarAnimal, numerarIncisos: s.numerarIncisos, barraInferior: s.barraInferior, fuenteLectura: s.fuenteLectura, pistasVistas: s.pistasVistas, compartirUso: s.compartirUso, confirmacionesOmitidas: s.confirmacionesOmitidas }),
    }
  )
)

/** El sistema pide menos movimiento: se respeta por encima de cualquier ajuste. */
export const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

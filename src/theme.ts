// Catálogo de temas de color para Prima Lex. Cada tema define una paleta de
// 11 tonos (50 → 950) que se exponen como variables CSS en :root y son
// consumidas por toda la app mediante: style={{ background: 'var(--accent-base)' }}
// o bien clases Tailwind con valor arbitrario: bg-[var(--accent-50)].
//
// La paleta sigue la convención de Tailwind: 500 es el tono principal y 700
// es el de "acento fuerte" usado para botones y elementos prominentes.
//
// El fondo de la app (blanco/negro) NO se ve afectado; solo cambian los
// detalles.

export type TemaColorId = 'esmeralda' | 'indigo' | 'borgona' | 'violeta' | 'ambar' | 'pizarra'

export interface PaletaAcento {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
  950: string
  /** Color principal usado en buttons sólidos, badges, focos. (Suele coincidir con 700.) */
  base: string
}

export interface TemaColor {
  id: TemaColorId
  nombre: string
  descripcion: string
  paleta: PaletaAcento
}

export const TEMAS: TemaColor[] = [
  {
    id: 'esmeralda',
    nombre: 'Esmeralda',
    descripcion: 'Derecho clásico — verde institucional',
    paleta: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#0F6E56',
      700: '#0F6E56',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22',
      base: '#0F6E56',
    },
  },
  {
    id: 'indigo',
    nombre: 'Índigo',
    descripcion: 'Institucional — sobrio y profesional',
    paleta: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b',
      base: '#4338ca',
    },
  },
  {
    id: 'borgona',
    nombre: 'Borgoña',
    descripcion: 'Tradicional — vino tinto, libro antiguo',
    paleta: {
      50: '#fdf2f4',
      100: '#fce4e9',
      200: '#fbcad4',
      300: '#f7a0b1',
      400: '#f06d87',
      500: '#e23f63',
      600: '#c81d4a',
      700: '#9f1239',
      800: '#7f1d1d',
      900: '#65171b',
      950: '#3f0a10',
      base: '#9f1239',
    },
  },
  {
    id: 'violeta',
    nombre: 'Violeta',
    descripcion: 'Universitario — moderno, juvenil',
    paleta: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764',
      base: '#7e22ce',
    },
  },
  {
    id: 'ambar',
    nombre: 'Ámbar',
    descripcion: 'Cálido — energético y luminoso',
    paleta: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
      base: '#b45309',
    },
  },
  {
    id: 'pizarra',
    nombre: 'Pizarra',
    descripcion: 'Neutro — gris azulado, sobrio',
    paleta: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
      base: '#334155',
    },
  },
]

export function obtenerTema(id: TemaColorId): TemaColor {
  return TEMAS.find((t) => t.id === id) ?? TEMAS[0]
}

/** Aplica el tema al documento sobreescribiendo las variables CSS de la raíz. */
export function aplicarTema(id: TemaColorId): void {
  if (typeof document === 'undefined') return
  const tema = obtenerTema(id)
  const root = document.documentElement
  root.style.setProperty('--accent-50', tema.paleta[50])
  root.style.setProperty('--accent-100', tema.paleta[100])
  root.style.setProperty('--accent-200', tema.paleta[200])
  root.style.setProperty('--accent-300', tema.paleta[300])
  root.style.setProperty('--accent-400', tema.paleta[400])
  root.style.setProperty('--accent-500', tema.paleta[500])
  root.style.setProperty('--accent-600', tema.paleta[600])
  root.style.setProperty('--accent-700', tema.paleta[700])
  root.style.setProperty('--accent-800', tema.paleta[800])
  root.style.setProperty('--accent-900', tema.paleta[900])
  root.style.setProperty('--accent-950', tema.paleta[950])
  root.style.setProperty('--accent-base', tema.paleta.base)
  root.setAttribute('data-tema', id)
}

import type { TemaLectura } from '../types'

/** Compartido entre cualquier "modo lectura" de la app (Explorador de
 *  códigos, Apuntes de Módulos) -- mismos pasos de tamaño de letra y misma
 *  paleta de temas, así el lector que ya se acostumbró a uno se siente en
 *  casa en el otro. Antes vivía solo dentro de ExploradorView.tsx. */
export const TAMANOS_FUENTE = [17, 19, 21, 24, 27]

export const TEMAS_LECTURA: Record<
  TemaLectura,
  {
    bg: string
    border: string
    text: string
    textSoft: string
    chipBg: string
    hoverSuave: string
    chipHover: string
    icono: string
    siguienteTema: TemaLectura
    tituloBoton: string
  }
> = {
  claro: {
    bg: 'bg-white',
    border: 'border-zinc-200',
    text: 'text-zinc-900',
    textSoft: 'text-zinc-500',
    chipBg: 'bg-zinc-100',
    hoverSuave: 'hover:bg-zinc-100',
    chipHover: 'hover:bg-zinc-200',
    icono: 'ti-sun',
    siguienteTema: 'oscuro',
    tituloBoton: 'Cambiar a tema oscuro',
  },
  oscuro: {
    bg: 'bg-zinc-900',
    border: 'border-zinc-800',
    text: 'text-white',
    textSoft: 'text-zinc-400',
    chipBg: 'bg-zinc-800',
    hoverSuave: 'hover:bg-zinc-800',
    chipHover: 'hover:bg-zinc-700',
    icono: 'ti-moon',
    siguienteTema: 'papel',
    tituloBoton: 'Cambiar a tema papel',
  },
  papel: {
    bg: 'bg-[#f4ecd8]',
    border: 'border-[#e2d0a4]',
    text: 'text-[#3a2c1a]',
    textSoft: 'text-[#8a7550]',
    chipBg: 'bg-[#ecdfc0]',
    hoverSuave: 'hover:bg-[#ecdfc0]',
    chipHover: 'hover:bg-[#e2d3a8]',
    icono: 'ti-coffee',
    siguienteTema: 'claro',
    tituloBoton: 'Cambiar a tema claro',
  },
}

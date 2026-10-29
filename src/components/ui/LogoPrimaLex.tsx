import { useId } from 'react'

/** El logo de Prima Lex: un cuaderno con la P y un marcador dorado. Toma el color del tema elegido (el fondo es el
 *  color de acento). La versión con colores fijos, para el favicon y la app instalable, la genera
 *  scripts/generar_logo.mjs con el mismo dibujo. */
export function LogoPrimaLex({ size = 44, className = '' }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        {/* un velo de luz arriba a la izquierda y de sombra abajo a la derecha: da volumen sea cual sea el tema */}
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="var(--accent-base)" />
      <rect width="64" height="64" rx="15" fill={`url(#${id})`} />
      <path d="M16 51V17a4 4 0 0 1 4-4h22a6 6 0 0 1 6 6v32z" fill="#fff" />
      <path d="M16 51c0-3.2 2.2-5.4 5.4-5.4H48" stroke="var(--accent-700, #4a4dd0)" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M24 38V23h7.2a4.6 4.6 0 0 1 0 9.2H24" stroke="var(--accent-700, #4a4dd0)" strokeWidth="4.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 13v14l3-2.4 3 2.4V13z" fill="#ffc94d" />
    </svg>
  )
}

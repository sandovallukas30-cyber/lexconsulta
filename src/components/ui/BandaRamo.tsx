import type { DisenoRamo } from '../../types'
import { colorPastel } from '../../services/disenoRamo'

/** Franja de color de un ramo con un diseño suave encima (formas grandes y simples, sin burbujas).
 *  Se usa arriba de las fichas de Módulos y en la cabecera del ramo. El contenido va encima,
 *  con el color de texto que se calcule para el fondo (un tono oscuro del mismo color: ver `tintaPastel`; la franja es pastel, ver `colorPastel`). */

function Dibujo({ diseno }: { diseno: DisenoRamo }) {
  switch (diseno) {
    case 'olas':
      return (
        <>
          <path d="M0 74 C60 54 120 94 200 74 S340 54 400 76 V120 H0Z" fill="#fff" opacity=".14" />
          <path d="M0 90 C70 70 140 106 220 90 S350 74 400 92 V120 H0Z" fill="#fff" opacity=".12" />
          <path d="M0 105 C80 91 150 117 230 105 S350 95 400 107 V120 H0Z" fill="#000" opacity=".13" />
        </>
      )
    case 'facetas':
      return (
        <>
          <polygon points="0,0 130,0 70,78" fill="#fff" opacity=".1" />
          <polygon points="130,0 270,0 195,64" fill="#000" opacity=".09" />
          <polygon points="270,0 400,0 335,86" fill="#fff" opacity=".12" />
          <polygon points="0,0 70,78 0,120" fill="#000" opacity=".07" />
          <polygon points="70,78 195,64 150,120 0,120" fill="#fff" opacity=".07" />
          <polygon points="195,64 335,86 270,120 150,120" fill="#000" opacity=".1" />
          <polygon points="335,86 400,0 400,120 270,120" fill="#fff" opacity=".06" />
        </>
      )
    case 'arcos':
      return (
        <g fill="none" stroke="#fff">
          <circle cx="390" cy="125" r="62" strokeWidth="16" opacity=".16" />
          <circle cx="390" cy="125" r="104" strokeWidth="16" opacity=".12" />
          <circle cx="390" cy="125" r="146" strokeWidth="16" opacity=".09" />
          <circle cx="390" cy="125" r="188" strokeWidth="16" opacity=".06" />
        </g>
      )
    case 'rayas':
      return (
        <>
          <polygon points="250,0 305,0 215,120 160,120" fill="#fff" opacity=".12" />
          <polygon points="320,0 365,0 275,120 230,120" fill="#000" opacity=".1" />
          <polygon points="380,0 400,0 400,120 335,120" fill="#fff" opacity=".1" />
          <polygon points="170,0 205,0 115,120 80,120" fill="#fff" opacity=".07" />
        </>
      )
  }
}

export function BandaRamo({
  color, diseno, className = '', style, children,
}: {
  color: string
  diseno: DisenoRamo
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: colorPastel(color), ...style }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <Dibujo diseno={diseno} />
      </svg>
      <div className="relative h-full">{children}</div>
    </div>
  )
}

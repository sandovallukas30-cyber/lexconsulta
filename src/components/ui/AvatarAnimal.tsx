import { useId } from 'react'
import { AVATAR_POR_ID, reflejar } from '../../data/avataresAnimales'

/** Avatar de animal (cara de frente, polígonos planos) dentro de un círculo. Si el id no existe no dibuja nada. */
export function AvatarAnimal({ id, className = 'w-9 h-9' }: { id: string; className?: string }) {
  const clip = useId()
  const a = AVATAR_POR_ID[id]
  if (!a) return null
  return (
    <svg viewBox="0 0 100 100" className={`${className} flex-shrink-0 rounded-full`} role="img" aria-label={a.nombre}>
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <circle cx="50" cy="50" r="50" fill={a.fondo} />
        {a.formas.map((forma, i) => (
          <g key={i} fill={forma.c} stroke={forma.c} strokeWidth="0.5" strokeLinejoin="round">
            <polygon points={forma.p} />
            {forma.espejo && <polygon points={reflejar(forma.p)} />}
          </g>
        ))}
      </g>
    </svg>
  )
}

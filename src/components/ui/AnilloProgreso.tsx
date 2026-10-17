/** Anillo de progreso (estilo Orbis): una pista suave y un arco de color que
 *  avanza con `progreso` (0 a 1). El contenido va al centro. */
export function AnilloProgreso({
  progreso,
  tamano = 220,
  grosor = 12,
  color = 'var(--accent-base)',
  modoOscuro,
  children,
  etiqueta,
}: {
  progreso: number
  tamano?: number
  grosor?: number
  color?: string
  modoOscuro: boolean
  children?: React.ReactNode
  /** Texto para lectores de pantalla (el anillo es decorativo). */
  etiqueta?: string
}) {
  const r = (tamano - grosor) / 2
  const circ = 2 * Math.PI * r
  const p = Math.min(1, Math.max(0, progreso))
  return (
    <div
      className="relative flex-shrink-0 rounded-full"
      style={{ width: tamano, height: tamano, background: 'var(--neu-bg)', boxShadow: tamano > 120 ? 'var(--neu-elevada)' : 'var(--neu-plana)' }}
      role="img"
      aria-label={etiqueta}
    >
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} className="-rotate-90" aria-hidden="true">
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" strokeWidth={grosor} stroke={modoOscuro ? 'var(--neu-sl)' : 'var(--neu-line)'} />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          strokeWidth={grosor}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - p)}
          style={{ transition: 'stroke-dashoffset 0.5s var(--ease-estandar), stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

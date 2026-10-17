import { motion } from 'framer-motion'

/** Control segmentado con la píldora que se desliza (estilo Orbis). */
export function Segmentado<T extends string>({
  id, opciones, valor, onChange, deshabilitado, etiqueta,
}: {
  /** Único por pantalla: la animación comparte la píldora entre opciones del mismo id. */
  id: string
  opciones: { valor: T; texto: string }[]
  valor: T
  onChange: (v: T) => void
  deshabilitado?: boolean
  etiqueta: string
}) {
  return (
    <div role="group" aria-label={etiqueta} className="neu-pressed inline-flex p-1.5 !rounded-full gap-1">
      {opciones.map((o) => {
        const activo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={activo}
            disabled={deshabilitado && !activo}
            onClick={() => onChange(o.valor)}
            className={`sin-tactil relative h-9 px-4 rounded-full text-[13px] font-bold transition-colors disabled:opacity-40 ${
              activo ? 'text-[var(--accent-texto)]' : 'text-[var(--neu-ink3)] hover:text-[var(--neu-ink2)]'
            }`}
          >
            {activo && (
              <motion.span
                layoutId={`pildora-${id}`}
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-chica)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{o.texto}</span>
          </button>
        )
      })}
    </div>
  )
}

import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'

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
  const modoOscuro = useStore((s) => s.modoOscuro)
  return (
    <div role="group" aria-label={etiqueta} className={`inline-flex p-1 rounded-control gap-0.5 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
      {opciones.map((o) => {
        const activo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={activo}
            disabled={deshabilitado && !activo}
            onClick={() => onChange(o.valor)}
            className={`sin-tactil relative h-8 px-3 rounded-[10px] text-[13px] font-semibold transition-colors disabled:opacity-40 ${
              activo ? (modoOscuro ? 'text-white' : 'text-zinc-900') : modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            {activo && (
              <motion.span
                layoutId={`pildora-${id}`}
                className={`absolute inset-0 rounded-[10px] shadow-tarjeta ${modoOscuro ? 'bg-zinc-700' : 'bg-white'}`}
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

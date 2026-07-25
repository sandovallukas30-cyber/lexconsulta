import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'

const VERDE = 'var(--accent-base)'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function JurisprudenciaToggle({ checked, onChange, disabled = false }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)

  return (
    <motion.label
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        checked
          ? modoOscuro
            ? 'bg-zinc-800 border-zinc-700'
            : 'bg-blue-50 border-blue-200'
          : modoOscuro
            ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
            : 'bg-white border-zinc-200 hover:border-zinc-300'
      }`}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      <div className="relative inline-block">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          aria-label="Incluir jurisprudencia"
        />
        {/* Checkbox visual personalizado */}
        <motion.div
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            checked
              ? 'border-0'
              : modoOscuro
                ? 'border-zinc-600'
                : 'border-zinc-300'
          }`}
          style={{
            background: checked ? VERDE : modoOscuro ? 'var(--accent-950)' : 'transparent',
          }}
          animate={{ scale: checked ? 1 : 1 }}
        >
          {checked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-white"
            >
              <i className="ti ti-check text-xs" />
            </motion.div>
          )}
        </motion.div>
      </div>

      <div className="flex flex-col gap-0.5">
        <div className={`text-sm font-medium ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          Jurisprudencia
        </div>
        <div
          className={`text-xs ${
            modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          Sentencias y dictámenes
        </div>
      </div>

      {/* Badge de estado */}
      <motion.div
        className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
          checked
            ? 'bg-green-100 text-green-700'
            : modoOscuro
              ? 'bg-zinc-800 text-zinc-400'
              : 'bg-zinc-100 text-zinc-500'
        }`}
        animate={{ opacity: checked ? 1 : 0.6 }}
      >
        {checked ? (
          <span className="flex items-center gap-1">
            <i className="ti ti-book-2 text-xs" />
            Activo
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <i className="ti ti-book text-xs" />
            Inactivo
          </span>
        )}
      </motion.div>
    </motion.label>
  )
}

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
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      type="button"
      title="Incluir jurisprudencia en consultas"
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
        checked
          ? 'text-white'
          : modoOscuro
            ? 'bg-transparent text-zinc-400 hover:text-zinc-300'
            : 'bg-transparent text-zinc-600 hover:text-zinc-900'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={checked ? { background: VERDE } : {}}
    >
      <i className={`ti ${checked ? 'ti-books' : 'ti-book'} text-sm`} />
      <span>Con jurisprudencia</span>
    </button>
  )
}

import { useStore } from '../../store/useStore'

const VERDE = 'var(--accent-base)'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function JurisprudenciaToggle({ checked, onChange, disabled = false }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)

  const opciones: Array<{ valor: boolean; icono: string; label: string; tip: string }> = [
    {
      valor: false,
      icono: 'ti-book',
      label: 'Sin J.',
      tip: 'Solo códigos',
    },
    {
      valor: true,
      icono: 'ti-books',
      label: 'Con J.',
      tip: 'Códigos + jurisprudencia',
    },
  ]

  return (
    <div className="flex items-center gap-1.5 bg-transparent">
      {opciones.map((op) => (
        <button
          key={String(op.valor)}
          onClick={() => !disabled && onChange(op.valor)}
          disabled={disabled}
          type="button"
          title={op.tip}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium ${
            checked === op.valor
              ? modoOscuro
                ? 'bg-zinc-800 text-white'
                : 'text-white'
              : modoOscuro
                ? 'bg-transparent text-zinc-400 hover:text-zinc-300'
                : 'bg-transparent text-zinc-600 hover:text-zinc-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={checked === op.valor ? { background: VERDE } : {}}
        >
          <i className={`ti ${op.icono} text-sm`} />
          <span className="hidden sm:inline">{op.label}</span>
        </button>
      ))}
    </div>
  )
}

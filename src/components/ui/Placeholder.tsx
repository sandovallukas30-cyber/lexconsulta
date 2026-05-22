import { useStore } from '../../store/useStore'

interface Props {
  icono: string
  titulo: string
  descripcion: string
  badge?: string
}

export function Placeholder({ icono, titulo, descripcion, badge = 'En construcción' }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: modoOscuro ? '#0F6E5620' : '#0F6E5610' }}
        >
          <i className={`ti ${icono} text-4xl`} style={{ color: '#0F6E56' }} />
        </div>
        <h3 className={`text-2xl font-serif font-semibold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          {titulo}
        </h3>
        <p className={`text-sm leading-relaxed mb-4 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {descripcion}
        </p>
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: modoOscuro ? '#78350f30' : '#fef3c7',
            color: modoOscuro ? '#fcd34d' : '#92400e',
          }}
        >
          {badge}
        </span>
      </div>
    </div>
  )
}

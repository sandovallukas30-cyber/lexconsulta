import { useStore } from '../../store/useStore'

const VERDE = 'var(--accent-base)'

export function MapaView() {
  const modoOscuro = useStore((s) => s.modoOscuro)

  return (
    <div className={`h-full flex items-center justify-center ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="text-center max-w-md px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
        >
          <i className="ti ti-network text-3xl" style={{ color: VERDE }} />
        </div>
        <h1 className={`text-2xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          Mapa de relaciones
        </h1>
        <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Vista interactiva de las relaciones entre artículos. Próximamente disponible.
        </p>
      </div>
    </div>
  )
}

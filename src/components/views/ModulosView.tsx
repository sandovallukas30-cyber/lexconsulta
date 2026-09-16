import { useStore } from '../../store/useStore'
import { MODULOS } from '../../data/modulos'
import { ModuloCard } from '../ui/ModuloCard'
import { ModuloDetalle } from '../ui/ModuloDetalle'

const VERDE = 'var(--accent-base)'

export function ModulosView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const progresoModulos = useStore((s) => s.progresoModulos)
  const moduloActivoId = useStore((s) => s.moduloActivoId)
  const setModuloActivo = useStore((s) => s.setModuloActivo)

  const modulosOrdenados = [...MODULOS].sort((a, b) => a.orden - b.orden)
  const moduloActivo = moduloActivoId ? MODULOS.find((m) => m.id === moduloActivoId) : undefined

  if (moduloActivo) {
    return <ModuloDetalle modulo={moduloActivo} modoOscuro={modoOscuro} onVolver={() => setModuloActivo(null)} />
  }

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: modoOscuro
                ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
                : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
            }}
          >
            <i className="ti ti-layout-grid text-xl" style={{ color: VERDE }} />
          </div>
          <div>
            <h1 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              Módulos
            </h1>
            <p className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Selecciona un área del derecho para explorar sus contenidos y ver tu progreso
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {modulosOrdenados.map((modulo) => (
            <ModuloCard
              key={modulo.id}
              modulo={modulo}
              progreso={progresoModulos[modulo.id]}
              modoOscuro={modoOscuro}
              onClick={() => setModuloActivo(modulo.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

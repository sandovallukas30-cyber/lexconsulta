import { useAjustes, ZOOMS, prefiereMenosMovimiento, type EstiloUI } from '../../store/useAjustes'
import { Segmentado } from './Segmentado'

/** Interruptor neumórfico (checkbox accesible como `switch`). */
export function Interruptor({
  activo, onChange, etiqueta, descripcion, deshabilitado,
}: {
  activo: boolean
  onChange: (v: boolean) => void
  etiqueta: string
  descripcion?: string
  deshabilitado?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={deshabilitado}
      onClick={() => onChange(!activo)}
      className={`sin-neu sin-tactil w-full flex items-start gap-3 text-left py-2 disabled:opacity-50 ${deshabilitado ? 'cursor-not-allowed' : ''}`}
    >
      <span
        aria-hidden="true"
        className="relative mt-0.5 w-11 h-6 rounded-full flex-shrink-0 transition-colors"
        style={{ background: activo ? 'var(--accent-base)' : 'var(--neu-bg3)', boxShadow: 'var(--neu-presionada-chica)' }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
          style={{ left: activo ? 22 : 2, background: activo ? '#fff' : 'var(--neu-card)', boxShadow: 'var(--neu-chica)' }}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>{etiqueta}</span>
        {descripcion && <span className="block text-xs mt-0.5" style={{ color: 'var(--neu-ink2)' }}>{descripcion}</span>}
      </span>
    </button>
  )
}

/** Tamaño de la interfaz, estilo, contraste, animaciones y celebraciones. */
export function AjustesInterfaz() {
  const a = useAjustes()
  const reducido = prefiereMenosMovimiento()
  const titulo = 'text-sm font-bold mb-2'
  return (
    <div className="space-y-6 mb-8">
      <section>
        <h3 className={titulo} style={{ color: 'var(--neu-ink)' }}>Tamaño de la interfaz</h3>
        <div className="flex flex-wrap gap-2">
          <Segmentado
            id="zoom"
            etiqueta="Tamaño de la interfaz"
            valor={String(a.zoom)}
            onChange={(v) => a.set({ zoom: Number(v) })}
            opciones={ZOOMS.map(([z, nombre]) => ({ valor: String(z), texto: nombre }))}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--neu-ink2)' }}>
          Agranda o achica todo: texto, botones y espacios. Es propio de cada dispositivo: el celular y el computador pueden tener tamaños distintos.
        </p>
      </section>

      <section>
        <h3 className={titulo} style={{ color: 'var(--neu-ink)' }}>Estilo</h3>
        <Segmentado<EstiloUI>
          id="estilo"
          etiqueta="Estilo de la interfaz"
          valor={a.estilo}
          onChange={(v) => a.set({ estilo: v })}
          opciones={[{ valor: 'neumo', texto: 'Neumorfismo' }, { valor: 'plano', texto: 'Plano' }]}
        />
        <p className="text-xs mt-2" style={{ color: 'var(--neu-ink2)' }}>
          «Neumorfismo» levanta y hunde las piezas con sombras suaves. «Plano» usa tarjetas blancas sobre fondo gris, más sobrio.
        </p>
        <Interruptor
          activo={a.contraste}
          onChange={(v) => a.set({ contraste: v })}
          etiqueta="Alto contraste"
          descripcion="Sin relieve, con bordes y textos más fuertes."
        />
      </section>

      <section>
        <h3 className={titulo} style={{ color: 'var(--neu-ink)' }}>Animaciones y efectos</h3>
        <Interruptor
          activo={a.animaciones}
          onChange={(v) => a.set({ animaciones: v })}
          etiqueta="Animaciones suaves al cambiar de sección y abrir ventanas"
        />
        <Interruptor
          activo={a.celebraciones && a.animaciones}
          deshabilitado={!a.animaciones}
          onChange={(v) => a.set({ celebraciones: v })}
          etiqueta="Pequeñas celebraciones al cumplir tareas y enfoques"
        />
        <p className="text-xs mt-1" style={{ color: 'var(--neu-ink2)' }}>
          {reducido
            ? 'Tu dispositivo pidió reducir el movimiento, así que los efectos están desactivados.'
            : 'Si tu dispositivo pide reducir el movimiento, los efectos se desactivan solos.'}
        </p>
      </section>
    </div>
  )
}

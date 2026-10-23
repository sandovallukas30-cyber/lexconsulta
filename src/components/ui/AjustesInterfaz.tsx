import { sumarTamanoCodigo, TAMANO_CODIGO_DEFECTO, TAMANO_CODIGO_MIN, TAMANO_CODIGO_MAX } from '../../store/useAjustes'
import { useAjustes, ZOOMS, prefiereMenosMovimiento } from '../../store/useAjustes'
import { Segmentado } from './Segmentado'

/** Interruptor (checkbox accesible como `switch`). */
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

const titulo = 'text-sm font-bold mb-2'

/** Escala de toda la interfaz. */
export function AjusteTamanoInterfaz() {
  const a = useAjustes()
  return (
    <div>
      <h3 className={titulo} style={{ color: 'var(--neu-ink)' }}>Tamaño de la interfaz</h3>
      <Segmentado
        id="zoom"
        etiqueta="Tamaño de la interfaz"
        valor={String(a.zoom)}
        onChange={(v) => a.set({ zoom: Number(v) })}
        opciones={ZOOMS.map(([z, nombre]) => ({ valor: String(z), texto: nombre }))}
      />
      <p className="text-xs mt-2" style={{ color: 'var(--neu-ink2)' }}>
        Agranda o achica todo: texto, botones y espacios. Es propio de cada dispositivo: el celular y el computador pueden tener tamaños distintos.
      </p>
    </div>
  )
}

/** Tamaño del texto de los artículos, con vista previa. */
export function AjusteTextoCodigos() {
  const a = useAjustes()
  return (
    <div>
      <h3 className={titulo} style={{ color: 'var(--neu-ink)' }}>Tamaño del texto de los códigos</h3>
      <div className="flex items-center gap-3">
        <button onClick={() => a.set({ tamanoCodigo: sumarTamanoCodigo(a.tamanoCodigo, -1) })} disabled={a.tamanoCodigo <= TAMANO_CODIGO_MIN} aria-label="Texto de los códigos más pequeño" className="boton boton-suave boton-icono">
          <i className="ti ti-minus" aria-hidden="true" />
        </button>
        <span className="w-12 text-center text-sm font-bold tabular-nums" style={{ color: 'var(--neu-ink)' }} aria-live="polite">{a.tamanoCodigo}</span>
        <button onClick={() => a.set({ tamanoCodigo: sumarTamanoCodigo(a.tamanoCodigo, 1) })} disabled={a.tamanoCodigo >= TAMANO_CODIGO_MAX} aria-label="Texto de los códigos más grande" className="boton boton-suave boton-icono">
          <i className="ti ti-plus" aria-hidden="true" />
        </button>
        <button onClick={() => a.set({ tamanoCodigo: TAMANO_CODIGO_DEFECTO })} disabled={a.tamanoCodigo === TAMANO_CODIGO_DEFECTO} className="boton boton-fantasma boton-chico">Restablecer</button>
      </div>
      <p className="mt-3 rounded-xl p-3" style={{ background: 'var(--neu-bg3)', color: 'var(--neu-ink)', fontFamily: 'var(--font-serif)', fontSize: a.tamanoCodigo, lineHeight: 1.7 }}>
        Las personas nacen libres e iguales en dignidad y derechos.
      </p>
      <p className="text-xs mt-2" style={{ color: 'var(--neu-ink2)' }}>
        Solo cambia las leyes en el Explorador, y va aparte del tamaño de la interfaz: puedes dejar todo pequeño y leer los códigos más grandes.
      </p>
    </div>
  )
}

/** Alto contraste. */
export function AjusteContraste() {
  const a = useAjustes()
  return (
    <Interruptor
      activo={a.contraste}
      onChange={(v) => a.set({ contraste: v })}
      etiqueta="Alto contraste"
      descripcion="Bordes y textos más fuertes, sin relieves."
    />
  )
}

/** Resumen del día y avisos de evaluaciones. */
export function AjusteAvisos() {
  const a = useAjustes()
  return (
    <div>
      <Interruptor
        activo={a.recordatorios}
        onChange={(v) => {
          a.set({ recordatorios: v })
          // el permiso se pide con un gesto del usuario
          if (v && typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission()
        }}
        etiqueta="Resumen del día y avisos de evaluaciones"
        descripcion="Una vez al día: tus clases y tareas de hoy, y las evaluaciones a 3 días, la víspera y el mismo día. Solo llega mientras Prima Lex esté abierta."
      />
      <label className="flex items-center gap-3 text-sm mt-2" style={{ color: 'var(--neu-ink2)', opacity: a.recordatorios ? 1 : 0.5 }}>
        Hora del resumen
        <select
          disabled={!a.recordatorios}
          value={a.horaResumen}
          onChange={(e) => a.set({ horaResumen: Number(e.target.value) })}
          aria-label="Hora del resumen del día"
          className="h-control px-3 text-sm"
        >
          {[6, 7, 8, 9, 10, 11, 12, 18, 20].map((h) => (
            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
          ))}
        </select>
      </label>
      {a.recordatorios && typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
        <p className="text-xs mt-2" style={{ color: 'var(--neu-danger)' }}>
          El navegador bloqueó las notificaciones; el resumen aparecerá como aviso dentro de la app.
        </p>
      )}
    </div>
  )
}

/** Animaciones y celebraciones. */
export function AjusteAnimaciones() {
  const a = useAjustes()
  const reducido = prefiereMenosMovimiento()
  return (
    <div>
      <Interruptor
        activo={a.animaciones}
        onChange={(v) => a.set({ animaciones: v })}
        etiqueta="Animaciones suaves"
        descripcion="Al cambiar de sección y abrir ventanas."
      />
      <Interruptor
        activo={a.celebraciones && a.animaciones}
        deshabilitado={!a.animaciones}
        onChange={(v) => a.set({ celebraciones: v })}
        etiqueta="Pequeñas celebraciones"
        descripcion="Al cumplir tareas y enfoques."
      />
      <p className="text-xs mt-1" style={{ color: 'var(--neu-ink2)' }}>
        {reducido
          ? 'Tu dispositivo pidió reducir el movimiento, así que los efectos están desactivados.'
          : 'Si tu dispositivo pide reducir el movimiento, los efectos se desactivan solos.'}
      </p>
    </div>
  )
}

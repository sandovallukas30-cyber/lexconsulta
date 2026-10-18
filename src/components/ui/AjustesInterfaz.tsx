import { useAjustes, ZOOMS, prefiereMenosMovimiento, type EstiloUI } from '../../store/useAjustes'
import { Segmentado } from './Segmentado'
import { DibujoMascota } from '../hoy/Mascota'
import { ACCESORIOS_MASCOTA, COLORES_MASCOTA, TIPOS_MASCOTA, mascotaSvg, type AccesorioMascota, type ColorMascota, type TipoMascota } from '../../services/mascota'

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
        <h3 className={titulo} style={{ color: 'var(--neu-ink)' }}>Tu mascota</h3>
        <Interruptor activo={a.mascotaActiva} onChange={(v) => a.set({ mascotaActiva: v })} etiqueta="Mostrar mi mascota en Hoy" descripcion="Te acompaña, comenta cómo va tu día y se deja acariciar." />
        {a.mascotaActiva && (
          <div className="mt-3 flex flex-col sm:flex-row gap-5">
            <DibujoMascota
              svg={mascotaSvg({ tipo: a.mascotaTipo, color: a.mascotaColor, accesorio: a.mascotaAccesorio, animo: 'feliz' })}
              className="w-28 h-28 rounded-full p-2 flex-shrink-0 mx-auto sm:mx-0"
              style={{ background: 'var(--neu-card)', boxShadow: 'var(--neu-plana)' }}
            />
            <div className="flex-1 space-y-3 min-w-0">
              <div role="group" aria-label="Tipo de mascota" className="flex gap-2 flex-wrap">
                {TIPOS_MASCOTA.map((t) => (
                  <button
                    key={t.id}
                    aria-pressed={a.mascotaTipo === t.id}
                    onClick={() => a.set({ mascotaTipo: t.id as TipoMascota })}
                    className={`boton boton-chico ${a.mascotaTipo === t.id ? 'boton-primario' : 'boton-suave'}`}
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-semibold" style={{ color: 'var(--neu-ink2)' }}>
                Nombre
                <input
                  value={a.mascotaNombre}
                  maxLength={16}
                  onChange={(e) => a.set({ mascotaNombre: e.target.value })}
                  onBlur={() => a.mascotaNombre.trim() === '' && a.set({ mascotaNombre: 'Lex' })}
                  aria-label="Nombre de la mascota"
                  className="mt-1 w-full h-control px-3 text-sm"
                />
              </label>
              <div role="group" aria-label="Color de la mascota" className="flex gap-2 flex-wrap items-center">
                <span className="text-xs font-semibold mr-1" style={{ color: 'var(--neu-ink2)' }}>Color</span>
                {(Object.keys(COLORES_MASCOTA) as ColorMascota[]).map((c) => (
                  <button
                    key={c}
                    aria-label={COLORES_MASCOTA[c].nombre}
                    aria-pressed={a.mascotaColor === c}
                    title={COLORES_MASCOTA[c].nombre}
                    onClick={() => a.set({ mascotaColor: c })}
                    className="sin-neu sin-tactil w-7 h-7 rounded-full"
                    style={{
                      background: COLORES_MASCOTA[c].base,
                      boxShadow: a.mascotaColor === c ? '0 0 0 3px var(--neu-card), 0 0 0 5px var(--accent-base)' : 'var(--neu-chica)',
                    }}
                  />
                ))}
              </div>
              <div role="group" aria-label="Accesorio" className="flex gap-2 flex-wrap items-center">
                <span className="text-xs font-semibold mr-1" style={{ color: 'var(--neu-ink2)' }}>Accesorio</span>
                {ACCESORIOS_MASCOTA.map((x) => (
                  <button
                    key={x.id}
                    aria-pressed={a.mascotaAccesorio === x.id}
                    onClick={() => a.set({ mascotaAccesorio: x.id as AccesorioMascota })}
                    className={`boton boton-chico ${a.mascotaAccesorio === x.id ? 'boton-primario' : 'boton-suave'}`}
                  >
                    {x.nombre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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
        <h3 className={titulo} style={{ color: 'var(--neu-ink)' }}>Avisos</h3>
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

import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useEnfoque, esFlow, msEnfocados, msMostrados } from '../../store/useEnfoque'
import { useAhora } from '../../hooks/useMotorEnfoque'
import { AnilloProgreso } from '../ui/AnilloProgreso'
import { Segmentado } from '../ui/Segmentado'
import { SelectorRamo } from '../ui/SelectorRamo'
import { colorRamo, hoyISO, nombreRamo } from '../../services/tareasPlan'
import {
  horasMin,
  lunesDe,
  minutosEnFecha,
  minutosPorDia,
  minutosPorRamo,
  mmss,
  NOMBRE_MODO,
  rachaMeta,
  type Modo,
  type Tecnica,
} from '../../services/enfoque'

const COLOR_MODO: Record<Modo, string> = { foco: 'var(--accent-base)', corto: '#16a34a', largo: '#0d9488' }
const DIA_INICIAL = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function useEstilos() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  return {
    modoOscuro,
    tarjeta: `rounded-tarjeta border p-4 sm:p-5 shadow-tarjeta ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`,
    campo: `h-control px-3 rounded-control border text-sm outline-none campo-foco w-full ${
      modoOscuro ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
    }`,
    suave: modoOscuro ? 'text-zinc-400' : 'text-zinc-500',
    titulo: modoOscuro ? 'text-white' : 'text-zinc-900',
  }
}

function Paso({
  etiqueta, valor, min, max, onChange, unidad = 'min', deshabilitado,
}: {
  etiqueta: string
  valor: number
  min: number
  max: number
  onChange: (n: number) => void
  unidad?: string
  deshabilitado?: boolean
}) {
  const e = useEstilos()
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className={`text-sm ${e.modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>{etiqueta}</span>
      <div className="flex items-center gap-1.5">
        <button
          aria-label={`Menos ${etiqueta}`}
          disabled={deshabilitado || valor <= min}
          onClick={() => onChange(Math.max(min, valor - 1))}
          className="boton boton-suave boton-chico boton-icono"
        >
          <i className="ti ti-minus" aria-hidden="true" />
        </button>
        <span className={`w-16 text-center text-sm font-semibold tabular-nums ${e.titulo}`}>
          {valor} {unidad}
        </span>
        <button
          aria-label={`Más ${etiqueta}`}
          disabled={deshabilitado || valor >= max}
          onClick={() => onChange(Math.min(max, valor + 1))}
          className="boton boton-suave boton-chico boton-icono"
        >
          <i className="ti ti-plus" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function Temporizador() {
  const e = useEstilos()
  const s = useEnfoque()
  const tareas = useStore((st) => st.tareasPlan)
  const [verAjustes, setVerAjustes] = useState(false)
  const corriendo = s.estado === 'corriendo'
  const ahora = useAhora(corriendo)
  const flow = esFlow(s)
  const ms = msMostrados(s, ahora)
  const enfocadoMin = Math.floor(msEnfocados(s, ahora) / 60_000)

  // el anillo: en Pomodoro se vacía; en Flowtime se llena con cada bloque del largo de un Pomodoro
  const bloque = Math.max(60_000, s.ajustes.foco * 60_000)
  const progreso = flow ? (ms % bloque) / bloque || (ms > 0 ? 1 : 0) : s.totalMs ? ms / s.totalMs : 0
  const color = COLOR_MODO[s.modo]
  const detenido = s.estado === 'detenido'

  const pendientes = useMemo(
    () => tareas.filter((t) => !t.hecha && (!s.ramoId || t.ramoId === s.ramoId)),
    [tareas, s.ramoId]
  )

  const alIniciar = () => {
    // pedir permiso de avisos con un gesto del usuario, solo la primera vez
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission()
    s.iniciar()
  }

  const etiquetaCentro = s.modo === 'foco' ? (flow ? 'Flowtime' : 'Enfoque') : NOMBRE_MODO[s.modo]
  const puedeTerminar = s.modo === 'foco' && s.estado !== 'detenido' && enfocadoMin >= 1

  return (
    <section className={`${e.tarjeta} flex flex-col items-center`} aria-label="Temporizador">
      <Segmentado<Modo>
        id="modo"
        etiqueta="Modo del temporizador"
        valor={s.modo}
        onChange={s.setModo}
        deshabilitado={!detenido}
        opciones={[
          { valor: 'foco', texto: 'Enfoque' },
          { valor: 'corto', texto: 'Descanso corto' },
          { valor: 'largo', texto: 'Descanso largo' },
        ]}
      />

      <div className="my-6">
        <AnilloProgreso
          progreso={progreso}
          tamano={260}
          grosor={14}
          color={color}
          modoOscuro={e.modoOscuro}
          etiqueta={`${etiquetaCentro}: ${mmss(ms)}`}
        >
          <span className={`text-5xl font-bold tabular-nums tracking-tight ${e.titulo}`} aria-live="off">
            {mmss(ms)}
          </span>
          <span className={`text-sm mt-1 ${e.suave}`}>{etiquetaCentro}</span>
          {s.modo === 'foco' && s.estado !== 'detenido' && !flow && (
            <span className={`text-xs mt-1 ${e.suave}`}>{enfocadoMin} min enfocados</span>
          )}
        </AnilloProgreso>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={s.reiniciar} aria-label="Reiniciar" title="Reiniciar" disabled={detenido && !flow} className="boton boton-suave boton-icono">
          <i className="ti ti-rotate" aria-hidden="true" />
        </button>
        <button
          onClick={corriendo ? s.pausar : alIniciar}
          className="boton boton-primario px-8 min-w-[140px]"
          style={{ background: color }}
        >
          <i className={`ti ${corriendo ? 'ti-player-pause' : 'ti-player-play'}`} aria-hidden="true" />
          {corriendo ? 'Pausar' : s.estado === 'pausado' ? 'Reanudar' : 'Iniciar'}
        </button>
        {s.modo === 'foco' ? (
          <button
            onClick={s.terminar}
            disabled={!puedeTerminar}
            aria-label="Terminar y guardar la sesión"
            title="Terminar y guardar la sesión"
            className="boton boton-suave boton-icono"
          >
            <i className="ti ti-flag-check" aria-hidden="true" />
          </button>
        ) : (
          <button onClick={s.saltarDescanso} aria-label="Saltar el descanso" title="Saltar el descanso" className="boton boton-suave boton-icono">
            <i className="ti ti-player-skip-forward" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-5" aria-label={`Ciclo: ${s.ciclo % s.ajustes.cada} de ${s.ajustes.cada} enfoques`} role="img">
        {Array.from({ length: s.ajustes.cada }).map((_, i) => (
          <span
            key={i}
            className="w-2.5 h-2.5 rounded-full transition-colors"
            style={{ background: i < s.ciclo % s.ajustes.cada ? 'var(--accent-base)' : e.modoOscuro ? '#323c4e' : '#d5dbe6' }}
          />
        ))}
      </div>

      <div className="w-full max-w-md mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={`block text-xs font-medium mb-1 ${e.suave}`}>¿De qué ramo?</span>
          <SelectorRamo
            valor={s.ramoId}
            onChange={(v) => s.setObjetivo(v, v === s.ramoId ? s.tareaId : null)}
            className={e.campo}
            etiqueta="Ramo de la sesión"
            textoVacio="Sin ramo"
          />
        </label>
        <label className="block">
          <span className={`block text-xs font-medium mb-1 ${e.suave}`}>¿Con qué tarea?</span>
          <select
            aria-label="Tarea de la sesión"
            value={s.tareaId ?? ''}
            onChange={(ev) => {
              const t = tareas.find((x) => x.id === ev.target.value)
              s.setObjetivo(t?.ramoId ?? s.ramoId, t?.id ?? null)
            }}
            className={e.campo}
          >
            <option value="">Sin tarea</option>
            {pendientes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-col items-center gap-2 w-full">
        <Segmentado<Tecnica>
          id="tecnica"
          etiqueta="Técnica"
          valor={s.tecnica}
          onChange={s.setTecnica}
          deshabilitado={!detenido}
          opciones={[
            { valor: 'pomodoro', texto: 'Pomodoro' },
            { valor: 'flowtime', texto: 'Flowtime' },
          ]}
        />
        <p className={`text-xs text-center max-w-sm ${e.suave}`}>
          {flow
            ? 'Flowtime: el reloj sube mientras te concentras y paras cuando quieras; el descanso se sugiere según cuánto enfocaste.'
            : `Pomodoro: ${s.ajustes.foco} min de enfoque y ${s.ajustes.corto} de descanso; cada ${s.ajustes.cada} enfoques, un descanso largo de ${s.ajustes.largo}.`}
        </p>
        <button onClick={() => setVerAjustes((v) => !v)} aria-expanded={verAjustes} className={`text-xs font-semibold flex items-center gap-1 ${e.suave}`}>
          <i className={`ti ti-chevron-right transition-transform ${verAjustes ? 'rotate-90' : ''}`} aria-hidden="true" />
          Ajustes
        </button>
      </div>

      {verAjustes && (
        <div className={`w-full max-w-sm mt-2 divide-y ${e.modoOscuro ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
          <Paso etiqueta="Enfoque" valor={s.ajustes.foco} min={5} max={120} onChange={(n) => s.ajustar({ foco: n })} deshabilitado={s.estado === 'corriendo'} />
          <Paso etiqueta="Descanso corto" valor={s.ajustes.corto} min={1} max={30} onChange={(n) => s.ajustar({ corto: n })} deshabilitado={s.estado === 'corriendo'} />
          <Paso etiqueta="Descanso largo" valor={s.ajustes.largo} min={5} max={60} onChange={(n) => s.ajustar({ largo: n })} deshabilitado={s.estado === 'corriendo'} />
          <Paso etiqueta="Largo cada" valor={s.ajustes.cada} min={2} max={8} unidad="enfoques" onChange={(n) => s.ajustar({ cada: n })} />
          <Paso etiqueta="Meta del día" valor={s.ajustes.metaDia} min={15} max={600} onChange={(n) => s.ajustar({ metaDia: n })} />
          <label className="flex items-center justify-between py-2 cursor-pointer">
            <span className={`text-sm ${e.modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Sonido al terminar</span>
            <input type="checkbox" checked={s.ajustes.sonido} onChange={(ev) => s.ajustar({ sonido: ev.target.checked })} style={{ accentColor: 'var(--accent-base)' }} className="w-4 h-4" />
          </label>
          <label className="flex items-center justify-between py-2 cursor-pointer">
            <span className={`text-sm ${e.modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Empezar solo el siguiente tramo</span>
            <input type="checkbox" checked={s.ajustes.autoSiguiente} onChange={(ev) => s.ajustar({ autoSiguiente: ev.target.checked })} style={{ accentColor: 'var(--accent-base)' }} className="w-4 h-4" />
          </label>
        </div>
      )}
    </section>
  )
}

function Resumen() {
  const e = useEstilos()
  const sesiones = useEnfoque((s) => s.sesiones)
  const ajustes = useEnfoque((s) => s.ajustes)
  const ramos = useStore((s) => s.ramos)
  const hoy = hoyISO()
  const minHoy = minutosEnFecha(sesiones, hoy)
  const racha = rachaMeta(sesiones, ajustes.metaDia, hoy)
  const semana = useMemo(() => minutosPorDia(sesiones, hoy, 7), [sesiones, hoy])
  const maxSemana = Math.max(ajustes.metaDia, ...semana.map((d) => d.minutos), 1)
  const totalSemana = semana.reduce((a, d) => a + d.minutos, 0)
  const porRamo = useMemo(() => minutosPorRamo(sesiones, lunesDe(hoy)).slice(0, 5), [sesiones, hoy])
  const maxRamo = Math.max(1, ...porRamo.map((r) => r.minutos))

  return (
    <div className="space-y-4">
      <section className={`${e.tarjeta} flex items-center gap-5`} aria-label="Meta del día">
        <AnilloProgreso progreso={minHoy / Math.max(1, ajustes.metaDia)} tamano={96} grosor={9} modoOscuro={e.modoOscuro} etiqueta={`${minHoy} de ${ajustes.metaDia} minutos hoy`}>
          <span className={`text-lg font-bold tabular-nums ${e.titulo}`}>{Math.round(Math.min(1, minHoy / Math.max(1, ajustes.metaDia)) * 100)}%</span>
        </AnilloProgreso>
        <div>
          <div className={`text-xs font-semibold uppercase tracking-wide ${e.suave}`}>Hoy</div>
          <div className={`text-2xl font-bold ${e.titulo}`}>{horasMin(minHoy)}</div>
          <div className={`text-xs ${e.suave}`}>
            meta {horasMin(ajustes.metaDia)}
            {racha > 0 && ` · ${racha} ${racha === 1 ? 'día' : 'días'} seguidos con meta`}
          </div>
        </div>
      </section>

      <section className={e.tarjeta} aria-label="Últimos 7 días">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className={`text-sm font-semibold ${e.modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>Últimos 7 días</h2>
          <span className={`text-xs ${e.suave}`}>{horasMin(totalSemana)}</span>
        </div>
        <div className="flex items-end gap-2">
          {semana.map((d) => {
            // altura en píxeles: un % no funciona dentro de un contenedor flex sin alto fijo
            const alto = d.minutos > 0 ? Math.max(6, Math.round((d.minutos / maxSemana) * 88)) : 4
            const [a, m, dd] = d.fecha.split('-').map(Number)
            const dow = (new Date(a, m - 1, dd).getDay() + 6) % 7
            const esHoy = d.fecha === hoy
            return (
              <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1.5" title={`${d.fecha}: ${horasMin(d.minutos)}`}>
                <div className="w-full flex items-end" style={{ height: 88 }}>
                  <div
                    className="w-full rounded-md transition-all"
                    style={{
                      height: alto,
                      background: d.minutos >= ajustes.metaDia ? 'var(--accent-base)' : d.minutos > 0 ? 'color-mix(in srgb, var(--accent-base) 45%, transparent)' : e.modoOscuro ? '#1c2230' : '#e6eaf1',
                    }}
                  />
                </div>
                <span className={`text-[11px] font-semibold ${esHoy ? '' : e.suave}`} style={esHoy ? { color: 'var(--accent-texto)' } : undefined}>
                  {DIA_INICIAL[dow]}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {porRamo.length > 0 && (
        <section className={e.tarjeta} aria-label="Esta semana por ramo">
          <h2 className={`text-sm font-semibold mb-3 ${e.modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>Esta semana por ramo</h2>
          <ul className="space-y-2.5">
            {porRamo.map((r) => (
              <li key={r.ramoId ?? 'sin'}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`truncate ${e.modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>{nombreRamo(r.ramoId, ramos) ?? 'Sin ramo'}</span>
                  <span className={`flex-shrink-0 ml-2 ${e.suave}`}>{horasMin(r.minutos)}</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${e.modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <div className="h-full rounded-full" style={{ width: `${(r.minutos / maxRamo) * 100}%`, background: colorRamo(r.ramoId, ramos) }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function SesionesDeHoy() {
  const e = useEstilos()
  const sesiones = useEnfoque((s) => s.sesiones)
  const eliminar = useEnfoque((s) => s.eliminarSesion)
  const registrar = useEnfoque((s) => s.registrarManual)
  const ramos = useStore((s) => s.ramos)
  const tareas = useStore((s) => s.tareasPlan)
  const [manual, setManual] = useState('')
  const hoy = hoyISO()
  const delDia = sesiones.filter((x) => x.fecha === hoy).sort((a, b) => b.inicio - a.inicio)

  return (
    <section className={e.tarjeta} aria-label="Sesiones de hoy">
      <h2 className={`text-sm font-semibold mb-2 ${e.modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>Sesiones de hoy</h2>
      {delDia.length === 0 ? (
        <p className={`text-sm py-2 ${e.suave}`}>Aún no hay sesiones hoy. Inicia un enfoque y queda registrado aquí.</p>
      ) : (
        <ul className={`divide-y ${e.modoOscuro ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
          {delDia.map((x) => {
            const hora = new Date(x.inicio).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
            const tarea = x.tareaId ? tareas.find((t) => t.id === x.tareaId)?.titulo : null
            return (
              <li key={x.id} className="flex items-center gap-3 py-2">
                <span className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: colorRamo(x.ramoId, ramos) }} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${e.titulo}`}>
                    {horasMin(x.minutos)} <span className={`font-normal ${e.suave}`}>· {hora}</span>
                  </div>
                  <div className={`text-xs truncate ${e.suave}`}>{[nombreRamo(x.ramoId, ramos), tarea].filter(Boolean).join(' · ') || 'Sin ramo'}</div>
                </div>
                <button onClick={() => eliminar(x.id)} aria-label="Eliminar sesión" className="boton boton-fantasma boton-chico boton-icono">
                  <i className="ti ti-trash text-sm" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <form
        className="flex gap-2 mt-3"
        onSubmit={(ev) => {
          ev.preventDefault()
          registrar(Number(manual))
          setManual('')
        }}
      >
        <input
          type="number"
          min={1}
          max={600}
          inputMode="numeric"
          value={manual}
          onChange={(ev) => setManual(ev.target.value)}
          aria-label="Minutos estudiados sin el temporizador"
          placeholder="¿Estudiaste sin el reloj? Minutos…"
          className={e.campo}
        />
        <button type="submit" disabled={!(Number(manual) >= 1)} className="boton boton-suave">
          Registrar
        </button>
      </form>
    </section>
  )
}

export function EnfoqueView() {
  const e = useEstilos()
  return (
    <div className={`h-full overflow-y-auto ${e.modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <header>
          <h1 className={`text-2xl font-bold tracking-tight ${e.titulo}`}>Enfoque</h1>
          <p className={`text-sm mt-1 ${e.suave}`}>Estudia en bloques con descansos. El reloj sigue corriendo aunque cambies de sección.</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          <div className="lg:col-span-3">
            <Temporizador />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Resumen />
            <SesionesDeHoy />
          </div>
        </div>
      </div>
    </div>
  )
}

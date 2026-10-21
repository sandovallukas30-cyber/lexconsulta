import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { FilaTarea } from '../ui/FilaTarea'
import { LoQueSigue } from '../hoy/LoQueSigue'
import { Solemnes } from '../hoy/Solemnes'
import { CompartirSemana } from '../hoy/CompartirSemana'
import { AnilloProgreso } from '../ui/AnilloProgreso'
import { useEnfoque, msMostrados } from '../../store/useEnfoque'
import { useAhora } from '../../hooks/useMotorEnfoque'
import { horasMin, minutosEnFecha, mmss } from '../../services/enfoque'
import { calcularRachaEstudio, contarTarjetasVencidas } from '../../services/actividadEstudio'
import {
  evaluacionesPendientes,
} from '../../services/modulosAcademico'
import { colorRamo, filtrarTareas, hoyISO, nombreRamo } from '../../services/tareasPlan'

const MAX_TAREAS = 6

function saludo(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

function fechaLarga(): string {
  const t = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function Tarjeta({
  titulo,
  icono,
  derecha,
  children,
}: {
  titulo: string
  icono: string
  derecha?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="neu-raised p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <i className={`ti ${icono} text-lg`} style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
        <h2 className="text-[15px] font-bold flex-1" style={{ color: 'var(--neu-ink)' }}>{titulo}</h2>
        {derecha}
      </div>
      {children}
    </section>
  )
}

export function HoyView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const tareas = useStore((s) => s.tareasPlan)
  const ramos = useStore((s) => s.ramos)
  const academico = useStore((s) => s.academicoModulos)
  const colecciones = useStore((s) => s.colecciones)
  const dias = useStore((s) => s.diasActividadEstudio)
  const agregar = useStore((s) => s.agregarTareaPlan)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const [nueva, setNueva] = useState('')
  const sesionesFoco = useEnfoque((e) => e.sesiones)
  const metaFoco = useEnfoque((e) => e.ajustes.metaDia)
  const relojEnfoque = useEnfoque()
  const ahoraEnfoque = useAhora(relojEnfoque.estado === 'corriendo')
  const minFoco = minutosEnFecha(sesionesFoco, hoyISO())

  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  const hoy = hoyISO()

  const paraHoy = useMemo(() => filtrarTareas(tareas, 'hoy'), [tareas])
  const hechasHoy = useMemo(() => tareas.filter((t) => t.hecha && t.hechaEn === hoy).length, [tareas, hoy])
  const setClasesModulo = useStore((st) => st.setClasesModulo)
  // todas las clases de hoy, también las ya vistas: así se puede marcar la asistencia
  const clasesHoy = useMemo(() => {
    const out: { moduloId: string; id: string; tema: string; hora?: string; sala?: string; asistio?: boolean; completada: boolean }[] = []
    for (const [moduloId, d] of Object.entries(academico)) {
      for (const c of d.clases) if (c.fecha === hoy) out.push({ moduloId, id: c.id, tema: c.tema, hora: c.hora, sala: c.sala, asistio: c.asistio, completada: c.completada })
    }
    return out.sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99'))
  }, [academico, hoy])
  const marcarAsistencia = (moduloId: string, claseId: string, valor: boolean) => {
    const lista = useStore.getState().academicoModulos[moduloId]?.clases ?? []
    setClasesModulo(moduloId, lista.map((c) => (c.id === claseId ? { ...c, asistio: c.asistio === valor ? undefined : valor, completada: valor ? true : c.completada } : c)))
  }
  const evaluaciones = useMemo(() => evaluacionesPendientes(academico).proximas.slice(0, 3), [academico])
  const tarjetas = useMemo(() => contarTarjetasVencidas(colecciones), [colecciones])
  const racha = calcularRachaEstudio(dias)
  const sinNada = ramos.length === 0 && tareas.length === 0

  const abrirModulo = (id: string) => {
    useStore.setState({ vistaActiva: 'modulos', moduloActivoId: id })
  }

  const agregarRapida = (e: React.FormEvent) => {
    e.preventDefault()
    const t = nueva.trim()
    if (!t) return
    agregar({ titulo: t, ramoId: null, fecha: hoy, prioridad: 'media' })
    setNueva('')
  }

  const resumen = [
    paraHoy.length > 0 && `${paraHoy.length} ${paraHoy.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}`,
    clasesHoy.length > 0 && `${clasesHoy.length} ${clasesHoy.length === 1 ? 'clase' : 'clases'}`,
    evaluaciones[0] && evaluaciones[0].dias <= 7 && `${evaluaciones.filter((x) => x.dias <= 7).length} ${evaluaciones.filter((x) => x.dias <= 7).length === 1 ? 'evaluación' : 'evaluaciones'} esta semana`,
  ].filter(Boolean)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
          <p className={`text-sm ${suave}`}>{fechaLarga()}</p>
          <h1 className="text-[32px] font-extrabold leading-tight" style={{ color: 'var(--neu-ink)' }}>{saludo()}</h1>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {resumen.length === 0 && <span className={`text-sm ${suave}`}>Hoy no tienes nada pendiente registrado.</span>}
            {resumen.map((r, i) => (
              <span
                key={String(r)}
                className="text-[12.5px] font-bold px-3 py-1 rounded-full"
                style={
                  i === 0
                    ? { background: 'var(--accent-100)', color: 'var(--accent-700)' }
                    : String(r).includes('evaluaci')
                    ? { background: 'var(--neu-warn-soft)', color: 'var(--neu-warn)' }
                    : { background: 'var(--neu-bg)', boxShadow: 'var(--neu-chica)', color: 'var(--neu-ink2)' }
                }
              >
                {r}
              </span>
            ))}
            {hechasHoy > 0 && (
              <span className="text-[12.5px] font-bold px-3 py-1 rounded-full" style={{ background: 'var(--neu-ok-soft)', color: 'var(--neu-ok)' }}>
                {hechasHoy} {hechasHoy === 1 ? 'hecha' : 'hechas'} hoy
              </span>
            )}
          </div>
          </div>
        </header>

        {hechasHoy + paraHoy.length > 0 && (
            <div className="neu-raised px-6 py-5">
              <div className="flex justify-between text-[15px] mb-2.5">
                <span className="font-bold" style={{ color: paraHoy.length === 0 ? 'var(--accent-texto)' : 'var(--neu-ink)' }}>
                  {paraHoy.length === 0 ? 'Terminaste todo lo de hoy' : `${hechasHoy} de ${hechasHoy + paraHoy.length} tareas hechas`}
                </span>
                <span className="font-extrabold" style={{ color: 'var(--accent-texto)' }}>{Math.round((hechasHoy / (hechasHoy + paraHoy.length)) * 100)}%</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-200'}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((hechasHoy / (hechasHoy + paraHoy.length)) * 100)} aria-label="Avance de tus tareas de hoy">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(hechasHoy / (hechasHoy + paraHoy.length)) * 100}%`, background: 'var(--accent-base)' }} />
              </div>
            </div>
          )}

        <LoQueSigue />

        {sinNada && (
          <div className={`rounded-tarjeta border border-dashed p-5 text-center ${modoOscuro ? 'border-zinc-700' : 'border-zinc-300'}`}>
            <p className={`text-sm mb-3 ${suave}`}>Empieza agregando los ramos que cursas este semestre. Con eso, Hoy te muestra clases, evaluaciones y repaso.</p>
            <button onClick={() => useStore.getState().pedirNuevoRamo()} className="boton boton-primario">
              <i className="ti ti-plus" aria-hidden="true" />
              Crear mi primer ramo
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Tarjeta
            titulo="Para hoy"
            icono="ti-checkbox"
            derecha={
              <button onClick={() => setVistaActiva('tareas')} className={`text-xs font-medium ${suave} hover:underline`}>
                Ver todas
              </button>
            }
          >
            {paraHoy.length === 0 ? (
              <p className={`text-sm py-2 ${suave}`}>Sin tareas para hoy.</p>
            ) : (
              <ul className={`divide-y ${modoOscuro ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
                {paraHoy.slice(0, MAX_TAREAS).map((t) => (
                  <li key={t.id}>
                    <FilaTarea tarea={t} />
                  </li>
                ))}
              </ul>
            )}
            {paraHoy.length > MAX_TAREAS && (
              <button onClick={() => setVistaActiva('tareas')} className={`text-xs mt-1 ${suave} hover:underline`}>
                y {paraHoy.length - MAX_TAREAS} más…
              </button>
            )}
            <form onSubmit={agregarRapida} className="flex gap-2 mt-3">
              <input
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                aria-label="Agregar tarea para hoy"
                placeholder="Agregar algo para hoy…"
                maxLength={200}
                className={`flex-1 min-w-0 h-control px-3 rounded-control border text-sm outline-none campo-foco ${
                  modoOscuro
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                }`}
              />
              <button type="submit" disabled={!nueva.trim()} className="boton boton-suave">
                Agregar
              </button>
            </form>
          </Tarjeta>

          <Tarjeta titulo="Enfoque de hoy" icono="ti-hourglass-high">
            <div className="flex items-center gap-4">
              <AnilloProgreso progreso={minFoco / Math.max(1, metaFoco)} tamano={84} grosor={8} modoOscuro={modoOscuro} etiqueta={`${minFoco} de ${metaFoco} minutos de enfoque hoy`}>
                <span className={`text-base font-bold tabular-nums ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{Math.round(Math.min(1, minFoco / Math.max(1, metaFoco)) * 100)}%</span>
              </AnilloProgreso>
              <div className="min-w-0">
                <div className={`text-lg font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{horasMin(minFoco)}</div>
                <div className={`text-xs ${suave}`}>de {horasMin(metaFoco)} de meta</div>
              </div>
            </div>
            <button onClick={() => setVistaActiva('enfoque')} className="boton boton-primario w-full mt-3">
              <i className={`ti ${relojEnfoque.estado === 'detenido' ? 'ti-player-play' : 'ti-hourglass-high'}`} aria-hidden="true" />
              {relojEnfoque.estado === 'detenido' ? 'Iniciar un enfoque' : `Ver temporizador · ${mmss(msMostrados(relojEnfoque, ahoraEnfoque))}`}
            </button>
          </Tarjeta>

          {!sinNada && (<>
          <Tarjeta titulo="Clases de hoy" icono="ti-calendar-event">
            {clasesHoy.length === 0 ? (
              <p className={`text-sm py-2 ${suave}`}>
                No hay clases registradas para hoy. Se muestran las que agregues en la pestaña Clases de cada ramo.
              </p>
            ) : (
              <ul className="space-y-1">
                {clasesHoy.map((e) => (
                  <li key={e.id} className={`flex items-center gap-2 rounded-control ${modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}>
                    <button onClick={() => abrirModulo(e.moduloId)} className="flex-1 min-w-0 flex items-center gap-3 p-2 text-left">
                      <span className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: colorRamo(e.moduloId, ramos) }} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className={`block text-sm font-medium truncate ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{e.tema || nombreRamo(e.moduloId, ramos) || 'Clase'}</span>
                        <span className={`block text-xs ${suave}`}>{e.hora ? `${e.hora} · ` : ''}{nombreRamo(e.moduloId, ramos) ?? 'Ramo'}{e.sala ? ` · ${e.sala}` : ''}</span>
                      </span>
                    </button>
                    <span className="flex gap-1 pr-2 flex-shrink-0" role="group" aria-label={`Asistencia a ${e.tema || nombreRamo(e.moduloId, ramos) || 'la clase'}`}>
                      <button onClick={() => marcarAsistencia(e.moduloId, e.id, true)} aria-pressed={e.asistio === true} className="boton boton-chico boton-suave">
                        Fui
                      </button>
                      <button
                        onClick={() => marcarAsistencia(e.moduloId, e.id, false)}
                        aria-pressed={e.asistio === false}
                        className={`boton boton-chico ${e.asistio === false ? '' : 'boton-suave'}`}
                        style={e.asistio === false ? { background: '#dc2626', color: '#fff' } : undefined}
                      >
                        Falté
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta
            titulo="Solemnes y evaluaciones"
            icono="ti-clipboard-check"
            derecha={
              <button onClick={() => setVistaActiva('modulos')} className={`text-xs font-medium ${suave} hover:underline`}>
                Módulos
              </button>
            }
          >
            <Solemnes />
          </Tarjeta>

          <Tarjeta titulo="Repaso y constancia" icono="ti-flame">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setVistaActiva('colecciones')}
                className={`p-3 rounded-control text-left ${modoOscuro ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100'}`}
              >
                <div className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{tarjetas}</div>
                <div className={`text-xs ${suave}`}>{tarjetas === 1 ? 'tarjeta por repasar' : 'tarjetas por repasar'}</div>
              </button>
              <div className={`p-3 rounded-control ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <div className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{racha}</div>
                <div className={`text-xs ${suave}`}>{racha === 1 ? 'día seguido' : 'días seguidos'}</div>
              </div>
            </div>
            <p className={`text-xs mt-3 ${suave}`}>Cuenta estudiar con apuntes, tarjetas o Práctica, o terminar una tarea.</p>
            <CompartirSemana />
          </Tarjeta>
          </>)}
        </div>
      </div>
    </div>
  )
}

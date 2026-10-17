import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { FilaTarea } from '../ui/FilaTarea'
import { calcularRachaEstudio, contarTarjetasVencidas } from '../../services/actividadEstudio'
import {
  diasHasta,
  evaluacionesPendientes,
  formatearCountdown,
  obtenerProximosEventos,
  urgenciaDe,
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
  const modoOscuro = useStore((s) => s.modoOscuro)
  return (
    <section className={`rounded-tarjeta border p-4 shadow-tarjeta ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <i className={`ti ${icono} text-base`} style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
        <h2 className={`text-sm font-semibold flex-1 ${modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>{titulo}</h2>
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

  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  const hoy = hoyISO()

  const paraHoy = useMemo(() => filtrarTareas(tareas, 'hoy'), [tareas])
  const hechasHoy = useMemo(() => tareas.filter((t) => t.hecha && t.hechaEn === hoy).length, [tareas, hoy])
  const clasesHoy = useMemo(
    () => obtenerProximosEventos(academico).filter((e) => e.tipo === 'clase' && diasHasta(e.fecha) === 0),
    [academico]
  )
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
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <header>
          <p className={`text-sm ${suave}`}>{fechaLarga()}</p>
          <h1 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{saludo()}</h1>
          <p className={`text-sm mt-1 ${suave}`}>
            {resumen.length > 0 ? resumen.join(' · ') : 'Hoy no tienes nada pendiente registrado.'}
            {hechasHoy > 0 && ` · ${hechasHoy} ${hechasHoy === 1 ? 'hecha' : 'hechas'} hoy`}
          </p>
        </header>

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

          {!sinNada && (<>
          <Tarjeta titulo="Clases de hoy" icono="ti-calendar-event">
            {clasesHoy.length === 0 ? (
              <p className={`text-sm py-2 ${suave}`}>
                No hay clases registradas para hoy. Se muestran las que agregues en la pestaña Clases de cada ramo.
              </p>
            ) : (
              <ul className="space-y-1">
                {clasesHoy.map((e, i) => (
                  <li key={`${e.moduloId}-${i}`}>
                    <button
                      onClick={() => abrirModulo(e.moduloId)}
                      className={`w-full flex items-center gap-3 p-2 rounded-control text-left ${modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
                    >
                      <span className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: colorRamo(e.moduloId, ramos) }} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className={`block text-sm font-medium truncate ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{e.titulo}</span>
                        <span className={`block text-xs ${suave}`}>{nombreRamo(e.moduloId, ramos) ?? 'Ramo'}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta
            titulo="Próximas evaluaciones"
            icono="ti-clipboard-check"
            derecha={
              <button onClick={() => setVistaActiva('modulos')} className={`text-xs font-medium ${suave} hover:underline`}>
                Módulos
              </button>
            }
          >
            {evaluaciones.length === 0 ? (
              <p className={`text-sm py-2 ${suave}`}>No tienes evaluaciones próximas registradas.</p>
            ) : (
              <ul className="space-y-1">
                {evaluaciones.map((x) => {
                  const u = urgenciaDe(x.dias)
                  return (
                    <li key={`${x.moduloId}-${x.evaluacion.id}`}>
                      <button
                        onClick={() => abrirModulo(x.moduloId)}
                        className={`w-full flex items-center gap-3 p-2 rounded-control text-left ${modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-medium truncate ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{x.evaluacion.nombre}</span>
                          <span className={`block text-xs ${suave}`}>
                            {nombreRamo(x.moduloId, ramos) ?? 'Ramo'} · {x.evaluacion.ponderacion}% de la nota
                          </span>
                        </span>
                        <span className={`text-xs font-semibold flex-shrink-0 ${u === 'urgente' ? 'text-red-600' : u === 'proximo' ? 'text-amber-700' : suave}`}>
                          {formatearCountdown(x.dias)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
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
          </Tarjeta>
          </>)}
        </div>
      </div>
    </div>
  )
}

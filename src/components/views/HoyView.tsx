import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { LoQueSigue } from '../hoy/LoQueSigue'
import { Solemnes } from '../hoy/Solemnes'
import { CompartirSemana } from '../hoy/CompartirSemana'
import { AnilloProgreso } from '../ui/AnilloProgreso'
import { SelectorRamo } from '../ui/SelectorRamo'
import { useEnfoque, msMostrados } from '../../store/useEnfoque'
import { useAhora } from '../../hooks/useMotorEnfoque'
import { horasMin, minutosEnFecha, mmss, type Tecnica } from '../../services/enfoque'
import { calcularRachaEstudio, contarTarjetasVencidas, fechaLocalISO } from '../../services/actividadEstudio'
import { claseEnCurso } from '../../services/loQueSigue'
import { filtrarTareas, hoyISO, nombreRamo, ETIQUETA_PRIORIDAD } from '../../services/tareasPlan'

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
  derecha,
  children,
  className = '',
}: {
  titulo: string
  derecha?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`neu-raised p-5 sm:p-6 ${className}`}>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-[18px] font-bold flex-1" style={{ color: 'var(--neu-ink)', fontFamily: 'var(--font-head)' }}>{titulo}</h2>
        {derecha}
      </div>
      {children}
    </section>
  )
}

type ItemDia =
  | { tipo: 'clase'; orden: string; moduloId: string; id: string; tema: string; hora?: string; sala?: string; asistio?: boolean }
  | { tipo: 'tarea'; orden: string; id: string; titulo: string; ramoId: string | null; prioridad: 'alta' | 'media' | 'baja' }

export function HoyView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const tareas = useStore((s) => s.tareasPlan)
  const ramos = useStore((s) => s.ramos)
  const academico = useStore((s) => s.academicoModulos)
  const colecciones = useStore((s) => s.colecciones)
  const dias = useStore((s) => s.diasActividadEstudio)
  const agregar = useStore((s) => s.agregarTareaPlan)
  const alternarTarea = useStore((s) => s.alternarTareaPlan)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const setClasesModulo = useStore((s) => s.setClasesModulo)
  const [nueva, setNueva] = useState('')
  const sesionesFoco = useEnfoque((e) => e.sesiones)
  const metaFoco = useEnfoque((e) => e.ajustes.metaDia)
  const estadoEnfoque = useEnfoque((e) => e.estado)
  const ramoEnfoque = useEnfoque((e) => e.ramoId)
  const tecnica = useEnfoque((e) => e.tecnica)
  const ahoraEnfoque = useAhora(estadoEnfoque === 'corriendo')
  const minFoco = minutosEnFecha(sesionesFoco, hoyISO())

  // la hora se pone al día cada 30 s (clase «en curso»)
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const suave = 'var(--neu-ink2)'
  const hoy = hoyISO()

  const paraHoy = useMemo(() => filtrarTareas(tareas, 'hoy'), [tareas])
  const hechasHoy = useMemo(() => tareas.filter((t) => t.hecha && t.hechaEn === hoy).length, [tareas, hoy])
  const enCurso = useMemo(() => claseEnCurso(academico, ramos, hoy, ahora), [academico, ramos, hoy, ahora])

  // clases y tareas de hoy en una sola línea de tiempo (también las clases ya vistas: se marca la asistencia)
  const lineaDeTiempo = useMemo(() => {
    const out: ItemDia[] = []
    for (const [moduloId, d] of Object.entries(academico)) {
      for (const c of d.clases ?? []) {
        if (c.fecha === hoy) out.push({ tipo: 'clase', orden: c.hora ?? '99:99', moduloId, id: c.id, tema: c.tema, hora: c.hora, sala: c.sala, asistio: c.asistio })
      }
    }
    out.sort((a, b) => a.orden.localeCompare(b.orden))
    for (const t of paraHoy) out.push({ tipo: 'tarea', orden: '99:99', id: t.id, titulo: t.titulo, ramoId: t.ramoId, prioridad: t.prioridad })
    return out
  }, [academico, hoy, paraHoy])

  const marcarAsistencia = (moduloId: string, claseId: string, valor: boolean) => {
    const lista = useStore.getState().academicoModulos[moduloId]?.clases ?? []
    setClasesModulo(moduloId, lista.map((c) => (c.id === claseId ? { ...c, asistio: c.asistio === valor ? undefined : valor, completada: valor ? true : c.completada } : c)))
  }
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

  // semana de lunes a domingo: qué hay cada día
  const semana = useMemo(() => {
    const base = new Date()
    base.setHours(12, 0, 0, 0)
    const lunes = new Date(base)
    lunes.setDate(base.getDate() - ((base.getDay() + 6) % 7))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes)
      d.setDate(lunes.getDate() + i)
      const iso = fechaLocalISO(d)
      let clases = 0
      let evals: string[] = []
      for (const datos of Object.values(academico)) {
        clases += (datos.clases ?? []).filter((c) => c.fecha === iso).length
        evals = evals.concat((datos.evaluaciones ?? []).filter((e) => e.fecha === iso && e.nota === null).map((e) => e.nombre))
      }
      const tareasDia = tareas.filter((t) => !t.hecha && t.fecha === iso).length
      return {
        iso,
        dia: d.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '').toUpperCase(),
        numero: d.getDate(),
        esHoy: iso === hoy,
        clases,
        tareas: tareasDia,
        evals,
      }
    })
  }, [academico, tareas, hoy])

  const iniciarEnfoque = () => {
    if (estadoEnfoque === 'detenido') useEnfoque.getState().iniciar()
    setVistaActiva('enfoque')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <header className="min-w-0">
          <p className="text-sm" style={{ color: suave }}>{fechaLarga()}</p>
          <h1 className="titulo-pagina titulo-visible">{saludo()}</h1>
        </header>

        <LoQueSigue />

        {sinNada && (
          <section className="neu-raised p-5" aria-label="Primeros pasos">
            <h2 className="text-base font-bold mb-1" style={{ color: 'var(--neu-ink)' }}>Empieza en tres pasos</h2>
            <p className="text-sm mb-4" style={{ color: suave }}>Con esto, Hoy te muestra tus clases, evaluaciones y repaso.</p>
            <ol className="space-y-2">
              {[
                { n: 1, texto: 'Crea tu primer ramo', accion: () => useStore.getState().pedirNuevoRamo(), primario: true },
                { n: 2, texto: 'Carga una evaluación y su fecha', accion: () => useStore.getState().setVistaActiva('modulos'), primario: false },
                { n: 3, texto: 'Haz tu primer bloque de enfoque', accion: () => useStore.getState().setVistaActiva('enfoque'), primario: false },
              ].map((paso) => (
                <li key={paso.n} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'var(--neu-bg3)', color: 'var(--neu-ink)' }} aria-hidden="true">{paso.n}</span>
                  <button onClick={paso.accion} className={`boton ${paso.primario ? 'boton-primario' : 'boton-suave'} flex-1 justify-start`}>
                    {paso.texto}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] gap-4 items-start">
          <Tarjeta
            titulo="Tu día"
            derecha={
              hechasHoy + paraHoy.length > 0 ? (
                <span className="text-[13px]" style={{ color: suave }}>
                  {hechasHoy} de {hechasHoy + paraHoy.length} {hechasHoy + paraHoy.length === 1 ? 'tarea hecha' : 'tareas hechas'}
                </span>
              ) : undefined
            }
          >
            {lineaDeTiempo.length === 0 ? (
              <p className="text-sm py-3" style={{ color: suave }}>
                No hay clases con fecha de hoy ni tareas para hoy. Las clases salen de la pestaña Clases de cada ramo (el horario por sí solo no alcanza).
              </p>
            ) : (
              <ol className="relative">
                {lineaDeTiempo.map((it, i) => {
                  const esClase = it.tipo === 'clase'
                  const actual = esClase && enCurso?.claseId === it.id
                  const ultimo = i === lineaDeTiempo.length - 1
                  return (
                    <li key={`${it.tipo}-${it.id}`} className="grid grid-cols-[3rem_1.25rem_minmax(0,1fr)] sm:grid-cols-[3.25rem_1.25rem_minmax(0,1fr)_auto] gap-x-3 items-start">
                      <span
                        className={`pt-3.5 text-[13px] tabular-nums ${esClase ? 'font-semibold' : 'font-bold uppercase tracking-wide text-[11px]'}`}
                        style={{ color: actual ? 'var(--accent-texto)' : 'var(--neu-ink3)' }}
                      >
                        {esClase ? it.hora ?? '—' : 'Tarea'}
                      </span>
                      <span className="relative flex justify-center self-stretch" aria-hidden="true">
                        {!ultimo && <span className="absolute top-8 bottom-0 w-px" style={{ background: 'var(--neu-line)' }} />}
                        <span
                          className="mt-4 w-3.5 h-3.5 rounded-full border-2 bg-[var(--neu-card)]"
                          style={{ borderColor: actual ? 'var(--accent-base)' : 'var(--neu-ink3)', background: actual ? 'var(--accent-base)' : undefined }}
                        />
                      </span>
                      {esClase ? (
                        <button onClick={() => abrirModulo(it.moduloId)} className="min-w-0 py-2.5 text-left">
                          <span className="block text-[15px] font-bold sm:truncate" style={{ color: 'var(--neu-ink)' }}>{it.tema || nombreRamo(it.moduloId, ramos) || 'Clase'}</span>
                          <span className="block text-[13px] truncate" style={{ color: suave }}>
                            {nombreRamo(it.moduloId, ramos) ?? 'Ramo'}{it.sala ? ` · ${it.sala}` : ''}
                          </span>
                        </button>
                      ) : (
                        <div className="min-w-0 py-2.5">
                          <span className="block text-[15px] font-bold sm:truncate" style={{ color: 'var(--neu-ink)' }}>{it.titulo}</span>
                          <span className="flex items-center gap-2 flex-wrap text-[13px]" style={{ color: suave }}>
                            {it.ramoId && (
                              <span className="px-2 py-0.5 rounded-md text-[12px] font-bold" style={{ background: 'color-mix(in srgb, var(--accent-base) 12%, transparent)', color: 'var(--accent-texto)' }}>
                                {nombreRamo(it.ramoId, ramos)}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ background: it.prioridad === 'alta' ? 'var(--neu-danger)' : it.prioridad === 'media' ? 'var(--neu-warn)' : 'var(--neu-ink3)' }} aria-hidden="true" />
                              Prioridad {ETIQUETA_PRIORIDAD[it.prioridad].toLowerCase()}
                            </span>
                          </span>
                        </div>
                      )}
                      <span className="col-start-3 sm:col-start-auto pb-2 sm:py-2 flex gap-1.5 flex-shrink-0 items-center">
                        {esClase ? (
                          actual ? (
                            <span className="text-[13px] font-bold px-3 py-1.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent-base) 14%, transparent)', color: 'var(--accent-texto)' }}>
                              En curso
                            </span>
                          ) : (
                            <span className="flex gap-1.5" role="group" aria-label={`Asistencia a ${it.tema || nombreRamo(it.moduloId, ramos) || 'la clase'}`}>
                              <button onClick={() => marcarAsistencia(it.moduloId, it.id, true)} aria-pressed={it.asistio === true} className="boton boton-chico boton-suave">
                                Fui
                              </button>
                              <button
                                onClick={() => marcarAsistencia(it.moduloId, it.id, false)}
                                aria-pressed={it.asistio === false}
                                className={`boton boton-chico ${it.asistio === false ? '' : 'boton-suave'}`}
                                style={it.asistio === false ? { background: '#dc2626', color: '#fff' } : undefined}
                              >
                                Falté
                              </button>
                            </span>
                          )
                        ) : (
                          <button onClick={() => alternarTarea(it.id)} className="boton boton-chico boton-suave" aria-label={`Marcar como hecha: ${it.titulo}`}>
                            Marcar hecha
                          </button>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
            <form onSubmit={agregarRapida} className="flex gap-2 mt-4">
              <input
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                aria-label="Agregar tarea para hoy"
                placeholder="Agregar algo para hoy…"
                maxLength={200}
                className={`flex-1 min-w-0 h-control px-3 rounded-control border text-sm outline-none campo-foco ${
                  modoOscuro
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                    : 'bg-[var(--neu-bg)] border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                }`}
              />
              <button type="submit" disabled={!nueva.trim()} className="boton boton-primario">
                Agregar
              </button>
            </form>
          </Tarjeta>

          <div className="space-y-4 min-w-0">
            {!sinNada && (
              <Tarjeta
                titulo="Evaluaciones"
                derecha={
                  <button onClick={() => setVistaActiva('modulos')} className="text-[13px] font-semibold hover:underline" style={{ color: 'var(--accent-texto)' }}>
                    Mis ramos
                  </button>
                }
              >
                <Solemnes />
              </Tarjeta>
            )}

            <section className="neu-raised p-5 sm:p-6" aria-label="Enfoque de hoy">
              <div className="flex items-center gap-4">
                <AnilloProgreso progreso={minFoco / Math.max(1, metaFoco)} tamano={64} grosor={7} modoOscuro={modoOscuro} etiqueta={`${minFoco} de ${metaFoco} minutos de enfoque hoy`}>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--neu-ink)' }}>{Math.round(Math.min(1, minFoco / Math.max(1, metaFoco)) * 100)}%</span>
                </AnilloProgreso>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--neu-ink3)' }}>Enfoque de hoy</p>
                  <p className="text-[22px] font-extrabold leading-tight" style={{ color: 'var(--neu-ink)' }}>
                    {horasMin(minFoco)} <span className="text-[13px] font-medium" style={{ color: suave }}>de {horasMin(metaFoco)}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <label className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--neu-ink3)' }}>Ramo</span>
                  <SelectorRamo
                    valor={ramoEnfoque}
                    onChange={(v) => useEnfoque.getState().setObjetivo(v, null)}
                    textoVacio="Sin ramo"
                    className="w-full h-control px-3 rounded-control border text-sm bg-[var(--neu-bg)] border-zinc-200 text-[var(--neu-ink)]"
                  />
                </label>
                <label className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--neu-ink3)' }}>Técnica</span>
                  <select
                    value={tecnica}
                    onChange={(e) => useEnfoque.getState().setTecnica(e.target.value as Tecnica)}
                    disabled={estadoEnfoque !== 'detenido'}
                    className="w-full h-control px-3 rounded-control border text-sm bg-[var(--neu-bg)] border-zinc-200 text-[var(--neu-ink)]"
                  >
                    <option value="pomodoro">Pomodoro</option>
                    <option value="flowtime">Flowtime</option>
                  </select>
                </label>
              </div>
              <button onClick={iniciarEnfoque} className="boton boton-primario w-full mt-4">
                {estadoEnfoque === 'detenido' ? 'Iniciar' : `Ver temporizador · ${mmss(msMostrados(useEnfoque.getState(), ahoraEnfoque))}`}
              </button>
            </section>
          </div>
        </div>

        <section className="neu-raised p-2 sm:p-3" aria-label="Esta semana">
          <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
            {semana.map((d) => (
              <li key={d.iso}>
                <button
                  onClick={() => setVistaActiva('calendario')}
                  className="w-full text-left rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--neu-bg3)]"
                  style={d.esHoy ? { background: 'color-mix(in srgb, var(--accent-base) 12%, transparent)' } : undefined}
                  aria-current={d.esHoy ? 'date' : undefined}
                >
                  <span className="block text-[13px] font-bold tracking-wide" style={{ color: d.esHoy ? 'var(--accent-texto)' : 'var(--neu-ink3)' }}>
                    {d.dia} <span className="text-[17px]" style={{ color: d.esHoy ? 'var(--accent-texto)' : 'var(--neu-ink)' }}>{d.numero}</span>
                  </span>
                  <span className="block text-[12px] min-h-[1.1rem]" style={{ color: d.evals.length ? 'var(--neu-danger)' : 'var(--neu-ink3)' }}>
                    {d.evals.length > 0
                      ? d.evals[0]
                      : [d.clases > 0 && `${d.clases} ${d.clases === 1 ? 'clase' : 'clases'}`, d.tareas > 0 && `${d.tareas} ${d.tareas === 1 ? 'tarea' : 'tareas'}`].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {!sinNada && (
          <Tarjeta titulo="Repaso y constancia">
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button onClick={() => setVistaActiva('colecciones')} className="p-3 rounded-control text-left" style={{ background: 'var(--neu-bg)' }}>
                <div className="text-2xl font-serif font-bold" style={{ color: 'var(--neu-ink)' }}>{tarjetas}</div>
                <div className="text-xs" style={{ color: suave }}>{tarjetas === 1 ? 'tarjeta por repasar' : 'tarjetas por repasar'}</div>
              </button>
              <div className="p-3 rounded-control" style={{ background: 'var(--neu-bg)' }}>
                {/* Sin racha no se muestra un «0» que se lea como fracaso: se invita a empezar, sin culpa */}
                {racha > 0 ? (
                  <>
                    <div className="text-2xl font-serif font-bold" style={{ color: 'var(--neu-ink)' }}>{racha}</div>
                    <div className="text-xs" style={{ color: suave }}>{racha === 1 ? 'día seguido' : 'días seguidos'}</div>
                  </>
                ) : (
                  <>
                    <div className="text-base font-serif font-bold" style={{ color: 'var(--neu-ink)' }}>Tu racha empieza hoy</div>
                    <div className="text-xs" style={{ color: suave }}>Cualquier estudio cuenta</div>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: suave }}>Cuenta estudiar con apuntes, tarjetas o Práctica, o terminar una tarea.</p>
            <CompartirSemana />
          </Tarjeta>
        )}
      </div>
    </div>
  )
}

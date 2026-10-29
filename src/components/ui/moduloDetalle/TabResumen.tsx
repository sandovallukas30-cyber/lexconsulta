import { SelectPrima } from '../SelectPrima'
import { useMemo, useState } from 'react'
import type { SesionClase, EvaluacionModulo, TextoObligatorio, ApunteModulo, BriefCaso, Coleccion, MapaMental } from '../../../types'
import { useStore } from '../../../store/useStore'
import { diasHasta, formatearCountdown, urgenciaDe } from '../../../services/modulosAcademico'
import { formatoNota, resumenNotas } from '../../../services/notas'
import { hoyISO } from '../../../services/tareasPlan'
import { type Tab } from './utilidades'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number)
  const dias = diasHasta(fecha)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${d}`
}

/** Tarjeta del resumen: título pequeño, contenido y, si hace falta, una acción. */
function Panel({ titulo, icono, children }: { titulo: string; icono: string; children: React.ReactNode }) {
  return (
    <section className="neu-raised p-4 flex flex-col gap-3 min-w-0" aria-label={titulo}>
      <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--neu-ink3)' }}>
        <i className={`ti ${icono} text-base`} style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function colorUrgencia(dias: number): string {
  const u = urgenciaDe(dias)
  // mezclados con la tinta para que el texto pase el contraste AA sobre el fondo claro u oscuro
  return u === 'urgente' ? 'color-mix(in srgb, var(--neu-danger) 45%, var(--neu-ink))' : u === 'proximo' ? 'color-mix(in srgb, var(--neu-warn) 38%, var(--neu-ink))' : 'var(--neu-ink2)'
}

export function TabResumen({
  moduloId, datos, modoOscuro, onIrA, onNuevoApunte, onAbrirApunte, colecciones, onAbrirColeccion,
  mapas, mapasDisponibles, onAbrirMapa, onVincularMapa,
}: {
  moduloId: string
  datos: { clases: SesionClase[]; evaluaciones: EvaluacionModulo[]; textos: TextoObligatorio[]; apuntes: ApunteModulo[]; briefs: BriefCaso[] }
  modoOscuro: boolean
  onIrA: (tab: Tab) => void
  onNuevoApunte: () => void
  onAbrirApunte: (id: string) => void
  colecciones: Coleccion[]
  onAbrirColeccion: (id: string) => void
  mapas: MapaMental[]
  mapasDisponibles: MapaMental[]
  onAbrirMapa: (id: string) => void
  onVincularMapa: (id: string) => void
}) {
  const tareas = useStore((st) => st.tareasPlan)
  const setVistaActiva = useStore((st) => st.setVistaActiva)
  const hoy = hoyISO()

  const proximaClase = useMemo(
    () => [...datos.clases].filter((c) => !c.completada && c.fecha >= hoy).sort((a, b) => (a.fecha + (a.hora ?? '')).localeCompare(b.fecha + (b.hora ?? '')))[0],
    [datos.clases, hoy]
  )
  const proximoExamen = useMemo(
    () => [...datos.evaluaciones].filter((e) => e.nota === null && e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0],
    [datos.evaluaciones, hoy]
  )
  const pendientes = tareas.filter((t) => t.ramoId === moduloId && !t.hecha)
  const recientes = useMemo(() => [...datos.apuntes].sort((a, b) => b.fechaModificacion - a.fechaModificacion).slice(0, 3), [datos.apuntes])
  const notas = useMemo(() => resumenNotas(datos.evaluaciones), [datos.evaluaciones])
  const textosLeidos = datos.textos.filter((t) => t.leido).length
  const suave = { color: 'var(--neu-ink2)' }
  // tarea rápida desde el ramo: antes había que salir al menú «Tareas» y volver a elegir el ramo
  const agregarTareaPlan = useStore((st) => st.agregarTareaPlan)
  const [nuevaTarea, setNuevaTarea] = useState<string | null>(null)
  const guardarTarea = () => {
    const titulo = (nuevaTarea ?? '').trim()
    if (!titulo) return
    agregarTareaPlan({ titulo, ramoId: moduloId, fecha: null, prioridad: 'media' })
    setNuevaTarea(null)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel titulo="Lo que viene" icono="ti-calendar-event">
          <div className="space-y-3 text-sm">
            {proximaClase ? (
              <button onClick={() => onIrA('clases')} className="sin-neu block w-full text-left">
                <div className="font-bold" style={{ color: 'var(--neu-ink)' }}>
                  {fechaCorta(proximaClase.fecha)}{proximaClase.hora ? ` · ${proximaClase.hora}` : ''}
                </div>
                <div className="text-xs" style={suave}>
                  Próxima clase{proximaClase.sala ? ` · ${proximaClase.sala}` : ''}{proximaClase.tema ? ` · ${proximaClase.tema}` : ''}
                </div>
              </button>
            ) : (
              datos.clases.length > 0 ? (
                <p className="text-xs" style={suave}>No quedan clases por delante.</p>
              ) : (
                <div>
                  <p className="text-xs mb-1" style={suave}>Aún no hay clases con fecha. El horario de la asignatura no basta: carga las clases para verlas en Hoy y en el Calendario.</p>
                  <button onClick={() => onIrA('clases')} className="sin-neu text-xs font-semibold" style={{ color: 'var(--accent-texto)' }}>
                    Cargar las clases del semestre
                  </button>
                </div>
              )
            )}
            {proximoExamen ? (
              <button onClick={() => onIrA('examenes')} className="sin-neu block w-full text-left">
                <div className="font-bold" style={{ color: colorUrgencia(diasHasta(proximoExamen.fecha)) }}>
                  {proximoExamen.nombre} · {formatearCountdown(diasHasta(proximoExamen.fecha)).toLowerCase()}
                </div>
                <div className="text-xs" style={suave}>{proximoExamen.ponderacion}% de la nota final</div>
              </button>
            ) : (
              <button onClick={() => onIrA('examenes')} className="sin-neu block w-full text-left text-xs font-semibold" style={{ color: 'var(--accent-texto)' }}>
                {datos.evaluaciones.length > 0 ? 'Todas las evaluaciones tienen nota' : 'Agrega tu primera evaluación'}
              </button>
            )}
            <button onClick={() => setVistaActiva('tareas')} className="sin-neu block w-full text-left">
              <span className="font-bold" style={{ color: 'var(--neu-ink)' }}>{pendientes.length}</span>{' '}
              <span className="text-xs" style={suave}>{pendientes.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}</span>
            </button>
            {nuevaTarea === null ? (
              <button onClick={() => setNuevaTarea('')} className="boton boton-suave boton-chico">
                <i className="ti ti-plus" aria-hidden="true" /> Agregar tarea
              </button>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); guardarTarea() }} className="flex gap-2">
                <input
                  autoFocus
                  value={nuevaTarea}
                  onChange={(e) => setNuevaTarea(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setNuevaTarea(null) }}
                  placeholder="Ej: Leer capítulo 1"
                  aria-label="Nueva tarea de esta asignatura"
                  className="flex-1 min-w-0 h-control-sm px-3 text-sm"
                />
                <button type="submit" disabled={!nuevaTarea.trim()} className="boton boton-primario boton-chico">Agregar</button>
              </form>
            )}
          </div>
        </Panel>

        <Panel titulo="Tus apuntes" icono="ti-notes">
          {recientes.length > 0 ? (
            <ul className="space-y-1.5">
              {recientes.map((a) => (
                <li key={a.id}>
                  <button onClick={() => onAbrirApunte(a.id)} className="sin-neu block w-full text-left min-h-[40px] py-1">
                    <span className="block text-sm font-bold truncate" style={{ color: 'var(--neu-ink)' }}>{a.titulo || 'Apunte sin título'}</span>
                    <span className="block text-xs" style={suave}>
                      {new Date(a.fechaModificacion).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs" style={suave}>Todavía no tienes apuntes en esta asignatura.</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-auto">
            <button onClick={onNuevoApunte} className="boton boton-primario boton-chico">
              <i className="ti ti-plus" aria-hidden="true" /> Nuevo apunte
            </button>
            {datos.apuntes.length > 0 && (
              <button onClick={() => onIrA('apuntes')} className="boton boton-fantasma boton-chico">Ver todos ({datos.apuntes.length})</button>
            )}
          </div>
        </Panel>

        <Panel titulo="Tu nota" icono="ti-chart-line">
          {notas.estado === 'sin-datos' ? (
            <>
              <p className="text-xs" style={suave}>Cuando agregues tus evaluaciones, aquí verás tu promedio y cuánto necesitas para aprobar.</p>
              <button onClick={() => onIrA('examenes')} className="boton boton-suave boton-chico self-start mt-auto">
                <i className="ti ti-plus" aria-hidden="true" /> Agregar evaluación
              </button>
            </>
          ) : (
            <>
              <div>
                <div className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--neu-ink)', fontFamily: 'var(--font-head)' }}>
                  {notas.promedio !== null ? formatoNota(notas.promedio) : '—'}
                </div>
                <div className="text-xs" style={suave}>
                  {notas.promedio !== null ? 'promedio hasta ahora' : 'sin notas todavía'} · {notas.pesoEvaluado}% evaluado
                </div>
              </div>
              <div className="text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>
                {notas.estado === 'posible' && notas.necesaria !== null && <>Necesitas {formatoNota(notas.necesaria)} en lo que falta</>}
                {notas.estado === 'asegurado' && <>Aprobado asegurado</>}
                {notas.estado === 'imposible' && <>Ya no alcanza el 4,0</>}
                {notas.estado === 'completo' && notas.promedio !== null && <>{notas.promedio >= 4 ? 'Asignatura aprobada' : 'Asignatura reprobada'}</>}
              </div>
              <button onClick={() => onIrA('examenes')} className="boton boton-fantasma boton-chico self-start mt-auto">Ver evaluaciones</button>
            </>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onIrA('textos')} className="neu-raised p-4 text-left flex items-center gap-3">
          <i className="ti ti-books text-2xl" style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-sm font-bold" style={{ color: 'var(--neu-ink)' }}>Textos · {textosLeidos}/{datos.textos.length} leídos</span>
            <span className="block text-xs" style={suave}>Lecturas de la asignatura</span>
          </span>
        </button>
        <button onClick={() => onIrA('casos')} className="neu-raised p-4 text-left flex items-center gap-3">
          <i className="ti ti-gavel text-2xl" style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-sm font-bold" style={{ color: 'var(--neu-ink)' }}>Casos · {datos.briefs.length}</span>
            <span className="block text-xs" style={suave}>{datos.briefs.length === 1 ? 'caso analizado' : 'casos analizados'}</span>
          </span>
        </button>
      </div>

      {colecciones.length > 0 && (
        <div className="mt-6">
          <h2 className={`text-sm font-semibold mb-3 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Colecciones de esta asignatura
          </h2>
          <div className="space-y-2">
            {colecciones.map((c) => (
              <button
                key={c.id}
                onClick={() => onAbrirColeccion(c.id)}
                className={`w-full flex items-center justify-between gap-2 p-3 rounded-tarjeta border text-left transition-colors ${
                  modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <span className={`text-sm font-medium ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{c.titulo}</span>
                <span className={`text-xs flex-shrink-0 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {c.articulos.length} {c.articulos.length === 1 ? 'artículo' : 'artículos'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <VinculoModuloSeccion
        titulo="Mapas mentales de esta asignatura"
        icono="ti-hierarchy-2"
        vinculados={mapas.map((m) => ({ id: m.id, label: m.titulo }))}
        disponibles={mapasDisponibles.map((m) => ({ id: m.id, label: m.titulo }))}
        placeholder="Vincular un mapa mental existente..."
        onAbrir={onAbrirMapa}
        onVincular={onVincularMapa}
        modoOscuro={modoOscuro}
      />
    </div>
  )
}

/** Sección "X de este módulo" usada por Mapas mentales:
 *  lista lo ya vinculado (abre directo) y, si hay candidatos sin vincular,
 *  ofrece un select que vincula al elegir -- mismo patrón que Colecciones,
 *  pero estos dos sí necesitan una acción de vincular porque no se infieren
 *  de datos existentes (código relacionado) sino que se asignan a mano. */
function VinculoModuloSeccion({
  titulo, icono, vinculados, disponibles, placeholder, onAbrir, onVincular, modoOscuro,
}: {
  titulo: string
  icono: string
  vinculados: { id: string; label: string }[]
  disponibles: { id: string; label: string }[]
  placeholder: string
  onAbrir: (id: string) => void
  onVincular: (id: string) => void
  modoOscuro: boolean
}) {
  if (vinculados.length === 0 && disponibles.length === 0) return null
  return (
    <div className="mt-6">
      <h2 className={`text-sm font-semibold mb-3 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>{titulo}</h2>
      {vinculados.length > 0 && (
        <div className="space-y-2 mb-2">
          {vinculados.map((v) => (
            <button
              key={v.id}
              onClick={() => onAbrir(v.id)}
              className={`w-full flex items-center gap-2 p-3 rounded-tarjeta border text-left transition-colors ${
                modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <i className={`ti ${icono} text-sm flex-shrink-0`} style={{ color: 'var(--accent-texto)' }} />
              <span className={`text-sm font-medium truncate ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{v.label}</span>
            </button>
          ))}
        </div>
      )}
      {disponibles.length > 0 && (
        <SelectPrima
          aria-label={placeholder}
          value=""
          onChange={(e) => { if (e.target.value) onVincular(e.target.value) }}
          className={`w-full rounded-control px-3 py-2 text-xs outline-none border campo-foco ${
            modoOscuro ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500'
          }`}
        >
          <option value="">{placeholder}</option>
          {disponibles.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </SelectPrima>
      )}
    </div>
  )
}

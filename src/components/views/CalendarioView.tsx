import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { avisar } from '../../store/useAvisos'
import { FilaTarea } from '../ui/FilaTarea'
import { Segmentado } from '../ui/Segmentado'
import {
  celdasMes,
  diasDeSemana,
  fechaLarga,
  itemsPorFecha,
  nombreMes,
  NOMBRE_TIPO,
  type ItemCalendario,
  type TipoItem,
} from '../../services/calendario'
import { colorRamo, hoyISO, nombreRamo, sumarDiasISO } from '../../services/tareasPlan'
import { crearICS, descargarICS } from '../../services/ics'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const ICONO: Record<TipoItem, string> = { clase: 'ti-school', evaluacion: 'ti-clipboard-check', tarea: 'ti-checkbox' }
const TODOS: TipoItem[] = ['clase', 'evaluacion', 'tarea']

function useEstilos() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  return {
    modoOscuro,
    tarjeta: `rounded-tarjeta border shadow-tarjeta ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`,
    suave: modoOscuro ? 'text-zinc-400' : 'text-zinc-500',
    titulo: modoOscuro ? 'text-white' : 'text-zinc-900',
    texto: modoOscuro ? 'text-zinc-200' : 'text-zinc-800',
  }
}

/** Abre el ramo de una clase o evaluación. */
function abrirRamo(ramoId: string | null) {
  if (ramoId) useStore.setState({ vistaActiva: 'modulos', moduloActivoId: ramoId })
}

/** Una clase o evaluación (las tareas usan FilaTarea, que se puede marcar). */
function ItemFila({ it }: { it: ItemCalendario }) {
  const e = useEstilos()
  const ramos = useStore((s) => s.ramos)
  const color = colorRamo(it.ramoId, ramos)
  const ramo = nombreRamo(it.ramoId, ramos)
  return (
    <button
      onClick={() => abrirRamo(it.ramoId)}
      className={`w-full flex items-center gap-3 p-2 rounded-control text-left ${e.modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${it.hecha ? 'opacity-60' : ''}`}
    >
      <span className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: color }} aria-hidden="true" />
      <i className={`ti ${ICONO[it.tipo]} text-base flex-shrink-0 ${e.suave}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium truncate ${e.titulo} ${it.hecha ? 'line-through' : ''}`}>{it.titulo}</span>
        <span className={`block text-xs truncate ${e.suave}`}>
          {[it.hora, ramo, it.detalle].filter(Boolean).join(' · ')}
        </span>
      </span>
      {it.tipo === 'evaluacion' && !it.hecha && (
        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600 flex-shrink-0">Evaluación</span>
      )}
    </button>
  )
}

/** Mini etiqueta dentro de la celda del mes. */
function Etiqueta({ it }: { it: ItemCalendario }) {
  const ramos = useStore((s) => s.ramos)
  const color = colorRamo(it.ramoId, ramos)
  return (
    <span
      className={`block truncate text-[11px] leading-tight px-1.5 py-0.5 rounded-md font-medium ${it.hecha ? 'opacity-50 line-through' : ''}`}
      style={{
        background: `color-mix(in srgb, ${color} ${it.tipo === 'evaluacion' ? 24 : 13}%, transparent)`,
        color: 'inherit',
        boxShadow: it.tipo === 'evaluacion' ? `inset 2px 0 0 ${color}` : undefined,
      }}
    >
      {it.hora && it.tipo === 'clase' ? `${it.hora} ` : ''}
      {it.titulo}
    </span>
  )
}

function CeldaDia({
  fecha, items, delMes, esHoy, seleccionada, onElegir,
}: {
  fecha: string
  items: ItemCalendario[]
  delMes: boolean
  esHoy: boolean
  seleccionada: boolean
  onElegir: () => void
}) {
  const e = useEstilos()
  const dia = Number(fecha.slice(8))
  const hayEval = items.some((x) => x.tipo === 'evaluacion' && !x.hecha)
  return (
    <button
      onClick={onElegir}
      aria-label={`${fechaLarga(fecha)}${items.length ? `, ${items.length} ${items.length === 1 ? 'elemento' : 'elementos'}` : ''}`}
      aria-pressed={seleccionada}
      className={`sin-tactil text-left min-h-[58px] sm:min-h-[92px] p-1 sm:p-1.5 rounded-control flex flex-col gap-1 transition-colors border ${
        seleccionada
          ? 'border-[var(--accent-base)] bg-[color-mix(in_srgb,var(--accent-base)_8%,transparent)]'
          : e.modoOscuro
          ? 'border-transparent hover:bg-zinc-800'
          : 'border-transparent hover:bg-zinc-50'
      } ${delMes ? '' : 'opacity-40'}`}
    >
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${esHoy ? 'text-white' : e.texto}`}
        style={esHoy ? { background: 'var(--accent-base)' } : undefined}
      >
        {dia}
      </span>
      <span className="hidden sm:flex flex-col gap-0.5 min-w-0 w-full">
        {items.slice(0, 3).map((it) => (
          <span key={it.id} className={e.texto}>
            <Etiqueta it={it} />
          </span>
        ))}
        {items.length > 3 && <span className={`text-[11px] px-1 ${e.suave}`}>+{items.length - 3} más</span>}
      </span>
      {/* móvil: solo puntos */}
      <span className="flex sm:hidden gap-0.5 flex-wrap px-0.5">
        {items.slice(0, 4).map((it) => (
          <span key={it.id} className="w-1.5 h-1.5 rounded-full" style={{ background: it.tipo === 'evaluacion' ? '#dc2626' : 'var(--accent-base)', opacity: it.hecha ? 0.4 : 1 }} />
        ))}
        {hayEval && <span className="sr-only">Hay una evaluación</span>}
      </span>
    </button>
  )
}

function ListaDelDia({ fecha, items }: { fecha: string; items: ItemCalendario[] }) {
  const tareas = useStore((s) => s.tareasPlan)
  const e = useEstilos()
  const agenda = items.filter((x) => x.tipo !== 'tarea')
  const delDia = items.filter((x) => x.tipo === 'tarea').map((x) => tareas.find((t) => `t-${t.id}` === x.id)).filter((t): t is NonNullable<typeof t> => !!t)
  if (items.length === 0) return <p className={`text-sm py-2 ${e.suave}`}>Nada este día.</p>
  return (
    <div>
      {agenda.length > 0 && (
        <ul className="space-y-0.5">
          {agenda.map((it) => (
            <li key={it.id}>
              <ItemFila it={it} />
            </li>
          ))}
        </ul>
      )}
      {delDia.length > 0 && (
        <ul className={`divide-y ${e.modoOscuro ? 'divide-zinc-800' : 'divide-zinc-100'} ${agenda.length > 0 ? 'mt-1 pt-1 border-t ' + (e.modoOscuro ? 'border-zinc-800' : 'border-zinc-100') : ''}`}>
          {delDia.map((t) => (
            <li key={t.id} className="px-2">
              <FilaTarea tarea={t} />
            </li>
          ))}
        </ul>
      )}
      <span className="sr-only">{fecha}</span>
    </div>
  )
}

function PanelDia({ fecha, items }: { fecha: string; items: ItemCalendario[] }) {
  const e = useEstilos()
  const agregar = useStore((s) => s.agregarTareaPlan)
  const [nueva, setNueva] = useState('')
  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault()
    const t = nueva.trim()
    if (!t) return
    agregar({ titulo: t, ramoId: null, fecha, prioridad: 'media' })
    setNueva('')
  }
  return (
    <section className={`${e.tarjeta} p-4`} aria-label={`Agenda del ${fechaLarga(fecha)}`}>
      <h2 className={`text-base font-bold mb-2 ${e.titulo}`}>{fechaLarga(fecha)}</h2>
      <ListaDelDia fecha={fecha} items={items} />
      <form onSubmit={enviar} className="flex gap-2 mt-3">
        <input
          value={nueva}
          onChange={(ev) => setNueva(ev.target.value)}
          aria-label="Agregar tarea a este día"
          placeholder="Agregar una tarea a este día…"
          maxLength={200}
          className={`flex-1 min-w-0 h-control px-3 rounded-control border text-sm outline-none campo-foco ${
            e.modoOscuro ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
          }`}
        />
        <button type="submit" disabled={!nueva.trim()} className="boton boton-suave">
          Agregar
        </button>
      </form>
    </section>
  )
}

export function CalendarioView() {
  const e = useEstilos()
  const academico = useStore((s) => s.academicoModulos)
  const tareas = useStore((s) => s.tareasPlan)
  const ramos = useStore((s) => s.ramos)
  const hoy = hoyISO()
  const [modo, setModo] = useState<'mes' | 'semana'>('mes')
  const [ancla, setAncla] = useState(hoy)
  const [seleccion, setSeleccion] = useState(hoy)
  const [tipos, setTipos] = useState<Set<TipoItem>>(new Set(TODOS))

  const anio = Number(ancla.slice(0, 4))
  const mes = Number(ancla.slice(5, 7)) - 1
  const celdas = useMemo(() => celdasMes(anio, mes), [anio, mes])
  const semana = useMemo(() => diasDeSemana(ancla), [ancla])
  const dias = modo === 'mes' ? celdas : semana
  const items = useMemo(
    () => itemsPorFecha({ academicoModulos: academico, tareasPlan: tareas, ramos }, dias[0], dias[dias.length - 1], tipos),
    [academico, tareas, ramos, dias, tipos]
  )

  const mover = (delta: number) => {
    if (modo === 'semana') setAncla((a) => sumarDiasISO(a, 7 * delta))
    else {
      const d = new Date(anio, mes + delta, 1)
      setAncla(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
    }
  }
  const irAHoy = () => {
    setAncla(hoy)
    setSeleccion(hoy)
  }
  const alternar = (t: TipoItem) =>
    setTipos((prev) => {
      const n = new Set(prev)
      if (n.has(t)) n.delete(t)
      else n.add(t)
      return n.size === 0 ? prev : n
    })

  const exportar = () => {
    const { texto, cantidad } = crearICS({ academicoModulos: academico, tareasPlan: tareas, ramos }, sumarDiasISO(hoy, -7), sumarDiasISO(hoy, 365))
    if (cantidad === 0) {
      avisar.info('No hay nada que exportar todavía')
      return
    }
    descargarICS(texto)
    avisar.exito(`${cantidad} eventos exportados. Ábrelo para agregarlos a tu calendario.`)
  }

  const etiquetaRango =
    modo === 'mes'
      ? nombreMes(anio, mes)
      : `${new Date(Number(semana[0].slice(0, 4)), Number(semana[0].slice(5, 7)) - 1, Number(semana[0].slice(8))).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} – ${new Date(Number(semana[6].slice(0, 4)), Number(semana[6].slice(5, 7)) - 1, Number(semana[6].slice(8))).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div className={`h-full overflow-y-auto ${e.modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${e.titulo}`}>Calendario</h1>
            <p className={`text-sm mt-1 ${e.suave}`}>Tus clases, evaluaciones y tareas en un solo lugar.</p>
          </div>
          <div className="flex items-center gap-2">
            <Segmentado<'mes' | 'semana'>
              id="vista-cal"
              etiqueta="Vista del calendario"
              valor={modo}
              onChange={setModo}
              opciones={[
                { valor: 'mes', texto: 'Mes' },
                { valor: 'semana', texto: 'Semana' },
              ]}
            />
            <button onClick={exportar} className="boton boton-borde" title="Descargar un archivo .ics para tu calendario del celular">
              <i className="ti ti-calendar-down" aria-hidden="true" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => mover(-1)} aria-label={modo === 'mes' ? 'Mes anterior' : 'Semana anterior'} className="boton boton-borde boton-icono">
            <i className="ti ti-chevron-left" aria-hidden="true" />
          </button>
          <button onClick={irAHoy} className="boton boton-borde">
            Hoy
          </button>
          <button onClick={() => mover(1)} aria-label={modo === 'mes' ? 'Mes siguiente' : 'Semana siguiente'} className="boton boton-borde boton-icono">
            <i className="ti ti-chevron-right" aria-hidden="true" />
          </button>
          <h2 className={`text-lg font-bold ml-1 ${e.titulo}`} aria-live="polite">
            {etiquetaRango}
          </h2>
          <div className="flex gap-1.5 ml-auto" role="group" aria-label="Qué mostrar">
            {TODOS.map((t) => (
              <button key={t} onClick={() => alternar(t)} aria-pressed={tipos.has(t)} className="boton boton-chico boton-suave">
                <i className={`ti ${ICONO[t]}`} aria-hidden="true" />
                <span className="hidden sm:inline">{NOMBRE_TIPO[t]}</span>
              </button>
            ))}
          </div>
        </div>

        {modo === 'mes' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <section className={`${e.tarjeta} p-2 sm:p-3 lg:col-span-2`} aria-label="Mes">
              <div className="grid grid-cols-7 mb-1">
                {DIAS.map((d) => (
                  <div key={d} className={`text-center text-[11px] font-semibold uppercase tracking-wide py-1 ${e.suave}`}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {celdas.map((f) => (
                  <CeldaDia
                    key={f}
                    fecha={f}
                    items={items.get(f) ?? []}
                    delMes={Number(f.slice(5, 7)) - 1 === mes}
                    esHoy={f === hoy}
                    seleccionada={f === seleccion}
                    onElegir={() => setSeleccion(f)}
                  />
                ))}
              </div>
            </section>
            <PanelDia fecha={seleccion} items={items.get(seleccion) ?? []} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 items-start">
            {semana.map((f, i) => {
              const delDia = items.get(f) ?? []
              const esHoy = f === hoy
              return (
                <section key={f} className={`${e.tarjeta} p-3 ${esHoy ? 'ring-2 ring-[var(--accent-base)]' : ''}`} aria-label={fechaLarga(f)}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${esHoy ? '' : e.suave}`} style={esHoy ? { color: 'var(--accent-texto)' } : undefined}>
                      {DIAS[i]}
                    </span>
                    <span className={`text-lg font-bold ${e.titulo}`}>{Number(f.slice(8))}</span>
                  </div>
                  <ListaDelDia fecha={f} items={delDia} />
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useId, useMemo, useRef, useState } from 'react'
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

const MS_DIA = 86_400_000
/** Cuántos días faltan para una fecha (negativo = ya pasó) y cómo decirlo. */
function cuentaRegresiva(fecha: string, hoy: string) {
  const d = Math.round((new Date(fecha + 'T12:00:00').getTime() - new Date(hoy + 'T12:00:00').getTime()) / MS_DIA)
  const texto = d === 0 ? '¡Es hoy!' : d === 1 ? 'Mañana' : d > 1 ? `En ${d} días` : d === -1 ? 'Fue ayer' : `Hace ${-d} días`
  return { dias: d, texto, urgente: d >= 0 && d <= 3 }
}

/* ---------- contorno en ola de los días con evaluación ----------
   La línea que rodea la ficha ondula suave y la onda recorre todo el borde. Todas las olas son iguales (siempre sutiles). Un solo bucle de animación para todas las fichas. */
const suscriptores = new Set<(seg: number) => void>()
let cuadro = 0
function suscribirOla(fn: (seg: number) => void) {
  suscriptores.add(fn)
  if (!cuadro) {
    const bucle = (ms: number) => {
      if (!document.hidden) suscriptores.forEach((f) => f(ms / 1000))
      cuadro = requestAnimationFrame(bucle)
    }
    cuadro = requestAnimationFrame(bucle)
  }
  return () => {
    suscriptores.delete(fn)
    if (suscriptores.size === 0) {
      cancelAnimationFrame(cuadro)
      cuadro = 0
    }
  }
}

interface PuntoBorde { x: number; y: number; nx: number; ny: number; lado: number; u: number }

/** Perímetro de un rectángulo redondeado muestreado cada ~3 px, con la normal hacia afuera. Cada punto sabe en
 *  qué lado está (0 arriba, 1 derecha, 2 abajo, 3 izquierda) y en qué fracción de él (`u`), así las ondas se
 *  reparten igual en los cuatro lados. Las esquinas son un punto de empalme (u = 0 del lado que sigue). */
function perimetroRedondeado(w: number, h: number, r: number) {
  const pts: PuntoBorde[] = []
  const rr = Math.max(2, Math.min(r, w / 2 - 1, h / 2 - 1))
  const esquina = (cx: number, cy: number, a0: number, lado: number) => {
    for (let a = 0; a <= 90; a += 10) {
      const rad = ((a0 + a) * Math.PI) / 180
      pts.push({ x: cx + rr * Math.cos(rad), y: cy + rr * Math.sin(rad), nx: Math.cos(rad), ny: Math.sin(rad), lado, u: 0 })
    }
  }
  const largos = [w - 2 * rr, h - 2 * rr, w - 2 * rr, h - 2 * rr]
  const recta = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number, lado: number) => {
    const n = Math.max(1, Math.round(largos[lado] / 3))
    for (let i = 1; i < n; i++) pts.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n, nx, ny, lado, u: i / n })
  }
  esquina(w - rr, rr, -90, 1); recta(w, rr, w, h - rr, 1, 0, 1)
  esquina(w - rr, h - rr, 0, 2); recta(w - rr, h, rr, h, 0, 1, 2)
  esquina(rr, h - rr, 90, 3); recta(0, h - rr, 0, rr, -1, 0, 3)
  esquina(rr, rr, 180, 0); recta(rr, 0, w - rr, 0, 0, -1, 0)
  return { pts, largos }
}

/** Contorno ondulado que reemplaza al borde recto de una ficha. Va dentro de un elemento `relative isolate`
 *  y se dibuja por detrás del contenido. */
function ContornoOla({ radio, grueso = false }: { radio: number; grueso?: boolean }) {
  const caja = useRef<HTMLSpanElement>(null)
  const ruta = useRef<SVGPathElement>(null)
  const [medida, setMedida] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = caja.current
    if (!el) return
    const medir = () => setMedida({ w: el.clientWidth, h: el.clientHeight })
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // todas las olas iguales: misma altura, mismo largo y misma velocidad en cada ficha
  const AMP = 1.0
  const VEL = 0.6

  useEffect(() => {
    if (!medida || medida.w < 20 || medida.h < 20 || !ruta.current) return
    const nodo = ruta.current
    const amp = AMP
    // la línea se dibuja un poco hacia adentro para que la onda nunca se salga de la ficha
    const margen = amp + 1
    const { pts, largos } = perimetroRedondeado(medida.w - margen * 2, medida.h - margen * 2, radio - margen)
    // las mismas ondas en los cuatro lados: cada uno lleva un número entero de ondas (una cada ~44 px)
    const ondas = largos.map((l) => Math.max(1, Math.round(l / 44)))
    const quieto =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.animaciones === 'no'
    const pintar = (seg: number) => {
      const fase = quieto ? 0 : seg * VEL * 1.6
      let d = ''
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        const o = amp * Math.sin(2 * Math.PI * ondas[p.lado] * p.u - fase)
        d += `${i ? 'L' : 'M'}${(margen + p.x + p.nx * o).toFixed(1)} ${(margen + p.y + p.ny * o).toFixed(1)}`
      }
      nodo.setAttribute('d', d + 'Z')
    }
    pintar(0)
    return quieto ? undefined : suscribirOla(pintar)
  }, [medida, radio])

  const id = useId()
  return (
    <span ref={caja} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[-1]">
      <svg width="100%" height="100%" className="overflow-visible" style={{ filter: 'drop-shadow(0 3px 7px color-mix(in srgb, var(--neu-danger) 22%, transparent))' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff8a5c" />
            <stop offset="55%" stopColor="#e4504f" />
            <stop offset="100%" stopColor="#c45bd6" />
          </linearGradient>
        </defs>
        <path
          ref={ruta}
          style={{ fill: 'color-mix(in srgb, var(--neu-danger) 7%, var(--neu-card))' }}
          stroke={`url(#${id})`}
          strokeWidth={grueso ? 2 : 1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

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
  if (it.tipo === 'evaluacion') {
    const cuenta = cuentaRegresiva(it.fecha, hoyISO())
    return (
      <button
        onClick={() => abrirRamo(it.ramoId)}
        className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left border ${it.hecha ? 'opacity-70' : ''}`}
        style={{
          background: it.hecha
            ? 'color-mix(in srgb, var(--neu-ok) 8%, var(--neu-card))'
            : 'linear-gradient(135deg, color-mix(in srgb, #ff8a5c 12%, var(--neu-card)), color-mix(in srgb, var(--neu-danger) 8%, var(--neu-card)))',
          borderColor: it.hecha ? 'color-mix(in srgb, var(--neu-ok) 35%, transparent)' : 'color-mix(in srgb, var(--neu-danger) 30%, transparent)',
        }}
      >
        {it.hecha && (
          <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'var(--neu-ok)' }} aria-hidden="true">
            <i className="ti ti-check text-base" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: it.hecha ? 'var(--neu-ok)' : 'var(--neu-danger)' }}>
            {it.hecha ? 'Evaluación rendida' : `Evaluación · ${cuenta.texto}`}
          </span>
          <span className="block text-[15px] font-bold truncate" style={{ color: 'var(--neu-ink)' }}>{it.titulo}</span>
          <span className="block text-xs truncate" style={{ color: 'var(--neu-ink2)' }}>
            {[ramo, it.detalle].filter(Boolean).join(' · ')}
          </span>
        </span>
      </button>
    )
  }
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
    </button>
  )
}

/** Mini etiqueta dentro de la celda del mes. */
function Etiqueta({ it }: { it: ItemCalendario }) {
  const ramos = useStore((s) => s.ramos)
  const color = colorRamo(it.ramoId, ramos)
  if (it.tipo === 'evaluacion' && !it.hecha) {
    return (
      <span
        className="flex items-center gap-1 truncate text-[11px] leading-tight px-1.5 py-0.5 rounded-md font-bold"
        style={{ background: 'color-mix(in srgb, var(--neu-danger) 14%, transparent)', color: 'var(--neu-danger)' }}
      >
        <span className="truncate">{it.titulo}</span>
      </span>
    )
  }
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
      aria-pressed={seleccionada}
      className={`sin-tactil relative isolate text-left min-h-[58px] sm:min-h-[76px] xl:min-h-[92px] p-1 sm:p-1.5 rounded-control flex flex-col gap-1 transition-colors border ${
        hayEval
          ? 'border-transparent'
          : seleccionada
          ? 'border-[var(--accent-base)] bg-[color-mix(in_srgb,var(--accent-base)_8%,transparent)]'
          : e.modoOscuro
          ? 'border-transparent hover:bg-zinc-800'
          : 'border-transparent hover:bg-zinc-50'
      } ${delMes ? '' : 'opacity-70'}`}
    >
      {/* contorno en ola: reemplaza al borde recto (al elegir el día, la línea se hace más gruesa) */}
      {hayEval && <ContornoOla radio={14} grueso={seleccionada} />}
      {/* el nombre accesible parte del texto visible (WCAG 2.5.3) y suma la fecha completa para el lector de pantalla */}
      <span className="sr-only">{`${fechaLarga(fecha)}${items.length ? `, ${items.length} ${items.length === 1 ? 'elemento' : 'elementos'}` : ''}. `}</span>
      <span
        aria-hidden="true"
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${esHoy ? 'text-white' : hayEval ? 'font-extrabold' : e.texto}`}
        style={esHoy ? { background: 'var(--accent-base)' } : hayEval ? { color: 'var(--neu-danger)' } : undefined}
      >
        {dia}
      </span>
      {/* en pantallas grandes, el título de cada cosa; en tablet y móvil, puntos de color (el detalle está en el panel del día) */}
      <span className="hidden xl:flex flex-col gap-0.5 min-w-0 w-full">
        {items.slice(0, 3).map((it) => (
          <span key={it.id} className={e.texto}>
            <Etiqueta it={it} />
          </span>
        ))}
        {items.length > 3 && <span className={`text-[11px] px-1 ${e.suave}`}>+{items.length - 3} más</span>}
      </span>
      {/* móvil: solo puntos */}
      <span className="flex xl:hidden gap-1 flex-wrap px-0.5">
        {items.filter((it) => !(it.tipo === 'evaluacion' && !it.hecha)).slice(0, 4).map((it) => (
          <span key={it.id} className="w-2 h-2 rounded-full" style={{ background: it.tipo === 'evaluacion' ? 'var(--neu-ok)' : 'var(--accent-base)', opacity: it.hecha ? 0.4 : 1 }} />
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

/** Cinta roja arriba del día cuando hay una evaluación pendiente: dice cuánto falta y anima a prepararse. */
function AvisoEvaluacion({ fecha, items }: { fecha: string; items: ItemCalendario[] }) {
  const pendientes = items.filter((x) => x.tipo === 'evaluacion' && !x.hecha)
  if (pendientes.length === 0) return null
  const c = cuentaRegresiva(fecha, hoyISO())
  const frase =
    c.dias === 0 ? '¡Hoy es el día! Respira, repasa lo esencial y mucha suerte.'
    : c.dias === 1 ? 'Es mañana: un repaso corto hoy y a descansar.'
    : c.dias > 1 ? `Faltan ${c.dias} días: todavía hay tiempo de repasar con calma.`
    : 'Este día ya pasó: anota la nota en el ramo para que cuente en tu promedio.'
  return (
    <div
      role="note"
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 mb-3 border"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, #ff8a5c 12%, var(--neu-card)), color-mix(in srgb, var(--neu-danger) 8%, var(--neu-card)))',
        borderColor: 'color-mix(in srgb, var(--neu-danger) 30%, transparent)',
      }}
    >
      <p className="text-[13px] leading-snug" style={{ color: 'var(--neu-ink)' }}>
        <span className="font-extrabold" style={{ color: 'var(--neu-danger)' }}>
          {pendientes.length === 1 ? 'Evaluación' : `${pendientes.length} evaluaciones`} · {c.texto}
        </span>
        <br />
        {frase}
      </p>
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
      <AvisoEvaluacion fecha={fecha} items={items} />
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

/** «Próximos días»: lo que viene después del día elegido (clases, tareas y evaluaciones con su cuenta regresiva). */
function ProximosDias({ desde }: { desde: string }) {
  const e = useEstilos()
  const academico = useStore((s) => s.academicoModulos)
  const tareas = useStore((s) => s.tareasPlan)
  const ramos = useStore((s) => s.ramos)
  const hoy = hoyISO()
  const lista = useMemo(() => {
    const ini = sumarDiasISO(desde, 1)
    const mapa = itemsPorFecha({ academicoModulos: academico, tareasPlan: tareas, ramos }, ini, sumarDiasISO(ini, 20), new Set(TODOS))
    const out: { fecha: string; it: ItemCalendario }[] = []
    for (const f of [...mapa.keys()].sort()) for (const it of mapa.get(f) ?? []) if (!it.hecha) out.push({ fecha: f, it })
    return out.slice(0, 5)
  }, [desde, academico, tareas, ramos])
  if (lista.length === 0) return null
  const dias = (f: string) => Math.round((new Date(f + 'T12:00:00').getTime() - new Date(hoy + 'T12:00:00').getTime()) / 86_400_000)
  return (
    <section className={`${e.tarjeta} p-4`} aria-label="Próximos días">
      <h2 className="text-[18px] font-bold mb-3" style={{ color: 'var(--neu-ink)', fontFamily: 'var(--font-head)' }}>Próximos días</h2>
      <ul className="space-y-2">
        {lista.map(({ fecha, it }) => {
          const ramo = nombreRamo(it.ramoId, ramos)
          const eval_ = it.tipo === 'evaluacion'
          const d = dias(fecha)
          const cuando = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }).replace('.', '')
          return (
            <li key={`${fecha}-${it.tipo}-${it.titulo}`}>
              <button
                onClick={() => abrirRamo(it.ramoId)}
                className="w-full flex gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-[var(--neu-bg3)]"
                style={eval_ ? { background: 'color-mix(in srgb, var(--neu-danger) 8%, var(--neu-card))' } : undefined}
              >
                <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: eval_ ? 'var(--neu-danger)' : it.tipo === 'clase' ? 'var(--accent-base)' : 'var(--neu-ink3)' }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  {eval_ && (
                    <span className="block text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--neu-danger)' }}>
                      Evaluación · en {d} {d === 1 ? 'día' : 'días'}
                    </span>
                  )}
                  <span className="block text-[15px] font-bold truncate" style={{ color: 'var(--neu-ink)' }}>{it.titulo}</span>
                  <span className="block text-[13px] truncate" style={{ color: 'var(--neu-ink2)' }}>
                    {[eval_ ? undefined : it.tipo === 'clase' ? 'Clase' : 'Tarea', cuando, it.hora, ramo].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
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
            <h1 className="titulo-pagina">Calendario</h1>
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
            <div className="space-y-4 min-w-0">
              <PanelDia fecha={seleccion} items={items.get(seleccion) ?? []} />
              <ProximosDias desde={seleccion} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 items-start">
            {semana.map((f, i) => {
              const delDia = items.get(f) ?? []
              const esHoy = f === hoy
              const hayEval = delDia.some((x) => x.tipo === 'evaluacion' && !x.hecha)
              return (
                <section
                  key={f}
                  className={`${e.tarjeta} relative isolate p-3 ${esHoy ? 'ring-2 ring-[var(--accent-base)]' : ''} ${hayEval ? '!border-transparent !bg-transparent !shadow-none' : ''}`}
                  aria-label={fechaLarga(f)}
                >
                  {hayEval && <ContornoOla radio={18} />}
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

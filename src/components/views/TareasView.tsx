import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { avisar } from '../../store/useAvisos'
import { MODULOS } from '../../data/modulos'
import { AnimatePresence } from 'framer-motion'
import { FilaTarea } from '../ui/FilaTarea'
import { ItemLista } from '../ui/ItemLista'
import { SelectorRamo } from '../ui/SelectorRamo'
import type { PrioridadTarea, TareaPlan } from '../../types'
import {
  contarPorFiltro,
  ETIQUETA_PRIORIDAD,
  filtrarTareas,
  hoyISO,
  mananaISO,
  type FiltroTareas,
} from '../../services/tareasPlan'

const FILTROS: { id: FiltroTareas; etiqueta: string }[] = [
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'proximas', etiqueta: 'Próximas' },
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'hechas', etiqueta: 'Hechas' },
]

const VACIO: Record<FiltroTareas, string> = {
  hoy: 'Nada para hoy. Si tienes algo pendiente, agrégalo arriba.',
  proximas: 'No hay tareas con fecha futura.',
  todas: 'No tienes tareas pendientes.',
  hechas: 'Aún no has terminado ninguna tarea.',
}

function useClases() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  return {
    modoOscuro,
    tarjeta: modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200',
    campo: `h-control px-3 rounded-control border text-sm outline-none campo-foco ${
      modoOscuro
        ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
        : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
    }`,
    suave: modoOscuro ? 'text-zinc-400' : 'text-zinc-500',
    titulo: modoOscuro ? 'text-white' : 'text-zinc-900',
  }
}

function NuevaTarea({ onCreada }: { onCreada: () => void }) {
  const agregar = useStore((s) => s.agregarTareaPlan)
  const c = useClases()
  const [titulo, setTitulo] = useState('')
  const [ramoId, setRamoId] = useState<string | null>(null)
  const [fecha, setFecha] = useState<string | null>(null)
  const [prioridad, setPrioridad] = useState<PrioridadTarea>('media')

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    const t = titulo.trim()
    if (!t) return
    agregar({ titulo: t, ramoId, fecha, prioridad })
    setTitulo('')
    setFecha(null)
    onCreada()
  }

  return (
    <form onSubmit={enviar} className={`rounded-tarjeta border p-3 sm:p-4 shadow-tarjeta ${c.tarjeta}`}>
      <div className="flex gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Nueva tarea"
          placeholder="Nueva tarea: leer cap. 3 de Alessandri…"
          maxLength={200}
          className={`flex-1 min-w-0 ${c.campo}`}
        />
        <button type="submit" disabled={!titulo.trim()} className="boton boton-primario">
          <i className="ti ti-plus" aria-hidden="true" />
          <span className="hidden sm:inline">Agregar</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <SelectorRamo valor={ramoId} onChange={setRamoId} className={`${c.campo} max-w-[210px]`} />
        <input
          type="date"
          aria-label="Fecha"
          value={fecha ?? ''}
          onChange={(e) => setFecha(e.target.value || null)}
          className={c.campo}
        />
        <button type="button" onClick={() => setFecha(hoyISO())} aria-pressed={fecha === hoyISO()} className="boton boton-borde">
          Hoy
        </button>
        <button type="button" onClick={() => setFecha(mananaISO())} aria-pressed={fecha === mananaISO()} className="boton boton-borde">
          Mañana
        </button>
        <select
          aria-label="Prioridad"
          value={prioridad}
          onChange={(e) => setPrioridad(e.target.value as PrioridadTarea)}
          className={c.campo}
        >
          {(['alta', 'media', 'baja'] as const).map((p) => (
            <option key={p} value={p}>
              Prioridad {ETIQUETA_PRIORIDAD[p].toLowerCase()}
            </option>
          ))}
        </select>
      </div>
    </form>
  )
}

function EditorTarea({ tarea, onCerrar }: { tarea: TareaPlan; onCerrar: () => void }) {
  const actualizar = useStore((s) => s.actualizarTareaPlan)
  const eliminar = useStore((s) => s.eliminarTareaPlan)
  const restaurar = useStore((s) => s.restaurarTareaPlan)
  const c = useClases()
  const [nuevaSub, setNuevaSub] = useState('')

  const agregarSub = (e: React.FormEvent) => {
    e.preventDefault()
    const t = nuevaSub.trim()
    if (!t) return
    actualizar(tarea.id, { subtareas: [...tarea.subtareas, { id: crypto.randomUUID(), titulo: t, hecha: false }] })
    setNuevaSub('')
  }

  const borrar = () => {
    const t = eliminar(tarea.id)
    if (t) avisar.conDeshacer('Tarea eliminada', () => restaurar(t))
    onCerrar()
  }

  return (
    <div className={`ml-[34px] mb-3 p-3 rounded-tarjeta border space-y-3 ${c.modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
      <input
        aria-label="Título"
        value={tarea.titulo}
        maxLength={200}
        onChange={(e) => actualizar(tarea.id, { titulo: e.target.value })}
        className={`w-full ${c.campo}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <SelectorRamo valor={tarea.ramoId} onChange={(v) => actualizar(tarea.id, { ramoId: v })} className={`${c.campo} max-w-[210px]`} />
        <input
          type="date"
          aria-label="Fecha"
          value={tarea.fecha ?? ''}
          onChange={(e) => actualizar(tarea.id, { fecha: e.target.value || null })}
          className={c.campo}
        />
        <select
          aria-label="Prioridad"
          value={tarea.prioridad}
          onChange={(e) => actualizar(tarea.id, { prioridad: e.target.value as PrioridadTarea })}
          className={c.campo}
        >
          {(['alta', 'media', 'baja'] as const).map((p) => (
            <option key={p} value={p}>
              Prioridad {ETIQUETA_PRIORIDAD[p].toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className={`text-xs font-semibold mb-1 ${c.suave}`}>Subtareas</div>
        {tarea.subtareas.map((s) => (
          <div key={s.id} className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={s.hecha}
              aria-label={s.titulo}
              onChange={() =>
                actualizar(tarea.id, { subtareas: tarea.subtareas.map((x) => (x.id === s.id ? { ...x, hecha: !x.hecha } : x)) })
              }
              style={{ accentColor: 'var(--accent-base)' }}
              className="w-4 h-4"
            />
            <span className={`flex-1 text-sm ${s.hecha ? `line-through ${c.suave}` : c.titulo}`}>{s.titulo}</span>
            <button
              aria-label={`Quitar subtarea: ${s.titulo}`}
              onClick={() => actualizar(tarea.id, { subtareas: tarea.subtareas.filter((x) => x.id !== s.id) })}
              className="boton boton-fantasma boton-chico boton-icono"
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>
        ))}
        <form onSubmit={agregarSub} className="flex gap-2 mt-1">
          <input
            value={nuevaSub}
            onChange={(e) => setNuevaSub(e.target.value)}
            aria-label="Nueva subtarea"
            placeholder="Agregar subtarea…"
            maxLength={160}
            className={`flex-1 min-w-0 ${c.campo}`}
          />
          <button type="submit" disabled={!nuevaSub.trim()} className="boton boton-suave">
            Agregar
          </button>
        </form>
      </div>

      <div className="flex justify-between">
        <button onClick={borrar} className="boton boton-fantasma text-red-600">
          <i className="ti ti-trash" aria-hidden="true" />
          Eliminar
        </button>
        <button onClick={onCerrar} className="boton boton-suave">
          Listo
        </button>
      </div>
    </div>
  )
}

export function TareasView() {
  const tareas = useStore((s) => s.tareasPlan)
  const ramos = useStore((s) => s.ramos)
  const c = useClases()
  const [filtro, setFiltro] = useState<FiltroTareas>('todas')
  const [ramoFiltro, setRamoFiltro] = useState<string | null>(null)
  const [abiertaId, setAbiertaId] = useState<string | null>(null)

  const cuentas = useMemo(() => contarPorFiltro(tareas), [tareas])
  const lista = useMemo(() => filtrarTareas(tareas, filtro, ramoFiltro), [tareas, filtro, ramoFiltro])
  const ramosConTareas = useMemo(() => {
    const ids = new Set(tareas.map((t) => t.ramoId).filter((x): x is string => !!x))
    return ids
  }, [tareas])

  return (
    <div className={`h-full overflow-y-auto ${c.modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <header>
          <h1 className="titulo-pagina">Tareas</h1>
          <p className={`text-sm mt-1 ${c.suave}`}>
            {cuentas.todas === 0
              ? 'Anota lo que tienes pendiente y ponle fecha.'
              : `${cuentas.todas} ${cuentas.todas === 1 ? 'pendiente' : 'pendientes'}${cuentas.hoy > 0 ? ` · ${cuentas.hoy} para hoy` : ''}`}
          </p>
        </header>
        <NuevaTarea onCreada={() => setFiltro((f) => (f === 'hechas' ? 'todas' : f))} />

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar tareas">
          {FILTROS.map((f) => (
            <button key={f.id} onClick={() => setFiltro(f.id)} aria-pressed={filtro === f.id} className="boton boton-chico boton-suave">
              {f.etiqueta}
              <span className="opacity-70 tabular-nums">{cuentas[f.id]}</span>
            </button>
          ))}
          {ramosConTareas.size > 0 && (
            <select
              aria-label="Filtrar por ramo"
              value={ramoFiltro ?? ''}
              onChange={(e) => setRamoFiltro(e.target.value || null)}
              className={`${c.campo} ml-auto max-w-[210px] h-control-sm`}
            >
              <option value="">Todos los ramos</option>
              {[...ramosConTareas].map((id) => (
                <option key={id} value={id}>
                  {ramos.find((r) => r.id === id)?.nombre ?? MODULOS.find((m) => m.id === id)?.nombre ?? 'Ramo eliminado'}
                </option>
              ))}
            </select>
          )}
        </div>

        <section className={`rounded-tarjeta border px-4 shadow-tarjeta ${c.tarjeta}`} aria-live="polite">
          {lista.length === 0 ? (
            <div className={`py-10 text-center text-sm ${c.suave}`}>
              <i className="ti ti-checkbox text-2xl block mb-2 opacity-60" aria-hidden="true" />
              {VACIO[filtro]}
            </div>
          ) : (
            <ul className={`divide-y ${c.modoOscuro ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
              <AnimatePresence initial={false}>
              {lista.map((t) => (
                <ItemLista key={t.id}>
                  <FilaTarea tarea={t} abierta={abiertaId === t.id} onAbrir={() => setAbiertaId((a) => (a === t.id ? null : t.id))} />
                  {abiertaId === t.id && <EditorTarea tarea={t} onCerrar={() => setAbiertaId(null)} />}
                </ItemLista>
              ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

import { SelectPrima } from '../ui/SelectPrima'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fondoModal, panelModal } from '../ui/animacionModal'
import { ItemLista } from '../ui/ItemLista'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/useStore'
import { useEnfoque } from '../../store/useEnfoque'
import type { SesionFoco } from '../../services/enfoque'
import { horasMin } from '../../services/enfoque'
import { fechaLarga } from '../../services/calendario'
import { colorRamo, hoyISO, nombreRamo, sumarDiasISO } from '../../services/tareasPlan'
import { useDialogo } from '../../hooks/useDialogo'
import { SelectorRamo } from '../ui/SelectorRamo'
import { Estrellas } from '../ui/CalificarSesion'

const TIPO = { pomodoro: 'Pomodoro', flowtime: 'Flowtime' } as const

const horaDe = (ms: number) => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Registrar una sesión que no se hizo con el temporizador, o corregir una existente. */
function SesionForm({ sesion, onClose }: { sesion?: SesionFoco; onClose: () => void }) {
  const agregar = useEnfoque((s) => s.agregarSesion)
  const editar = useEnfoque((s) => s.editarSesion)
  const eliminar = useEnfoque((s) => s.eliminarSesion)
  const tareas = useStore((s) => s.tareasPlan)
  const hoy = hoyISO()
  const [fecha, setFecha] = useState(sesion?.fecha ?? hoy)
  const [hora, setHora] = useState(sesion ? horaDe(sesion.inicio) : horaDe(Date.now() - 30 * 60_000))
  const [minutos, setMinutos] = useState(String(sesion?.minutos ?? 30))
  const [ramoId, setRamoId] = useState<string | null>(sesion?.ramoId ?? null)
  const [tareaId, setTareaId] = useState(sesion?.tareaId ?? '')
  const [calidad, setCalidad] = useState(sesion?.calidad ?? 0)
  const [nota, setNota] = useState(sesion?.nota ?? '')
  const [error, setError] = useState('')
  const ref = useDialogo<HTMLDivElement>(true, onClose)

  const guardar = (e: React.FormEvent) => {
    e.preventDefault()
    const m = Math.round(Number(minutos))
    if (!m || m < 1 || m > 960) return setError('Escribe una duración entre 1 y 960 minutos.')
    if (!fecha) return setError('Elige una fecha.')
    if (fecha > hoy) return setError('La fecha no puede ser futura.')
    let inicio: number | undefined
    if (hora) {
      const [h, mm] = hora.split(':').map(Number)
      const [y, mo, d] = fecha.split('-').map(Number)
      inicio = new Date(y, mo - 1, d, h, mm).getTime()
    }
    const datos = { fecha, minutos: m, ramoId, tareaId: tareaId || null, inicio, calidad: calidad || undefined, nota: nota.trim() || undefined }
    if (sesion) editar(sesion.id, datos)
    else agregar(datos)
    onClose()
  }

  const etiqueta = 'block text-xs font-semibold mb-1'
  // en un portal: así no hereda los colores del fondo animado de la pestaña y se lee siempre igual
  return createPortal(
    <motion.div {...fondoModal} className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <motion.div
        {...panelModal}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={sesion ? 'Editar sesión' : 'Registrar sesión'}
        onClick={(e) => e.stopPropagation()}
        className="max-w-md w-full max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl p-6"
        style={{ background: 'var(--neu-card)' }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--neu-ink)' }}>{sesion ? 'Editar sesión' : 'Registrar sesión'}</h2>
        <form onSubmit={guardar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={etiqueta} style={{ color: 'var(--neu-ink2)' }}>Día</span>
              <input type="date" max={hoy} value={fecha} onChange={(e) => { setFecha(e.target.value); setError('') }} aria-label="Día de la sesión" className="w-full h-control px-3 text-sm" />
            </label>
            <label>
              <span className={etiqueta} style={{ color: 'var(--neu-ink2)' }}>Hora de inicio</span>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} aria-label="Hora de inicio" className="w-full h-control px-3 text-sm" />
            </label>
          </div>
          <label className="block">
            <span className={etiqueta} style={{ color: 'var(--neu-ink2)' }}>Duración (minutos)</span>
            <input type="number" min={1} max={960} value={minutos} onChange={(e) => { setMinutos(e.target.value); setError('') }} aria-label="Duración en minutos" data-autofocus className="w-full h-control px-3 text-sm" />
          </label>
          <label className="block">
            <span className={etiqueta} style={{ color: 'var(--neu-ink2)' }}>Asignatura</span>
            <SelectorRamo valor={ramoId} onChange={setRamoId} className="w-full h-control px-3 text-sm" />
          </label>
          <label className="block">
            <span className={etiqueta} style={{ color: 'var(--neu-ink2)' }}>Tarea</span>
            <SelectPrima value={tareaId} onChange={(e) => setTareaId(e.target.value)} aria-label="Tarea" className="w-full h-control px-3 text-sm">
              <option value="">Sin tarea</option>
              {tareas.filter((t) => !t.hecha || t.id === sesion?.tareaId).map((t) => (
                <option key={t.id} value={t.id}>{t.titulo}</option>
              ))}
            </SelectPrima>
          </label>
          <div>
            <span className={etiqueta} style={{ color: 'var(--neu-ink2)' }}>Concentración</span>
            <Estrellas valor={calidad} onChange={(n) => setCalidad(n === calidad ? 0 : n)} />
          </div>
          <label className="block">
            <span className={etiqueta} style={{ color: 'var(--neu-ink2)' }}>Nota (opcional)</span>
            <input value={nota} maxLength={200} onChange={(e) => setNota(e.target.value)} className="w-full h-control px-3 text-sm" />
          </label>
          {error && <p role="alert" className="text-sm" style={{ color: 'var(--neu-danger)' }}>{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            {sesion && (
              <button type="button" className="boton boton-fantasma mr-auto" style={{ color: 'var(--neu-danger)' }} onClick={() => { eliminar(sesion.id); onClose() }}>
                Eliminar
              </button>
            )}
            <button type="button" className="boton boton-suave" onClick={onClose}>Cancelar</button>
            <button type="submit" className="boton boton-primario">Guardar</button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

export function EnfoqueHistorial() {
  const sesiones = useEnfoque((s) => s.sesiones)
  const ramos = useStore((s) => s.ramos)
  const tareas = useStore((s) => s.tareasPlan)
  const [form, setForm] = useState<{ sesion?: SesionFoco } | null>(null)
  const [dias, setDias] = useState(14)
  const hoy = hoyISO()

  const desde = sumarDiasISO(hoy, -(dias - 1))
  const grupos = new Map<string, SesionFoco[]>()
  for (const s of sesiones.filter((x) => x.fecha >= desde).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.inicio - a.inicio)) {
    grupos.set(s.fecha, [...(grupos.get(s.fecha) ?? []), s])
  }
  const hayMas = sesiones.some((s) => s.fecha < desde)

  return (
    <>
      <section className="neu-raised p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--neu-ink)' }}>Historial</h2>
          <button className="boton boton-suave boton-chico" onClick={() => setForm({})}>
            <i className="ti ti-plus" aria-hidden="true" /> Registrar sesión
          </button>
        </div>
        {grupos.size === 0 && (
          <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>No hay sesiones en este período. Si estudiaste sin el temporizador, regístrala a mano.</p>
        )}
        <AnimatePresence initial={false}>
        {[...grupos.entries()].map(([fecha, lista]) => (
          <ItemLista as="div" key={fecha}>
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--neu-ink3)' }}>
              {fecha === hoy ? 'Hoy · ' : fecha === sumarDiasISO(hoy, -1) ? 'Ayer · ' : ''}
              {fechaLarga(fecha)} · {horasMin(lista.reduce((a, s) => a + s.minutos, 0))}
            </p>
            <AnimatePresence initial={false}>
            {lista.map((s) => {
              const nombre = nombreRamo(s.ramoId, ramos)
              const tarea = tareas.find((t) => t.id === s.tareaId)
              return (
                <ItemLista as="div" key={s.id}>
                <button
                  onClick={() => setForm({ sesion: s })}
                  aria-label={`Editar sesión de ${s.minutos} minutos`}
                  className="sin-neu sin-tactil w-full flex items-center gap-3 py-2.5 text-left rounded-xl hover:bg-[var(--neu-bg3)] px-2 -mx-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colorRamo(s.ramoId, ramos) }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold break-words" style={{ color: 'var(--neu-ink)' }}>
                      {nombre ?? 'Sin asignatura'}{tarea ? ` · ${tarea.titulo}` : ''}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs" style={{ color: 'var(--neu-ink2)' }}>
                      <span>{horaDe(s.inicio)}</span>
                      <span className="neu-chip px-2 py-0.5 text-[10px] font-bold">{TIPO[s.tipo]}</span>
                      {s.distracciones ? <span>{s.distracciones} {s.distracciones === 1 ? 'distracción' : 'distracciones'}</span> : null}
                      {s.nota && <span className="italic">“{s.nota}”</span>}
                    </span>
                  </span>
                  {s.calidad !== undefined && <Estrellas valor={s.calidad} tamano={14} />}
                  <span className="neu-chip px-3 py-1 text-xs font-bold tabular-nums min-w-[76px] text-center" style={{ color: 'var(--accent-texto)' }}>{horasMin(s.minutos)}</span>
                </button>
                </ItemLista>
              )
            })}
            </AnimatePresence>
          </div>
          </ItemLista>
        ))}
        </AnimatePresence>
        {hayMas && dias < 365 && (
          <button className="boton boton-suave w-full mt-2" onClick={() => setDias((n) => n * 2)}>Ver más antiguas</button>
        )}
      </section>
      <AnimatePresence>{form && <SesionForm sesion={form.sesion} onClose={() => setForm(null)} />}</AnimatePresence>
    </>
  )
}

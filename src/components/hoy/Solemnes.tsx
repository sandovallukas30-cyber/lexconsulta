import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { useEnfoque } from '../../store/useEnfoque'
import { avisar } from '../../store/useAvisos'
import { evaluacionesPendientes } from '../../services/modulosAcademico'
import { fraseCuentaRegresiva, generarPlan, origenDePlan } from '../../services/planEstudio'
import { tarjetasDe, estaPendiente } from '../../services/tarjetasApunte'
import { minutosPorRamo, horasMin } from '../../services/enfoque'
import { colorRamo, hoyISO, nombreRamo, sumarDiasISO, etiquetaFecha } from '../../services/tareasPlan'
import { celebrar } from '../../services/celebrar'

/** Cuenta regresiva de solemnes: cuánto falta, cuánto llevas estudiado de ese
 *  ramo y un botón que arma el plan de estudio día por día. */
export function Solemnes() {
  const academico = useStore((s) => s.academicoModulos)
  const ramos = useStore((s) => s.ramos)
  const tareas = useStore((s) => s.tareasPlan)
  const sesiones = useEnfoque((s) => s.sesiones)
  const setVista = useStore((s) => s.setVistaActiva)
  const hoy = hoyISO()

  const proximas = useMemo(() => evaluacionesPendientes(academico).proximas.slice(0, 3), [academico])
  const hace7 = sumarDiasISO(hoy, -6)

  if (proximas.length === 0) {
    return <p className="text-sm py-2" style={{ color: 'var(--neu-ink2)' }}>No tienes evaluaciones próximas registradas. Agrégalas en la pestaña Exámenes de cada ramo y aquí aparece la cuenta regresiva.</p>
  }

  const crearPlan = (moduloId: string, evaluacion: { id: string; nombre: string; fecha: string }) => {
    const st = useStore.getState()
    const datos = st.academicoModulos[moduloId]
    const apuntes = datos?.apuntes ?? []
    const pendientes = apuntes.reduce((n, a) => n + tarjetasDe(a).filter((t) => estaPendiente(st.repasoApuntes[t.id])).length, 0)
    const pasos = generarPlan({
      evaluacion: evaluacion.nombre,
      ramo: nombreRamo(moduloId, st.ramos) ?? 'el ramo',
      fechaEval: evaluacion.fecha,
      hoy: hoyISO(),
      apuntes: apuntes.map((a) => a.titulo || 'Apunte sin título'),
      tarjetasPendientes: pendientes,
    })
    if (pasos.length === 0) {
      avisar.info('No queda tiempo para armar un plan: la evaluación es hoy.')
      return
    }
    const origen = origenDePlan(evaluacion.id)
    // rehacer el plan reemplaza lo que quedaba pendiente del anterior
    const previas = st.tareasPlan.filter((t) => t.origen === origen && !t.hecha)
    for (const t of previas) st.eliminarTareaPlan(t.id)
    const ids = pasos.map((p) =>
      st.agregarTareaPlan({
        titulo: p.titulo,
        ramoId: moduloId,
        fecha: p.fecha,
        prioridad: p.prioridad,
        subtareas: p.subtareas.map((t) => ({ id: crypto.randomUUID(), titulo: t, hecha: false })),
        origen,
      })
    )
    celebrar(null)
    avisar.conDeshacer(`Plan listo: ${pasos.length} pasos hasta el ${pasos[pasos.length - 1].fecha.split('-').reverse().slice(0, 2).join('/')}`, () => {
      const s2 = useStore.getState()
      ids.forEach((id) => s2.eliminarTareaPlan(id))
      previas.forEach((t) => s2.restaurarTareaPlan(t))
    })
  }

  return (
    <ul className="space-y-3">
      {proximas.map((x) => {
        const color = colorRamo(x.moduloId, ramos)
        const origen = origenDePlan(x.evaluacion.id)
        const plan = tareas.filter((t) => t.origen === origen)
        const hechas = plan.filter((t) => t.hecha).length
        const minutos = minutosPorRamo(sesiones, hace7).find((m) => m.ramoId === x.moduloId)?.minutos ?? 0
        const urgente = x.dias <= 3
        const proximo = x.dias <= 7
        const fondo = urgente ? 'var(--neu-danger-soft)' : proximo ? 'var(--neu-warn-soft)' : 'var(--neu-bg)'
        const tinta = urgente ? 'var(--neu-danger)' : proximo ? 'var(--neu-warn)' : 'var(--neu-ink)'
        return (
          <li key={`${x.moduloId}-${x.evaluacion.id}`} className="flex gap-3 items-stretch">
            <div
              className="w-[68px] flex-shrink-0 rounded-2xl flex flex-col items-center justify-center py-2"
              style={{ background: fondo, boxShadow: urgente || proximo ? 'none' : 'var(--neu-chica)', color: tinta }}
              aria-label={x.dias === 0 ? 'Es hoy' : x.dias === 1 ? 'Es mañana' : `Faltan ${x.dias} días`}
            >
              {x.dias <= 1 ? (
                <span className="text-[11px] font-extrabold uppercase tracking-wide">{x.dias === 0 ? 'Hoy' : 'Mañana'}</span>
              ) : (
                <>
                  <span className="text-2xl font-extrabold leading-none">{x.dias}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide mt-0.5">días</span>
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--neu-ink)' }}>{x.evaluacion.nombre}</p>
              <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--neu-ink2)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} aria-hidden="true" />
                <span className="truncate">{nombreRamo(x.moduloId, ramos) ?? 'Ramo'} · {x.evaluacion.ponderacion}% de la nota · {etiquetaFecha(x.evaluacion.fecha).texto.toLowerCase()}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--neu-ink3)' }}>
                {fraseCuentaRegresiva(x.dias, plan.length > 0 ? { hechas, total: plan.length } : undefined)}
                {minutos > 0 ? ` En los últimos 7 días llevas ${horasMin(minutos)} de enfoque en este ramo.` : ''}
              </p>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {x.dias >= 1 && x.dias <= 30 && (
                  <button onClick={() => crearPlan(x.moduloId, x.evaluacion)} className="boton boton-suave boton-chico">
                    <i className="ti ti-route" aria-hidden="true" /> {plan.length > 0 ? 'Rehacer el plan' : 'Armar plan de estudio'}
                  </button>
                )}
                {plan.length > 0 && (
                  <button onClick={() => setVista('tareas')} className="boton boton-fantasma boton-chico">
                    Ver el plan <i className="ti ti-chevron-right" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

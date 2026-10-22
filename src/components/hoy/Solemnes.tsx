import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { useEnfoque } from '../../store/useEnfoque'
import { avisar } from '../../store/useAvisos'
import { evaluacionesPendientes } from '../../services/modulosAcademico'
import { fraseCuentaRegresiva, generarPlan, origenDePlan } from '../../services/planEstudio'
import { tarjetasDe, estaPendiente } from '../../services/tarjetasApunte'
import { minutosPorRamo, horasMin } from '../../services/enfoque'
import { hoyISO, nombreRamo, sumarDiasISO, etiquetaFecha } from '../../services/tareasPlan'
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

  const textoDias = (dias: number) => (dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : dias < 42 ? `${dias} días` : `${Math.round(dias / 7)} sem.`)

  return (
    <ul className="space-y-2">
      {proximas.map((x, i) => {
        const origen = origenDePlan(x.evaluacion.id)
        const plan = tareas.filter((t) => t.origen === origen)
        const hechas = plan.filter((t) => t.hecha).length
        const minutos = minutosPorRamo(sesiones, hace7).find((m) => m.ramoId === x.moduloId)?.minutos ?? 0
        const destacada = i === 0
        const urgente = x.dias <= 3
        const proximo = x.dias <= 7
        const fondo = urgente ? 'var(--neu-danger-soft)' : proximo ? 'var(--neu-warn-soft)' : 'var(--neu-bg)'
        const tinta = urgente ? 'var(--neu-danger)' : proximo ? 'var(--neu-warn)' : 'var(--neu-ink)'
        const detalle = `${nombreRamo(x.moduloId, ramos) ?? 'Ramo'} · ${x.evaluacion.ponderacion} % · ${etiquetaFecha(x.evaluacion.fecha).texto.toLowerCase()}`
        const etiquetaDias = x.dias === 0 ? 'Es hoy' : x.dias === 1 ? 'Es mañana' : `Faltan ${x.dias} días`
        if (!destacada) {
          return (
            <li key={`${x.moduloId}-${x.evaluacion.id}`} className="flex items-center gap-3 px-1 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold truncate" style={{ color: 'var(--neu-ink)' }}>{x.evaluacion.nombre}</p>
                <p className="text-[12.5px] truncate" style={{ color: 'var(--neu-ink2)' }}>{detalle}</p>
              </div>
              <span
                className="text-[12.5px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 tabular-nums"
                style={{ background: 'var(--neu-bg3)', color: 'var(--neu-ink2)' }}
                aria-label={etiquetaDias}
              >
                {textoDias(x.dias)}
              </span>
            </li>
          )
        }
        return (
          <li key={`${x.moduloId}-${x.evaluacion.id}`} className="rounded-2xl p-3.5" style={{ background: fondo }}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold truncate" style={{ color: 'var(--neu-ink)' }}>{x.evaluacion.nombre}</p>
                <p className="text-[12.5px] truncate" style={{ color: 'var(--neu-ink2)' }}>{detalle}</p>
              </div>
              <span className="flex items-baseline gap-1 flex-shrink-0" style={{ color: tinta }} aria-label={etiquetaDias}>
                {x.dias <= 1 ? (
                  <span className="text-[18px] font-extrabold">{textoDias(x.dias)}</span>
                ) : (
                  <>
                    <span className="text-[26px] font-extrabold leading-none tabular-nums">{x.dias}</span>
                    <span className="text-[13px] font-bold">días</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--neu-ink2)' }}>
              {fraseCuentaRegresiva(x.dias, plan.length > 0 ? { hechas, total: plan.length } : undefined)}
              {minutos > 0 ? ` En los últimos 7 días llevas ${horasMin(minutos)} de enfoque en este ramo.` : ''}
            </p>
            <div className="flex gap-2 mt-2.5 flex-wrap">
              {x.dias >= 1 && x.dias <= 30 && (
                <button
                  onClick={() => crearPlan(x.moduloId, x.evaluacion)}
                  className="boton flex-1 justify-center border"
                  style={{ background: 'var(--neu-card)', borderColor: 'var(--neu-line)', color: tinta }}
                >
                  {plan.length > 0 ? 'Rehacer el plan' : 'Armar plan de estudio'}
                </button>
              )}
              {plan.length > 0 && (
                <button onClick={() => setVista('tareas')} className="boton boton-fantasma boton-chico">
                  Ver el plan <i className="ti ti-chevron-right" aria-hidden="true" />
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

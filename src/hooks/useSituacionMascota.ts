import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { useEnfoque } from '../store/useEnfoque'
import { evaluacionesPendientes } from '../services/modulosAcademico'
import { calcularRachaEstudio } from '../services/actividadEstudio'
import { claseEnCurso } from '../services/loQueSigue'
import { minutosEnFecha } from '../services/enfoque'
import { filtrarTareas, hoyISO } from '../services/tareasPlan'
import type { SituacionMascota } from '../services/mascota'

/** Cosas que cambian con el día: la mascota las mira para saber cómo está. */
export function useSituacionMascota(): SituacionMascota {
  const tareas = useStore((s) => s.tareasPlan)
  const academico = useStore((s) => s.academicoModulos)
  const ramos = useStore((s) => s.ramos)
  const dias = useStore((s) => s.diasActividadEstudio)
  const estado = useEnfoque((e) => e.estado)
  const modo = useEnfoque((e) => e.modo)
  const sesiones = useEnfoque((e) => e.sesiones)
  const meta = useEnfoque((e) => e.ajustes.metaDia)
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const hoy = hoyISO()
  return useMemo(() => {
    const evals = evaluacionesPendientes(academico).proximas
    return {
      hora: ahora.getHours(),
      enfocando: estado === 'corriendo' && modo === 'foco',
      enClase: claseEnCurso(academico, ramos, hoy, ahora) !== null,
      minutosHoy: minutosEnFecha(sesiones, hoy),
      metaMin: meta,
      tareasHechasHoy: tareas.filter((t) => t.hecha && t.hechaEn === hoy).length,
      tareasPendientesHoy: filtrarTareas(tareas, 'hoy').length,
      tareasVencidas: tareas.filter((t) => !t.hecha && t.fecha !== null && t.fecha < hoy).length,
      diasSolemne: evals.length > 0 ? Math.max(0, evals[0].dias) : null,
      rachaDias: calcularRachaEstudio(dias),
    }
  }, [academico, ramos, dias, estado, modo, sesiones, meta, tareas, ahora, hoy])
}


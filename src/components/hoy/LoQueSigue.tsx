import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useEnfoque } from '../../store/useEnfoque'
import { obtenerProximosEventos, diasHasta } from '../../services/modulosAcademico'
import { claseEnCurso, textoEnClase, textoSiguiente } from '../../services/loQueSigue'
import { abrirApunteDeClase, marcarAsistencia } from '../../services/apuntesClase'
import { hoyISO, nombreRamo } from '../../services/tareasPlan'

/** «Lo que sigue» de Hoy: la próxima clase o evaluación con cuenta regresiva,
 *  lugar, una frase amable y accesos directos. Si estás en clase ahora mismo,
 *  pasa a «modo clase»: un solo botón para tomar apuntes. */
export function LoQueSigue() {
  const academico = useStore((s) => s.academicoModulos)
  const ramos = useStore((s) => s.ramos)
  const setVista = useStore((s) => s.setVistaActiva)
  const [ahora, setAhora] = useState(() => new Date())
  // la cuenta regresiva se pone al día cada 30 segundos
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const hoy = hoyISO()
  const hm = ahora.toTimeString().slice(0, 5)
  const enCurso = useMemo(() => claseEnCurso(academico, ramos, hoy, ahora), [academico, ramos, hoy, ahora])
  const siguiente = useMemo(() => {
    const lista = obtenerProximosEventos(academico).filter((e) => e.fecha > hoy || (e.fecha === hoy && (e.tipo === 'examen' || !e.hora || e.hora >= hm)))
    // si la clase en curso aparece como «siguiente» (empieza en 5 min), se muestra la que viene después
    return lista.find((e) => !(enCurso && e.claseId === enCurso.claseId)) ?? null
  }, [academico, hoy, hm, enCurso])

  const enfocar = (ramoId: string) => {
    useEnfoque.getState().setObjetivo(ramoId, null)
    setVista('enfoque')
  }
  const verRamo = (id: string) => useStore.setState({ vistaActiva: 'modulos', moduloActivoId: id })

  if (enCurso) {
    const ramo = nombreRamo(enCurso.moduloId, ramos) ?? 'tu clase'
    const t = textoEnClase({ ramo, sala: enCurso.sala, minutosRestantes: enCurso.minutosRestantes }, hoy)
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        aria-label="Estás en clase"
        className="sobre-color rounded-[22px] px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ background: 'color-mix(in srgb, var(--accent-base) 20%, var(--neu-bg))', boxShadow: 'var(--neu-elevada)' }}
      >
        <span className="w-14 h-14 rounded-[16px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-plana)' }}>
          <i className="ti ti-pencil text-2xl" style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: 'var(--accent-texto)' }}>
            <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-base)' }} aria-hidden="true" />
            En clase
          </p>
          <h2 className="text-xl font-extrabold leading-tight" style={{ color: 'var(--neu-ink)' }}>{t.titulo}</h2>
          <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>{t.detalle}</p>
          <p className="text-sm italic mt-1" style={{ color: 'var(--neu-ink3)' }}>{t.animo}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => abrirApunteDeClase(enCurso.moduloId, enCurso.claseId)} className="boton boton-primario px-5">
            <i className="ti ti-notes" aria-hidden="true" /> Tomar apuntes
          </button>
          {enCurso.asistio === undefined ? (
            <button onClick={() => marcarAsistencia(enCurso.moduloId, enCurso.claseId, true)} className="boton boton-suave">
              <i className="ti ti-check" aria-hidden="true" /> Estoy aquí
            </button>
          ) : (
            <span className="boton boton-suave pointer-events-none" aria-live="polite">
              <i className={`ti ${enCurso.asistio ? 'ti-circle-check' : 'ti-circle-x'}`} aria-hidden="true" /> {enCurso.asistio ? 'Asistencia marcada' : 'Faltaste'}
            </span>
          )}
        </div>
      </motion.section>
    )
  }

  if (!siguiente) return null
  const ramoNombre = nombreRamo(siguiente.moduloId, ramos) ?? 'Ramo'
  const clase = siguiente.tipo === 'clase' ? academico[siguiente.moduloId]?.clases.find((c) => c.id === siguiente.claseId) : undefined
  const t = textoSiguiente(
    { tipo: siguiente.tipo, ramo: ramoNombre, titulo: siguiente.titulo, fecha: siguiente.fecha, hora: siguiente.hora, sala: clase?.sala, dias: diasHasta(siguiente.fecha) },
    ahora,
    hoy
  )
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label="Lo que sigue"
      className="sobre-color rounded-[22px] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ background: 'color-mix(in srgb, var(--accent-base) 12%, var(--neu-bg))', boxShadow: 'var(--neu-elevada)' }}
    >
      <span className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-plana)' }}>
        <i className={`ti ${siguiente.tipo === 'clase' ? 'ti-school' : 'ti-clipboard-check'} text-xl`} style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--neu-ink3)' }}>Lo que sigue</p>
        <h2 className="text-lg font-extrabold leading-tight" style={{ color: 'var(--neu-ink)' }}>{t.titulo}</h2>
        <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>{t.detalle}</p>
        <p className="text-sm italic mt-0.5" style={{ color: 'var(--neu-ink3)' }}>{t.animo}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {siguiente.tipo === 'clase' && siguiente.claseId && (
          <button onClick={() => abrirApunteDeClase(siguiente.moduloId, siguiente.claseId as string)} className="boton boton-suave boton-chico" title="Crea el apunte de esta clase para tenerlo listo">
            <i className="ti ti-notes" aria-hidden="true" /> Apunte de la clase
          </button>
        )}
        <button onClick={() => enfocar(siguiente.moduloId)} className="boton boton-suave boton-chico">
          <i className="ti ti-hourglass-high" aria-hidden="true" /> Enfocar 25 min
        </button>
        <button onClick={() => verRamo(siguiente.moduloId)} className="boton boton-fantasma boton-chico">
          Ver ramo <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </motion.section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useEnfoque, esFlow, msEnfocados, msMostrados } from '../../store/useEnfoque'
import { useEnfoqueLocal } from '../../store/useEnfoqueLocal'
import { avisar } from '../../store/useAvisos'
import { useAhora } from '../../hooks/useMotorEnfoque'
import { SONIDOS } from '../../services/ambiente'
import { mmss, NOMBRE_MODO } from '../../services/enfoque'
import { colorRamo, nombreRamo } from '../../services/tareasPlan'
import { AnilloProgreso } from '../ui/AnilloProgreso'
import { CalificarSesion } from '../ui/CalificarSesion'
import { SelectorRamo } from '../ui/SelectorRamo'
import { FondoEnfoque, SelectorFondo, useConFondo } from './FondoEnfoque'
import { Respiracion } from './Respiracion'

/** Anillo grande, pero que quepa en pantallas chicas. */
const anillo = () => Math.max(170, Math.min(380, window.innerWidth - 80, window.innerHeight - 330))

/** Pantalla completa de enfoque: reloj grande, ramo y tarea en foco, fondo animado y sonido. */
export function ModoConcentracion({ onCerrar }: { onCerrar: () => void }) {
  const estado = useEnfoque((s) => s.estado)
  const modo = useEnfoque((s) => s.modo)
  const tecnica = useEnfoque((s) => s.tecnica)
  const ramoId = useEnfoque((s) => s.ramoId)
  const tareaId = useEnfoque((s) => s.tareaId)
  const distracciones = useEnfoque((s) => s.distracciones)
  const inicioSesion = useEnfoque((s) => s.inicioSesion)
  const foco = useEnfoque((s) => s.ajustes.foco)
  const reloj = useEnfoque()
  const iniciar = useEnfoque((s) => s.iniciar)
  const pausar = useEnfoque((s) => s.pausar)
  const reiniciar = useEnfoque((s) => s.reiniciar)
  const terminar = useEnfoque((s) => s.terminar)
  const saltarDescanso = useEnfoque((s) => s.saltarDescanso)
  const distraje = useEnfoque((s) => s.distraje)
  const setObjetivo = useEnfoque((s) => s.setObjetivo)

  const ramos = useStore((s) => s.ramos)
  const tareasPlan = useStore((s) => s.tareasPlan)
  const agregarTareaPlan = useStore((s) => s.agregarTareaPlan)
  const alternarTareaPlan = useStore((s) => s.alternarTareaPlan)
  const modoOscuro = useStore((s) => s.modoOscuro)

  const sonido = useEnfoqueLocal((s) => s.sonido)
  const volumen = useEnfoqueLocal((s) => s.volumen)
  const ajustarLocal = useEnfoqueLocal((s) => s.set)

  const conFondo = useConFondo()
  const corriendo = estado === 'corriendo'
  const ahora = useAhora(corriendo, 250)
  const [tamanoAnillo, setTamanoAnillo] = useState(anillo)
  const [opciones, setOpciones] = useState(false)
  const [idea, setIdea] = useState('')

  // El cierre se guarda en una ref para no volver a armar los listeners en cada render.
  const cerrarRef = useRef(onCerrar)
  useEffect(() => {
    cerrarRef.current = onCerrar
  }, [onCerrar])
  const enPantallaCompleta = useRef(false)

  // Pantalla completa del sistema, si está permitida; Esc sale de ambos.
  useEffect(() => {
    const el = document.documentElement
    if (el.requestFullscreen) {
      el.requestFullscreen()
        .then(() => {
          enPantallaCompleta.current = true
        })
        .catch(() => undefined)
    }
    const alCambiar = () => {
      if (enPantallaCompleta.current && !document.fullscreenElement) cerrarRef.current()
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarRef.current()
    }
    const alRedimensionar = () => setTamanoAnillo(anillo())
    window.addEventListener('resize', alRedimensionar)
    document.addEventListener('fullscreenchange', alCambiar)
    window.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('fullscreenchange', alCambiar)
      window.removeEventListener('keydown', alTeclear)
      window.removeEventListener('resize', alRedimensionar)
      enPantallaCompleta.current = false
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  const flow = esFlow(reloj)
  const bloqueMs = Math.max(60, foco * 60) * 1000
  const mostrados = msMostrados(reloj, ahora)
  const enfocados = msEnfocados(reloj, ahora)
  const progreso = flow ? (enfocados % bloqueMs) / bloqueMs || (enfocados > 0 ? 1 : 0) : reloj.totalMs ? mostrados / reloj.totalMs : 0
  const pendientes = tareasPlan.filter((t) => !t.hecha)
  const tarea = pendientes.find((t) => t.id === tareaId)
  const puedeTerminar = modo === 'foco' && inicioSesion !== null && enfocados >= 60_000
  const nombre = nombreRamo(ramoId, ramos)

  const anotarIdea = (e: React.FormEvent) => {
    e.preventDefault()
    const titulo = idea.trim()
    if (!titulo) return
    agregarTareaPlan({ titulo, ramoId, fecha: null, prioridad: 'baja' })
    setIdea('')
    avisar.exito('Idea guardada en tus tareas')
  }

  return (
    <div className={`enf-foco${conFondo ? ' enf-con-fondo' : ''}`} role="dialog" aria-modal="true" aria-label="Modo concentración">
      <FondoEnfoque />
      <button type="button" className="boton boton-suave enf-foco-salir" onClick={onCerrar} aria-label="Salir del modo concentración">
        <i className="ti ti-x" aria-hidden="true" />
      </button>

      <div className="enf-foco-centro">
        <div className="enf-sobretitulo">{flow ? 'Flowtime' : NOMBRE_MODO[modo]}</div>
        <AnilloProgreso
          progreso={progreso}
          tamano={tamanoAnillo}
          grosor={16}
          modoOscuro={modoOscuro}
          etiqueta={`${flow ? 'Flowtime' : NOMBRE_MODO[modo]}: ${mmss(mostrados)}`}
        >
          <div className="enf-reloj" style={{ fontSize: Math.round(tamanoAnillo * (mostrados >= 3_600_000 ? 0.19 : 0.25)) }}>
            {mmss(mostrados)}
          </div>
        </AnilloProgreso>

        {tarea && <div className="enf-foco-tarea">{tarea.titulo}</div>}
        {!tarea && nombre && (
          <div className="enf-foco-tarea" style={{ borderLeft: `4px solid ${colorRamo(ramoId, ramos)}` }}>
            {nombre}
          </div>
        )}
        {modo !== 'foco' && tecnica === 'pomodoro' && <Respiracion compacta />}

        <div className="enf-controles">
          <button type="button" className="boton boton-suave enf-redondo" onClick={reiniciar} aria-label="Reiniciar (descarta lo avanzado)" title="Reiniciar">
            <i className="ti ti-rotate-clockwise-2" aria-hidden="true" />
          </button>
          <button type="button" className="boton boton-primario enf-principal" onClick={corriendo ? pausar : iniciar}>
            <i className={`ti ${corriendo ? 'ti-player-pause' : 'ti-player-play'}`} aria-hidden="true" />
            {corriendo ? 'Pausar' : 'Iniciar'}
          </button>
          {modo !== 'foco' && (
            <button type="button" className="boton boton-suave enf-redondo" onClick={saltarDescanso} aria-label="Saltar el descanso" title="Saltar el descanso">
              <i className="ti ti-player-skip-forward" aria-hidden="true" />
            </button>
          )}
        </div>

        {modo === 'foco' && inicioSesion !== null && (
          <div className="enf-fila">
            <button type="button" className="boton boton-suave" disabled={!puedeTerminar} onClick={terminar} title={puedeTerminar ? undefined : 'Necesitas al menos 1 minuto enfocado'}>
              <i className="ti ti-flag" aria-hidden="true" /> Terminar y guardar
            </button>
            <button type="button" className="boton boton-fantasma" onClick={distraje}>
              <i className="ti ti-bolt" aria-hidden="true" /> Me distraje{distracciones > 0 ? ` · ${distracciones}` : ''}
            </button>
          </div>
        )}
        <div className="enf-calificar">
          <CalificarSesion />
        </div>
      </div>

      {opciones && (
        <div className="enf-panel neu-raised" role="region" aria-label="Opciones del enfoque">
          <div className="enf-panel-cab">
            <b>Fondo, sonido e ideas</b>
            <button type="button" className="boton boton-fantasma boton-chico" aria-label="Cerrar las opciones" onClick={() => setOpciones(false)}>
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>
          <form className="enf-campo" onSubmit={anotarIdea}>
            <label className="enf-etiqueta" htmlFor="enf-idea">
              Se me ocurrió…
            </label>
            <div className="enf-fila-idea">
              <input
                id="enf-idea"
                value={idea}
                maxLength={140}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Anótalo y sigue concentrado; lo ves después en Tareas"
                className="enf-input"
              />
              <button type="submit" className="boton boton-suave" disabled={!idea.trim()}>
                Guardar
              </button>
            </div>
          </form>
          <div className="enf-campo">
            <span className="enf-etiqueta">Fondo</span>
            <SelectorFondo />
          </div>
          <div className="enf-campo">
            <span className="enf-etiqueta">Sonido ambiente</span>
            <div className="enf-sonidos" role="radiogroup" aria-label="Sonido ambiente">
              {SONIDOS.map(([id, nombreSonido]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={sonido === id}
                  className={`boton boton-chico ${sonido === id ? 'boton-primario' : 'boton-suave'}`}
                  onClick={() => ajustarLocal({ sonido: id })}
                >
                  {nombreSonido}
                </button>
              ))}
            </div>
            <div className="enf-volumen">
              <i className="ti ti-volume" aria-hidden="true" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volumen}
                onChange={(e) => ajustarLocal({ volumen: Number(e.target.value) })}
                aria-label="Volumen"
                disabled={sonido === 'apagado'}
              />
            </div>
          </div>
        </div>
      )}

      <div className="enf-pie neu-raised">
        <div className="enf-campo">
          <span className="enf-etiqueta">Ramo</span>
          <SelectorRamo valor={ramoId} onChange={(v) => setObjetivo(v, tareaId)} etiqueta="Ramo en foco" className="enf-input" />
        </div>
        <div className="enf-campo">
          <label className="enf-etiqueta" htmlFor="enf-tarea">
            Tarea en foco
          </label>
          <select id="enf-tarea" className="enf-input" value={tareaId ?? ''} onChange={(e) => setObjetivo(ramoId, e.target.value || null)}>
            <option value="">Ninguna</option>
            {pendientes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo}
              </option>
            ))}
          </select>
        </div>
        {tarea && (
          <button
            type="button"
            className="boton boton-suave"
            onClick={() => {
              alternarTareaPlan(tarea.id)
              setObjetivo(ramoId, null)
              avisar.exito(`Tarea completada: ${tarea.titulo}`)
            }}
          >
            <i className="ti ti-check" aria-hidden="true" /> Completar
          </button>
        )}
        <button type="button" className={`boton boton-suave enf-mas${opciones ? ' is-on' : ''}`} aria-expanded={opciones} onClick={() => setOpciones((o) => !o)}>
          <i className="ti ti-adjustments" aria-hidden="true" /> Fondo, sonido e ideas
        </button>
      </div>
    </div>
  )
}

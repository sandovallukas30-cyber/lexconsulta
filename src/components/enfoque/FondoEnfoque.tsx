import { useEffect, useRef, useState } from 'react'
import { useAjustes, prefiereMenosMovimiento } from '../../store/useAjustes'
import { useEnfoque, esFlow, msEnfocados } from '../../store/useEnfoque'
import { useEnfoqueLocal } from '../../store/useEnfoqueLocal'
import { avisar } from '../../store/useAvisos'
import { useAhora } from '../../hooks/useMotorEnfoque'
import { FONDOS, esFondo, infoFondo, type FondoId } from '../../services/fondos'
import { guardarFoto, leerFoto, quitarFoto } from '../../services/fotoFondo'
import { Aurora, Bosque, Cafeteria, Cielo, Ciudad, Espacio, Lluvia, Noche, Otono, Playa, type PropsEscena } from './Escenas'

const ESCENAS: Partial<Record<FondoId, (props: PropsEscena) => React.JSX.Element>> = {
  noche: Noche, bosque: Bosque, playa: Playa, aurora: Aurora, lluvia: Lluvia, ciudad: Ciudad, cafeteria: Cafeteria, espacio: Espacio, otono: Otono,
}

/** Hora del día en decimales (14,5 = 14:30), puesta al día cada minuto. */
function useHora(): number {
  const ahora = () => {
    const d = new Date()
    return d.getHours() + d.getMinutes() / 60
  }
  const [h, setH] = useState(ahora)
  useEffect(() => {
    const id = window.setInterval(() => setH(ahora()), 60000)
    return () => window.clearInterval(id)
  }, [])
  return h
}

/** El fondo que se ve ahora, según lo elegido en el panel de enfoque. */
// eslint-disable-next-line react-refresh/only-export-components
export function useFondoActivo(): FondoId {
  const fondo = useEnfoqueLocal((s) => s.fondo)
  return esFondo(fondo) ? fondo : 'ninguno'
}

/** Verdadero cuando hay un fondo animado: los textos y controles pasan a claro. */
// eslint-disable-next-line react-refresh/only-export-components
export function useConFondo(): boolean {
  return useFondoActivo() !== 'ninguno'
}

/** Cuánto avanzó el ciclo actual, de 0 a 1 (en Flowtime, el bloque de enfoque en curso). */
function useProgreso(): number {
  const corriendo = useEnfoque((s) => s.estado === 'corriendo')
  const ahora = useAhora(corriendo, 1000)
  const s = useEnfoque()
  if (esFlow(s)) {
    const bloque = Math.max(60, s.ajustes.foco * 60) * 1000
    return (msEnfocados(s, ahora) % bloque) / bloque
  }
  if (!s.totalMs) return 0
  const restante = s.estado === 'corriendo' && s.finAt ? Math.max(0, s.finAt - ahora) : s.restanteMs
  return Math.max(0, Math.min(1, 1 - restante / s.totalMs))
}

function useFoto(activo: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!activo) return
    let hecho = false
    let actual: string | null = null
    void leerFoto().then((u) => {
      if (hecho) {
        if (u) URL.revokeObjectURL(u)
        return
      }
      actual = u
      setUrl(u)
    })
    return () => {
      hecho = true
      if (actual) URL.revokeObjectURL(actual)
    }
  }, [activo])
  return url
}

/** Fondo animado detrás del temporizador. Si está apagado, no dibuja nada.
 *  `vivo`: sigue el avance de la sesión y celebra al terminar. */
export function FondoEnfoque({ vivo = true }: { vivo?: boolean }) {
  const activo = useFondoActivo()
  const hora = useHora()
  const progreso = useProgreso()
  const foto = useFoto(activo === 'foto')
  const animaciones = useAjustes((s) => s.animaciones)
  const celebraciones = useAjustes((s) => s.celebraciones)
  const [oculto, setOculto] = useState(typeof document !== 'undefined' && document.visibilityState === 'hidden')
  const [cierre, setCierre] = useState(false)
  const sesiones = useEnfoque((s) => s.sesiones.length)
  const previas = useRef(sesiones)
  const sonidoDeFondo = useEnfoqueLocal((s) => s.sonidoDeFondo)
  const primera = useRef(true)

  // Las animaciones se detienen cuando no estás mirando la pantalla (cuida la batería).
  useEffect(() => {
    const alCambiar = () => setOculto(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', alCambiar)
    return () => document.removeEventListener('visibilitychange', alCambiar)
  }, [])

  // Al terminar una sesión de enfoque, la escena da un pequeño destello de cierre.
  useEffect(() => {
    if (sesiones > previas.current && vivo && celebraciones && animaciones) {
      previas.current = sesiones
      setCierre(true)
      const id = window.setTimeout(() => setCierre(false), 5200)
      return () => window.clearTimeout(id)
    }
    previas.current = sesiones
  }, [sesiones, vivo, celebraciones, animaciones])

  // Si el fondo cambia y se usa «con su sonido», el sonido lo acompaña.
  useEffect(() => {
    if (primera.current) {
      primera.current = false
      return
    }
    const s = infoFondo(activo).sonido
    if (vivo && sonidoDeFondo && s && useEnfoqueLocal.getState().sonido !== s) useEnfoqueLocal.getState().set({ sonido: s })
  }, [activo, sonidoDeFondo, vivo])

  if (activo === 'ninguno') return null
  const p = vivo ? progreso : 0.35
  const Escena = ESCENAS[activo]
  const quieto = !animaciones || prefiereMenosMovimiento()
  return (
    <div className={`enf-fondo${oculto ? ' enf-pausado' : ''}${cierre ? ' enf-cierre' : ''}${quieto ? ' enf-quieto' : ''}`} aria-hidden="true">
      {activo === 'auto' && <Cielo hora={hora} />}
      {Escena && <Escena p={p} />}
      {activo === 'foto' && <div className="enf-fondo-foto" style={foto ? { backgroundImage: `url(${foto})` } : undefined} />}
    </div>
  )
}

/** Fila de muestras para elegir el fondo, con su sonido y la foto propia. */
export function SelectorFondo() {
  const fondo = useEnfoqueLocal((s) => s.fondo)
  const sonidoDeFondo = useEnfoqueLocal((s) => s.sonidoDeFondo)
  const set = useEnfoqueLocal((s) => s.set)
  const entrada = useRef<HTMLInputElement>(null)
  const [hayFoto, setHayFoto] = useState(false)
  useEffect(() => {
    void leerFoto().then((u) => {
      setHayFoto(!!u)
      if (u) URL.revokeObjectURL(u)
    })
  }, [])

  const fondoActual: FondoId = esFondo(fondo) ? fondo : 'ninguno'

  function elegir(id: FondoId) {
    const info = infoFondo(id)
    set({ fondo: id, ...(sonidoDeFondo && info.sonido ? { sonido: info.sonido } : {}) })
  }

  async function subir(f: File | undefined) {
    if (!f) return
    try {
      await guardarFoto(f)
      setHayFoto(true)
      elegir('foto')
    } catch {
      avisar.error('No se pudo usar esa imagen')
    }
  }

  return (
    <div className="enf-fondo-bloque">
      <div className="enf-fondo-selector" role="radiogroup" aria-label="Fondo del temporizador">
        {FONDOS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={fondoActual === f.id}
            className={`sin-neu enf-fondo-muestra${fondoActual === f.id ? ' is-on' : ''}`}
            title={f.nombre}
            onClick={() => (f.id === 'foto' && !hayFoto ? entrada.current?.click() : elegir(f.id))}
          >
            <span className="enf-fondo-vista" style={{ background: f.vista }} />
            <span className="enf-fondo-nombre">{f.nombre}</span>
          </button>
        ))}
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void subir(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div className="enf-fondo-opciones">
        <label className="enf-fondo-opcion">
          <input type="checkbox" checked={sonidoDeFondo} onChange={(e) => set({ sonidoDeFondo: e.target.checked })} /> Con el sonido del lugar
        </label>
        <button type="button" className="boton boton-suave boton-chico" onClick={() => entrada.current?.click()}>
          {hayFoto ? 'Cambiar mi foto' : 'Subir mi foto'}
        </button>
        {hayFoto && (
          <button
            type="button"
            className="boton boton-fantasma boton-chico"
            onClick={() => {
              void quitarFoto().then(() => {
                setHayFoto(false)
                if (useEnfoqueLocal.getState().fondo === 'foto') set({ fondo: 'ninguno' })
              })
            }}
          >
            Quitar mi foto
          </button>
        )}
      </div>
    </div>
  )
}

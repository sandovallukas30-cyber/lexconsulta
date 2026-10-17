import { useEffect, useState } from 'react'
import { useEnfoqueLocal } from '../store/useEnfoqueLocal'
import { detenerSonido, ponerSonido, ponerVolumen, type Sonido } from '../services/ambiente'
import { useEnfoque, esFlow, msMostrados } from '../store/useEnfoque'
import { mmss, NOMBRE_MODO } from '../services/enfoque'

/** "Ahora" que se actualiza cada `cada` ms mientras `activo`; así el reloj de
 *  la pantalla se mueve sin guardar segundos en el estado. */
export function useAhora(activo: boolean, cada = 250): number {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (!activo) return
    const id = window.setInterval(() => setAhora(Date.now()), cada)
    return () => window.clearInterval(id)
  }, [activo, cada])
  return activo ? ahora : Date.now()
}

/** Se monta una vez en App: cierra los tramos que llegan a cero estés en la
 *  vista que estés (suena, guarda la sesión) y pone el tiempo en el título de
 *  la pestaña. */
export function useMotorEnfoque() {
  useMotorSonido()
  const corriendo = useEnfoque((s) => s.estado === 'corriendo')

  useEffect(() => {
    // al volver a la pestaña o recargar, cierra lo que haya terminado mientras tanto
    useEnfoque.getState().tick()
    if (!corriendo) return
    const id = window.setInterval(() => useEnfoque.getState().tick(), 500)
    const alVolver = () => {
      if (document.visibilityState === 'visible') useEnfoque.getState().tick()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [corriendo])

  const ahora = useAhora(corriendo, 1000)
  const titulo = useEnfoque((s) =>
    s.estado === 'detenido' ? null : `${mmss(msMostrados(s, ahora))} · ${esFlow(s) ? 'Flowtime' : NOMBRE_MODO[s.modo]}`
  )
  useEffect(() => {
    document.title = titulo ? `${titulo} — Prima Lex` : TITULO_APP
    return () => {
      document.title = TITULO_APP
    }
  }, [titulo])
}

const TITULO_APP = 'Prima Lex — tu semestre de Derecho, ordenado'

/** El sonido ambiente sigue al temporizador desde cualquier pantalla: suena
 *  mientras corre un enfoque (o siempre, si se apagó «solo enfocando»). */
function useMotorSonido() {
  useEffect(() => {
    let sonando: Sonido | null = null
    const aplicar = () => {
      const e = useEnfoque.getState()
      const l = useEnfoqueLocal.getState()
      const debe = l.sonido !== 'apagado' && (!l.soloEnfocando || (e.estado === 'corriendo' && e.modo === 'foco'))
      if (!debe) {
        if (sonando) {
          detenerSonido()
          sonando = null
        }
        return
      }
      if (sonando !== l.sonido) {
        ponerSonido(l.sonido, l.volumen)
        sonando = l.sonido
      } else ponerVolumen(l.volumen)
    }
    const a = useEnfoque.subscribe(aplicar)
    const b = useEnfoqueLocal.subscribe(aplicar)
    aplicar()
    return () => {
      a()
      b()
      detenerSonido()
    }
  }, [])
}

import { useEffect, useState } from 'react'
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
    document.title = titulo ? `${titulo} — Prima Lex` : 'Prima Lex'
    return () => {
      document.title = 'Prima Lex'
    }
  }, [titulo])
}

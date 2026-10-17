import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useAjustes } from '../store/useAjustes'
import { avisar } from '../store/useAvisos'
import { avisoDelDia } from '../services/recordatorios'
import { hoyISO } from '../services/tareasPlan'

const CLAVE = 'prima-lex-ultimo-aviso'

function yaAvisado(hoy: string): boolean {
  try {
    return localStorage.getItem(CLAVE) === hoy
  } catch {
    return false
  }
}
function marcarAvisado(hoy: string) {
  try {
    localStorage.setItem(CLAVE, hoy)
  } catch {
    /* sin almacenamiento: puede repetirse al recargar */
  }
}

/** Una vez al día, a la hora elegida, muestra el resumen del día y las
 *  evaluaciones que se acercan. Con permiso, como notificación del sistema;
 *  si no, como aviso dentro de la app. Solo corre mientras Prima Lex está abierta. */
export function useRecordatorios() {
  const activo = useAjustes((s) => s.recordatorios)
  const hora = useAjustes((s) => s.horaResumen)

  useEffect(() => {
    if (!activo) return
    const revisar = () => {
      const ahora = new Date()
      const hoy = hoyISO()
      if (ahora.getHours() < hora || yaAvisado(hoy)) return
      const st = useStore.getState()
      const aviso = avisoDelDia({ academicoModulos: st.academicoModulos, tareasPlan: st.tareasPlan, ramos: st.ramos }, hoy)
      marcarAvisado(hoy)
      if (!aviso) return
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(aviso.titulo, { body: aviso.cuerpo, icon: '/favicon.svg', tag: 'prima-lex-resumen' })
          return
        }
      } catch {
        /* cae al aviso dentro de la app */
      }
      avisar.info(aviso.cuerpo)
    }
    revisar()
    const id = window.setInterval(revisar, 60_000)
    return () => window.clearInterval(id)
  }, [activo, hora])
}

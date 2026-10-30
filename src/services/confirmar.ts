import { create } from 'zustand'
import { useAjustes } from '../store/useAjustes'

/** Confirmación propia de Prima Lex, en lugar del `confirm()` del navegador
 *  (que se ve distinto en cada dispositivo y no sigue el tema). Se usa con
 *  `await confirmar({...})` o `.then(ok => ...)`.
 *
 *  Con `clave`, el diálogo ofrece «No volver a preguntar»: si la persona lo
 *  marca y confirma, esa clave queda en los ajustes del dispositivo y las
 *  próximas veces se confirma sola (se puede revertir en Configuración →
 *  Avisos). Sin `clave` siempre pregunta: úsalo solo en acciones que no se
 *  pueden deshacer. */

export interface OpcionesConfirmar {
  titulo: string
  /** Frase que explica qué va a pasar. */
  mensaje?: string
  /** Lo que se va a afectar (p. ej. el texto del nodo), en un recuadro aparte. */
  vistaPrevia?: string
  /** Pista breve bajo el mensaje (p. ej. «Puedes deshacerlo con Ctrl+Z»). */
  nota?: string
  etiquetaConfirmar?: string
  etiquetaCancelar?: string
  /** Pinta el botón de confirmar en rojo (acciones que borran). */
  peligro?: boolean
  /** Identifica la pregunta para poder dejar de hacerla. */
  clave?: string
}

export interface ConfirmacionPendiente extends OpcionesConfirmar {
  resolver: (confirmado: boolean, noVolverAPreguntar: boolean) => void
}

interface EstadoConfirmacion {
  pendiente: ConfirmacionPendiente | null
}

export const useConfirmacion = create<EstadoConfirmacion>()(() => ({ pendiente: null }))

export function confirmar(opciones: OpcionesConfirmar): Promise<boolean> {
  if (opciones.clave && useAjustes.getState().confirmacionesOmitidas.includes(opciones.clave)) {
    return Promise.resolve(true)
  }
  return new Promise((resolve) => {
    // una pregunta nueva descarta la anterior (cuenta como «no»)
    useConfirmacion.getState().pendiente?.resolver(false, false)
    useConfirmacion.setState({
      pendiente: {
        ...opciones,
        resolver: (confirmado, noVolverAPreguntar) => {
          useConfirmacion.setState({ pendiente: null })
          if (confirmado && noVolverAPreguntar && opciones.clave) {
            const { confirmacionesOmitidas, set } = useAjustes.getState()
            if (!confirmacionesOmitidas.includes(opciones.clave)) {
              set({ confirmacionesOmitidas: [...confirmacionesOmitidas, opciones.clave] })
            }
          }
          resolve(confirmado)
        },
      },
    })
  })
}

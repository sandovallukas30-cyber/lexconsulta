import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { buscar } from '../services/busqueda'
import { consultar } from '../services/anthropic'
import { codigosCargados, precargar } from '../services/codigos'
import { getCached, setCached } from '../services/queryCache'
import type { Mensaje, ConsultaHistorial } from '../types'

function titularDesdePregunta(p: string): string {
  const limpio = p.trim().replace(/\s+/g, ' ')
  return limpio.length > 80 ? limpio.slice(0, 77) + '…' : limpio
}

export function esMensajeError(m: Mensaje): boolean {
  return m.rol === 'assistant' && m.contenido.startsWith('⚠️')
}

export function useChat() {
  const perfil = useStore((s) => s.perfil)
  const codigos = useStore((s) => s.codigos)
  const consultaActivaId = useStore((s) => s.consultaActivaId)
  const historial = useStore((s) => s.historial)
  const agregarConsulta = useStore((s) => s.agregarConsulta)
  const actualizarConsulta = useStore((s) => s.actualizarConsulta)
  const nuevaConsulta = useStore((s) => s.nuevaConsulta)
  const usuarioEmail = useStore((s) => s.usuarioEmail)
  const setConsultasRestantes = useStore((s) => s.setConsultasRestantes)

  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // para "Reintentar": se repite la última pregunta con la misma opción
  const ultimaJurisprudencia = useRef(false)

  // Cargar mensajes cuando cambia la conversación activa
  useEffect(() => {
    if (consultaActivaId) {
      const c = historial.find((h) => h.id === consultaActivaId)
      setMensajes(c ? c.mensajes : [])
    } else {
      setMensajes([])
    }
    // Solo reaccionar a cambios del ID, no del historial completo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaActivaId])

  const enviar = useCallback(
    /** `base`: conversación sobre la que se agrega la pregunta (por
     *  defecto, la actual). Reintentar pasa la conversación SIN la pregunta
     *  fallida ni su mensaje de error, para no duplicarlos. */
    async (pregunta: string, incluirJurisprudencia: boolean = false, base?: Mensaje[]) => {
      const texto = pregunta.trim()
      if (!texto || cargando) return
      ultimaJurisprudencia.current = incluirJurisprudencia

      const cargadosDisponibles = codigosCargados()
      const activos = codigos
        .filter((c) => c.activo && cargadosDisponibles.includes(c.tipo))
        .map((c) => c.tipo)

      const mensajeUsuario: Mensaje = {
        id: crypto.randomUUID(),
        rol: 'user',
        contenido: texto,
        timestamp: new Date(),
      }
      const mensajesConUser = [...(base ?? mensajes), mensajeUsuario]
      setMensajes(mensajesConUser)
      setCargando(true)
      setError(null)

      let idConv = consultaActivaId
      if (!idConv) {
        const nueva: ConsultaHistorial = {
          id: crypto.randomUUID(),
          titulo: titularDesdePregunta(texto),
          modulo: 'consultar',
          fecha: new Date(),
          mensajes: mensajesConUser,
        }
        idConv = nueva.id
        agregarConsulta(nueva)
      } else {
        actualizarConsulta(idConv, mensajesConUser)
      }

      try {
        await precargar(activos)
        const resultados = buscar(texto, activos)

        // Verificar caché antes de llamar a la API (clave incluye códigos activos)
        const cached = getCached(texto, activos)
        const respuesta = cached ?? await consultar(texto, resultados, perfil, usuarioEmail, setConsultasRestantes, incluirJurisprudencia)
        if (!cached) setCached(texto, respuesta, activos)
        const mensajeAsistente: Mensaje = {
          id: crypto.randomUUID(),
          rol: 'assistant',
          contenido: respuesta.texto,
          citas: respuesta.citas,
          citasNoVerificadas: respuesta.citasNoVerificadas,
          timestamp: new Date(),
        }
        const mensajesFinales = [...mensajesConUser, mensajeAsistente]
        setMensajes(mensajesFinales)
        actualizarConsulta(idConv, mensajesFinales)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error desconocido'
        setError(msg)
        const mensajeError: Mensaje = {
          id: crypto.randomUUID(),
          rol: 'assistant',
          contenido: `⚠️ ${msg}`,
          timestamp: new Date(),
        }
        const mensajesFinales = [...mensajesConUser, mensajeError]
        setMensajes(mensajesFinales)
        actualizarConsulta(idConv, mensajesFinales)
      } finally {
        setCargando(false)
      }
    },
    [cargando, codigos, perfil, mensajes, consultaActivaId, agregarConsulta, actualizarConsulta, usuarioEmail, setConsultasRestantes]
  )

  /** Repite la última pregunta si su respuesta fue un error (⚠️). */
  const reintentar = useCallback(() => {
    const ultimo = mensajes[mensajes.length - 1]
    if (cargando || !ultimo || !esMensajeError(ultimo)) return
    let i = mensajes.length - 2
    while (i >= 0 && mensajes[i].rol !== 'user') i--
    if (i < 0) return
    void enviar(mensajes[i].contenido, ultimaJurisprudencia.current, mensajes.slice(0, i))
  }, [mensajes, cargando, enviar])

  const limpiar = useCallback(() => {
    nuevaConsulta()
    setMensajes([])
    setError(null)
  }, [nuevaConsulta])

  return { mensajes, cargando, error, enviar, reintentar, limpiar }
}

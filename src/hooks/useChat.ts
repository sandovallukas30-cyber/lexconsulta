import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { buscar } from '../services/busqueda'
import { consultar } from '../services/anthropic'
import { codigosCargados, precargar } from '../services/codigos'
import type { Mensaje, ConsultaHistorial } from '../types'

function titularDesdePregunta(p: string): string {
  const limpio = p.trim().replace(/\s+/g, ' ')
  return limpio.length > 80 ? limpio.slice(0, 77) + '…' : limpio
}

export function useChat() {
  const perfil = useStore((s) => s.perfil)
  const codigos = useStore((s) => s.codigos)
  const consultaActivaId = useStore((s) => s.consultaActivaId)
  const historial = useStore((s) => s.historial)
  const agregarConsulta = useStore((s) => s.agregarConsulta)
  const actualizarConsulta = useStore((s) => s.actualizarConsulta)
  const nuevaConsulta = useStore((s) => s.nuevaConsulta)

  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    async (pregunta: string) => {
      const texto = pregunta.trim()
      if (!texto || cargando) return

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
      const mensajesConUser = [...mensajes, mensajeUsuario]
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
        const resultados = buscar(texto, activos, 8)
        const respuesta = await consultar(texto, resultados, perfil)
        const mensajeAsistente: Mensaje = {
          id: crypto.randomUUID(),
          rol: 'assistant',
          contenido: respuesta.texto,
          citas: respuesta.citas,
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
    [cargando, codigos, perfil, mensajes, consultaActivaId, agregarConsulta, actualizarConsulta]
  )

  const limpiar = useCallback(() => {
    nuevaConsulta()
    setMensajes([])
    setError(null)
  }, [nuevaConsulta])

  return { mensajes, cargando, error, enviar, limpiar }
}

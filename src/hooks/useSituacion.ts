import { useCallback, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { analizarSituacion } from '../services/situacion'
import { obtenerArea } from '../data/situaciones'
import type { ConsultaHistorial, Mensaje, RespuestaSituacion, ResultadoSituacion } from '../types'

export type EstadoFlujo = 'codigo' | 'eleccion' | 'cuestionario' | 'analizando' | 'resultado' | 'error'

function resumirRespuestas(area: ReturnType<typeof obtenerArea>, respuestas: RespuestaSituacion[]): string {
  if (!area) return ''
  const lines: string[] = []
  for (const p of area.preguntas) {
    const r = respuestas.find((x) => x.preguntaId === p.id)
    if (!r || !r.valor) continue
    lines.push(`**${p.preguntaSimple}** ${r.valor}`)
  }
  return lines.join('\n\n')
}

function resultadoAMarkdown(r: ResultadoSituacion): string {
  const partes: string[] = []
  partes.push(`**Diagnóstico**\n\n${r.diagnostico}`)
  if (r.plazosCriticos.length > 0) {
    partes.push(`**Plazos críticos**\n\n${r.plazosCriticos.map((p) => `- ⚠ ${p}`).join('\n')}`)
  }
  if (r.pasos.length > 0) {
    const pasosTxt = r.pasos
      .map((p, i) => `${i + 1}. **${p.titulo}** — ${p.detalle}${p.plazo ? ` *(${p.plazo})*` : ''}`)
      .join('\n')
    partes.push(`**Qué puedes hacer**\n\n${pasosTxt}`)
  }
  if (r.dondeAcudir.length > 0) {
    partes.push(`**Dónde acudir**\n\n${r.dondeAcudir.map((d) => `- ${d}`).join('\n')}`)
  }
  return partes.join('\n\n---\n\n')
}

export function useSituacion() {
  const perfil = useStore((s) => s.perfil)
  const codigos = useStore((s) => s.codigos)
  const consultaActivaId = useStore((s) => s.consultaActivaId)
  const historial = useStore((s) => s.historial)
  const agregarConsulta = useStore((s) => s.agregarConsulta)
  const actualizarConsulta = useStore((s) => s.actualizarConsulta)
  const nuevaConsulta = useStore((s) => s.nuevaConsulta)
  const [estado, setEstado] = useState<EstadoFlujo>('codigo')
  const [codigoElegido, setCodigoElegido] = useState<string | null>(null)
  const [areaId, setAreaId] = useState<string | null>(null)
  const [paso, setPaso] = useState(0)
  const [respuestas, setRespuestas] = useState<RespuestaSituacion[]>([])
  const [resultado, setResultado] = useState<ResultadoSituacion | null>(null)
  const [error, setError] = useState<string | null>(null)

  const area = useMemo(() => (areaId ? obtenerArea(areaId) : null), [areaId])
  const totalPasos = area?.preguntas.length ?? 0
  const preguntaActual = area && paso < totalPasos ? area.preguntas[paso] : null
  const respuestaActual = preguntaActual
    ? respuestas.find((r) => r.preguntaId === preguntaActual.id)?.valor ?? ''
    : ''

  const elegirCodigo = useCallback((codigo: string) => {
    setCodigoElegido(codigo)
    setEstado('eleccion')
  }, [])

  const volverACodigo = useCallback(() => {
    setCodigoElegido(null)
    setEstado('codigo')
    setAreaId(null)
    setPaso(0)
    setRespuestas([])
  }, [])

  const elegirArea = useCallback((id: string) => {
    const a = obtenerArea(id)
    if (!a) return
    setAreaId(id)
    setPaso(0)
    setRespuestas([])
    setResultado(null)
    setError(null)
    setEstado('cuestionario')
  }, [])

  const responder = useCallback((valor: string) => {
    if (!preguntaActual) return
    setRespuestas((prev) => {
      const filtradas = prev.filter((r) => r.preguntaId !== preguntaActual.id)
      return [...filtradas, { preguntaId: preguntaActual.id, valor }]
    })
  }, [preguntaActual])

  const siguiente = useCallback(() => {
    if (!area) return
    if (paso < totalPasos - 1) {
      setPaso((p) => p + 1)
    }
  }, [area, paso, totalPasos])

  const anterior = useCallback(() => {
    if (paso > 0) setPaso((p) => p - 1)
  }, [paso])

  const puedeAvanzar = useCallback(() => {
    if (!preguntaActual) return false
    if (!preguntaActual.obligatoria) return true
    return respuestaActual.trim().length > 0
  }, [preguntaActual, respuestaActual])

  const enviar = useCallback(async () => {
    if (!area) return
    setEstado('analizando')
    setError(null)

    // Crear o tomar conversación activa
    const userMsg: Mensaje = {
      id: crypto.randomUUID(),
      rol: 'user',
      contenido: resumirRespuestas(area, respuestas),
      timestamp: new Date(),
    }

    let idConv = consultaActivaId
    const esContinuacion = idConv && historial.find((h) => h.id === idConv)?.modulo === 'situacion'
    let mensajesPrevios: Mensaje[] = []
    if (esContinuacion && idConv) {
      mensajesPrevios = historial.find((h) => h.id === idConv)?.mensajes ?? []
      actualizarConsulta(idConv, [...mensajesPrevios, userMsg])
    } else {
      const nueva: ConsultaHistorial = {
        id: crypto.randomUUID(),
        titulo: `${area.titulo}`,
        modulo: 'situacion',
        fecha: new Date(),
        mensajes: [userMsg],
      }
      idConv = nueva.id
      agregarConsulta(nueva)
    }

    try {
      const activos = codigos.filter((c) => c.activo && c.cargado).map((c) => c.tipo)
      const res = await analizarSituacion(area, respuestas, perfil, activos)
      setResultado(res)
      setEstado('resultado')

      const asistenteMsg: Mensaje = {
        id: crypto.randomUUID(),
        rol: 'assistant',
        contenido: resultadoAMarkdown(res),
        citas: res.marcoLegal,
        timestamp: new Date(),
      }
      actualizarConsulta(idConv, [...mensajesPrevios, userMsg, asistenteMsg])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setError(msg)
      setEstado('error')
      const errMsg: Mensaje = {
        id: crypto.randomUUID(),
        rol: 'assistant',
        contenido: `⚠️ ${msg}`,
        timestamp: new Date(),
      }
      actualizarConsulta(idConv, [...mensajesPrevios, userMsg, errMsg])
    }
  }, [area, respuestas, perfil, codigos, consultaActivaId, historial, agregarConsulta, actualizarConsulta])

  const reset = useCallback(() => {
    nuevaConsulta()
    setEstado('codigo')
    setCodigoElegido(null)
    setAreaId(null)
    setPaso(0)
    setRespuestas([])
    setResultado(null)
    setError(null)
  }, [nuevaConsulta])

  const volverACuestionario = useCallback(() => {
    setEstado('cuestionario')
  }, [])

  return {
    estado,
    codigoElegido,
    area,
    paso,
    totalPasos,
    preguntaActual,
    respuestaActual,
    respuestas,
    resultado,
    error,
    elegirCodigo,
    volverACodigo,
    elegirArea,
    responder,
    siguiente,
    anterior,
    puedeAvanzar,
    enviar,
    reset,
    volverACuestionario,
  }
}

import { useState, useCallback } from 'react'
import { obtenerVariasPreguntasAleatorias } from '../data/destelloPreguntas'
import type { PreguntaDestello, CodigoTipo } from '../types'

type EstadoDestello = 'codigo' | 'jugando' | 'resultado'

export interface FlujoDestello {
  estado: EstadoDestello
  codigoElegido: CodigoTipo | null
  preguntasActuales: PreguntaDestello[]
  preguntaIdx: number
  preguntaActual: PreguntaDestello | null
  respuestaSeleccionada: number | null
  mostrarResultado: boolean
  puntos: number
  racha: number
  aciertos: number
  errores: number
  // funciones
  elegirCodigo: (codigo: CodigoTipo) => void
  responder: (opcionIdx: number) => void
  siguiente: () => void
  volverAInicio: () => void
}

const PREGUNTAS_POR_RONDA = 10

export function useDestello(): FlujoDestello {
  const [estado, setEstado] = useState<EstadoDestello>('codigo')
  const [codigoElegido, setCodigoElegido] = useState<CodigoTipo | null>(null)
  const [preguntasActuales, setPreguntasActuales] = useState<PreguntaDestello[]>([])
  const [preguntaIdx, setPreguntaIdx] = useState(0)
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<number | null>(null)
  const [mostrarResultado, setMostrarResultado] = useState(false)
  const [puntos, setPuntos] = useState(0)
  const [racha, setRacha] = useState(0)
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)

  const preguntaActual = preguntasActuales[preguntaIdx] ?? null

  const elegirCodigo = useCallback((codigo: CodigoTipo) => {
    setCodigoElegido(codigo)
    const preguntas = obtenerVariasPreguntasAleatorias(PREGUNTAS_POR_RONDA, codigo)
    setPreguntasActuales(preguntas)
    setPreguntaIdx(0)
    setRespuestaSeleccionada(null)
    setMostrarResultado(false)
    setPuntos(0)
    setRacha(0)
    setAciertos(0)
    setErrores(0)
    setEstado('jugando')
  }, [])

  const responder = useCallback((opcionIdx: number) => {
    if (!preguntaActual || respuestaSeleccionada !== null) return

    setRespuestaSeleccionada(opcionIdx)
    setMostrarResultado(true)

    // Determinar si es correcto
    const esCorrect = opcionIdx === preguntaActual.respuestaCorrecta

    if (esCorrect) {
      // Multiplicar puntos según dificultad y racha
      const basePuntos = preguntaActual.dificultad === 'facil' ? 10 : preguntaActual.dificultad === 'normal' ? 15 : 25
      const multiplicador = Math.min(racha + 1, 4) // Máximo 4x
      const puntosGanados = basePuntos * multiplicador

      setPuntos((p) => p + puntosGanados)
      setRacha((r) => r + 1)
      setAciertos((a) => a + 1)
    } else {
      setRacha(0)
      setErrores((e) => e + 1)
    }
  }, [preguntaActual, respuestaSeleccionada, racha])

  const siguiente = useCallback(() => {
    if (preguntaIdx < preguntasActuales.length - 1) {
      // Siguiente pregunta
      setPreguntaIdx((i) => i + 1)
      setRespuestaSeleccionada(null)
      setMostrarResultado(false)
    } else {
      // Fin de la ronda
      setEstado('resultado')
    }
  }, [preguntaIdx, preguntasActuales.length])

  const volverAInicio = useCallback(() => {
    setEstado('codigo')
    setCodigoElegido(null)
    setPreguntasActuales([])
    setPreguntaIdx(0)
    setRespuestaSeleccionada(null)
    setMostrarResultado(false)
    setPuntos(0)
    setRacha(0)
    setAciertos(0)
    setErrores(0)
  }, [])

  return {
    estado,
    codigoElegido,
    preguntasActuales,
    preguntaIdx,
    preguntaActual,
    respuestaSeleccionada,
    mostrarResultado,
    puntos,
    racha,
    aciertos,
    errores,
    elegirCodigo,
    responder,
    siguiente,
    volverAInicio,
  }
}

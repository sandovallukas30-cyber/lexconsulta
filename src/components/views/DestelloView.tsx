import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useDestello } from '../../hooks/useDestello'
import { SelectorCodigo } from '../ui/SelectorCodigo'
import type { CodigoTipo } from '../../types'

const VERDE = 'var(--accent-base)'

export function DestelloView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const codigos = useStore((s) => s.codigos)
  const flujo = useDestello()

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <AnimatePresence mode="wait">
        {flujo.estado === 'codigo' && (
          <motion.div
            key="codigo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SelectorCodigo
              titulo="Destello Legal"
              descripcion="Quiz rápidos con preguntas sobre artículos y conceptos clave"
              icono="ti-lightning-2"
              onElegir={(tipo) => flujo.elegirCodigo(tipo as CodigoTipo)}
            />
          </motion.div>
        )}

        {flujo.estado === 'jugando' && flujo.preguntaActual && (
          <motion.div
            key="jugando"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PantallaJuego
              flujo={flujo}
              modoOscuro={modoOscuro}
            />
          </motion.div>
        )}

        {flujo.estado === 'resultado' && (
          <motion.div
            key="resultado"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PantallaResultado
              aciertos={flujo.aciertos}
              errores={flujo.errores}
              puntos={flujo.puntos}
              racha={flujo.racha}
              codigoMeta={codigos.find((c) => c.tipo === flujo.codigoElegido)}
              modoOscuro={modoOscuro}
              onJugarDeNuevo={() => {
                flujo.volverAInicio()
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============= PANTALLA DE JUEGO =============

function PantallaJuego({
  flujo,
  modoOscuro,
}: {
  flujo: ReturnType<typeof useDestello>
  modoOscuro: boolean
}) {
  const progreso = ((flujo.preguntaIdx + 1) / flujo.preguntasActuales.length) * 100
  const pregunta = flujo.preguntaActual!

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => flujo.volverAInicio()}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              modoOscuro
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <i className="ti ti-arrow-left text-sm" />
            Cambiar código
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className={`text-xs font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Puntos
              </p>
              <p className="text-lg font-bold" style={{ color: VERDE }}>
                {flujo.puntos}
              </p>
            </div>
            <div
              className={`w-px h-8 ${modoOscuro ? 'bg-zinc-700' : 'bg-zinc-300'}`}
            />
            <div className="text-right">
              <p className={`text-xs font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Racha
              </p>
              <p className="text-lg font-bold" style={{ color: VERDE }}>
                ×{flujo.racha}
              </p>
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className={`h-2 rounded-full overflow-hidden ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progreso}%` }}
            transition={{ duration: 0.3 }}
            className="h-full rounded-full"
            style={{ background: VERDE }}
          />
        </div>
        <p className={`text-[11px] uppercase tracking-wider font-semibold mt-3 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
          {flujo.preguntaIdx + 1} / {flujo.preguntasActuales.length}
        </p>
      </div>

      {/* Pregunta */}
      <motion.div
        key={pregunta.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mb-8"
      >
        <div className="mb-2">
          <p
            className="text-xs font-mono font-semibold"
            style={{ color: VERDE }}
          >
            {pregunta.articulo}
          </p>
        </div>
        <h2 className={`text-2xl font-serif font-semibold mb-1 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          {pregunta.pregunta}
        </h2>
        {pregunta.descripcionBreve && (
          <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {pregunta.descripcionBreve}
          </p>
        )}
      </motion.div>

      {/* Opciones */}
      <div className="space-y-3 mb-8">
        {pregunta.opciones.map((opcion, idx) => {
          const seleccionada = flujo.respuestaSeleccionada === idx
          const esCorrecta = idx === pregunta.respuestaCorrecta
          const mostrarResultado = flujo.mostrarResultado

          let estilosBase = `w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer`

          // Estilos según estado
          if (!mostrarResultado) {
            // Antes de responder
            estilosBase += seleccionada
              ? modoOscuro
                ? ' bg-[var(--accent-950)]/40 border-[var(--accent-700)]'
                : ' bg-[var(--accent-50)]/80 border-[var(--accent-500)]'
              : modoOscuro
              ? ' bg-zinc-800/40 border-zinc-800 hover:border-zinc-700'
              : ' bg-white border-zinc-200 hover:border-zinc-300'
          } else {
            // Después de responder
            if (seleccionada && esCorrecta) {
              estilosBase += modoOscuro
                ? ' bg-green-950/30 border-green-700'
                : ' bg-green-50/80 border-green-500'
            } else if (seleccionada && !esCorrecta) {
              estilosBase += modoOscuro
                ? ' bg-red-950/30 border-red-700'
                : ' bg-red-50/80 border-red-500'
            } else if (esCorrecta) {
              estilosBase += modoOscuro
                ? ' bg-green-950/20 border-green-700/50'
                : ' bg-green-50/50 border-green-300'
            } else {
              estilosBase += modoOscuro
                ? ' bg-zinc-800/40 border-zinc-800'
                : ' bg-white border-zinc-200'
            }
          }

          return (
            <button
              key={idx}
              onClick={() => !mostrarResultado && flujo.responder(idx)}
              disabled={mostrarResultado}
              className={estilosBase}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold text-sm ${
                    !mostrarResultado && !seleccionada
                      ? modoOscuro
                        ? 'border-zinc-600 text-zinc-500'
                        : 'border-zinc-300 text-zinc-400'
                      : ''
                  }`}
                  style={
                    seleccionada || (mostrarResultado && esCorrecta)
                      ? {
                          borderColor: seleccionada && !esCorrecta ? '#ef4444' : '#22c55e',
                          background: seleccionada && !esCorrecta ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                          color: seleccionada && !esCorrecta ? '#ef4444' : '#22c55e',
                        }
                      : undefined
                  }
                >
                  {mostrarResultado && esCorrecta && <i className="ti ti-check text-base" />}
                  {mostrarResultado && seleccionada && !esCorrecta && (
                    <i className="ti ti-x text-base" />
                  )}
                  {!mostrarResultado && <span>{String.fromCharCode(65 + idx)}</span>}
                </span>
                <span className={`text-sm ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {opcion}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Feedback y botón siguiente */}
      <AnimatePresence>
        {flujo.mostrarResultado && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {flujo.respuestaSeleccionada === pregunta.respuestaCorrecta ? (
              <div
                className={`p-4 rounded-lg border-l-4 ${
                  modoOscuro
                    ? 'bg-green-950/30 border-green-700 text-green-200'
                    : 'bg-green-50 border-green-500 text-green-900'
                }`}
              >
                <p className="font-semibold flex items-center gap-2">
                  <i className="ti ti-check text-lg" />
                  ¡Correcto!
                </p>
              </div>
            ) : (
              <div
                className={`p-4 rounded-lg border-l-4 ${
                  modoOscuro
                    ? 'bg-red-950/30 border-red-700 text-red-200'
                    : 'bg-red-50 border-red-500 text-red-900'
                }`}
              >
                <p className="font-semibold flex items-center gap-2 mb-2">
                  <i className="ti ti-x text-lg" />
                  Incorrecto
                </p>
                <p className="text-sm">La respuesta correcta es: {pregunta.opciones[pregunta.respuestaCorrecta]}</p>
              </div>
            )}

            <div
              className={`p-4 rounded-lg ${
                modoOscuro ? 'bg-zinc-800/50' : 'bg-zinc-50'
              }`}
            >
              <p className={`text-sm leading-relaxed ${modoOscuro ? 'text-zinc-200' : 'text-zinc-700'}`}>
                {pregunta.explicacion}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => flujo.siguiente()}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg"
                style={{ background: VERDE }}
              >
                {flujo.preguntaIdx === flujo.preguntasActuales.length - 1
                  ? 'Ver resultados'
                  : 'Siguiente pregunta'}
                <i className="ti ti-arrow-right text-base" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============= PANTALLA DE RESULTADOS =============

function PantallaResultado({
  aciertos,
  errores,
  puntos,
  racha,
  codigoMeta,
  modoOscuro,
  onJugarDeNuevo,
}: {
  aciertos: number
  errores: number
  puntos: number
  racha: number
  codigoMeta: any
  modoOscuro: boolean
  onJugarDeNuevo: () => void
}) {
  const total = aciertos + errores
  const tasaAcierto = total > 0 ? Math.round((aciertos / total) * 100) : 0
  const rendimiento =
    tasaAcierto >= 90 ? 'Excelente' : tasaAcierto >= 70 ? 'Bueno' : tasaAcierto >= 50 ? 'Regular' : 'Necesitas practicar más'

  const colorRendimiento =
    tasaAcierto >= 90 ? '#22c55e' : tasaAcierto >= 70 ? '#3b82f6' : tasaAcierto >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      {/* Encabezado */}
      <div className="text-center mb-10">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{
            background: modoOscuro
              ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
              : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
          }}
        >
          <i className="ti ti-trophy text-4xl" style={{ color: VERDE }} />
        </div>
        <h1 className={`text-3xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          ¡Fin de la ronda!
        </h1>
        <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {codigoMeta?.nombre || 'Destello Legal'}
        </p>
      </div>

      {/* Puntos principales */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`rounded-2xl p-8 mb-8 border ${modoOscuro ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className={`text-xs uppercase tracking-wider font-semibold mb-2 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Puntos
            </p>
            <p className="text-3xl font-bold" style={{ color: VERDE }}>
              {puntos}
            </p>
          </div>
          <div>
            <p className={`text-xs uppercase tracking-wider font-semibold mb-2 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Racha máxima
            </p>
            <p className="text-3xl font-bold" style={{ color: VERDE }}>
              ×{racha}
            </p>
          </div>
          <div>
            <p className={`text-xs uppercase tracking-wider font-semibold mb-2 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Acierto
            </p>
            <p className="text-3xl font-bold" style={{ color: colorRendimiento }}>
              {tasaAcierto}%
            </p>
          </div>
        </div>
      </motion.div>

      {/* Análisis de rendimiento */}
      <div className={`rounded-2xl p-6 mb-8 border ${modoOscuro ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
        <p className={`text-sm font-semibold mb-2 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Rendimiento
        </p>
        <p className="text-xl font-serif font-bold mb-4" style={{ color: colorRendimiento }}>
          {rendimiento}
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Aciertos
            </p>
            <p className={`text-sm font-semibold text-green-500`}>
              {aciertos} / {total}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Errores
            </p>
            <p className={`text-sm font-semibold text-red-500`}>
              {errores} / {total}
            </p>
          </div>
        </div>
      </div>

      {/* Botón */}
      <div className="flex gap-3">
        <button
          onClick={onJugarDeNuevo}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg"
          style={{ background: VERDE }}
        >
          <i className="ti ti-reload text-base" />
          Jugar de nuevo
        </button>
        <button
          onClick={onJugarDeNuevo}
          className={`px-6 py-3 rounded-lg text-sm font-semibold transition-colors ${
            modoOscuro
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          <i className="ti ti-home text-base" />
        </button>
      </div>

      <p className={`text-xs text-center mt-6 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
        Juega regularmente para mejorar tu dominio de los conceptos legales
      </p>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { generarRosco, esRespuestaCorrecta } from '../../services/pasapalabra'
import { useDestello } from '../../hooks/useDestello'
import type { AreaPractica, EntradaRosco, PartidaPasapalabra, CodigoTipo } from '../../types'

const VERDE = 'var(--accent-base)'
const DURACION_DEFAULT = 300 // 5 minutos

const AREAS: { id: AreaPractica; nombre: string; icono: string; descripcion: string }[] = [
  { id: 'general', nombre: 'General', icono: 'ti-arrows-shuffle', descripcion: 'Mezcla de todas las ramas' },
  { id: 'civil', nombre: 'Civil', icono: 'ti-scale', descripcion: 'Contratos, familia, sucesiones, propiedad' },
  { id: 'penal', nombre: 'Penal', icono: 'ti-shield-exclamation', descripcion: 'Delitos, penas y leyes especiales' },
  { id: 'laboral', nombre: 'Laboral', icono: 'ti-briefcase', descripcion: 'Código del Trabajo, Ley 16.744, Karin' },
  { id: 'procesal', nombre: 'Procesal', icono: 'ti-gavel', descripcion: 'Civil, penal y orgánica de tribunales' },
  { id: 'constitucional', nombre: 'Constitucional', icono: 'ti-building-bank', descripcion: 'Constitución y derechos fundamentales' },
]

type JuegoSeleccionado = 'none' | 'pasapalabra' | 'quiz'

export function PracticaView() {
  const partida = useStore((s) => s.partidaPasapalabra)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const retomar = useStore((s) => s.retomarPartidaPasapalabra)
  const abandonar = useStore((s) => s.abandonarPartidaPasapalabra)
  const flujoQuiz = useDestello()

  const [mostrarContinuar, setMostrarContinuar] = useState(false)
  const [juegoSeleccionado, setJuegoSeleccionado] = useState<JuegoSeleccionado>('none')

  // Si entramos a la vista y hay una partida pausada sin terminar, mostrar el modal
  useEffect(() => {
    if (partida && partida.pausadaEn && !partida.finalizada) {
      setMostrarContinuar(true)
    }
  }, [partida])

  // Lógica para Pasapalabra
  if (juegoSeleccionado === 'pasapalabra') {
    if (partida && partida.finalizada) {
      return <ResumenPartida partida={partida} modoOscuro={modoOscuro} />
    }

    if (partida && !partida.pausadaEn) {
      return <Pasapalabra partida={partida} modoOscuro={modoOscuro} />
    }

    return (
      <>
        <SeleccionArea modoOscuro={modoOscuro} onVolverAlMenu={() => setJuegoSeleccionado('none')} />
        <AnimatePresence>
          {mostrarContinuar && partida && (
            <ModalContinuar
              modoOscuro={modoOscuro}
              partida={partida}
              onContinuar={() => {
                retomar()
                setMostrarContinuar(false)
              }}
              onAbandonar={() => {
                abandonar()
                setMostrarContinuar(false)
              }}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  // Lógica para Quiz Jurídico
  if (juegoSeleccionado === 'quiz') {
    return (
      <QuizJuridicoWrapper
        flujo={flujoQuiz}
        modoOscuro={modoOscuro}
        codigos={useStore((s) => s.codigos)}
        onVolverAlMenu={() => {
          setJuegoSeleccionado('none')
          flujoQuiz.volverAInicio()
        }}
      />
    )
  }

  // Menú de selección inicial
  return <MenuSeleccionJuegos modoOscuro={modoOscuro} onSeleccionar={setJuegoSeleccionado} />
}

// ============ Menú de selección de juego ============

function MenuSeleccionJuegos({
  modoOscuro,
  onSeleccionar,
}: {
  modoOscuro: boolean
  onSeleccionar: (juego: JuegoSeleccionado) => void
}) {
  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-4xl mx-auto px-8 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-10"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: modoOscuro
                ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
                : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
            }}
          >
            <i className="ti ti-puzzle text-3xl" style={{ color: VERDE }} />
          </div>
          <h1 className={`text-3xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            Área de práctica
          </h1>
          <p className={`text-sm max-w-lg mx-auto ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Elige un juego para practicar y mejorar tu conocimiento del derecho chileno
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Pasapalabra */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0 }}
            onClick={() => onSeleccionar('pasapalabra')}
            className={`group text-left rounded-2xl border-2 p-6 transition-all hover:shadow-lg hover:-translate-y-1 ${
              modoOscuro
                ? 'bg-zinc-800/40 border-zinc-800 hover:border-[var(--accent-700)]'
                : 'bg-white border-zinc-200 hover:border-[var(--accent-500)]'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <span
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: modoOscuro
                    ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)'
                    : 'color-mix(in srgb, var(--accent-base) 8%, transparent)',
                }}
              >
                <i className="ti ti-puzzle text-2xl" style={{ color: VERDE }} />
              </span>
              <i
                className="ti ti-arrow-right text-lg transition-transform group-hover:translate-x-1"
                style={{ color: VERDE }}
              />
            </div>
            <h2 className={`text-xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              Pasapalabra Jurídico
            </h2>
            <p className={`text-sm leading-relaxed ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              27 letras, 5 minutos. Demuestra tu dominio de la terminología legal en contra del cronómetro.
            </p>
            <div className={`mt-4 text-xs uppercase tracking-wider font-semibold ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Desafío de velocidad
            </div>
          </motion.button>

          {/* Quiz Jurídico */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            onClick={() => onSeleccionar('quiz')}
            className={`group text-left rounded-2xl border-2 p-6 transition-all hover:shadow-lg hover:-translate-y-1 ${
              modoOscuro
                ? 'bg-zinc-800/40 border-zinc-800 hover:border-[var(--accent-700)]'
                : 'bg-white border-zinc-200 hover:border-[var(--accent-500)]'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <span
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: modoOscuro
                    ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)'
                    : 'color-mix(in srgb, var(--accent-base) 8%, transparent)',
                }}
              >
                <i className="ti ti-help text-2xl" style={{ color: VERDE }} />
              </span>
              <i
                className="ti ti-arrow-right text-lg transition-transform group-hover:translate-x-1"
                style={{ color: VERDE }}
              />
            </div>
            <h2 className={`text-xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              Quiz Jurídico
            </h2>
            <p className={`text-sm leading-relaxed ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Preguntas sobre artículos clave con puntos y rachas. Aprende a tu ritmo y gana puntos.
            </p>
            <div className={`mt-4 text-xs uppercase tracking-wider font-semibold ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Aprendizaje con puntos
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ============ Selección de área ============

function SeleccionArea({
  modoOscuro,
  onVolverAlMenu,
}: {
  modoOscuro: boolean
  onVolverAlMenu: () => void
}) {
  const iniciar = useStore((s) => s.iniciarPartidaPasapalabra)
  const records = useStore((s) => s.recordsPasapalabra)
  const [cargando, setCargando] = useState<AreaPractica | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modoEstudio, setModoEstudio] = useState(false)

  async function comenzar(area: AreaPractica) {
    setCargando(area)
    setError(null)
    try {
      const rosco = await generarRosco(area)
      const partida: PartidaPasapalabra = {
        id: crypto.randomUUID(),
        area,
        rosco,
        letraActualIdx: 0,
        segundosRestantes: DURACION_DEFAULT,
        duracionTotalSeg: DURACION_DEFAULT,
        pausadaEn: null,
        iniciada: Date.now(),
        finalizada: null,
        modoEstudio,
        pistasUsadas: 0,
      }
      iniciar(partida)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando el rosco')
    } finally {
      setCargando(null)
    }
  }

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-10"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
          >
            <i className="ti ti-puzzle text-3xl" style={{ color: VERDE }} />
          </div>
          <h1 className={`text-3xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            Pasapalabra jurídico
          </h1>
          <p className={`text-sm max-w-lg mx-auto ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            27 letras, 5 minutos, terminología del derecho chileno. Cada palabra se respalda en una norma indexada.
          </p>
        </motion.div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onVolverAlMenu}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                modoOscuro
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <i className="ti ti-arrow-left text-sm" />
              Volver
            </button>
            <div className={`text-[11px] uppercase tracking-wider font-semibold ${
              modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Elige un área
            </div>
          </div>
          <label
            className={`inline-flex items-center gap-2 text-xs cursor-pointer select-none ${
              modoOscuro ? 'text-zinc-400' : 'text-zinc-600'
            }`}
            title="Sin cronómetro, ideal para repasar antes de un examen. No cuenta para récords."
          >
            <input
              type="checkbox"
              checked={modoEstudio}
              onChange={(e) => setModoEstudio(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-current"
              style={{ accentColor: 'var(--accent-base)' }}
            />
            Modo estudio (sin cronómetro)
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AREAS.map((a) => {
            const rec = records[a.id]
            return (
              <button
                key={a.id}
                onClick={() => comenzar(a.id)}
                disabled={cargando !== null}
                className={`text-left rounded-xl border-2 p-5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5 ${
                  modoOscuro
                    ? 'bg-zinc-800/40 border-zinc-800 hover:border-[var(--accent-700)]'
                    : 'bg-white border-zinc-200 hover:border-[var(--accent-500)]'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)' : 'color-mix(in srgb, var(--accent-base) 8%, transparent)' }}
                  >
                    <i className={`ti ${a.icono} text-xl`} style={{ color: VERDE }} />
                  </span>
                  <h3 className={`text-base font-serif font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                    {a.nombre}
                  </h3>
                  {cargando === a.id && (
                    <i className="ti ti-loader-2 text-base animate-spin ml-auto" style={{ color: VERDE }} />
                  )}
                </div>
                <p className={`text-xs leading-relaxed ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {a.descripcion}
                </p>
                {rec && (
                  <div
                    className={`mt-3 inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md ${
                      modoOscuro
                        ? 'bg-[color-mix(in_srgb,var(--accent-base)_15%,transparent)] text-[var(--accent-300)]'
                        : 'bg-[color-mix(in_srgb,var(--accent-base)_8%,transparent)] text-[var(--accent-700)]'
                    }`}
                    title="Tu mejor marca en este área"
                  >
                    <i className="ti ti-trophy text-[11px]" />
                    {rec.aciertos}/27 · {formatearTiempo(rec.tiempoUsadoSeg)}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {error && (
          <div
            className={`mt-6 p-3 rounded-lg text-sm ${
              modoOscuro ? 'bg-rose-950/40 text-rose-300 border border-rose-900/60' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <i className="ti ti-alert-triangle mr-1" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ Juego ============

function Pasapalabra({ partida, modoOscuro }: { partida: PartidaPasapalabra; modoOscuro: boolean }) {
  const responder = useStore((s) => s.responderLetraActual)
  const pasar = useStore((s) => s.pasarLetraActual)
  const finalizar = useStore((s) => s.finalizarPartidaPasapalabra)
  const abandonar = useStore((s) => s.abandonarPartidaPasapalabra)
  const decrementar = useStore((s) => s.decrementarTiempoPasapalabra)
  const usarPista = useStore((s) => s.usarPistaPasapalabra)
  const [valor, setValor] = useState('')
  const [feedback, setFeedback] = useState<'ok' | 'fail' | null>(null)
  const [pistaRevelada, setPistaRevelada] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Timer
  useEffect(() => {
    if (partida.pausadaEn || partida.finalizada) return
    const interval = setInterval(() => decrementar(1), 1000)
    return () => clearInterval(interval)
  }, [partida.pausadaEn, partida.finalizada, decrementar])

  // Detectar fin: ya no quedan pendientes
  useEffect(() => {
    const quedan = partida.rosco.some((r) => r.estado === 'pendiente' || r.estado === 'pasada')
    if (!quedan && !partida.finalizada) finalizar()
  }, [partida.rosco, partida.finalizada, finalizar])

  // Auto-focus al input al cambiar de letra; limpiar la pista revelada
  useEffect(() => {
    inputRef.current?.focus()
    setPistaRevelada(null)
  }, [partida.letraActualIdx])

  const actual = partida.rosco[partida.letraActualIdx]

  function manejarSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!actual || !valor.trim()) return
    const correcta = esRespuestaCorrecta(valor, actual.palabra)
    setFeedback(correcta ? 'ok' : 'fail')
    setTimeout(() => {
      responder(valor, correcta)
      setValor('')
      setFeedback(null)
    }, 400)
  }

  function manejarPasapalabra() {
    pasar()
    setValor('')
  }

  function manejarPista() {
    if (!actual) return
    if ((partida.pistasUsadas ?? 0) >= 3) return
    // Revela la primera letra de la palabra esperada (en minúscula) y descuenta 15s.
    const primera = actual.palabra.charAt(0).toUpperCase()
    const longitud = actual.palabra.length
    setPistaRevelada(`Empieza con "${primera}" · ${longitud} letras`)
    usarPista()
  }

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      {/* Header sticky: el tiempo siempre visible, aunque el usuario scrollee hacia el input */}
      <div
        className={`sticky top-0 z-10 backdrop-blur-sm border-b ${
          modoOscuro ? 'bg-zinc-900/85 border-zinc-800' : 'bg-zinc-50/85 border-zinc-200'
        }`}
      >
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className={`text-sm flex items-center gap-2 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Área: <strong className={modoOscuro ? 'text-white' : 'text-zinc-900'}>{labelArea(partida.area)}</strong>
            {partida.modoEstudio && (
              <span
                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${
                  modoOscuro ? 'bg-[var(--accent-950)]/40 text-[var(--accent-300)]' : 'bg-[var(--accent-50)] text-[var(--accent-700)]'
                }`}
                title="Sin cronómetro · no cuenta para récords"
              >
                Estudio
              </span>
            )}
          </div>
          {partida.modoEstudio ? (
            <div className={`text-sm font-mono ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              <i className="ti ti-infinity mr-1" />
              sin tiempo
            </div>
          ) : (
            <Tiempo segundos={partida.segundosRestantes} modoOscuro={modoOscuro} />
          )}
          <button
            onClick={() => {
              if (confirm('¿Abandonar la partida en curso? Se perderá el progreso.')) abandonar()
            }}
            className={`text-xs px-2.5 py-1 rounded-md ${modoOscuro ? 'text-zinc-500 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
            title="Abandonar partida"
          >
            <i className="ti ti-x text-sm" /> Abandonar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-5">
        {/* Rosco visual */}
        <Rosco rosco={partida.rosco} letraActualIdx={partida.letraActualIdx} modoOscuro={modoOscuro} />

        {/* Panel central */}
        {actual && (
          <div
            className={`max-w-2xl mx-auto mt-4 p-5 rounded-2xl border ${
              modoOscuro ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
            }`}
          >
            <div className="flex items-baseline gap-3 mb-3">
              <span
                className="text-4xl font-bold font-serif"
                style={{ color: VERDE }}
              >
                {actual.letra}
              </span>
              <span className={`text-xs uppercase tracking-wider ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {actual.modo === 'empieza' ? 'empieza con la' : 'contiene la'} {actual.letra}
              </span>
            </div>
            <p className={`text-base leading-relaxed mb-2 ${modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {actual.definicion}
            </p>
            {pistaRevelada && (
              <div
                className={`mb-3 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md font-mono ${
                  modoOscuro
                    ? 'bg-[color-mix(in_srgb,var(--accent-base)_15%,transparent)] text-[var(--accent-300)] border border-[var(--accent-800)]'
                    : 'bg-[color-mix(in_srgb,var(--accent-base)_8%,transparent)] text-[var(--accent-800)] border border-[var(--accent-200)]'
                }`}
              >
                <i className="ti ti-bulb text-sm" />
                {pistaRevelada}
              </div>
            )}
            <form onSubmit={manejarSubmit} className="flex flex-col sm:flex-row gap-2 mt-2">
              <input
                ref={inputRef}
                type="text"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Tu respuesta..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-base outline-none transition-colors ${
                  feedback === 'ok'
                    ? 'border-[var(--accent-500)] bg-[var(--accent-50)] text-[var(--accent-900)]'
                    : feedback === 'fail'
                    ? 'border-rose-500 bg-rose-50 text-rose-900'
                    : modoOscuro
                    ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[var(--accent-600)]'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-[var(--accent-500)]'
                }`}
              />
              <button
                type="submit"
                disabled={!valor.trim()}
                className="px-4 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-40"
                style={{ background: VERDE }}
              >
                Responder
              </button>
              <button
                type="button"
                onClick={manejarPasapalabra}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
                  modoOscuro ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                }`}
                title="Saltar esta letra y volver después"
              >
                Pasapalabra
              </button>
              <button
                type="button"
                onClick={manejarPista}
                disabled={
                  (partida.pistasUsadas ?? 0) >= 3 ||
                  pistaRevelada !== null ||
                  actual.estado !== 'pendiente' && actual.estado !== 'pasada'
                }
                title={
                  (partida.pistasUsadas ?? 0) >= 3
                    ? 'Sin pistas disponibles (máximo 3)'
                    : partida.modoEstudio
                    ? 'Revela la primera letra y la longitud (sin costo en modo estudio)'
                    : 'Revela la primera letra y la longitud · cuesta 15 segundos'
                }
                className={`px-4 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                  modoOscuro
                    ? 'bg-zinc-800 text-[var(--accent-300)] hover:bg-zinc-700 border border-zinc-700'
                    : 'bg-white text-[var(--accent-700)] hover:bg-zinc-50 border border-zinc-200'
                }`}
              >
                <i className="ti ti-bulb text-base" />
                Pista
                <span className="text-[10px] opacity-70">
                  {3 - (partida.pistasUsadas ?? 0)}
                </span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function Tiempo({ segundos, modoOscuro }: { segundos: number; modoOscuro: boolean }) {
  const min = Math.floor(segundos / 60)
  const sec = segundos % 60
  const critico = segundos <= 30
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-mono font-semibold ${
        critico
          ? modoOscuro
            ? 'bg-rose-950/60 text-rose-300'
            : 'bg-rose-50 text-rose-700'
          : modoOscuro
          ? 'bg-zinc-800 text-zinc-200'
          : 'bg-zinc-100 text-zinc-800'
      }`}
    >
      <i className="ti ti-clock text-sm" />
      {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </div>
  )
}

// ============ Rosco circular ============

function Rosco({
  rosco,
  letraActualIdx,
  modoOscuro,
}: {
  rosco: EntradaRosco[]
  letraActualIdx: number
  modoOscuro: boolean
}) {
  // Letras más chicas + radio holgado: la circunferencia (2πr ≈ 1100) dividida
  // por 27 letras deja unos 41 px por letra; con círculos de 30 px sobra ~11 px
  // de espacio entre cada una.
  const radio = 175
  const tam = 30
  const centro = radio + tam
  const diametro = (radio + tam) * 2
  return (
    <div className="flex justify-center">
      <svg
        width={diametro}
        height={diametro}
        viewBox={`0 0 ${diametro} ${diametro}`}
        className="max-w-full h-auto"
        style={{ maxHeight: '52vh' }}
      >
        {rosco.map((r, i) => {
          const angulo = (i / rosco.length) * 2 * Math.PI - Math.PI / 2
          const x = centro + radio * Math.cos(angulo)
          const y = centro + radio * Math.sin(angulo)
          const esActual = i === letraActualIdx
          const fill =
            r.estado === 'acertada'
              ? 'var(--accent-base)'
              : r.estado === 'fallada'
              ? '#dc2626'
              : r.estado === 'pasada'
              ? modoOscuro ? '#52525b' : '#a1a1aa'
              : modoOscuro
              ? '#27272a'
              : '#f4f4f5'
          const textFill =
            r.estado === 'acertada' || r.estado === 'fallada'
              ? '#ffffff'
              : r.estado === 'pasada'
              ? '#ffffff'
              : modoOscuro
              ? '#a1a1aa'
              : '#52525b'
          return (
            <g key={r.letra}>
              <circle
                cx={x}
                cy={y}
                r={tam / 2}
                fill={fill}
                stroke={esActual ? 'var(--accent-base)' : 'transparent'}
                strokeWidth={3}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight="600"
                fontFamily="Georgia, serif"
                fill={textFill}
              >
                {r.letra}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============ Resumen final ============

function ResumenPartida({
  partida,
  modoOscuro,
}: {
  partida: PartidaPasapalabra
  modoOscuro: boolean
}) {
  const abandonar = useStore((s) => s.abandonarPartidaPasapalabra)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const setCodigoExplorador = useStore((s) => s.setCodigoExplorador)
  const registrarRecord = useStore((s) => s.registrarRecordSiCorresponde)
  const recordPrevio = useStore((s) => s.recordsPasapalabra[partida.area])
  const aciertos = partida.rosco.filter((r) => r.estado === 'acertada').length
  const fallos = partida.rosco.filter((r) => r.estado === 'fallada').length
  const pasadas = partida.rosco.filter((r) => r.estado === 'pasada' || r.estado === 'pendiente').length
  const tiempoUsado = partida.duracionTotalSeg - partida.segundosRestantes
  const min = Math.floor(tiempoUsado / 60)
  const sec = tiempoUsado % 60

  // Detectar si esta partida es récord ANTES de registrarla.
  const esNuevoRecord = !partida.modoEstudio && (
    !recordPrevio ||
    aciertos > recordPrevio.aciertos ||
    (aciertos === recordPrevio.aciertos && tiempoUsado < recordPrevio.tiempoUsadoSeg)
  )

  useEffect(() => {
    if (!partida.modoEstudio) registrarRecord()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partida.id])

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
          >
            <i className="ti ti-trophy text-3xl" style={{ color: VERDE }} />
          </div>
          <h1 className={`text-3xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            Partida terminada
          </h1>
          <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Área: {labelArea(partida.area)} · Tiempo usado: {min}:{String(sec).padStart(2, '0')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatCard label="Aciertos" valor={aciertos} color="emerald" modoOscuro={modoOscuro} />
          <StatCard label="Fallos" valor={fallos} color="rose" modoOscuro={modoOscuro} />
          <StatCard label="Sin responder" valor={pasadas} color="zinc" modoOscuro={modoOscuro} />
        </div>

        {partida.modoEstudio ? (
          <div
            className={`mb-6 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 ${
              modoOscuro ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
            }`}
          >
            <i className="ti ti-book-2 text-sm" />
            Modo estudio · esta partida no cuenta para récords personales
          </div>
        ) : esNuevoRecord ? (
          <div
            className={`mb-6 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 font-medium ${
              modoOscuro
                ? 'bg-[color-mix(in_srgb,var(--accent-base)_18%,transparent)] text-[var(--accent-200)] border border-[var(--accent-700)]'
                : 'bg-[color-mix(in_srgb,var(--accent-base)_10%,transparent)] text-[var(--accent-800)] border border-[var(--accent-300)]'
            }`}
          >
            <i className="ti ti-confetti text-base" />
            ¡Nuevo récord personal en {labelArea(partida.area)}!
            {recordPrevio && (
              <span className="opacity-70 text-xs ml-1">
                · previo: {recordPrevio.aciertos}/27 en {formatearTiempo(recordPrevio.tiempoUsadoSeg)}
              </span>
            )}
          </div>
        ) : recordPrevio ? (
          <div
            className={`mb-6 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 ${
              modoOscuro ? 'bg-zinc-800/60 text-zinc-400 border border-zinc-700' : 'bg-zinc-50 text-zinc-600 border border-zinc-200'
            }`}
          >
            <i className="ti ti-trophy text-sm" />
            Tu mejor marca sigue siendo: <strong>{recordPrevio.aciertos}/27</strong> en {formatearTiempo(recordPrevio.tiempoUsadoSeg)}
          </div>
        ) : null}

        <h2 className={`text-[11px] uppercase tracking-wider font-semibold mb-3 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Revisión por letra
        </h2>
        <div className="space-y-1.5">
          {partida.rosco.map((r) => (
            <div
              key={r.letra}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-white border-zinc-200'
              }`}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold flex-shrink-0 text-white"
                style={{
                  background:
                    r.estado === 'acertada'
                      ? 'var(--accent-base)'
                      : r.estado === 'fallada'
                      ? '#dc2626'
                      : modoOscuro
                      ? '#52525b'
                      : '#a1a1aa',
                }}
              >
                {r.letra}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                    {r.palabraVisible}
                  </span>
                  {r.respuestaUsuario && r.estado === 'fallada' && (
                    <span className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      (tu respuesta: <em>{r.respuestaUsuario}</em>)
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>{r.definicion}</p>
                {r.codigoOrigen && r.articulo && (
                  <button
                    onClick={() => {
                      setCodigoExplorador(r.codigoOrigen!)
                      setVistaActiva('explorador')
                    }}
                    className={`mt-1 inline-flex items-center gap-1 text-[11px] underline ${
                      modoOscuro ? 'text-[var(--accent-400)] hover:text-[var(--accent-300)]' : 'text-[var(--accent-700)] hover:text-[var(--accent-800)]'
                    }`}
                  >
                    <i className="ti ti-external-link text-[10px]" />
                    {r.articulo} en el Explorador
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={() => abandonar()}
            className="px-5 py-2.5 rounded-lg text-white font-medium text-sm"
            style={{ background: VERDE }}
          >
            <i className="ti ti-refresh mr-1" />
            Jugar otra partida
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  valor,
  color,
  modoOscuro,
}: {
  label: string
  valor: number
  color: 'emerald' | 'rose' | 'zinc'
  modoOscuro: boolean
}) {
  const colores = {
    emerald: modoOscuro ? 'bg-[var(--accent-950)]/40 text-[var(--accent-300)]' : 'bg-[var(--accent-50)] text-[var(--accent-800)]',
    rose: modoOscuro ? 'bg-rose-950/40 text-rose-300' : 'bg-rose-50 text-rose-800',
    zinc: modoOscuro ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700',
  }
  return (
    <div className={`rounded-xl p-4 text-center ${colores[color]}`}>
      <div className="text-3xl font-bold">{valor}</div>
      <div className="text-[11px] uppercase tracking-wider mt-1 opacity-80">{label}</div>
    </div>
  )
}

// ============ Modal continuar ============

function ModalContinuar({
  modoOscuro,
  partida,
  onContinuar,
  onAbandonar,
}: {
  modoOscuro: boolean
  partida: PartidaPasapalabra
  onContinuar: () => void
  onAbandonar: () => void
}) {
  const aciertos = partida.rosco.filter((r) => r.estado === 'acertada').length
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`max-w-md w-full rounded-2xl shadow-2xl overflow-hidden ${
          modoOscuro ? 'bg-zinc-900' : 'bg-white'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)' : 'color-mix(in srgb, var(--accent-base) 8%, transparent)' }}
            >
              <i className="ti ti-player-pause text-xl" style={{ color: VERDE }} />
            </span>
            <h2 className={`text-xl font-serif font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              ¿Continuar la partida?
            </h2>
          </div>
          <p className={`text-sm mb-4 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Tienes una partida pausada del rosco <strong>{labelArea(partida.area)}</strong>: {aciertos}{' '}
            {aciertos === 1 ? 'acierto' : 'aciertos'} y{' '}
            <strong>{formatearTiempo(partida.segundosRestantes)}</strong> restantes.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onContinuar}
              className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium text-sm"
              style={{ background: VERDE }}
            >
              <i className="ti ti-player-play mr-1" />
              Continuar
            </button>
            <button
              onClick={onAbandonar}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
                modoOscuro ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              Empezar nueva
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============ Quiz Jurídico ============

function QuizJuridicoWrapper({
  flujo,
  modoOscuro,
  codigos,
  onVolverAlMenu,
}: {
  flujo: ReturnType<typeof useDestello>
  modoOscuro: boolean
  codigos: any[]
  onVolverAlMenu: () => void
}) {
  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      {flujo.estado === 'codigo' && (
        <SelectorCodigoQuiz
          titulo="Quiz Jurídico"
          descripcion="Preguntas sobre artículos clave con puntos, rachas y feedback"
          onElegir={(tipo) => flujo.elegirCodigo(tipo as CodigoTipo)}
          onVolverAlMenu={onVolverAlMenu}
          modoOscuro={modoOscuro}
        />
      )}

      {flujo.estado === 'jugando' && flujo.preguntaActual && (
        <PantallaJuegoQuiz flujo={flujo} modoOscuro={modoOscuro} />
      )}

      {flujo.estado === 'resultado' && (
        <PantallaResultadoQuiz
          aciertos={flujo.aciertos}
          errores={flujo.errores}
          puntos={flujo.puntos}
          racha={flujo.racha}
          codigoMeta={codigos.find((c) => c.tipo === flujo.codigoElegido)}
          modoOscuro={modoOscuro}
          onJugarDeNuevo={() => {
            onVolverAlMenu()
          }}
        />
      )}
    </div>
  )
}

function SelectorCodigoQuiz({
  titulo,
  descripcion,
  onElegir,
  onVolverAlMenu,
  modoOscuro,
}: {
  titulo: string
  descripcion: string
  onElegir: (tipo: string) => void
  onVolverAlMenu: () => void
  modoOscuro: boolean
}) {
  const codigos = useStore((s) => s.codigos)
  const codigosConPreguntas = codigos.filter((c) => c.activo)

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="text-center mb-8">
        <button
          onClick={onVolverAlMenu}
          className={`inline-flex items-center gap-1 text-xs font-medium mb-4 transition-colors ${
            modoOscuro
              ? 'text-zinc-400 hover:text-white'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <i className="ti ti-arrow-left text-sm" />
          Volver al menú
        </button>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: modoOscuro
              ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
              : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
          }}
        >
          <i className="ti ti-help text-3xl" style={{ color: VERDE }} />
        </div>
        <h1 className={`text-3xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          {titulo}
        </h1>
        <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {descripcion}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {codigosConPreguntas.map((codigo, i) => (
          <motion.button
            key={codigo.tipo}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            onClick={() => onElegir(codigo.tipo)}
            className={`group text-left rounded-xl border-2 p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 ${
              modoOscuro
                ? 'bg-zinc-800/40 border-zinc-800 hover:border-[var(--accent-700)]'
                : 'bg-white border-zinc-200 hover:border-[var(--accent-500)]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className={`text-base font-serif font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                {codigo.nombre}
              </h3>
              <i
                className="ti ti-arrow-right text-base transition-transform group-hover:translate-x-1"
                style={{ color: VERDE }}
              />
            </div>
            <p className={`text-xs leading-relaxed mt-2 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Pregunta preguntas sobre este código legal
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function PantallaJuegoQuiz({
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
            <div className={`w-px h-8 ${modoOscuro ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
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
      {flujo.mostrarResultado && (
        <div className="space-y-4">
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
        </div>
      )}
    </div>
  )
}

function PantallaResultadoQuiz({
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
          {codigoMeta?.nombre || 'Quiz Jurídico'}
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
          <i className="ti ti-home text-base" />
          Volver al menú
        </button>
      </div>

      <p className={`text-xs text-center mt-6 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
        Juega regularmente para mejorar tu dominio de los conceptos legales
      </p>
    </div>
  )
}

function labelArea(a: AreaPractica): string {
  return AREAS.find((x) => x.id === a)?.nombre ?? a
}

function formatearTiempo(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

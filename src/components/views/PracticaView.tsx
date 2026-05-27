import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { generarRosco, esRespuestaCorrecta } from '../../services/pasapalabra'
import type { AreaPractica, EntradaRosco, PartidaPasapalabra } from '../../types'

const VERDE = '#0F6E56'
const DURACION_DEFAULT = 300 // 5 minutos

const AREAS: { id: AreaPractica; nombre: string; icono: string; descripcion: string }[] = [
  { id: 'general', nombre: 'General', icono: 'ti-shuffle', descripcion: 'Mezcla de todas las ramas' },
  { id: 'civil', nombre: 'Civil', icono: 'ti-scale', descripcion: 'Contratos, familia, sucesiones, propiedad' },
  { id: 'penal', nombre: 'Penal', icono: 'ti-shield-exclamation', descripcion: 'Delitos, penas y leyes especiales' },
  { id: 'laboral', nombre: 'Laboral', icono: 'ti-briefcase', descripcion: 'Código del Trabajo, Ley 16.744, Karin' },
  { id: 'procesal', nombre: 'Procesal', icono: 'ti-gavel', descripcion: 'Civil, penal y orgánica de tribunales' },
  { id: 'constitucional', nombre: 'Constitucional', icono: 'ti-building-bank', descripcion: 'Constitución y derechos fundamentales' },
]

export function PracticaView() {
  const partida = useStore((s) => s.partidaPasapalabra)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const retomar = useStore((s) => s.retomarPartidaPasapalabra)
  const abandonar = useStore((s) => s.abandonarPartidaPasapalabra)

  const [mostrarContinuar, setMostrarContinuar] = useState(false)

  // Si entramos a la vista y hay una partida pausada sin terminar, mostrar el modal
  useEffect(() => {
    if (partida && partida.pausadaEn && !partida.finalizada) {
      setMostrarContinuar(true)
    }
  }, [partida])

  if (partida && partida.finalizada) {
    return <ResumenPartida partida={partida} modoOscuro={modoOscuro} />
  }

  if (partida && !partida.pausadaEn) {
    return <Pasapalabra partida={partida} modoOscuro={modoOscuro} />
  }

  return (
    <>
      <SeleccionArea modoOscuro={modoOscuro} />
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

// ============ Selección de área ============

function SeleccionArea({ modoOscuro }: { modoOscuro: boolean }) {
  const iniciar = useStore((s) => s.iniciarPartidaPasapalabra)
  const [cargando, setCargando] = useState<AreaPractica | null>(null)
  const [error, setError] = useState<string | null>(null)

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
            style={{ background: modoOscuro ? '#0F6E5625' : '#0F6E5610' }}
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

        <h2
          className={`text-[11px] uppercase tracking-wider font-semibold mb-3 ${
            modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          Elige un área
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AREAS.map((a) => (
            <button
              key={a.id}
              onClick={() => comenzar(a.id)}
              disabled={cargando !== null}
              className={`text-left rounded-xl border-2 p-5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5 ${
                modoOscuro
                  ? 'bg-zinc-800/40 border-zinc-800 hover:border-emerald-700'
                  : 'bg-white border-zinc-200 hover:border-emerald-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: modoOscuro ? '#0F6E5630' : '#0F6E5615' }}
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
            </button>
          ))}
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
  const [valor, setValor] = useState('')
  const [feedback, setFeedback] = useState<'ok' | 'fail' | null>(null)
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

  // Auto-focus al input al cambiar de letra
  useEffect(() => {
    inputRef.current?.focus()
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

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Header con stats */}
        <div className="flex items-center justify-between mb-6">
          <div className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Área: <strong className={modoOscuro ? 'text-white' : 'text-zinc-900'}>{labelArea(partida.area)}</strong>
          </div>
          <Tiempo segundos={partida.segundosRestantes} modoOscuro={modoOscuro} />
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

        {/* Rosco visual */}
        <Rosco rosco={partida.rosco} letraActualIdx={partida.letraActualIdx} modoOscuro={modoOscuro} />

        {/* Panel central */}
        {actual && (
          <div
            className={`max-w-2xl mx-auto mt-8 p-6 rounded-2xl border ${
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
            <p className={`text-base leading-relaxed mb-4 ${modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {actual.definicion}
            </p>
            <form onSubmit={manejarSubmit} className="flex flex-col sm:flex-row gap-2">
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
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : feedback === 'fail'
                    ? 'border-rose-500 bg-rose-50 text-rose-900'
                    : modoOscuro
                    ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-600'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500'
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
  const radio = 170
  const tam = 40
  const centro = radio + tam
  const diametro = (radio + tam) * 2
  return (
    <div className="flex justify-center">
      <svg width={diametro} height={diametro} viewBox={`0 0 ${diametro} ${diametro}`}>
        {rosco.map((r, i) => {
          const angulo = (i / rosco.length) * 2 * Math.PI - Math.PI / 2
          const x = centro + radio * Math.cos(angulo)
          const y = centro + radio * Math.sin(angulo)
          const esActual = i === letraActualIdx
          const fill =
            r.estado === 'acertada'
              ? '#0F6E56'
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
                stroke={esActual ? '#0F6E56' : 'transparent'}
                strokeWidth={3}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={16}
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

function ResumenPartida({ partida, modoOscuro }: { partida: PartidaPasapalabra; modoOscuro: boolean }) {
  const abandonar = useStore((s) => s.abandonarPartidaPasapalabra)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const setCodigoExplorador = useStore((s) => s.setCodigoExplorador)
  const aciertos = partida.rosco.filter((r) => r.estado === 'acertada').length
  const fallos = partida.rosco.filter((r) => r.estado === 'fallada').length
  const pasadas = partida.rosco.filter((r) => r.estado === 'pasada' || r.estado === 'pendiente').length
  const tiempoUsado = partida.duracionTotalSeg - partida.segundosRestantes
  const min = Math.floor(tiempoUsado / 60)
  const sec = tiempoUsado % 60

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: modoOscuro ? '#0F6E5625' : '#0F6E5610' }}
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

        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Aciertos" valor={aciertos} color="emerald" modoOscuro={modoOscuro} />
          <StatCard label="Fallos" valor={fallos} color="rose" modoOscuro={modoOscuro} />
          <StatCard label="Sin responder" valor={pasadas} color="zinc" modoOscuro={modoOscuro} />
        </div>

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
                      ? '#0F6E56'
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
                      modoOscuro ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-800'
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
    emerald: modoOscuro ? 'bg-emerald-950/40 text-emerald-300' : 'bg-emerald-50 text-emerald-800',
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
              style={{ background: modoOscuro ? '#0F6E5630' : '#0F6E5615' }}
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

function labelArea(a: AreaPractica): string {
  return AREAS.find((x) => x.id === a)?.nombre ?? a
}

function formatearTiempo(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

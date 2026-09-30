import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import {
  estaPendiente,
  generarTarjetas,
  ordenarParaSesion,
  REINSERTAR_FALLADA_EN,
  type TarjetaRepaso,
} from '../../services/tarjetasApunte'
import type { ApunteModulo } from '../../types'

const VERDE = 'var(--accent-base)'
/** Sesiones cortas: 80 tarjetas seguidas cansan y se abandona a la mitad. */
const TARJETAS_POR_SESION = 20

interface Props {
  apunte: ApunteModulo
  onCerrar: () => void
}

/** Modo repaso de un apunte (B5): tarjetas generadas por reglas desde su
 *  texto, "la sabía / no la sabía", y las falladas vuelven unas tarjetas
 *  más adelante en la misma sesión (y mañana en la programación Leitner). */
export function RepasoApunte({ apunte, onCerrar }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const estados = useStore((s) => s.repasoApuntes)
  const registrar = useStore((s) => s.registrarRepasoTarjeta)
  const tarjetas = useMemo(() => generarTarjetas(apunte), [apunte])
  const pendientesAlInicio = useMemo(
    () => tarjetas.filter((t) => estaPendiente(useStore.getState().repasoApuntes[t.id])).length,
    [tarjetas]
  )

  const [cola, setCola] = useState<TarjetaRepaso[]>(() =>
    ordenarParaSesion(tarjetas, useStore.getState().repasoApuntes, true).slice(0, TARJETAS_POR_SESION)
  )
  const [indice, setIndice] = useState(0)
  const [volteada, setVolteada] = useState(false)
  const [sabidas, setSabidas] = useState<Set<string>>(() => new Set())
  const [falladas, setFalladas] = useState<Set<string>>(() => new Set())
  // Solo la PRIMERA respuesta de cada tarjeta en la sesión cuenta para la
  // programación: acertar una fallada 3 tarjetas después es reaprendizaje,
  // no debe subirla de caja (si no, "no la sabía" nunca volvería mañana).
  const [registradas, setRegistradas] = useState<Set<string>>(() => new Set())

  const actual = cola[indice]
  const terminado = indice >= cola.length

  const responder = (resultado: 'sabia' | 'no_sabia') => {
    if (!actual || !volteada) return
    const primera = !registradas.has(actual.id)
    if (primera) {
      registrar(actual.id, resultado)
      setRegistradas((s) => new Set(s).add(actual.id))
    }
    if (resultado === 'sabia') {
      if (primera) setSabidas((s) => new Set(s).add(actual.id))
    } else {
      setFalladas((s) => new Set(s).add(actual.id))
      // vuelve antes: unas tarjetas más adelante, no al final de la sesión
      setCola((c) => {
        const nueva = [...c]
        nueva.splice(Math.min(nueva.length, indice + 1 + REINSERTAR_FALLADA_EN), 0, actual)
        return nueva
      })
    }
    setVolteada(false)
    setIndice((i) => i + 1)
  }

  const reiniciar = (lista: TarjetaRepaso[]) => {
    setCola(lista)
    setIndice(0)
    setVolteada(false)
    setSabidas(new Set())
    setFalladas(new Set())
    setRegistradas(new Set())
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrar()
        return
      }
      if (terminado) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setVolteada((v) => !v)
      } else if (e.key === 'ArrowRight' || e.key === '2') responder('sabia')
      else if (e.key === 'ArrowLeft' || e.key === '1') responder('no_sabia')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const texto = modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  // tarjetas únicas vistas en la sesión (las falladas se repiten en la cola)
  const unicas = new Set(cola.map((t) => t.id)).size
  const hechas = new Set(cola.slice(0, indice).map((t) => t.id)).size

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`fixed inset-0 z-[90] flex flex-col ${modoOscuro ? 'bg-zinc-950' : 'bg-zinc-50'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Repaso: ${apunte.titulo}`}
    >
      <div className={`flex items-center gap-3 px-4 sm:px-6 py-3 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <button
          onClick={onCerrar}
          aria-label="Cerrar repaso"
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
        >
          <i className="ti ti-x text-lg" />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${texto}`}>Repaso · {apunte.titulo}</p>
          <p className={`text-[11px] ${suave}`}>
            {tarjetas.length} tarjeta{tarjetas.length === 1 ? '' : 's'} · {pendientesAlInicio} para hoy
          </p>
        </div>
        {!terminado && tarjetas.length > 0 && (
          <span className={`text-xs font-medium tabular-nums ${suave}`}>
            {Math.min(hechas + 1, unicas)} / {unicas}
          </span>
        )}
      </div>

      <div className={`h-1 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-200'}`} aria-hidden>
        <div className="h-full transition-[width] duration-200" style={{ width: `${cola.length ? (indice / cola.length) * 100 : 0}%`, background: VERDE }} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
        {tarjetas.length === 0 ? (
          <div className={`max-w-md text-sm leading-relaxed ${suave}`}>
            <p className={`text-base font-semibold mb-2 ${texto}`}>Este apunte aún no tiene tarjetas</p>
            <p className="mb-3">Las tarjetas se crean solas a partir de dos formatos del apunte:</p>
            <pre className={`text-xs rounded-lg p-3 mb-3 whitespace-pre-wrap ${modoOscuro ? 'bg-zinc-900 text-zinc-300' : 'bg-white border border-zinc-200 text-zinc-700'}`}>
              {'- **Obligación:** vínculo jurídico entre personas determinadas\n> 🎯 El contrato es ley para las partes (art. 1545)'}
            </pre>
            <p>Cada viñeta que empieza con un término en negrita seguido de dos puntos es una tarjeta, y cada recuadro 🎯 o 💡 es una tarjeta de idea clave.</p>
          </div>
        ) : terminado ? (
          <div className="max-w-md w-full text-center">
            <i className="ti ti-circle-check text-5xl mb-3 inline-block" style={{ color: VERDE }} />
            <p className={`text-xl font-serif font-bold mb-1 ${texto}`}>¡Repaso terminado!</p>
            <p className={`text-sm mb-6 ${suave}`}>
              Sabías {sabidas.size} de {unicas} a la primera
              {falladas.size > 0 ? ` · ${falladas.size} para reforzar (vuelve${falladas.size === 1 ? '' : 'n'} mañana)` : ''}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {(() => {
                const restantes = tarjetas.filter((t) => estaPendiente(estados[t.id]))
                if (restantes.length === 0) return null
                return (
                  <button
                    onClick={() => reiniciar(ordenarParaSesion(tarjetas, estados, true).slice(0, TARJETAS_POR_SESION))}
                    className="px-4 min-h-[44px] rounded-lg text-sm font-medium text-white"
                    style={{ background: VERDE }}
                  >
                    Seguir ({restantes.length} para hoy)
                  </button>
                )
              })()}
              {falladas.size > 0 && (
                <button
                  onClick={() => reiniciar(tarjetas.filter((t) => falladas.has(t.id)))}
                  className="px-4 min-h-[44px] rounded-lg text-sm font-medium text-white"
                  style={{ background: VERDE }}
                >
                  {falladas.size === 1 ? 'Repasar la fallada' : `Repasar las ${falladas.size} falladas`}
                </button>
              )}
              <button
                onClick={() => reiniciar(ordenarParaSesion(tarjetas, estados, false))}
                className={`px-4 min-h-[44px] rounded-lg text-sm font-medium border ${modoOscuro ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-white'}`}
              >
                Repasar todas otra vez
              </button>
              <button onClick={onCerrar} className={`px-4 min-h-[44px] rounded-lg text-sm ${suave}`}>
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait">
              <motion.button
                key={`${actual.id}-${indice}-${volteada}`}
                initial={{ opacity: 0, rotateX: -8 }}
                animate={{ opacity: 1, rotateX: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setVolteada((v) => !v)}
                aria-label={volteada ? 'Ver el frente de la tarjeta' : 'Voltear la tarjeta'}
                className={`w-full min-h-[240px] sm:min-h-[280px] rounded-2xl border shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center ${
                  modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
              >
                <span className={`text-[11px] uppercase tracking-wider font-semibold mb-3 ${suave}`}>
                  {actual.tipo === 'idea' ? 'Idea clave' : 'Término'}
                  {actual.seccion && actual.tipo === 'termino' ? ` · ${actual.seccion}` : ''}
                  {volteada ? ' · respuesta' : ''}
                </span>
                {volteada ? (
                  <>
                    {/* el frente queda visible arriba: reforzar la asociación pregunta → respuesta */}
                    <p className={`text-sm font-semibold mb-3 ${suave}`}>{actual.frente}</p>
                    <p className={`text-base sm:text-lg leading-relaxed whitespace-pre-line font-serif ${texto}`}>{actual.reverso}</p>
                  </>
                ) : (
                  <p className={`text-xl sm:text-2xl font-serif font-bold ${texto}`}>{actual.frente}</p>
                )}
                {!volteada && <span className={`mt-4 text-xs ${suave}`}>Toca o presiona Espacio para ver la respuesta</span>}
              </motion.button>
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => responder('no_sabia')}
                disabled={!volteada}
                className={`min-h-[52px] rounded-xl text-sm font-semibold border transition-opacity disabled:opacity-40 ${
                  modoOscuro ? 'border-red-900 text-red-300 hover:bg-red-950/40' : 'border-red-200 text-red-700 hover:bg-red-50'
                }`}
              >
                <i className="ti ti-x mr-1" /> No la sabía
              </button>
              <button
                onClick={() => responder('sabia')}
                disabled={!volteada}
                className="min-h-[52px] rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: VERDE }}
              >
                <i className="ti ti-check mr-1" /> La sabía
              </button>
            </div>
            <p className={`hidden sm:block text-center text-[11px] mt-3 ${suave}`}>
              Espacio: voltear · ←/1: no la sabía · →/2: la sabía · Esc: salir
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { registrarRespuesta, type ItemRepaso } from '../../services/repaso'
import { REINSERTAR_FALLADA_EN } from '../../services/tarjetasApunte'

/** Sesiones cortas: 80 tarjetas seguidas cansan y se abandona a la mitad. */

interface Props {
  titulo: string
  subtitulo?: string
  items: ItemRepaso[]
  onCerrar: () => void
  /** Lo que todavía toca hoy (se calcula al terminar, con el estado ya actualizado). */
  pendientes?: () => Promise<{ total: number; lote: ItemRepaso[] }>
  /** Todo el conjunto, para "Repasar todas otra vez". */
  todas?: () => ItemRepaso[]
  /** Texto cuando no hay nada que repasar. */
  vacio?: React.ReactNode
}

const ETIQUETA_ORIGEN: Record<ItemRepaso['origen'], { icono: string; nombre: string }> = {
  apunte: { icono: 'ti-notebook', nombre: 'Apuntes' },
  articulo: { icono: 'ti-book-2', nombre: 'Artículos' },
  pregunta: { icono: 'ti-help-circle', nombre: 'Preguntas' },
}

/** Sesión de repaso. Sirve igual para una cola mezclada del día que para un
 *  solo apunte. Tarjeta (frente → voltear → "la sabía / no la sabía") o
 *  pregunta con alternativas (se corrige sola). Las falladas vuelven unas
 *  tarjetas más adelante en la misma sesión y mañana en la programación. */
export function SesionRepaso({ titulo, subtitulo, items, onCerrar, pendientes, todas, vacio }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [cola, setCola] = useState<ItemRepaso[]>(items)
  const [indice, setIndice] = useState(0)
  const [volteada, setVolteada] = useState(false)
  const [elegida, setElegida] = useState<number | null>(null)
  const [sabidas, setSabidas] = useState<Set<string>>(() => new Set())
  const [falladas, setFalladas] = useState<Set<string>>(() => new Set())
  // Solo la PRIMERA respuesta de cada tarjeta en la sesión cuenta para la
  // programación: acertar una fallada 3 tarjetas después es reaprendizaje,
  // no debe subirla de caja (si no, "no la sabía" nunca volvería mañana).
  const [registradas, setRegistradas] = useState<Set<string>>(() => new Set())

  const refDialogo = useRef<HTMLDivElement>(null)
  // El foco entra al diálogo y vuelve al botón que lo abrió: si se queda
  // detrás, Espacio/Enter activan ESE botón (reiniciaban la sesión).
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    refDialogo.current?.focus()
    return () => previo?.focus?.()
  }, [])

  const actual = cola[indice]
  const terminado = indice >= cola.length
  const esPregunta = actual?.origen === 'pregunta'

  const responder = (resultado: 'sabia' | 'no_sabia') => {
    if (!actual) return
    const primera = !registradas.has(actual.id)
    if (primera) {
      registrarRespuesta(actual, resultado)
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
    setElegida(null)
    setIndice((i) => i + 1)
  }

  /** Pregunta: elegir una alternativa la corrige; "Continuar" registra y avanza. */
  const elegir = (i: number) => {
    if (!actual || actual.origen !== 'pregunta' || elegida !== null) return
    setElegida(i)
  }
  const continuarPregunta = () => {
    if (!actual || elegida === null) return
    responder(elegida === actual.correcta ? 'sabia' : 'no_sabia')
  }

  const reiniciar = (lista: ItemRepaso[]) => {
    setCola(lista)
    setIndice(0)
    setVolteada(false)
    setElegida(null)
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
      if (terminado || !actual) return
      // Espacio/Enter sobre un botón ya lo activan solos (voltear, La sabía…):
      // manejarlos también acá los dispararía dos veces.
      const enBoton = (e.target as HTMLElement | null)?.closest?.('button') != null
      if (esPregunta) {
        const n = Number(e.key)
        if (elegida === null && n >= 1 && n <= (actual.opciones?.length ?? 0)) elegir(n - 1)
        else if (elegida !== null && ((!enBoton && (e.key === ' ' || e.key === 'Enter')) || e.key === 'ArrowRight')) {
          e.preventDefault()
          continuarPregunta()
        }
        return
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (enBoton) return
        e.preventDefault()
        setVolteada((v) => !v)
      } else if ((e.key === 'ArrowRight' || e.key === '2') && volteada) responder('sabia')
      else if ((e.key === 'ArrowLeft' || e.key === '1') && volteada) responder('no_sabia')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const texto = modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  // tarjetas únicas vistas en la sesión (las falladas se repiten en la cola)
  const unicas = new Set(cola.map((t) => t.id)).size
  const hechas = new Set(cola.slice(0, indice).map((t) => t.id)).size
  const [restantes, setRestantes] = useState<{ total: number; lote: ItemRepaso[] }>({ total: 0, lote: [] })
  useEffect(() => {
    if (!terminado || !pendientes) return
    let vigente = true
    pendientes().then((r) => vigente && setRestantes(r)).catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [terminado, pendientes])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`fixed inset-0 h-[100dvh] z-[90] flex flex-col outline-none ${modoOscuro ? 'bg-zinc-950' : 'bg-zinc-50'}`}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      ref={refDialogo}
      tabIndex={-1}
    >
      <div className={`flex items-center gap-3 px-4 sm:px-6 py-3 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <button onClick={onCerrar} aria-label="Cerrar repaso" className="boton boton-fantasma boton-icono">
          <i className="ti ti-x text-lg" aria-hidden />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${texto}`}>{titulo}</p>
          {subtitulo && <p className={`text-[11px] ${suave}`}>{subtitulo}</p>}
        </div>
        {!terminado && cola.length > 0 && (
          <span className={`text-xs font-medium tabular-nums ${suave}`}>
            {Math.min(hechas + 1, unicas)} / {unicas}
          </span>
        )}
      </div>

      <div className={`h-1 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-200'}`} aria-hidden>
        <div className="h-full transition-[width] duration-200" style={{ width: `${cola.length ? (indice / cola.length) * 100 : 0}%`, background: 'var(--accent-base)' }} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
        {items.length === 0 ? (
          <div className={`max-w-md text-sm leading-relaxed ${suave}`}>{vacio ?? <p>No hay nada que repasar por ahora.</p>}</div>
        ) : terminado ? (
          <div className="max-w-md w-full text-center">
            <i className="ti ti-circle-check text-5xl mb-3 inline-block" style={{ color: 'var(--accent-texto)' }} aria-hidden />
            <p className={`text-xl font-serif font-bold mb-1 ${texto}`}>¡Repaso terminado!</p>
            <p className={`text-sm mb-6 ${suave}`}>
              Sabías {sabidas.size} de {unicas} a la primera
              {falladas.size > 0 ? ` · ${falladas.size} para reforzar (vuelve${falladas.size === 1 ? '' : 'n'} mañana)` : ''}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {restantes.total > 0 && (
                <button
                  onClick={() => {
                    reiniciar(restantes.lote)
                    setRestantes({ total: 0, lote: [] })
                  }}
                  className="boton boton-primario px-4 min-h-[44px]"
                >
                  Seguir ({restantes.total} para hoy)
                </button>
              )}
              {falladas.size > 0 && (
                <button onClick={() => reiniciar(items.filter((t) => falladas.has(t.id)))} className="boton boton-primario px-4 min-h-[44px]">
                  {falladas.size === 1 ? 'Repasar la fallada' : `Repasar las ${falladas.size} falladas`}
                </button>
              )}
              {todas && (
                <button onClick={() => reiniciar(todas())} className="boton boton-borde px-4 min-h-[44px]">
                  Repasar todas otra vez
                </button>
              )}
              <button onClick={onCerrar} className="boton boton-fantasma px-4 min-h-[44px]">
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl">
            <p className={`flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold mb-2 ${suave}`}>
              <i className={`ti ${ETIQUETA_ORIGEN[actual.origen].icono} text-sm`} aria-hidden />
              {actual.etiqueta}
              {!esPregunta && volteada ? ' · respuesta' : ''}
            </p>
            <AnimatePresence mode="wait">
              {esPregunta ? (
                <motion.div key={`${actual.id}-${indice}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className={`rounded-panel border shadow-tarjeta p-6 mb-3 ${modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <p className={`text-lg sm:text-xl font-serif font-bold leading-snug ${texto}`}>{actual.frente}</p>
                  </div>
                  <div className="space-y-2">
                    {(actual.opciones ?? []).map((op, i) => {
                      const correcta = elegida !== null && i === actual.correcta
                      const mala = elegida === i && i !== actual.correcta
                      return (
                        <button
                          key={i}
                          onClick={() => elegir(i)}
                          disabled={elegida !== null}
                          className={`w-full text-left rounded-xl border px-4 py-3 min-h-[48px] text-sm transition-colors ${
                            correcta
                              ? modoOscuro ? 'border-emerald-600 bg-emerald-950/40 text-emerald-200' : 'border-emerald-500 bg-emerald-50 text-emerald-900'
                              : mala
                              ? modoOscuro ? 'border-red-800 bg-red-950/40 text-red-200' : 'border-red-300 bg-red-50 text-red-900'
                              : modoOscuro ? 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 disabled:hover:bg-zinc-900' : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 disabled:hover:bg-white'
                          }`}
                        >
                          <span className={`inline-block w-5 font-mono text-xs ${suave}`}>{i + 1}</span>
                          {op}
                          {correcta && <i className="ti ti-check ml-2" aria-label="correcta" />}
                          {mala && <i className="ti ti-x ml-2" aria-label="incorrecta" />}
                        </button>
                      )
                    })}
                  </div>
                  {elegida !== null && (
                    <div className="mt-3" role="status">
                      <p className={`text-sm leading-relaxed ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        <strong>{elegida === actual.correcta ? '¡Correcto! ' : 'No es esa. '}</strong>
                        {actual.explicacion}
                      </p>
                      <button onClick={continuarPregunta} className="boton boton-primario w-full mt-3 min-h-[48px]">
                        Continuar
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key={`${actual.id}-${indice}-${volteada}`} initial={{ opacity: 0, rotateX: -8 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <button
                    onClick={() => setVolteada((v) => !v)}
                    aria-label={volteada ? 'Ver el frente de la tarjeta' : 'Voltear la tarjeta'}
                    className={`w-full min-h-[240px] sm:min-h-[280px] max-h-[60dvh] overflow-y-auto rounded-panel border shadow-tarjeta p-6 sm:p-8 flex flex-col items-center justify-center text-center ${
                      modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    {volteada ? (
                      <>
                        {/* el frente queda visible arriba: reforzar la asociación pregunta → respuesta */}
                        <p className={`text-sm font-semibold mb-3 ${suave}`}>{actual.frente}</p>
                        <p className={`text-base sm:text-lg leading-relaxed whitespace-pre-line font-serif ${texto}`}>{actual.reverso.trim()}</p>
                      </>
                    ) : (
                      <p className={`text-xl sm:text-2xl font-serif font-bold ${texto}`}>{actual.frente}</p>
                    )}
                    {!volteada && <span className={`mt-4 text-xs ${suave}`}>Toca o presiona Espacio para ver la respuesta</span>}
                  </button>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => volteada && responder('no_sabia')}
                      disabled={!volteada}
                      className={`boton boton-borde min-h-[52px] font-semibold ${modoOscuro ? '!border-red-900 !text-red-300' : '!border-red-200 !text-red-700'}`}
                    >
                      <i className="ti ti-x" aria-hidden /> No la sabía
                    </button>
                    <button onClick={() => volteada && responder('sabia')} disabled={!volteada} className="boton boton-primario min-h-[52px] font-semibold">
                      <i className="ti ti-check" aria-hidden /> La sabía
                    </button>
                  </div>
                  <p className={`hidden sm:block text-center text-[11px] mt-3 ${suave}`}>
                    Espacio: voltear · ←/1: no la sabía · →/2: la sabía · Esc: salir
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}

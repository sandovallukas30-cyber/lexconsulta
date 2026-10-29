import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { textosIntervalo, type NotaRepaso } from '../../services/fsrs'
import { TarjetaDeslizable, type DireccionTarjeta } from './TarjetaDeslizable'
import {
  aEstadoFSRS,
  estaPendiente,
  generarTarjetas,
  ordenarParaSesion,
  pistaDe,
  REINSERTAR_FALLADA_EN,
  type TarjetaRepaso,
} from '../../services/tarjetasApunte'
import { PistaGesto } from './PistaGesto'
import { registrarUso } from '../../services/uso'
import { esPantallaTactil } from '../../services/pantallaTactil'
import type { ApunteModulo } from '../../types'

const VERDE = 'var(--accent-base)'
/** Sesiones cortas: 80 tarjetas seguidas cansan y se abandona a la mitad. */
const TARJETAS_POR_SESION = 20
/** Preferencia de este dispositivo: ver los 4 botones (Otra vez, Difícil, Bien, Fácil) con sus tiempos en vez de solo Error / Acierto. */
const CLAVE_CUATRO_BOTONES = 'prima-lex-repaso-cuatro-botones'

function leerCuatroBotones(): boolean {
  try {
    return localStorage.getItem(CLAVE_CUATRO_BOTONES) === '1'
  } catch {
    return false
  }
}

interface Props {
  /** Repaso de un apunte: sus tarjetas se generan del texto. */
  apunte?: ApunteModulo
  /** Repaso de un mazo armado con filtros (varias asignaturas): llega con las tarjetas ya elegidas. */
  mazo?: { titulo: string; tarjetas: TarjetaRepaso[] }
  onCerrar: () => void
}

/** Modo repaso de un apunte (B5): tarjetas generadas por reglas desde su
 *  texto. Por defecto se califican con dos botones, Error / Acierto (Otra vez
 *  y Bien en FSRS); "Más opciones" muestra los cuatro (Otra vez / Difícil /
 *  Bien / Fácil) con el tiempo en que vuelve cada tarjeta. La repetición
 *  espaciada es FSRS (services/fsrs.ts) y las que fallas reaparecen unas
 *  tarjetas más adelante. La pista (primeras palabras de la respuesta, sin IA)
 *  baja un acierto a "Difícil". */
export function RepasoApunte({ apunte, mazo, onCerrar }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const estados = useStore((s) => s.repasoApuntes)
  const registrar = useStore((s) => s.registrarRepasoTarjeta)
  const tarjetas = useMemo(() => (mazo ? mazo.tarjetas : apunte ? generarTarjetas(apunte) : []), [apunte, mazo])
  const titulo = mazo?.titulo ?? apunte?.titulo ?? ''
  const pendientesAlInicio = useMemo(
    () => tarjetas.filter((t) => estaPendiente(useStore.getState().repasoApuntes[t.id])).length,
    [tarjetas]
  )

  const [cola, setCola] = useState<TarjetaRepaso[]>(() =>
    // un apunte parte por lo que toca hoy; un mazo filtrado trae justo lo que se pidió (aunque no toque hoy)
    ordenarParaSesion(tarjetas, useStore.getState().repasoApuntes, !mazo).slice(0, TARJETAS_POR_SESION)
  )
  const [indice, setIndice] = useState(0)
  const [volteada, setVolteada] = useState(false)
  const [sabidas, setSabidas] = useState<Set<string>>(() => new Set())
  const [falladas, setFalladas] = useState<Set<string>>(() => new Set())
  // Cada respuesta se registra en FSRS (una fallada que luego aciertas sale
  // del aprendizaje). Para el resumen solo cuenta la PRIMERA de cada tarjeta.
  const [vistas, setVistas] = useState<Set<string>>(() => new Set())
  const [cuatroBotones, setCuatroBotones] = useState(leerCuatroBotones)
  // Pista de la tarjeta actual (0 = sin pista). Si se usó, la respuesta cuenta como "Difícil" como máximo.
  const [nivelPista, setNivelPista] = useState(0)

  const actual = cola[indice]
  const terminado = indice >= cola.length

  const intervalos = useMemo(() => (actual ? textosIntervalo(aEstadoFSRS(estados[actual.id])) : null), [actual, estados])

  const pista = useMemo(() => (actual ? pistaDe(actual.reverso, nivelPista) : { texto: '', hayMas: false }), [actual, nivelPista])

  const pedirPista = () => {
    if (!actual || volteada) return
    if (nivelPista === 0 || pista.hayMas) {
      if (nivelPista === 0) registrarUso('repaso.pista')
      setNivelPista((n) => n + 1)
    }
  }

  const alternarBotones = () => {
    const nuevo = !cuatroBotones
    if (nuevo) registrarUso('repaso.cuatroBotones')
    setCuatroBotones(nuevo)
    try {
      localStorage.setItem(CLAVE_CUATRO_BOTONES, nuevo ? '1' : '0')
    } catch {
      /* sin almacenamiento: la preferencia vale solo para esta sesión */
    }
  }

  const responder = (notaElegida: NotaRepaso) => {
    if (!actual || !volteada) return
    registrarUso('repaso.respuesta')
    const usoPista = nivelPista > 0
    // con pista no se puede decir "Bien" ni "Fácil": cuenta como "Difícil" (se acordó con ayuda)
    const nota: NotaRepaso = usoPista && notaElegida > 2 ? 2 : notaElegida
    const primera = !vistas.has(actual.id)
    registrar(actual.id, nota)
    if (primera) setVistas((s) => new Set(s).add(actual.id))
    setNivelPista(0)
    if (nota > 1) {
      if (primera && !usoPista) setSabidas((s) => new Set(s).add(actual.id))
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
    setVistas(new Set())
    setNivelPista(0)
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
      } else if (e.key === 'ArrowLeft') responder(1)
      else if (e.key === 'ArrowRight') responder(3)
      else if (e.key === 'p' || e.key === 'P') pedirPista()
      else if (e.key >= '1' && e.key <= '4') responder(Number(e.key) as NotaRepaso)
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
      aria-label={`Repaso: ${titulo}`}
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
          <p className={`text-sm font-semibold truncate ${texto}`}>Repaso · {titulo}</p>
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
            <p className={`text-base font-semibold mb-2 ${texto}`}>{mazo ? 'No hay tarjetas con estos filtros' : 'Este apunte aún no tiene tarjetas'}</p>
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
              Recordaste {sabidas.size} de {unicas} a la primera
              {falladas.size > 0 ? ` · ${falladas.size} para reforzar (vuelve${falladas.size === 1 ? '' : 'n'} pronto)` : ''}
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
            <PistaGesto id="deslizar-tarjeta" activa={esPantallaTactil() && volteada} texto="Desliza la tarjeta: izquierda «Error», derecha «Acierto», arriba «Fácil»" />
            <TarjetaDeslizable
              key={`${actual.id}-${indice}`}
              habilitada={volteada}
              etiquetas={{
                izquierda: { texto: 'Error', color: '#dc2626' },
                derecha: { texto: nivelPista > 0 ? 'Difícil' : 'Acierto', color: nivelPista > 0 ? '#d97706' : '#16a34a' },
                arriba: { texto: nivelPista > 0 ? 'Difícil' : 'Fácil', color: nivelPista > 0 ? '#d97706' : '#0284c7' },
              }}
              onResponder={(dir: DireccionTarjeta) => responder(dir === 'izquierda' ? 1 : dir === 'derecha' ? 3 : 4)}
            >
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
                  {!volteada && nivelPista > 0 && pista.texto && (
                    <p className={`mt-4 text-sm italic leading-relaxed font-serif ${suave}`}>
                      <span className="not-italic font-semibold">Pista: </span>
                      {pista.texto}
                    </p>
                  )}
                  {!volteada && <span className={`mt-4 text-xs ${suave}`}>Toca o presiona Espacio para ver la respuesta</span>}
                </motion.button>
              </AnimatePresence>
            </TarjetaDeslizable>

            {/* Pista (solo antes de voltear): las primeras palabras de la respuesta, sin IA. Ocupa siempre su lugar para que nada salte al voltear. */}
            <div className={`flex justify-center mt-3 ${volteada ? 'invisible' : ''}`} aria-hidden={volteada}>
              <button
                onClick={pedirPista}
                disabled={volteada || (nivelPista > 0 && !pista.hayMas)}
                className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold border flex items-center gap-2 transition-opacity disabled:opacity-40 ${
                  modoOscuro ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-white'
                }`}
              >
                <i className="ti ti-bulb text-base" aria-hidden />
                {nivelPista === 0 ? 'Pista' : pista.hayMas ? 'Otra pista' : 'Sin más pistas'}
              </button>
            </div>

            <div className={`grid gap-2 sm:gap-3 mt-3 ${cuatroBotones ? 'grid-cols-4' : 'grid-cols-2'}`}>
              {(cuatroBotones
                ? ([
                    [1, 'Otra vez', modoOscuro ? 'border-red-900 text-red-300 hover:bg-red-950/40' : 'border-red-200 text-red-700 hover:bg-red-50'],
                    [2, 'Difícil', modoOscuro ? 'border-amber-900 text-amber-300 hover:bg-amber-950/40' : 'border-amber-200 text-amber-700 hover:bg-amber-50'],
                    [3, 'Bien', modoOscuro ? 'border-emerald-900 text-emerald-300 hover:bg-emerald-950/40' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'],
                    [4, 'Fácil', modoOscuro ? 'border-sky-900 text-sky-300 hover:bg-sky-950/40' : 'border-sky-200 text-sky-700 hover:bg-sky-50'],
                  ] as [NotaRepaso, string, string][])
                : ([
                    [1, 'Error', modoOscuro ? 'border-red-900 text-red-300 hover:bg-red-950/40' : 'border-red-200 text-red-700 hover:bg-red-50'],
                    [3, 'Acierto', modoOscuro ? 'border-emerald-900 text-emerald-300 hover:bg-emerald-950/40' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'],
                  ] as [NotaRepaso, string, string][])
              ).map(([nota, nombre, color]) => (
                <button
                  key={nota}
                  onClick={() => responder(nota)}
                  disabled={!volteada}
                  className={`min-h-[56px] rounded-xl text-sm font-semibold border transition-opacity disabled:opacity-40 flex flex-col items-center justify-center ${color}`}
                >
                  {nombre}
                  {cuatroBotones && <span className="text-[11px] font-normal opacity-80 tabular-nums">{intervalos?.[nivelPista > 0 && nota > 2 ? 2 : nota]}</span>}
                </button>
              ))}
            </div>
            {volteada && nivelPista > 0 && (
              <p className={`text-center text-[11px] mt-2 ${suave}`}>Usaste pista: un acierto cuenta como «Difícil» y la tarjeta vuelve antes.</p>
            )}
            <button onClick={alternarBotones} className={`block mx-auto mt-2 min-h-[44px] px-3 text-xs underline underline-offset-2 ${suave}`}>
              {cuatroBotones ? 'Solo Error / Acierto' : 'Más opciones: Difícil, Fácil y tiempos'}
            </button>
            <p className={`sm:hidden text-center text-[11px] mt-1 ${suave}`}>
              {volteada ? 'Desliza la tarjeta: ← error · → acierto · ↑ fácil' : 'Toca la tarjeta para ver la respuesta'}
            </p>
            <p className={`hidden sm:block text-center text-[11px] mt-1 ${suave}`}>
              Espacio: voltear · P pista · 1 Error · 3 Acierto · 2 Difícil · 4 Fácil · Esc: salir
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

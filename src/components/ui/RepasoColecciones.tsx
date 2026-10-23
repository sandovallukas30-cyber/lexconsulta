import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { obtenerCodigo, precargar } from '../../services/codigos'
import { nombreCortoMetadata } from '../../data/codigosMetadata'
import { TarjetaDeslizable } from './TarjetaDeslizable'
import type { CodigoTipo } from '../../types'

const VERDE = 'var(--accent-base)'
/** Sesiones cortas: más de 20 seguidas cansan y se abandona a la mitad. */
const POR_SESION = 20

interface Pendiente {
  coleccionId: string
  coleccion: string
  codigo: CodigoTipo
  articulo: string
}

/** Repaso de los artículos de tus Colecciones que hoy te tocan (repetición espaciada de 5 cajas).
 *  La tarjeta muestra el número del artículo: intenta recordar qué dice, tócala para verlo y deslízala
 *  a la derecha si lo sabías o a la izquierda si no. */
export function RepasoColecciones({ onVolver }: { onVolver: () => void }) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const registrar = useStore((s) => s.registrarRepaso)

  // se arma una sola vez al entrar: al responder, `proximoRepaso` cambia y la lista no debe moverse
  const [cola] = useState<Pendiente[]>(() => {
    const ahora = Date.now()
    const todos: (Pendiente & { caja: number; vence: number })[] = []
    for (const c of useStore.getState().colecciones) {
      for (const a of c.articulos) {
        if (a.proximoRepaso && a.proximoRepaso > ahora) continue
        todos.push({ coleccionId: c.id, coleccion: c.titulo, codigo: a.codigo, articulo: a.articulo, caja: a.caja ?? 1, vence: a.proximoRepaso ?? 0 })
      }
    }
    // primero las cajas bajas (lo que peor sabes) y las más atrasadas
    todos.sort((p, q) => p.caja - q.caja || p.vence - q.vence)
    return todos.slice(0, POR_SESION)
  })
  const [, forzar] = useState(0)
  useEffect(() => {
    const codigos = [...new Set(cola.map((p) => p.codigo))].filter((c) => !obtenerCodigo(c))
    if (codigos.length) void precargar(codigos).then(() => forzar((n) => n + 1))
  }, [cola])

  const [indice, setIndice] = useState(0)
  const [volteada, setVolteada] = useState(false)
  const [sabidas, setSabidas] = useState(0)
  const actual = cola[indice]
  const terminado = indice >= cola.length
  const texto = actual ? (obtenerCodigo(actual.codigo)?.articulos.find((a) => a.a === actual.articulo)?.t ?? '') : ''

  const responder = (sabia: boolean) => {
    if (!actual || !volteada) return
    registrar(actual.coleccionId, { codigo: actual.codigo, articulo: actual.articulo }, sabia ? 'sabia' : 'no_sabia')
    if (sabia) setSabidas((n) => n + 1)
    setVolteada(false)
    setIndice((i) => i + 1)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onVolver()
      if (terminado) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setVolteada((v) => !v)
      } else if (e.key === 'ArrowLeft') responder(false)
      else if (e.key === 'ArrowRight') responder(true)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const tx = modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'

  return (
    <div className={`h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className={`flex items-center gap-3 px-4 sm:px-6 py-3 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <button
          onClick={onVolver}
          aria-label="Volver al área de práctica"
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
        >
          <i className="ti ti-arrow-left text-lg" />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${tx}`}>Repaso de colecciones</p>
          <p className={`text-[11px] ${suave}`}>
            {cola.length} artículo{cola.length === 1 ? '' : 's'} para hoy
          </p>
        </div>
        {!terminado && cola.length > 0 && (
          <span className={`text-xs font-medium tabular-nums ${suave}`}>
            {indice + 1} / {cola.length}
          </span>
        )}
      </div>
      <div className={`h-1 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-200'}`} aria-hidden>
        <div className="h-full transition-[width] duration-200" style={{ width: `${cola.length ? (indice / cola.length) * 100 : 0}%`, background: VERDE }} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
        {cola.length === 0 ? (
          <div className={`max-w-md text-center text-sm leading-relaxed ${suave}`}>
            <i className="ti ti-circle-check text-5xl mb-3 inline-block" style={{ color: VERDE }} />
            <p className={`text-base font-semibold mb-1 ${tx}`}>No tienes nada por repasar hoy</p>
            <p>Guarda artículos en una Colección desde el Explorador: aquí aparecerán cuando les toque repasarse.</p>
          </div>
        ) : terminado ? (
          <div className="max-w-md w-full text-center">
            <i className="ti ti-circle-check text-5xl mb-3 inline-block" style={{ color: VERDE }} />
            <p className={`text-xl font-serif font-bold mb-1 ${tx}`}>¡Repaso terminado!</p>
            <p className={`text-sm mb-6 ${suave}`}>
              Recordaste {sabidas} de {cola.length}
              {sabidas < cola.length ? ` · ${cola.length - sabidas} vuelve${cola.length - sabidas === 1 ? '' : 'n'} mañana` : ''}
            </p>
            <button onClick={onVolver} className="px-5 min-h-[44px] rounded-lg text-sm font-medium text-white" style={{ background: VERDE }}>
              Listo
            </button>
          </div>
        ) : (
          <div className="w-full max-w-xl">
            <TarjetaDeslizable
              key={`${actual.coleccionId}-${actual.codigo}-${actual.articulo}`}
              habilitada={volteada}
              ejes="x"
              etiquetas={{ izquierda: { texto: 'Otra vez', color: '#dc2626' }, derecha: { texto: 'La sabía', color: '#16a34a' } }}
              onResponder={(dir) => responder(dir === 'derecha')}
            >
              <AnimatePresence mode="wait">
                <motion.button
                  key={String(volteada)}
                  initial={{ opacity: 0, rotateX: -8 }}
                  animate={{ opacity: 1, rotateX: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setVolteada((v) => !v)}
                  aria-label={volteada ? 'Ver el frente de la tarjeta' : 'Ver el artículo'}
                  className={`w-full min-h-[260px] rounded-2xl border shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center ${
                    modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}
                >
                  <span className={`text-[11px] uppercase tracking-wider font-semibold mb-3 ${suave}`}>
                    {actual.coleccion}
                    {volteada ? ' · respuesta' : ''}
                  </span>
                  <p className="text-2xl sm:text-3xl font-serif font-bold" style={{ color: 'var(--accent-texto)' }}>
                    {actual.articulo}
                  </p>
                  <p className={`text-sm font-semibold ${suave}`}>{nombreCortoMetadata(actual.codigo)}</p>
                  {volteada ? (
                    <p className={`mt-4 text-base leading-relaxed whitespace-pre-line font-serif text-left max-h-[40vh] overflow-y-auto touch-pan-y ${tx}`}>
                      {texto || 'Cargando el texto…'}
                    </p>
                  ) : (
                    <span className={`mt-5 text-xs ${suave}`}>¿Qué dice? Intenta recordarlo y toca para verlo</span>
                  )}
                </motion.button>
              </AnimatePresence>
            </TarjetaDeslizable>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4">
              <button
                onClick={() => responder(false)}
                disabled={!volteada}
                className={`min-h-[52px] rounded-xl text-sm font-semibold border transition-opacity disabled:opacity-40 ${
                  modoOscuro ? 'border-red-900 text-red-300 hover:bg-red-950/40' : 'border-red-200 text-red-700 hover:bg-red-50'
                }`}
              >
                Otra vez
                <span className="block text-[11px] font-normal opacity-80">mañana</span>
              </button>
              <button
                onClick={() => responder(true)}
                disabled={!volteada}
                className={`min-h-[52px] rounded-xl text-sm font-semibold border transition-opacity disabled:opacity-40 ${
                  modoOscuro ? 'border-emerald-900 text-emerald-300 hover:bg-emerald-950/40' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                La sabía
                <span className="block text-[11px] font-normal opacity-80">sube de caja</span>
              </button>
            </div>
            <p className={`text-center text-[11px] mt-3 ${suave}`}>
              {volteada ? 'Desliza la tarjeta: ← otra vez · → la sabía' : 'Toca la tarjeta para ver el artículo'}
              <span className="hidden sm:inline"> · Espacio: voltear · ← → responder · Esc: salir</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

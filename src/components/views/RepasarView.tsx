import { lazy, Suspense, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useRepaso } from '../../hooks/useRepaso'
import { SesionRepaso } from '../ui/SesionRepaso'
import { avisar } from '../../store/useAvisos'
import { completarTextos, construirCola, nombreRamo, pendientesAhora, PREGUNTAS_POR_DIA, TARJETAS_POR_SESION, type ItemRepaso } from '../../services/repaso'
import { diasHasta, formatearCountdown } from '../../services/modulosAcademico'

// Los juegos (Pasapalabra, El Acusado, Quiz) siguen siendo la misma pantalla de
// siempre, ahora como una pestaña de Repasar: se bajan solo al abrirla.
const PracticaView = lazy(() => import('./PracticaView').then((m) => ({ default: m.PracticaView })))

interface SesionAbierta {
  titulo: string
  subtitulo?: string
  items: ItemRepaso[]
  ramoId?: string | null
  intensivo?: boolean
}

export function RepasarView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const tab = useStore((s) => s.repasarTab)
  const setTab = useStore((s) => s.setRepasarTab)

  const base = modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'
  return (
    <div className={`h-full flex flex-col ${base}`}>
      <div className={`flex-shrink-0 border-b px-4 sm:px-6 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div role="tablist" aria-label="Repasar" className="max-w-4xl mx-auto flex gap-1">
          {([
            ['cola', 'Cola de hoy', 'ti-repeat'],
            ['juegos', 'Juegos', 'ti-puzzle'],
          ] as const).map(([id, label, icono]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault()
                  setTab(id === 'cola' ? 'juegos' : 'cola')
                }
              }}
              className={`flex items-center gap-1.5 px-3 min-h-[44px] text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === id ? 'border-current' : `border-transparent ${modoOscuro ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`
              }`}
              style={tab === id ? { color: 'var(--accent-texto)' } : undefined}
            >
              <i className={`ti ${icono} text-base`} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {tab === 'cola' ? (
          <ColaDeHoy />
        ) : (
          <Suspense fallback={<div className="h-full" aria-busy="true" aria-label="Cargando" />}>
            <PracticaView />
          </Suspense>
        )}
      </div>
    </div>
  )
}

function ColaDeHoy() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const ramos = useStore((s) => s.ramos)
  const academicoModulos = useStore((s) => s.academicoModulos)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const { items, resumen } = useRepaso()
  const [sesion, setSesion] = useState<SesionAbierta | null>(null)
  const [preparando, setPreparando] = useState(false)

  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  const texto = modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
  const tarjeta = `rounded-panel border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200 shadow-tarjeta'}`

  // ramos que tienen algo repasable, con cuánto toca hoy y su próxima evaluación
  const porRamo = useMemo(() => {
    const ids = new Set<string | null>(items.map((i) => i.ramoId))
    return [...ids]
      .map((id) => {
        const suyas = items.filter((i) => i.ramoId === id)
        const evals = (id ? academicoModulos[id]?.evaluaciones ?? [] : [])
          .filter((e) => e.nota === null && e.fecha)
          .map((e) => ({ nombre: e.nombre, dias: diasHasta(e.fecha) }))
          .filter((e) => e.dias >= 0)
          .sort((a, b) => a.dias - b.dias)
        return { id, nombre: nombreRamo(id, ramos), total: suyas.length, hoy: resumen.porRamo[id ?? ''] ?? 0, proxima: evals[0] }
      })
      .sort((a, b) => b.hoy - a.hoy || (a.proxima?.dias ?? 1e9) - (b.proxima?.dias ?? 1e9) || a.nombre.localeCompare(b.nombre))
  }, [items, resumen, academicoModulos, ramos])

  const empezar = async (opts: { ramoId?: string | null; intensivo?: boolean; titulo: string }) => {
    setPreparando(true)
    try {
      const cola = construirCola(items, { ramoId: opts.ramoId, intensivo: opts.intensivo, limite: TARJETAS_POR_SESION })
      if (cola.length === 0) {
        avisar.info('No hay nada para repasar ahí por ahora.')
        return
      }
      const listos = await completarTextos(cola)
      setSesion({
        titulo: opts.titulo,
        subtitulo: opts.intensivo ? 'Modo examen: todo el ramo, lo atrasado primero' : `${cola.length} para hoy`,
        items: listos,
        ramoId: opts.ramoId,
        intensivo: opts.intensivo,
      })
    } catch {
      avisar.error('No se pudo preparar el repaso. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setPreparando(false)
    }
  }

  // lo que sigue tocando, ya con el estado actualizado, para "Seguir"
  const pendientes = useMemo(() => {
    if (!sesion) return undefined
    return () => pendientesAhora({ ramoId: sesion.ramoId, lote: TARJETAS_POR_SESION })
  }, [sesion])

  const sinNada = resumen.existentes === 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {sinNada ? (
          <div className={`${tarjeta} p-6 sm:p-8 text-center`}>
            <i className="ti ti-cards text-4xl mb-3 inline-block" style={{ color: 'var(--accent-texto)' }} aria-hidden />
            <h1 className={`text-xl font-serif font-bold mb-2 ${texto}`}>Aquí se junta todo lo que tienes que repasar</h1>
            <p className={`text-sm max-w-md mx-auto mb-5 ${suave}`}>
              Todavía no hay nada. Las tarjetas salen de tres lugares y se programan solas con repetición espaciada:
            </p>
            <ul className={`text-sm text-left max-w-md mx-auto space-y-2 mb-6 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
              <li><i className="ti ti-notebook mr-2" aria-hidden /><strong>Apuntes:</strong> escribe «- **Término:** definición» o un recuadro 🎯 y se vuelve tarjeta.</li>
              <li><i className="ti ti-book-2 mr-2" aria-hidden /><strong>Artículos:</strong> los que guardes en una colección se repasan recitándolos.</li>
              <li><i className="ti ti-help-circle mr-2" aria-hidden /><strong>Preguntas:</strong> {PREGUNTAS_POR_DIA} al día del banco de práctica.</li>
            </ul>
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => setVistaActiva('modulos')} className="boton boton-primario">
                <i className="ti ti-notebook" aria-hidden /> Ir a mis apuntes
              </button>
              <button onClick={() => setVistaActiva('explorador')} className="boton boton-borde">
                <i className="ti ti-book-2" aria-hidden /> Explorar códigos
              </button>
            </div>
          </div>
        ) : (
          <div className={`${tarjeta} p-5 sm:p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <h1 className={`text-sm font-semibold mb-1 ${suave}`}>Para repasar hoy</h1>
                {resumen.total > 0 ? (
                  <>
                    <p className={`text-4xl font-serif font-bold ${texto}`}>
                      {resumen.total} <span className={`text-base font-sans font-medium ${suave}`}>· ~{resumen.minutos} min</span>
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {([
                        ['apunte', 'ti-notebook', 'tarjeta de apuntes', 'tarjetas de apuntes'],
                        ['articulo', 'ti-book-2', 'artículo', 'artículos'],
                        ['pregunta', 'ti-help-circle', 'pregunta', 'preguntas'],
                      ] as const).map(([o, icono, uno, varios]) =>
                        resumen.porOrigen[o] > 0 ? (
                          <span key={o} className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${modoOscuro ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-100 text-zinc-700'}`}>
                            <i className={`ti ${icono}`} aria-hidden /> {resumen.porOrigen[o]} {resumen.porOrigen[o] === 1 ? uno : varios}
                          </span>
                        ) : null
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className={`text-2xl font-serif font-bold ${texto}`}>Estás al día</p>
                    <p className={`text-sm mt-1 ${suave}`}>
                      No hay nada vencido. Lo próximo vuelve cuando le toque; mientras tanto puedes jugar o repasar un ramo en modo examen.
                    </p>
                  </>
                )}
              </div>
              {resumen.total > 0 && (
                <button
                  onClick={() => empezar({ titulo: 'Repaso de hoy' })}
                  disabled={preparando}
                  className="boton boton-primario min-h-[52px] px-6 text-base"
                >
                  {preparando ? <i className="ti ti-loader-2 animate-spin" aria-hidden /> : <i className="ti ti-player-play" aria-hidden />}
                  {preparando ? 'Preparando…' : 'Empezar'}
                </button>
              )}
            </div>
          </div>
        )}

        {porRamo.length > 0 && (
          <section aria-labelledby="repasar-por-ramo">
            <h2 id="repasar-por-ramo" className={`text-sm font-semibold mb-3 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Por ramo
            </h2>
            <div className="space-y-2">
              {porRamo.map((r) => (
                <div key={r.id ?? 'sin'} className={`${tarjeta} p-3 sm:p-4 flex flex-wrap items-center gap-3`}>
                  <div className="flex-1 min-w-[10rem]">
                    <p className={`text-sm font-medium ${texto}`}>{r.nombre}</p>
                    <p className={`text-xs ${suave}`}>
                      {r.hoy > 0 ? `${r.hoy} para hoy` : 'al día'} · {r.total} en total
                      {r.proxima && ` · ${r.proxima.nombre}: ${formatearCountdown(r.proxima.dias).toLowerCase()}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {r.hoy > 0 && (
                      <button onClick={() => empezar({ ramoId: r.id, titulo: `Repaso · ${r.nombre}` })} disabled={preparando} className="boton boton-borde boton-chico">
                        Repasar
                      </button>
                    )}
                    <button
                      onClick={() => empezar({ ramoId: r.id, intensivo: true, titulo: `Modo examen · ${r.nombre}` })}
                      disabled={preparando}
                      title="Todo lo de este ramo, vencido o no: lo atrasado y lo más fallado primero"
                      className="boton boton-suave boton-chico"
                    >
                      <i className="ti ti-flame" aria-hidden /> Modo examen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {sesion && (
          <SesionRepaso
            titulo={sesion.titulo}
            subtitulo={sesion.subtitulo}
            items={sesion.items}
            pendientes={pendientes}
            onCerrar={() => setSesion(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}


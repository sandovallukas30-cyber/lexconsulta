import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useRepaso } from '../../hooks/useRepaso'
import { ProximasEvaluaciones } from '../ui/ProximosEventos'
import { calcularRachaEstudio } from '../../services/actividadEstudio'
import { nombreCortoMetadata } from '../../data/codigosMetadata'
import { nombreRamo } from '../../services/repaso'
import type { ApunteModulo, DatosAcademicosModulo } from '../../types'

function saludo(hora: number): string {
  if (hora < 6) return 'Buenas noches'
  if (hora < 13) return 'Buenos días'
  if (hora < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function ultimoApunteLeido(
  posicionLectura: Record<string, { ratio: number; fecha: number }>,
  academicoModulos: Record<string, DatosAcademicosModulo>
): { moduloId: string; apunte: ApunteModulo; ratio: number } | null {
  const recientes = Object.entries(posicionLectura).sort((a, b) => b[1].fecha - a[1].fecha)
  for (const [id, pos] of recientes) {
    for (const [moduloId, d] of Object.entries(academicoModulos)) {
      const apunte = d.apuntes.find((a) => a.id === id)
      if (apunte) return { moduloId, apunte, ratio: pos.ratio }
    }
  }
  return null
}

/** Portada: lo que hay que hacer HOY, reunido en un solo lugar. Antes esto
 *  estaba repartido entre Módulos (evaluaciones), Colecciones (tarjetas) y
 *  cada apunte (dónde quedaste). */
export function HoyView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const ramos = useStore((s) => s.ramos)
  const academicoModulos = useStore((s) => s.academicoModulos)
  const colecciones = useStore((s) => s.colecciones)
  const posicionLectura = useStore((s) => s.posicionLectura)
  const diasActividad = useStore((s) => s.diasActividadEstudio)
  const codigoExplorador = useStore((s) => s.codigoExploradorActivo)
  const ultimoArticulo = useStore((s) => s.ultimoArticuloExplorador)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const abrirApunte = useStore((s) => s.abrirApunte)
  const abrirArticulo = useStore((s) => s.abrirArticuloEnExplorador)
  const { resumen } = useRepaso()
  const [ahora] = useState(() => new Date())

  const texto = modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  const tarjeta = `rounded-panel border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200 shadow-tarjeta'}`
  const racha = calcularRachaEstudio(diasActividad)

  // el apunte que se estaba leyendo (el último con posición guardada)
  const retomar = ultimoApunteLeido(posicionLectura, academicoModulos)

  const articuloPendiente = codigoExplorador && ultimoArticulo[codigoExplorador] ? { codigo: codigoExplorador, articulo: ultimoArticulo[codigoExplorador]! } : null

  const nApuntes = Object.values(academicoModulos).reduce((n, d) => n + d.apuntes.length, 0)
  const esNuevo = ramos.length === 0 && nApuntes === 0 && colecciones.length === 0

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-serif font-bold ${texto}`}>{saludo(ahora.getHours())}</h1>
            <p className={`text-sm mt-1 ${suave}`}>
              {ahora.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {racha > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-control flex-shrink-0 ${modoOscuro ? 'bg-orange-500/15' : 'bg-orange-50'}`} title="Días seguidos estudiando">
              <i className="ti ti-flame text-lg text-orange-500" aria-hidden />
              <span className={`text-sm font-semibold ${modoOscuro ? 'text-orange-300' : 'text-orange-700'}`}>
                {racha} {racha === 1 ? 'día' : 'días'}
              </span>
            </div>
          )}
        </header>

        {esNuevo && (
          <section className={`${tarjeta} p-5 sm:p-6`} aria-labelledby="hoy-empezar">
            <h2 id="hoy-empezar" className={`text-lg font-serif font-bold mb-1 ${texto}`}>Empecemos</h2>
            <p className={`text-sm mb-4 ${suave}`}>Prima Lex junta tus ramos, apuntes, artículos y repaso. Tres pasos para partir:</p>
            <ol className="grid sm:grid-cols-3 gap-3">
              {([
                ['1', 'Crea un ramo', 'Con sus clases, evaluaciones y apuntes.', 'modulos', 'ti-school'],
                ['2', 'Explora un código', 'Lee, busca y guarda artículos.', 'explorador', 'ti-book-2'],
                ['3', 'Pregunta a la IA', 'Con los artículos como respaldo.', 'consultar', 'ti-messages'],
              ] as const).map(([n, titulo, desc, vista, icono]) => (
                <li key={n}>
                  <button
                    onClick={() => setVistaActiva(vista)}
                    className={`w-full h-full text-left p-4 rounded-tarjeta border transition-colors ${modoOscuro ? 'border-zinc-700 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-50'}`}
                  >
                    <i className={`ti ${icono} text-xl mb-2 inline-block`} style={{ color: 'var(--accent-texto)' }} aria-hidden />
                    <p className={`text-sm font-semibold ${texto}`}>{n}. {titulo}</p>
                    <p className={`text-xs mt-0.5 ${suave}`}>{desc}</p>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}

        {!esNuevo && (
          <section className={`${tarjeta} p-5 sm:p-6`} aria-labelledby="hoy-repasar">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <h2 id="hoy-repasar" className={`text-sm font-semibold mb-1 ${suave}`}>Para repasar hoy</h2>
                {resumen.total > 0 ? (
                  <p className={`text-3xl font-serif font-bold ${texto}`}>
                    {resumen.total} <span className={`text-base font-sans font-medium ${suave}`}>· ~{resumen.minutos} min</span>
                  </p>
                ) : resumen.existentes > 0 ? (
                  <p className={`text-xl font-serif font-bold ${texto}`}>Estás al día</p>
                ) : (
                  <p className={`text-sm ${suave}`}>Aún no hay tarjetas: se crean desde tus apuntes, tus artículos guardados y el banco de preguntas.</p>
                )}
              </div>
              <button onClick={() => setVistaActiva('repasar')} className={`boton ${resumen.total > 0 ? 'boton-primario' : 'boton-borde'} min-h-[48px] px-5`}>
                <i className={`ti ${resumen.total > 0 ? 'ti-player-play' : 'ti-repeat'}`} aria-hidden />
                {resumen.total > 0 ? 'Repasar ahora' : 'Abrir Repasar'}
              </button>
            </div>
          </section>
        )}

        {(retomar || articuloPendiente) && (
          <section aria-labelledby="hoy-retomar">
            <h2 id="hoy-retomar" className={`text-sm font-semibold mb-3 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Retomar</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {retomar && (
                <button
                  onClick={() => abrirApunte(retomar.moduloId, retomar.apunte.id)}
                  className={`${tarjeta} p-4 text-left flex items-center gap-3 transition-colors ${modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
                >
                  <i className="ti ti-notebook text-xl flex-shrink-0" style={{ color: 'var(--accent-texto)' }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${texto}`}>{retomar.apunte.titulo}</p>
                    <p className={`text-xs truncate ${suave}`}>
                      {nombreRamo(retomar.moduloId, ramos)} · vas en el {Math.round(retomar.ratio * 100)}%
                    </p>
                  </div>
                  <i className={`ti ti-chevron-right ${suave}`} aria-hidden />
                </button>
              )}
              {articuloPendiente && (
                <button
                  onClick={() => abrirArticulo(articuloPendiente.codigo, articuloPendiente.articulo)}
                  className={`${tarjeta} p-4 text-left flex items-center gap-3 transition-colors ${modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
                >
                  <i className="ti ti-book-2 text-xl flex-shrink-0" style={{ color: 'var(--accent-texto)' }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${texto}`}>{articuloPendiente.articulo}</p>
                    <p className={`text-xs truncate ${suave}`}>Seguir leyendo · {nombreCortoMetadata(articuloPendiente.codigo)}</p>
                  </div>
                  <i className={`ti ti-chevron-right ${suave}`} aria-hidden />
                </button>
              )}
            </div>
          </section>
        )}

        <ProximasEvaluaciones modoOscuro={modoOscuro} onAbrir={(moduloId, tab, evaluacionId) => useStore.getState().abrirModuloEn(moduloId, tab, evaluacionId)} />

        <section aria-labelledby="hoy-atajos">
          <h2 id="hoy-atajos" className={`text-sm font-semibold mb-3 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Ir a</h2>
          <div className="flex flex-wrap gap-2">
            {([
              ['consultar', 'ti-messages', 'Preguntar a la IA'],
              ['plazos', 'ti-calendar-time', 'Calcular un plazo'],
              ['situacion', 'ti-list-numbers', 'Analizar una situación'],
              ['modulos', 'ti-school', 'Mis ramos'],
              ['explorador', 'ti-book-2', 'Códigos'],
            ] as const).map(([vista, icono, label]) => (
              <button key={vista} onClick={() => setVistaActiva(vista)} className="boton boton-borde">
                <i className={`ti ${icono}`} aria-hidden /> {label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

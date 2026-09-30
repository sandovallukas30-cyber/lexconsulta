import type { SesionClase, EvaluacionModulo, TextoObligatorio, ApunteModulo, BriefCaso, Coleccion, Canvas, MapaMental } from '../../../types'
import { diasHasta, formatearCountdown } from '../../../services/modulosAcademico'
import { VERDE, type Tab } from './utilidades'

export function TabResumen({
  datos, modoOscuro, onIrA, colecciones, onAbrirColeccion,
  canvases, canvasesDisponibles, onAbrirCanvas, onVincularCanvas,
  mapas, mapasDisponibles, onAbrirMapa, onVincularMapa,
}: {
  datos: { clases: SesionClase[]; evaluaciones: EvaluacionModulo[]; textos: TextoObligatorio[]; apuntes: ApunteModulo[]; briefs: BriefCaso[] }
  modoOscuro: boolean
  onIrA: (tab: Tab) => void
  colecciones: Coleccion[]
  onAbrirColeccion: (id: string) => void
  canvases: Canvas[]
  canvasesDisponibles: Canvas[]
  onAbrirCanvas: (id: string) => void
  onVincularCanvas: (id: string) => void
  mapas: MapaMental[]
  mapasDisponibles: MapaMental[]
  onAbrirMapa: (id: string) => void
  onVincularMapa: (id: string) => void
}) {
  const proximaClase = [...datos.clases]
    .filter((c) => !c.completada)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  const proximoExamen = [...datos.evaluaciones]
    .filter((e) => e.nota === null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  const textosLeidos = datos.textos.filter((t) => t.leido).length

  const tarjetas = [
    {
      tab: 'clases' as Tab,
      icono: 'ti-calendar-event',
      label: 'Clases',
      valor: `${datos.clases.length}`,
      detalle: proximaClase
        ? `Próxima: ${formatearCountdown(diasHasta(proximaClase.fecha)).toLowerCase()}`
        : datos.clases.length > 0
        ? 'Todas completadas'
        : 'Sin sesiones registradas',
    },
    {
      tab: 'examenes' as Tab,
      icono: 'ti-clipboard-check',
      label: 'Exámenes',
      valor: `${datos.evaluaciones.length}`,
      detalle: proximoExamen
        ? `${proximoExamen.nombre} · ${formatearCountdown(diasHasta(proximoExamen.fecha)).toLowerCase()}`
        : datos.evaluaciones.length > 0
        ? 'Todas calificadas'
        : 'Sin evaluaciones registradas',
    },
    { tab: 'textos' as Tab, icono: 'ti-books', label: 'Textos', valor: `${textosLeidos}/${datos.textos.length}`, detalle: 'leídos' },
    { tab: 'apuntes' as Tab, icono: 'ti-notes', label: 'Apuntes', valor: `${datos.apuntes.length}`, detalle: datos.apuntes.length === 1 ? 'apunte guardado' : 'apuntes guardados' },
    { tab: 'casos' as Tab, icono: 'ti-gavel', label: 'Casos', valor: `${datos.briefs.length}`, detalle: datos.briefs.length === 1 ? 'caso analizado' : 'casos analizados' },
  ]

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tarjetas.map((t) => (
          <button
            key={t.tab}
            onClick={() => onIrA(t.tab)}
            className={`text-left p-4 rounded-tarjeta border transition-colors ${
              modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <i className={`ti ${t.icono} text-base`} style={{ color: VERDE }} />
              <span className={`text-xs font-medium ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>{t.label}</span>
            </div>
            <div className={`text-xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{t.valor}</div>
            <div className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{t.detalle}</div>
          </button>
        ))}
      </div>

      {colecciones.length > 0 && (
        <div className="mt-6">
          <h2 className={`text-sm font-semibold mb-3 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Colecciones de este módulo
          </h2>
          <div className="space-y-2">
            {colecciones.map((c) => (
              <button
                key={c.id}
                onClick={() => onAbrirColeccion(c.id)}
                className={`w-full flex items-center justify-between gap-2 p-3 rounded-tarjeta border text-left transition-colors ${
                  modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <span className={`text-sm font-medium ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{c.titulo}</span>
                <span className={`text-xs flex-shrink-0 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {c.articulos.length} {c.articulos.length === 1 ? 'artículo' : 'artículos'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <VinculoModuloSeccion
        titulo="Canvas de este módulo"
        icono="ti-affiliate"
        vinculados={canvases.map((c) => ({ id: c.id, label: c.nombre }))}
        disponibles={canvasesDisponibles.map((c) => ({ id: c.id, label: c.nombre }))}
        placeholder="Vincular un Canvas existente..."
        onAbrir={onAbrirCanvas}
        onVincular={onVincularCanvas}
        modoOscuro={modoOscuro}
      />

      <VinculoModuloSeccion
        titulo="Mapas mentales de este módulo"
        icono="ti-hierarchy-2"
        vinculados={mapas.map((m) => ({ id: m.id, label: m.titulo }))}
        disponibles={mapasDisponibles.map((m) => ({ id: m.id, label: m.titulo }))}
        placeholder="Vincular un mapa mental existente..."
        onAbrir={onAbrirMapa}
        onVincular={onVincularMapa}
        modoOscuro={modoOscuro}
      />
    </div>
  )
}

/** Sección "X de este módulo" reutilizada por Canvas y Mapas mentales:
 *  lista lo ya vinculado (abre directo) y, si hay candidatos sin vincular,
 *  ofrece un select que vincula al elegir -- mismo patrón que Colecciones,
 *  pero estos dos sí necesitan una acción de vincular porque no se infieren
 *  de datos existentes (código relacionado) sino que se asignan a mano. */
function VinculoModuloSeccion({
  titulo, icono, vinculados, disponibles, placeholder, onAbrir, onVincular, modoOscuro,
}: {
  titulo: string
  icono: string
  vinculados: { id: string; label: string }[]
  disponibles: { id: string; label: string }[]
  placeholder: string
  onAbrir: (id: string) => void
  onVincular: (id: string) => void
  modoOscuro: boolean
}) {
  if (vinculados.length === 0 && disponibles.length === 0) return null
  return (
    <div className="mt-6">
      <h2 className={`text-sm font-semibold mb-3 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>{titulo}</h2>
      {vinculados.length > 0 && (
        <div className="space-y-2 mb-2">
          {vinculados.map((v) => (
            <button
              key={v.id}
              onClick={() => onAbrir(v.id)}
              className={`w-full flex items-center gap-2 p-3 rounded-tarjeta border text-left transition-colors ${
                modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <i className={`ti ${icono} text-sm flex-shrink-0`} style={{ color: VERDE }} />
              <span className={`text-sm font-medium truncate ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{v.label}</span>
            </button>
          ))}
        </div>
      )}
      {disponibles.length > 0 && (
        <select
          value=""
          onChange={(e) => { if (e.target.value) onVincular(e.target.value) }}
          className={`w-full rounded-control px-3 py-2 text-xs outline-none border campo-foco ${
            modoOscuro ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500'
          }`}
        >
          <option value="">{placeholder}</option>
          {disponibles.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      )}
    </div>
  )
}

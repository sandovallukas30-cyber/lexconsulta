import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Handle,
  Position,
  NodeToolbar,
  NodeResizer,
  EdgeLabelRenderer,
  BaseEdge,
  getBezierPath,
  MarkerType,
  ConnectionMode,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useStore } from '../../store/useStore'
import { eliminarMapaMentalConDeshacer } from '../../services/deshacer'
import type { MapaMental, NodoMapaMental, ConexionMapaMental, FormaNodoMental, TamanoTextoMental } from '../../types'
import { MAPAS_MENTALES_PLANTILLA } from '../../data/mapasMentalesPlantilla'
import { MenuCabeceraApunte, FilaMenuCabecera } from '../ui/MenuCabeceraApunte'
import { registrarUso } from '../../services/uso'
import { calcularLayoutMapaMental, elegirLadosConexion } from '../../services/layoutMapaMental'
import { crearMapaDesdeEsquema } from '../../services/mapaDesdeEsquema'
import { ModalApunteDesdeMapa } from '../ui/ModalApunteDesdeMapa'

// Inter solo para Mapas mentales (.fuente-mapa-mental). Va con la propia app
// (antes se pedía a Google Fonts, que recibía la IP de cada estudiante); como
// esta vista es lazy, la fuente no pesa en el arranque (C8).
import '@fontsource-variable/inter'
import { PanelConsultaArticulos } from '../ui/PanelConsultaArticulos'
import { avisar } from '../../store/useAvisos'
import { confirmar } from '../../services/confirmar'

const VERDE = 'var(--accent-base)'
/** Paleta CON significado fijo, no un selector de color libre: la idea es
 * que el color en sí diga algo al repasar el mapa de un vistazo, igual que
 * en un apunte de mano donde el rojo siempre marca "excepción" y no
 * cualquier cosa. `color: null` = "Neutro" (sin marcar, usa el acento de la
 * app) — es la opción para sacarle un color puesto por error. */
const PALETA_SEMANTICA: { color: string | null; nombre: string; significado: string }[] = [
  { color: null, nombre: 'Neutro', significado: 'Sin marcar (color por defecto)' },
  { color: '#1d4ed8', nombre: 'Azul', significado: 'Concepto o clasificación' },
  { color: '#15803d', nombre: 'Verde', significado: 'Regla general / lo permitido' },
  { color: '#b91c1c', nombre: 'Rojo', significado: 'Excepción, prohibición o riesgo' },
  { color: '#b45309', nombre: 'Ámbar', significado: 'Atención — punto clave' },
  { color: '#7e22ce', nombre: 'Morado', significado: 'Ejemplo o caso práctico' },
]
// Punta de flecha en las conexiones — sin esto eran solo líneas sin sentido
// de dirección, perdiendo justo el vocabulario visual (→, ↓) que el propio
// apunte de referencia usaba para mostrar jerarquía. Color neutro fijo (no
// depende de modoOscuro): el marcador se fija una vez al crear el edge, no
// se recalcula en cada render como el trazo de la línea sí hace.
const MARKER_FLECHA = { type: MarkerType.ArrowClosed, color: '#71717a', width: 18, height: 18 }

/**
 * Mapas mentales: diagrama libre de estudio (formas + jerarquía tipográfica +
 * conexiones), pensado para estructuras que NO son una colección de
 * artículos (ej. "atribuciones del presidente: administrativas,
 * gubernativas..."). Vista nueva y separada de Canvas a propósito — Canvas
 * ya tiene su propio motor maduro (mismo `@xyflow/react`) para relacionar
 * CONCEPTOS jurídicos con nodos semánticos (definición/caso/artículos); acá
 * el "tipo" de nodo es la FORMA VISUAL en sí (rectángulo/óvalo/nube/rombo),
 * que es lo que un mapa mental de apunte de mano necesita para distinguir
 * de un vistazo "esto es una categoría" de "esto es una subcategoría".
 *
 * v1 (formas + texto): sin artículos adjuntos todavía — se suma en una
 * próxima vuelta sobre esta misma base.
 */

// ============= NODE DATA =============

// `type` (no `interface`): React Flow exige que Node<T> satisfaga
// Record<string, unknown> estructuralmente — un type alias de objeto lo
// cumple, una interface con propiedades explícitas no (mismo patrón que
// NodoData en CanvasView.tsx).
type NodoData = {
  texto: string
  forma: FormaNodoMental
  tamanoTexto: TamanoTextoMental
  color?: string
  nota?: string
  /** Cita del artículo si el nodo es una ficha de artículo (ver NodoMapaMental.articulo). */
  articulo?: string
  /** Solo pantalla (no se guarda): el nodo entra directo en modo edición. */
  autoEditar?: boolean
}

interface NodoCallbacks {
  actualizar: (id: string, cambios: Partial<NodoData>) => void
  eliminar: (id: string) => void
  duplicar: (id: string) => void
  duplicarRama: (id: string) => void
  actualizarEtiqueta: (id: string, etiqueta: string) => void
}

interface MentalCtx {
  modoOscuro: boolean
  callbacks: NodoCallbacks
  /** Colapsar/expandir ramas — ver el useMemo de nodesVisibles/edgesVisibles
   * en MapaMentalDetalle. Puramente de pantalla (no se guarda con el mapa):
   * sirve para no tener que scrollear un mapa entero cuando solo hace falta
   * mirar una rama a la vez. */
  tieneHijos: (id: string) => boolean
  estaColapsado: (id: string) => boolean
  cantidadOcultosSi: (id: string) => number
  toggleColapsado: (id: string) => void
}

const MentalContext = createContext<MentalCtx | null>(null)
function useMentalCtx(): MentalCtx {
  const ctx = useContext(MentalContext)
  if (!ctx) throw new Error('MentalContext missing')
  return ctx
}

type NodoFlow = Node<NodoData>
type EdgeWithData = Edge

// ============= COMPONENT =============

export function MapasMentalesView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const mapas = useStore((s) => s.mapasMentales)
  const mapaActivoId = useStore((s) => s.mapaMentalActivoId)
  const crearMapaMental = useStore((s) => s.crearMapaMental)
  const setMapaMentalActivo = useStore((s) => s.setMapaMentalActivo)

  const mapaActivo = useMemo(() => mapas.find((m) => m.id === mapaActivoId) ?? null, [mapas, mapaActivoId])

  const usarPlantilla = (plantillaId: string) => {
    const plantilla = MAPAS_MENTALES_PLANTILLA.find((p) => p.id === plantillaId)
    if (!plantilla) return
    crearMapaDesdeEsquema({ titulo: plantilla.titulo, nodos: plantilla.nodos, conexiones: plantilla.conexiones, layout: plantilla.layoutInicial })
  }

  if (!mapaActivo) {
    return (
      <ListaMapas
        mapas={mapas}
        onAbrir={setMapaMentalActivo}
        onCrear={() => {
          const id = crearMapaMental('Nuevo mapa mental')
          setMapaMentalActivo(id)
        }}
        onUsarPlantilla={usarPlantilla}
        onEliminar={eliminarMapaMentalConDeshacer}
      />
    )
  }

  return (
    <MapaMentalDetalle
      key={mapaActivo.id}
      mapa={mapaActivo}
      modoOscuro={modoOscuro}
      onVolver={() => setMapaMentalActivo(null)}
    />
  )
}

// ============= LISTA =============

/** Miniatura de un mapa: sus nodos como cajitas y sus conexiones como líneas, sin texto. */
function MiniaturaMapa({ mapa }: { mapa: MapaMental }) {
  const nodos = mapa.nodos
  if (nodos.length === 0) {
    return (
      <div className="h-[130px] flex items-center justify-center text-[13px]" style={{ color: 'var(--neu-ink3)', background: 'var(--neu-bg)' }}>
        Mapa vacío
      </div>
    )
  }
  const ancho = (n: (typeof nodos)[number]) => n.ancho ?? 130
  const alto = (n: (typeof nodos)[number]) => n.alto ?? 44
  const minX = Math.min(...nodos.map((n) => n.posicion.x))
  const minY = Math.min(...nodos.map((n) => n.posicion.y))
  const maxX = Math.max(...nodos.map((n) => n.posicion.x + ancho(n)))
  const maxY = Math.max(...nodos.map((n) => n.posicion.y + alto(n)))
  const pad = 30
  const porId = new Map(nodos.map((n) => [n.id, n]))
  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-[130px]"
      style={{ background: 'var(--neu-bg)' }}
      role="img"
      aria-label={`Vista previa del mapa ${mapa.titulo}`}
    >
      {mapa.conexiones.map((c) => {
        const d = porId.get(c.desde)
        const h = porId.get(c.hasta)
        if (!d || !h) return null
        return (
          <line
            key={c.id}
            x1={d.posicion.x + ancho(d) / 2}
            y1={d.posicion.y + alto(d) / 2}
            x2={h.posicion.x + ancho(h) / 2}
            y2={h.posicion.y + alto(h) / 2}
            stroke="var(--neu-ink3)"
            strokeOpacity={0.5}
            strokeWidth={4}
          />
        )
      })}
      {nodos.map((n) => (
        <rect
          key={n.id}
          x={n.posicion.x}
          y={n.posicion.y}
          width={ancho(n)}
          height={alto(n)}
          rx={n.forma === 'ovalo' ? alto(n) / 2 : 10}
          fill={n.forma === 'ninguna' ? 'none' : n.color ?? 'color-mix(in srgb, var(--accent-base) 35%, white)'}
          stroke={n.forma === 'ninguna' ? 'var(--neu-ink3)' : 'none'}
          strokeWidth={3}
        />
      ))}
    </svg>
  )
}

function ListaMapas({
  mapas,
  onAbrir,
  onCrear,
  onUsarPlantilla,
  onEliminar,
}: {
  mapas: MapaMental[]
  onAbrir: (id: string) => void
  onCrear: () => void
  onUsarPlantilla: (id: string) => void
  onEliminar: (id: string) => void
}) {
  const [plantillasAbiertas, setPlantillasAbiertas] = useState(mapas.length === 0)
  const fecha = (ms: number) => new Date(ms).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div className="fuente-mapa-mental h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="titulo-pagina">Mapas mentales</h1>
            <p className="text-sm mt-1 max-w-xl" style={{ color: 'var(--neu-ink2)' }}>
              Diagramas libres para estructurar un tema: formas, tamaños de texto y conexiones, sin depender del texto oficial de un artículo.
            </p>
          </div>
          <button onClick={onCrear} className="boton boton-primario flex-shrink-0">
            <i className="ti ti-plus text-base" aria-hidden="true" />
            Nuevo mapa mental
          </button>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-[17px] font-bold" style={{ color: 'var(--neu-ink)' }}>Mis mapas</h2>
          <span className="text-[13px]" style={{ color: 'var(--neu-ink3)' }}>{mapas.length}</span>
        </div>
        {mapas.length === 0 ? (
          <p className="text-center text-sm py-10" style={{ color: 'var(--neu-ink3)' }}>
            Aún no tienes mapas mentales.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mapas.map((m) => (
              <div
                key={m.id}
                className="group relative rounded-2xl border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ background: 'var(--neu-card)', borderColor: 'var(--neu-line)' }}
                onClick={() => onAbrir(m.id)}
              >
                <MiniaturaMapa mapa={m} />
                <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--neu-line)' }}>
                  <h3 className="text-[16px] font-bold truncate" style={{ color: 'var(--neu-ink)' }}>{m.titulo}</h3>
                  <p className="text-[13px]" style={{ color: 'var(--neu-ink2)' }}>
                    {m.nodos.length} nodo{m.nodos.length === 1 ? '' : 's'} · editado {fecha(m.fechaModificacion)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEliminar(m.id)
                  }}
                  aria-label={`Eliminar el mapa "${m.titulo}"`}
                  title="Eliminar"
                  className="absolute top-2 right-2 w-9 h-9 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 transition-opacity"
                  style={{ background: 'var(--neu-card)', color: 'var(--neu-ink3)', border: '1px solid var(--neu-line)' }}
                >
                  <i className="ti ti-trash text-sm" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              onClick={onCrear}
              className="min-h-[200px] rounded-2xl border border-dashed flex items-center justify-center text-[15px] font-semibold transition-colors hover:bg-[var(--neu-bg3)]"
              style={{ borderColor: 'var(--neu-line)', color: 'var(--accent-texto)' }}
            >
              + Nuevo mapa mental
            </button>
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={() => setPlantillasAbiertas((v) => !v)}
            aria-expanded={plantillasAbiertas}
            className="min-h-11 flex items-center gap-2 text-[17px] font-bold"
            style={{ color: 'var(--neu-ink)' }}
          >
            Plantillas para empezar
            <span className="text-[13px] font-normal" style={{ color: 'var(--neu-ink3)' }}>{MAPAS_MENTALES_PLANTILLA.length}</span>
            <i className={`ti ti-chevron-down text-base transition-transform ${plantillasAbiertas ? 'rotate-180' : ''}`} style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
          </button>
          {plantillasAbiertas && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
              {MAPAS_MENTALES_PLANTILLA.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onUsarPlantilla(p.id)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors hover:bg-[var(--neu-bg3)]"
                  style={{ background: 'var(--neu-card)', borderColor: 'var(--neu-line)' }}
                >
                  <i className="ti ti-template text-lg flex-shrink-0" style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--neu-ink)' }}>{p.titulo}</h3>
                    <p className="text-xs truncate" style={{ color: 'var(--neu-ink2)' }}>{p.descripcion}</p>
                  </div>
                  <i className="ti ti-chevron-right text-sm flex-shrink-0" style={{ color: 'var(--neu-ink3)' }} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
// ============= DETALLE =============

const FORMAS: { id: FormaNodoMental; icono: string; label: string }[] = [
  { id: 'rectangulo', icono: 'ti-square', label: 'Rectángulo — categoría principal' },
  { id: 'ovalo', icono: 'ti-circle', label: 'Óvalo — subcategoría o tema raíz' },
  { id: 'ninguna', icono: 'ti-underline', label: 'Sin figura — texto subrayado' },
]

/** Tamaño mínimo de redimensionado por forma — el texto sin figura no
 * necesita una caja mínima grande, es solo texto. */
const MIN_TAMANO: Record<FormaNodoMental, { w: number; h: number }> = {
  rectangulo: { w: 90, h: 44 },
  ovalo: { w: 90, h: 44 },
  ninguna: { w: 50, h: 24 },
}

/** 'nube' y 'rombo' ya no son valores válidos del tipo (se sacaron, no
 * convencían), pero un mapa guardado ANTES de este cambio puede tener
 * nodos con esos strings en localStorage — el tipo no se valida en tiempo
 * de ejecución. Se migran solos a 'ovalo' la primera vez que se abre el
 * mapa (nodosIniciales, más abajo); el efecto de guardado ya persiste la
 * forma migrada, así que esto corre una sola vez por nodo. `as string`
 * a propósito: son valores que FormaNodoMental ya no admite. */
function migrarForma(forma: FormaNodoMental): FormaNodoMental {
  const f = forma as string
  return f === 'nube' || f === 'rombo' ? 'ovalo' : forma
}

/** Un handle por lado, no solo arriba/abajo — antes solo se podía conectar
 * verticalmente, y una conexión hacia un nodo ubicado al costado salía
 * "hacia abajo" igual, dando una curva torcida en vez de una línea directa.
 * Los 4 son `type="source"`: con `connectionMode="loose"` (ver <ReactFlow>)
 * cualquier handle sirve tanto para EMPEZAR como para RECIBIR una conexión,
 * así que no hace falta duplicar cada lado en source+target. */
const HANDLES_POR_LADO: { id: string; posicion: Position }[] = [
  { id: 'top', posicion: Position.Top },
  { id: 'right', posicion: Position.Right },
  { id: 'bottom', posicion: Position.Bottom },
  { id: 'left', posicion: Position.Left },
]

const TAMANOS: { id: TamanoTextoMental; label: string; muestra: string }[] = [
  { id: 'titulo', label: 'Título', muestra: 'T' },
  { id: 'subtitulo', label: 'Subtítulo', muestra: 't' },
  { id: 'texto', label: 'Texto', muestra: '·' },
]

/**
 * Encuadra TODO el contenido dentro del contenedor visible — a mano, sin usar
 * el fitView() de la librería. Se comprobó (mapas de 50+ nodos, con
 * StrictMode activo en desarrollo — dos montajes seguidos del mismo
 * <ReactFlow>) que fitView() puede quedar con una promesa que nunca se
 * resuelve: el viewport se queda tal cual (zoom 1, sin encuadrar) y no hay
 * ningún error en consola que lo delate. Pasaba tanto en el fit-to-view
 * automático al abrir un mapa grande como al imprimir uno — que es
 * exactamente el síntoma reportado ("al imprimir no cabe todo"): no faltaba
 * ajustar el zoom mínimo, el ajuste mismo nunca llegaba a aplicarse.
 *
 * En vez de depender de esa lógica interna, acá se mide el tamaño YA
 * RENDERIZADO de cada nodo en el DOM (nodeEls, real — no una estimación por
 * `style.width`, que no sabe cuánto creció un nodo con texto envuelto en
 * varias líneas) y se convierte a coordenadas del lienzo con
 * `screenToFlowPosition` (deshace el pan/zoom actual, así el resultado no
 * depende de dónde estaba mirando el usuario antes de pedir el encuadre).
 * Con esa caja real se calcula el zoom/posición a mano y se aplica con
 * `setViewport` — la operación primitiva de la librería, sin la lógica
 * adicional de fitView que es justo la que se atasca.
 *
 * Alineado a la IZQUIERDA, no centrado: un árbol angosto y muy alto (título
 * + pocas ramas pero muchas hojas — el caso típico acá, ver
 * calcularLayoutMapaMental) tiene una caja mucho más alta que ancha; si se
 * centrara esa caja completa en un contenedor panorámico, el título
 * quedaba flotando en el medio de la pantalla con muchísimo margen vacío a
 * los dos lados — técnicamente el nodo con menor X, pero no se leía como
 * "el título está a la izquierda" de un vistazo. Pegando el borde
 * izquierdo del contenido (que por construcción es siempre el título) al
 * borde izquierdo del contenedor, la lectura izquierda→derecha queda
 * inequívoca sea cual sea la forma del árbol.
 *
 * `zoomLegible` (opcional): en un mapa grande, el zoom que hace entrar TODO
 * el contenido de una puede ser tan chico que el texto queda ilegible — se
 * ve el mapa entero, pero no se puede leer nada a primera vista, que es
 * justo lo contrario de lo que sirve al abrir un mapa para estudiar. Si se
 * pasa este parámetro y el zoom "entra todo" queda por debajo de él, se usa
 * este piso en su lugar y la vista se ancla en el TÍTULO (el nodo más a la
 * izquierda) en vez de en el centro de todo el árbol — así lo primero que
 * se ve, legible, es el título con sus primeras ramas; el resto del mapa
 * se explora paneando/haciendo scroll, no forzando un zoom ilegible para
 * que quepa todo de entrada. Sin este parámetro (como en el uso para
 * imprimir) siempre se prioriza que entre todo, por chico que quede el
 * texto — es lo esperable al imprimir un diagrama grande en una hoja.
 */
function ajustarVista(
  rf: ReactFlowInstance<NodoFlow, EdgeWithData> | null,
  contenedor: HTMLElement | null,
  padding: number,
  minZoom: number,
  maxZoom: number,
  zoomLegible?: number
) {
  if (!rf || !contenedor) return
  const nodeEls = contenedor.querySelectorAll<HTMLElement>('.react-flow__node')
  if (nodeEls.length === 0) return

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  // Caja del "título": el nodo con menor X (la raíz del árbol, ver
  // calcularLayoutMapaMental — ahí siempre queda en la columna más a la
  // izquierda). De haber varias raíces sueltas a la misma X, se prefiere la
  // más cercana al centro vertical de todo el contenido.
  let tituloMinX = Infinity
  let tituloMinY = 0
  let tituloMaxY = 0
  nodeEls.forEach((el) => {
    const r = el.getBoundingClientRect()
    const supIzq = rf.screenToFlowPosition({ x: r.left, y: r.top })
    const infDer = rf.screenToFlowPosition({ x: r.right, y: r.bottom })
    minX = Math.min(minX, supIzq.x)
    minY = Math.min(minY, supIzq.y)
    maxX = Math.max(maxX, infDer.x)
    maxY = Math.max(maxY, infDer.y)
    if (supIzq.x < tituloMinX) {
      tituloMinX = supIzq.x
      tituloMinY = supIzq.y
      tituloMaxY = infDer.y
    }
  })
  const anchoContenido = Math.max(1, maxX - minX)
  const altoContenido = Math.max(1, maxY - minY)

  const rectContenedor = contenedor.getBoundingClientRect()
  const anchoDisponible = Math.max(1, rectContenedor.width * (1 - padding * 2))
  const altoDisponible = Math.max(1, rectContenedor.height * (1 - padding * 2))
  const zoomQueEntraTodo = Math.min(anchoDisponible / anchoContenido, altoDisponible / altoContenido)

  let zoom: number
  let ancla: { minX: number; minY: number; maxY: number }
  if (!zoomLegible || zoomQueEntraTodo >= zoomLegible) {
    // Entra todo a un zoom razonable (o no se pidió piso legible — caso
    // impresión): usar el zoom que ajusta el contenido completo, anclado en
    // la caja de TODO el árbol.
    zoom = Math.min(maxZoom, Math.max(minZoom, zoomQueEntraTodo))
    ancla = { minX, minY, maxY }
  } else {
    // No entra completo a un zoom legible: mejor un zoom fijo y cómodo,
    // anclado en el título, que "todo el mapa" ilegible.
    zoom = zoomLegible
    ancla = { minX: tituloMinX, minY: tituloMinY, maxY: tituloMaxY }
  }
  // Horizontal: el borde izquierdo del ancla queda a `padding` del borde
  // izquierdo del contenedor, no centrado.
  // Vertical: centrado respecto del ancla — con el título como ancla (caso
  // ilegible) esto lo deja vertical mente centrado en pantalla; con toda la
  // caja como ancla (caso normal) el título ya queda cerca de ese centro
  // por construcción del layout, así que da lo mismo.
  const x = rectContenedor.width * padding - ancla.minX * zoom
  const y = rectContenedor.height / 2 - ((ancla.minY + ancla.maxY) / 2) * zoom
  rf.setViewport({ x, y, zoom }, { duration: 0 })
}

// ============= IMPRIMIR (SVG estático, no el lienzo vivo) =============

/** Caracteres por línea, alto de línea y tamaño de fuente para envolver el
 * texto de un nodo a mano en el SVG de impresión — el navegador no envuelve
 * texto SVG solo como hace con HTML, así que hay que decidir los saltos de
 * línea nosotros. Aproximación (no pixel-perfect, en Inter ~0.52em por
 * carácter): alcanza para que el texto no se salga groseramente de su caja
 * al imprimir, que es lo único que importa acá. */
const FUENTE_POR_TAMANO_IMPRESO: Record<TamanoTextoMental, number> = { titulo: 16, subtitulo: 14, texto: 12 }
function medidasTextoImpreso(ancho: number, tamanoTexto: TamanoTextoMental): { maxCaracteresPorLinea: number; altoLinea: number; fuente: number } {
  const fuente = FUENTE_POR_TAMANO_IMPRESO[tamanoTexto]
  const usable = Math.max(20, ancho - 24)
  return { maxCaracteresPorLinea: Math.max(6, Math.floor(usable / (fuente * 0.52))), altoLinea: fuente * 1.35, fuente }
}
function envolverTextoImpreso(texto: string, maxCaracteresPorLinea: number): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean)
  const lineas: string[] = []
  let actual = ''
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra
    if (candidata.length > maxCaracteresPorLinea && actual) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = candidata
    }
  }
  if (actual) lineas.push(actual)
  return lineas.length > 0 ? lineas : ['']
}

interface CajaNodoImpreso {
  nodo: NodoMapaMental
  x: number
  y: number
  ancho: number
  alto: number
  lineas: string[]
  fuente: number
  altoLinea: number
}

/** Ancho/alto reales si el nodo fue redimensionado a mano (n.ancho/n.alto);
 * si no, el mismo default que usarPlantilla()/agregarNodo() para el ancho, y
 * una ESTIMACIÓN para el alto (acá no hay DOM real que medir, a diferencia
 * del lienzo interactivo). */
function calcularCajaNodoImpreso(n: NodoMapaMental): CajaNodoImpreso {
  const ancho = n.ancho ?? (n.tamanoTexto === 'titulo' ? 200 : 155)
  const { maxCaracteresPorLinea, altoLinea, fuente } = medidasTextoImpreso(ancho, n.tamanoTexto)
  const lineas = envolverTextoImpreso(n.texto.replace(/\*([^*\n]+)\*/g, '$1').replace(/_([^_\n]+)_/g, '$1'), maxCaracteresPorLinea)
  const alto = n.alto ?? Math.max(44, lineas.length * altoLinea + 16)
  return { nodo: n, x: n.posicion.x, y: n.posicion.y, ancho, alto, lineas, fuente, altoLinea }
}

/** Punto de conexión sobre el borde de la caja, según el lado guardado en
 * la conexión (ver ConexionMapaMental.desdeHandle/hastaHandle) — mismo
 * dato que ya usa el lienzo interactivo para saber por dónde sale/entra
 * cada línea, reutilizado acá para que el SVG impreso no salga siempre
 * "desde abajo, hacia arriba" sin importar dónde queda el otro nodo. */
function puntoDeHandleImpreso(caja: CajaNodoImpreso, handle: string | undefined): { x: number; y: number } {
  switch (handle) {
    case 'left':
      return { x: caja.x, y: caja.y + caja.alto / 2 }
    case 'right':
      return { x: caja.x + caja.ancho, y: caja.y + caja.alto / 2 }
    case 'top':
      return { x: caja.x + caja.ancho / 2, y: caja.y }
    case 'bottom':
    default:
      return { x: caja.x + caja.ancho / 2, y: caja.y + caja.alto }
  }
}

/**
 * Vista imprimible de un mapa mental (botón "Exportar a PDF" -> window.print()
 * -> el usuario elige "Guardar como PDF"), montada vía createPortal directo
 * en document.body — mismo patrón que VistaImprimibleColeccion en
 * ColeccionesView.tsx y VistaImprimibleCodigo en ExploradorView.tsx.
 *
 * A propósito NO imprime el lienzo vivo de React Flow (como hacía la
 * versión anterior, con position:fixed + visibility sobre el canvas real
 * dentro de #root): se comprobó que eso podía salir como una hoja
 * completamente en blanco, sin nodos ni error visible — React Flow
 * posiciona todo por CSS transform y depende de que ResizeObserver haya
 * "medido" cada nodo, y ninguna de las dos cosas está garantizada en el
 * momento exacto en que el navegador captura el contenido para imprimir.
 * Acá en cambio se dibuja un SVG estático a mano a partir de los mismos
 * datos guardados (mapa.nodos/mapa.conexiones) — sin transform, sin
 * position:fixed, sin depender de que nada se termine de "medir": lo que
 * hay en los datos es exactamente lo que se dibuja, siempre.
 *
 * Se encoge (viewBox + tamaño en cm) para ocupar el ANCHO de una hoja —
 * pero NO el alto: un mapa grande sigue siendo más alto que ancho (ver
 * calcularLayoutMapaMental), y forzarlo a entrar en una sola hoja completa
 * (ancho Y alto a la vez) dejaba el texto microscópico e ilegible — "cabía"
 * todo, pero no servía para nada. Ahora se imprime a un tamaño legible y,
 * si no entra en una hoja, sigue en la siguiente — igual que una tabla o
 * una imagen alta en cualquier documento impreso. El corte entre hojas cae
 * donde caiga (puede partir un nodo justo por la mitad visualmente, ya que
 * es un solo SVG y no hay forma de controlar el salto de página adentro de
 * uno) — no es prolijo, pero ningún nodo se pierde: sigue completo, solo
 * que repartido en dos hojas en vez de una.
 */
function VistaImprimibleMapaMental({ mapa }: { mapa: MapaMental }) {
  const cajas = useMemo(() => {
    const m = new Map<string, CajaNodoImpreso>()
    for (const n of mapa.nodos) m.set(n.id, calcularCajaNodoImpreso(n))
    return m
  }, [mapa.nodos])

  const dimensiones = useMemo(() => {
    if (cajas.size === 0) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    cajas.forEach((c) => {
      minX = Math.min(minX, c.x)
      minY = Math.min(minY, c.y)
      maxX = Math.max(maxX, c.x + c.ancho)
      maxY = Math.max(maxY, c.y + c.alto)
    })
    const MARGEN_SVG = 20
    return { minX: minX - MARGEN_SVG, minY: minY - MARGEN_SVG, ancho: maxX - minX + MARGEN_SVG * 2, alto: maxY - minY + MARGEN_SVG * 2 }
  }, [cajas])

  if (!dimensiones) return null

  // Ancho impreso seguro para carta/A4 con ~2cm de margen a cada lado —
  // SOLO el ancho: el alto no se limita, ver el comentario de arriba.
  const PAGINA_ANCHO_CM = 17
  const escala = PAGINA_ANCHO_CM / dimensiones.ancho

  return createPortal(
    <div className="imprimir-mapa-mental-svg">
      <style>{`
        @page { margin: 2cm; }
        .imprimir-mapa-mental-svg { color: #111; background: #fff; font-family: Georgia, 'Times New Roman', serif; padding: 24px; }
        .imprimir-mapa-mental-svg h1 { font-size: 20px; margin: 0 0 4px; font-family: inherit; }
        .imprimir-mapa-mental-svg .imm-meta { font-size: 11px; color: #666; margin-bottom: 16px; }
        .imprimir-mapa-mental-svg svg { display: block; }
        .imprimir-mapa-mental-svg text { font-family: 'Inter Variable', 'Inter', ui-sans-serif, system-ui, sans-serif; }
      `}</style>
      <h1>{mapa.titulo}</h1>
      <p className="imm-meta">{mapa.nodos.length} nodo{mapa.nodos.length === 1 ? '' : 's'} · Prima Lex</p>
      <svg
        viewBox={`${dimensiones.minX} ${dimensiones.minY} ${dimensiones.ancho} ${dimensiones.alto}`}
        style={{ width: `${dimensiones.ancho * escala}cm`, height: `${dimensiones.alto * escala}cm` }}
      >
        <defs>
          <marker id="imm-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#71717a" />
          </marker>
        </defs>
        {mapa.conexiones.map((c) => {
          const cajaDesde = cajas.get(c.desde)
          const cajaHasta = cajas.get(c.hasta)
          if (!cajaDesde || !cajaHasta) return null
          const p1 = puntoDeHandleImpreso(cajaDesde, c.desdeHandle)
          const p2 = puntoDeHandleImpreso(cajaHasta, c.hastaHandle)
          return (
            <g key={c.id}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#a1a1aa" strokeWidth={1.5} markerEnd="url(#imm-flecha)" />
              {c.etiqueta && (
                <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 4} fontSize={10} fill="#71717a" textAnchor="middle">
                  {c.etiqueta}
                </text>
              )}
            </g>
          )
        })}
        {mapa.nodos.map((n) => (
          <NodoSvgImpreso key={n.id} caja={cajas.get(n.id)!} />
        ))}
      </svg>
    </div>,
    document.body
  )
}

function NodoSvgImpreso({ caja }: { caja: CajaNodoImpreso }) {
  const { nodo, x, y, ancho, alto, lineas, fuente, altoLinea } = caja
  const color = nodo.color ?? '#0F6E56'
  const cx = x + ancho / 2
  const cy = y + alto / 2
  const peso = nodo.tamanoTexto === 'titulo' ? 700 : nodo.tamanoTexto === 'subtitulo' ? 600 : 400

  const texto = (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={fuente} fontWeight={peso} fill="#18181b">
      {lineas.map((linea, i) => (
        <tspan key={i} x={cx} dy={i === 0 ? (-(lineas.length - 1) * altoLinea) / 2 : altoLinea}>
          {linea}
        </tspan>
      ))}
    </text>
  )

  if (nodo.forma === 'ninguna') {
    return (
      <g>
        {texto}
        <line x1={x} y1={y + alto} x2={x + ancho} y2={y + alto} stroke={color} strokeWidth={2} />
      </g>
    )
  }

  return (
    <g>
      {nodo.forma === 'ovalo' ? (
        <ellipse cx={cx} cy={cy} rx={ancho / 2} ry={alto / 2} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={2} />
      ) : (
        <rect x={x} y={y} width={ancho} height={alto} rx={10} ry={10} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={2} />
      )}
      {texto}
    </g>
  )
}

function MapaMentalDetalle({
  mapa,
  modoOscuro,
  onVolver,
}: {
  mapa: MapaMental
  modoOscuro: boolean
  onVolver: () => void
}) {
  const renombrarMapaMental = useStore((s) => s.renombrarMapaMental)
  const actualizarMapaMental = useStore((s) => s.actualizarMapaMental)
  const [crearApunte, setCrearApunte] = useState(false)
  // Colección vinculada (si alguna) — ver Coleccion.mapaMentalVinculado en
  // types/index.ts: un solo lado guarda el vínculo, acá solo se consulta.
  const coleccionVinculada = useStore((s) => s.colecciones.find((c) => c.mapaMentalVinculado === mapa.id))
  const setColeccionActiva = useStore((s) => s.setColeccionActiva)
  const setVistaActiva = useStore((s) => s.setVistaActiva)

  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [tituloTmp, setTituloTmp] = useState(mapa.titulo)

  const nodosIniciales: NodoFlow[] = useMemo(
    () =>
      mapa.nodos.map((n) => ({
        id: n.id,
        type: 'mental',
        position: n.posicion,
        data: { texto: n.texto, forma: migrarForma(n.forma), tamanoTexto: n.tamanoTexto, color: n.color, nota: n.nota, articulo: n.articulo },
        style: { width: n.ancho ?? 180, height: n.alto },
      })),
    // Solo al montar: el mapa se remonta entero al volver a la lista (key={mapa.id}), así que no hace
    // falta re-sincronizar en cada cambio de `mapa.nodos` — eso crearía un ciclo con el guardado de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const edgesIniciales: EdgeWithData[] = useMemo(
    () =>
      mapa.conexiones.map((c) => ({
        id: c.id,
        source: c.desde,
        target: c.hasta,
        // 'bottom'/'top' acá reproducen el comportamiento ANTERIOR (única
        // salida abajo, única entrada arriba) para conexiones guardadas
        // antes de que existieran los 4 costados — así no se rompe ninguna
        // conexión ya hecha al agregar los handles nuevos.
        sourceHandle: c.desdeHandle ?? 'bottom',
        targetHandle: c.hastaHandle ?? 'top',
        type: 'editable',
        label: c.etiqueta,
        markerEnd: MARKER_FLECHA,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<NodoFlow>(nodosIniciales)
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeWithData>(edgesIniciales)
  const rfRef = useRef<ReactFlowInstance<NodoFlow, EdgeWithData> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // ============= COLAPSAR RAMAS =============
  // Puramente de pantalla — a propósito NO se guarda con el mapa (no se
  // toca `nodes`/`edges`, que es lo que el efecto de más abajo persiste):
  // es una ayuda para no tener que scrollear un mapa grande entero cuando
  // en el momento solo hace falta mirar una rama, no un cambio de
  // estructura. Cada vez que se reabre el mapa, todo empieza expandido.
  const [colapsados, setColapsados] = useState<Set<string>>(new Set())

  const hijosDe = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const e of edges) {
      if (!m.has(e.source)) m.set(e.source, [])
      m.get(e.source)!.push(e.target)
    }
    return m
  }, [edges])

  // Todo lo que queda oculto por estar debajo de ALGUNA rama colapsada —
  // recursivo: colapsar una rama esconde toda su descendencia, no solo sus
  // hijos directos.
  const idsOcultos = useMemo(() => {
    if (colapsados.size === 0) return new Set<string>()
    const ocultos = new Set<string>()
    function marcar(id: string) {
      for (const hijo of hijosDe.get(id) ?? []) {
        if (!ocultos.has(hijo)) {
          ocultos.add(hijo)
          marcar(hijo)
        }
      }
    }
    for (const id of colapsados) marcar(id)
    return ocultos
  }, [colapsados, hijosDe])

  // `hidden` de React Flow (no borra el nodo, solo no lo pinta) — por eso
  // se arma un array APARTE para el prop `nodes`/`edges` de <ReactFlow>, en
  // vez de tocar el estado `nodes`/`edges` de verdad: ese es el que se
  // persiste tal cual, y perder un nodo colapsado de esa lista lo habría
  // borrado del mapa guardado, no solo escondido de la pantalla.
  const nodesVisibles = useMemo(
    () => nodes.map((n) => (idsOcultos.has(n.id) ? { ...n, hidden: true } : n)),
    [nodes, idsOcultos]
  )
  const edgesVisibles = useMemo(
    () => edges.map((e) => (idsOcultos.has(e.source) || idsOcultos.has(e.target) ? { ...e, hidden: true } : e)),
    [edges, idsOcultos]
  )

  const toggleColapsado = useCallback((id: string) => {
    setColapsados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Guardar en el store cada vez que cambian nodos/conexiones — mismo patrón
  // que Canvas: estado "vivo" en React Flow, persistencia en un efecto aparte.
  useEffect(() => {
    const nodosPersist: NodoMapaMental[] = nodes.map((n) => ({
      id: n.id,
      posicion: n.position,
      texto: n.data.texto,
      forma: n.data.forma,
      tamanoTexto: n.data.tamanoTexto,
      color: n.data.color,
      nota: n.data.nota,
      articulo: n.data.articulo,
      ancho: typeof n.style?.width === 'number' ? n.style.width : 180,
      alto: typeof n.style?.height === 'number' ? n.style.height : undefined,
    }))
    const conexionesPersist: ConexionMapaMental[] = edges.map((e) => ({
      id: e.id,
      desde: e.source,
      hasta: e.target,
      desdeHandle: e.sourceHandle ?? undefined,
      hastaHandle: e.targetHandle ?? undefined,
      etiqueta: typeof e.label === 'string' ? e.label : undefined,
    }))
    actualizarMapaMental(mapa.id, { nodos: nodosPersist, conexiones: conexionesPersist })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  // ============= HISTORIAL (deshacer/rehacer) =============
  // Mismo patrón que CanvasView.tsx: snapshots manuales en un ref (no el
  // estado de React, para no disparar re-renders ni entrar al ciclo de
  // guardado de arriba), tope de 50 para no crecer sin límite.
  const nodesRef = useRef<NodoFlow[]>(nodes)
  const edgesRef = useRef<EdgeWithData[]>(edges)
  nodesRef.current = nodes
  edgesRef.current = edges
  // Arranca con UN snapshot del estado de apertura, no vacío — mismo patrón
  // que CanvasView.tsx (historyIdx=0 al cargar, no -1).
  const history = useRef<{ nodes: NodoFlow[]; edges: EdgeWithData[] }[]>([
    { nodes: nodosIniciales.map((n) => ({ ...n, data: { ...n.data } })), edges: edgesIniciales.map((e) => ({ ...e })) },
  ])
  const historyIdx = useRef(0)

  // `pushHistory()` (llamado ANTES de cada acción discreta, como en Canvas)
  // solo LEVANTA UNA BANDERA — no captura nada todavía. La captura real
  // ocurre en el efecto de abajo, DESPUÉS de que React ya aplicó el cambio,
  // así el snapshot guardado es el resultado real de la acción, no una
  // copia del estado anterior. Sin esto, "Rehacer" restauraba el mismo
  // estado que "Deshacer" ya había restaurado (el snapshot posterior era
  // idéntico al anterior, nunca el resultado real del cambio) porque
  // pushHistory() capturaba el estado ANTES de aplicarse el cambio.
  const necesitaSnapshotRef = useRef(false)
  const restaurandoRef = useRef(false)
  const pushHistory = useCallback(() => {
    necesitaSnapshotRef.current = true
  }, [])

  useEffect(() => {
    if (restaurandoRef.current) {
      restaurandoRef.current = false
      return
    }
    if (!necesitaSnapshotRef.current) return // cambio "silencioso" (ej. tipear texto letra por letra): no es un punto de historial
    necesitaSnapshotRef.current = false
    const snap = {
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
      edges: edges.map((e) => ({ ...e })),
    }
    history.current = history.current.slice(0, historyIdx.current + 1)
    history.current.push(snap)
    if (history.current.length > 50) history.current.shift()
    else historyIdx.current++
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return
    historyIdx.current--
    restaurandoRef.current = true
    const snap = history.current[historyIdx.current]
    setNodes(snap.nodes)
    setEdges(snap.edges)
  }, [setNodes, setEdges])

  const redo = useCallback(() => {
    if (historyIdx.current >= history.current.length - 1) return
    historyIdx.current++
    restaurandoRef.current = true
    const snap = history.current[historyIdx.current]
    setNodes(snap.nodes)
    setEdges(snap.edges)
  }, [setNodes, setEdges])

  const handleActualizar = useCallback(
    (id: string, cambios: Partial<NodoData>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...cambios } } : n)))
    },
    [setNodes]
  )
  const handleEliminarNodo = useCallback(
    (id: string) => {
      pushHistory()
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    },
    [setNodes, setEdges, pushHistory]
  )
  const handleDuplicar = useCallback(
    (id: string) => {
      pushHistory()
      setNodes((nds) => {
        const original = nds.find((n) => n.id === id)
        if (!original) return nds
        const copia: NodoFlow = {
          ...original,
          id: crypto.randomUUID(),
          position: { x: original.position.x + 30, y: original.position.y + 30 },
          data: { ...original.data },
          selected: false,
        }
        return [...nds, copia]
      })
    },
    [setNodes, pushHistory]
  )
  // "Duplicar rama": copia el nodo y TODOS los que dependen de él siguiendo
  // conexiones donde él es el origen (sus "hijos", recursivo) — junto con las
  // conexiones internas entre ellos. Es lo que de verdad sirve para el caso
  // real que motivó esto: una sub-estructura completa (ej. "Elementos" con
  // sus "Objetivos"+"Subjetivos" colgando) que se repite para otra rama
  // paralela, en vez de duplicar un nodo suelto sin lo que cuelga de él.
  const handleDuplicarRama = useCallback(
    (id: string) => {
      const nds = nodesRef.current
      const eds = edgesRef.current
      const idsRama = new Set<string>([id])
      let frontera = [id]
      while (frontera.length > 0) {
        const siguiente: string[] = []
        for (const origen of frontera) {
          for (const e of eds) {
            if (e.source === origen && !idsRama.has(e.target)) {
              idsRama.add(e.target)
              siguiente.push(e.target)
            }
          }
        }
        frontera = siguiente
      }
      const idsNuevos = new Map<string, string>()
      idsRama.forEach((oid) => idsNuevos.set(oid, crypto.randomUUID()))
      const OFFSET = 60
      const nodosCopia: NodoFlow[] = nds
        .filter((n) => idsRama.has(n.id))
        .map((n) => ({
          ...n,
          id: idsNuevos.get(n.id)!,
          position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
          data: { ...n.data },
          selected: false,
        }))
      const edgesCopia: EdgeWithData[] = eds
        .filter((e) => idsRama.has(e.source) && idsRama.has(e.target))
        .map((e) => ({ ...e, id: crypto.randomUUID(), source: idsNuevos.get(e.source)!, target: idsNuevos.get(e.target)! }))
      if (nodosCopia.length === 0) return
      pushHistory()
      setNodes((prev) => [...prev, ...nodosCopia])
      setEdges((prev) => [...prev, ...edgesCopia])
    },
    [setNodes, setEdges, pushHistory]
  )
  const handleActualizarEtiqueta = useCallback(
    (id: string, etiqueta: string) => {
      setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, label: etiqueta || undefined } : e)))
    },
    [setEdges]
  )

  const onConnect = useCallback(
    (conn: Connection) => {
      pushHistory()
      setEdges((eds) => addEdge({ ...conn, type: 'editable', markerEnd: MARKER_FLECHA }, eds))
    },
    [setEdges, pushHistory]
  )
  // Caso distinto de los demás: acá el cambio de posición YA ocurrió (via
  // onNodesChange durante el arrastre) para cuando este handler se dispara,
  // así que pushHistory()+bandera llegaría tarde — puede que nodes/edges no
  // vuelvan a cambiar después de esto, y el efecto de arriba nunca reciba la
  // señal para capturar. Se captura DIRECTO acá, ya con el resultado final.
  const onNodeDragStop = useCallback(() => {
    const snap = {
      nodes: nodesRef.current.map((n) => ({ ...n, data: { ...n.data } })),
      edges: edgesRef.current.map((e) => ({ ...e })),
    }
    history.current = history.current.slice(0, historyIdx.current + 1)
    history.current.push(snap)
    if (history.current.length > 50) history.current.shift()
    else historyIdx.current++
  }, [])

  // Nodo nuevo en el CENTRO de lo que se está mirando ahora mismo, no en una
  // zona fija cerca del origen — si ya te moviste/hiciste zoom a otra parte
  // del mapa, antes el nodo aparecía fuera de la vista y había que salir a
  // buscarlo. `screenToFlowPosition` traduce coordenadas de pantalla a
  // coordenadas del "mundo" del lienzo, sea cual sea el pan/zoom actual.
  const [panelArticulos, setPanelArticulos] = useState(false)

  /** Copia fija de un artículo como nodo del mapa: la cita en negrita y el texto debajo. No se actualiza si el código cambia. */
  const agregarArticulo = ({ cita, texto }: { cita: string; texto: string }) => {
    pushHistory()
    const rect = wrapperRef.current?.getBoundingClientRect()
    const centroPantalla = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 400, y: 300 }
    const centro = rfRef.current?.screenToFlowPosition(centroPantalla) ?? { x: 200, y: 200 }
    const jitter = () => (Math.random() - 0.5) * 60
    const ancho = 300
    const nuevo: NodoFlow = {
      id: crypto.randomUUID(),
      type: 'mental',
      position: { x: centro.x - ancho / 2 + jitter(), y: centro.y - 60 + jitter() },
      data: { texto: `*${cita}*\n${texto}`, forma: 'rectangulo', tamanoTexto: 'texto', articulo: cita, color: '#1d4ed8' },
      style: { width: ancho },
      initialWidth: ancho,
      initialHeight: Math.min(600, 50 + Math.ceil(texto.length / 48) * 16),
    }
    setNodes((nds) => [...nds.map((n) => (n.selected ? { ...n, selected: false } : n)), nuevo])
    avisar.exito(`${cita} agregado al mapa`)
  }

  const agregarNodo = (forma: FormaNodoMental) => {
    pushHistory()
    const rect = wrapperRef.current?.getBoundingClientRect()
    const centroPantalla = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 400, y: 300 }
    const centro = rfRef.current?.screenToFlowPosition(centroPantalla) ?? { x: 200, y: 200 }
    const jitter = () => (Math.random() - 0.5) * 60
    const nuevo: NodoFlow = {
      id: crypto.randomUUID(),
      type: 'mental',
      position: { x: centro.x + jitter(), y: centro.y + jitter() },
      data: { texto: 'Nuevo', forma, tamanoTexto: 'texto', autoEditar: true },
      style: { width: forma === 'ninguna' ? 140 : 160 },
      initialWidth: forma === 'ninguna' ? 140 : 160,
      initialHeight: 60,
    }
    setNodes((nds) => [...nds, nuevo])
  }

  /** Crea un nodo en `posicion`, ya seleccionado y listo para escribir. Si
   *  viene `padreId`, lo conecta a ese nodo. */
  const crearNodoEn = (
    posicion: { x: number; y: number },
    padreId: string | null,
    extra?: Partial<NodoData> & { ancho?: number }
  ) => {
    pushHistory()
    const forma: FormaNodoMental = extra?.forma ?? 'rectangulo'
    const nuevo: NodoFlow = {
      id: crypto.randomUUID(),
      type: 'mental',
      position: posicion,
      selected: true,
      data: { texto: extra?.texto ?? 'Nuevo', forma, tamanoTexto: extra?.tamanoTexto ?? 'texto', color: extra?.color, autoEditar: true },
      style: { width: extra?.ancho ?? (forma === 'ninguna' ? 140 : 160) },
      // medidas iniciales: sin ellas React Flow deja el nodo oculto hasta medirlo y no se puede escribir en él
      initialWidth: extra?.ancho ?? (forma === 'ninguna' ? 140 : 160),
      initialHeight: 60,
    }
    setNodes((nds) => [...nds.map((n) => (n.selected ? { ...n, selected: false } : n)), nuevo])
    if (padreId) {
      const padre = nodesRef.current.find((n) => n.id === padreId)
      const lados = elegirLadosConexion(padre?.position ?? { x: 0, y: 0 }, posicion)
      setEdges((eds) => [
        ...eds,
        { id: crypto.randomUUID(), source: padreId, target: nuevo.id, sourceHandle: lados.desdeHandle, targetHandle: lados.hastaHandle, type: 'editable', markerEnd: MARKER_FLECHA },
      ])
    }
    return nuevo.id
  }

  /** Tab = rama nueva del nodo elegido (a su derecha); Enter = otro del mismo
   *  nivel (debajo del último hermano). Como en los mapas mentales de siempre. */
  const crearRelativo = (id: string, tipo: 'hijo' | 'hermano') => {
    const actual = nodesRef.current.find((n) => n.id === id)
    if (!actual) return
    const aristas = edgesRef.current
    const padreId = tipo === 'hermano' ? aristas.find((e) => e.target === id)?.source ?? null : id
    const base = padreId ? nodesRef.current.find((n) => n.id === padreId) : null
    if (!base) {
      // sin padre: un nodo nuevo al lado, sin conexión
      crearNodoEn({ x: actual.position.x + 220, y: actual.position.y }, null, { forma: actual.data.forma })
      return
    }
    const hermanos = aristas.filter((e) => e.source === base.id).map((e) => nodesRef.current.find((n) => n.id === e.target)).filter((n): n is NodoFlow => !!n)
    const ancho = typeof base.style?.width === 'number' ? base.style.width : 160
    const y = hermanos.length > 0 ? Math.max(...hermanos.map((h) => h.position.y)) + 75 : base.position.y
    crearNodoEn({ x: base.position.x + ancho + 90, y }, base.id, { forma: actual.data.forma === 'ninguna' ? 'ninguna' : 'ovalo', color: actual.data.color })
  }

  // Tab y Enter valen para el nodo elegido aunque el foco esté en la página
  // (al confirmar un texto el foco queda en el cuerpo del documento), por eso
  // se escucha a nivel de documento y se descartan los campos y botones.
  const crearRelativoRef = useRef(crearRelativo)
  useEffect(() => {
    crearRelativoRef.current = crearRelativo
  })
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' && e.key !== 'Enter') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]')) return
      if (t !== document.body && !t.closest('.react-flow')) return
      const elegidos = nodesRef.current.filter((n) => n.selected)
      if (elegidos.length !== 1) return
      e.preventDefault()
      crearRelativoRef.current(elegidos[0].id, e.key === 'Tab' ? 'hijo' : 'hermano')
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [])

  // doble clic en un espacio vacío: nodo nuevo ahí mismo
  const alDobleClicLienzo = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).classList.contains('react-flow__pane')) return
    const pos = rfRef.current?.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    if (pos) crearNodoEn({ x: pos.x - 80, y: pos.y - 24 }, null)
  }

  const crearIdeaCentral = () => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    const centro = rect
      ? rfRef.current?.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) ?? { x: 0, y: 0 }
      : { x: 0, y: 0 }
    crearNodoEn({ x: centro.x - 100, y: centro.y - 30 }, null, { texto: 'Idea central', forma: 'ovalo', tamanoTexto: 'titulo', ancho: 200 })
  }

  // ============= ORGANIZAR AUTOMÁTICO =============
  const organizarAutomatico = useCallback(() => {
    if (nodesRef.current.length === 0) return
    registrarUso('mapa.organizar')
    pushHistory()
    const posiciones = calcularLayoutMapaMental(
      nodesRef.current.map((n) => n.id),
      edgesRef.current.map((e) => ({ desde: e.source, hasta: e.target }))
    )
    setNodes((nds) => nds.map((n) => (posiciones.has(n.id) ? { ...n, position: posiciones.get(n.id)! } : n)))
    // Recalcular por qué lado sale/entra cada conexión con las posiciones
    // NUEVAS — si no se hace esto, una conexión que antes salía derecho
    // (nodos alineados verticalmente) puede quedar entrando por el lado
    // equivocado después de reorganizar, con el mismo efecto "torcido" que
    // "Organizar" se supone que arregla, no que crea.
    setEdges((eds) =>
      eds.map((e) => {
        const origen = posiciones.get(e.source)
        const destino = posiciones.get(e.target)
        if (!origen || !destino) return e
        const lados = elegirLadosConexion(origen, destino)
        return { ...e, sourceHandle: lados.desdeHandle, targetHandle: lados.hastaHandle }
      })
    )
    // 50ms para que React ya haya pintado las posiciones nuevas en el DOM
    // antes de medirlas — ajustarVista() mide cajas REALES (ver su comentario).
    // Padding chico (no 0.3 como antes): ahora ajustarVista() pega el
    // título contra el borde izquierdo en vez de centrar la caja, así que
    // un padding grande acá solo dejaba un margen izquierdo enorme y vacío.
    setTimeout(() => ajustarVista(rfRef.current, wrapperRef.current, 0.08, 0.02, 1.5, 0.6), 50)
  }, [setNodes, setEdges, pushHistory])

  // ============= BUSCAR =============
  const [busquedaAbierta, setBusquedaAbierta] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return []
    return nodes.filter((n) => n.data.texto.toLowerCase().includes(q))
  }, [busqueda, nodes])
  const [indiceCoincidencia, setIndiceCoincidencia] = useState(0)

  const irACoincidencia = useCallback(
    (nodo: NodoFlow) => {
      const ancho = typeof nodo.style?.width === 'number' ? nodo.style.width : 160
      const alto = typeof nodo.style?.height === 'number' ? nodo.style.height : 60
      rfRef.current?.setCenter(nodo.position.x + ancho / 2, nodo.position.y + alto / 2, { zoom: 1.1, duration: 400 })
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodo.id })))
    },
    [setNodes]
  )

  useEffect(() => {
    setIndiceCoincidencia(0)
    if (coincidencias.length > 0) irACoincidencia(coincidencias[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  // ============= ATAJOS DE TECLADO =============
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const enCampoDeTexto = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault()
        redo()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !enCampoDeTexto) {
        const seleccionados = nodesRef.current.filter((n) => n.selected)
        if (seleccionados.length === 0) return
        e.preventDefault()
        pushHistory()
        const idsBorrar = new Set(seleccionados.map((n) => n.id))
        setNodes((nds) => nds.filter((n) => !idsBorrar.has(n.id)))
        setEdges((eds) => eds.filter((ed) => !idsBorrar.has(ed.source) && !idsBorrar.has(ed.target)))
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && !enCampoDeTexto) {
        const seleccionado = nodesRef.current.find((n) => n.selected)
        if (seleccionado) {
          e.preventDefault()
          handleDuplicar(seleccionado.id)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, pushHistory, setNodes, setEdges, handleDuplicar])

  // Encuadre inicial al abrir el mapa — ANTES esto era la prop declarativa
  // `fitView` de <ReactFlow>, que se sacó junto con `fitViewOptions` (ver
  // ajustarVista(): esa prop usa el mismo fitView() interno que quedaba
  // pegado en mapas grandes). Un tick (rAF) para dar tiempo a que el DOM
  // ya tenga los nodos pintados con su tamaño real antes de medirlos.
  useEffect(() => {
    const id = requestAnimationFrame(() => ajustarVista(rfRef.current, wrapperRef.current, 0.08, 0.02, 1.5, 0.6))
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============= EXPORTAR / IMPRIMIR =============
  // Ya NO se imprime el lienzo vivo de React Flow (ver VistaImprimibleMapaMental
  // más abajo, y su comentario, para el porqué: imprimir el canvas real —
  // posicionado con transform/position:fixed, dependiente de que React Flow
  // haya "medido" cada nodo vía ResizeObserver — daba una hoja en blanco de
  // forma intermitente, sin ningún error que lo delate. La vista imprimible
  // ahora es un SVG estático aparte, armado a mano a partir de los mismos
  // datos (mapa.nodos/mapa.conexiones), montado por fuera de #root igual que
  // Colecciones y el Explorador — mismo patrón simple y ya probado.

  const ctxValue = useMemo<MentalCtx>(
    () => ({
      modoOscuro,
      callbacks: {
        actualizar: handleActualizar,
        eliminar: handleEliminarNodo,
        duplicar: handleDuplicar,
        duplicarRama: handleDuplicarRama,
        actualizarEtiqueta: handleActualizarEtiqueta,
      },
      tieneHijos: (id) => (hijosDe.get(id)?.length ?? 0) > 0,
      estaColapsado: (id) => colapsados.has(id),
      // Cuántos nodos quedarían ocultos si SE colapsara este id ahora mismo
      // — para mostrar "+N" en el badge sin tener que colapsar primero.
      cantidadOcultosSi: (id) => {
        const vistos = new Set<string>()
        function marcar(actual: string) {
          for (const hijo of hijosDe.get(actual) ?? []) {
            if (!vistos.has(hijo)) {
              vistos.add(hijo)
              marcar(hijo)
            }
          }
        }
        marcar(id)
        return vistos.size
      },
      toggleColapsado,
    }),
    [modoOscuro, handleActualizar, handleEliminarNodo, handleDuplicar, handleDuplicarRama, handleActualizarEtiqueta, hijosDe, colapsados, toggleColapsado]
  )

  const guardarTitulo = () => {
    const t = tituloTmp.trim()
    if (t) renombrarMapaMental(mapa.id, t)
    else setTituloTmp(mapa.titulo)
    setEditandoTitulo(false)
  }

  const claseIconoCabecera = `w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
    modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
  }`

  return (
    <div className={`fuente-mapa-mental h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      {/* Cabecera en dos niveles: arriba volver + título + menú ⋯ (en celular); abajo las herramientas que se usan todo el rato.
          Lo ocasional (organizar, ver colección, exportar, eliminar) va dentro del menú ⋯. */}
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-3 px-3 sm:px-6 py-2 sm:py-3 border-b flex-shrink-0 ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div className="order-1 flex items-center gap-2 flex-1 min-w-0">
          <button onClick={onVolver} title="Volver a Mapas mentales" aria-label="Volver a Mapas mentales" className={claseIconoCabecera}>
            <i className="ti ti-arrow-left text-lg" />
          </button>

          {editandoTitulo ? (
            <input
              autoFocus
              value={tituloTmp}
              onChange={(e) => setTituloTmp(e.target.value)}
              onBlur={guardarTitulo}
              onKeyDown={(e) => {
                if (e.key === 'Enter') guardarTitulo()
                if (e.key === 'Escape') {
                  setTituloTmp(mapa.titulo)
                  setEditandoTitulo(false)
                }
              }}
              className={`flex-1 min-w-0 bg-transparent outline-none border campo-foco-b-2 text-lg font-serif font-semibold px-0.5 ${
                modoOscuro ? 'text-white' : 'text-zinc-900'
              }`}
              style={{ borderColor: VERDE }}
            />
          ) : (
            <button onClick={() => setEditandoTitulo(true)} className="group/title flex-1 min-w-0 text-left flex items-center gap-2">
              <h1 className={`text-lg font-serif font-semibold truncate ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{mapa.titulo}</h1>
              <i
                className={`ti ti-pencil text-xs opacity-60 sm:opacity-0 group-hover/title:opacity-60 transition-opacity flex-shrink-0 ${
                  modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              />
            </button>
          )}
        </div>

        {/* Herramientas de uso constante. En celular bajan a su propia fila. */}
        <div className="order-3 sm:order-2 max-sm:basis-full flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {/* Agregar nodo: un botón por forma, siempre visibles (son la acción principal acá). */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded-lg flex-shrink-0 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            {FORMAS.map((f) => (
              <button
                key={f.id}
                onClick={() => agregarNodo(f.id)}
                title={`Agregar ${f.label}`}
                aria-label={`Agregar ${f.label.split(' — ')[0]}`}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  modoOscuro ? 'text-zinc-300 hover:bg-zinc-700' : 'text-zinc-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <i className={`ti ${f.icono} text-base`} />
              </button>
            ))}
            <button
              onClick={() => setPanelArticulos((v) => !v)}
              title="Agregar un artículo de un código al mapa (copia del texto)"
              aria-label="Agregar un artículo de un código al mapa"
              aria-pressed={panelArticulos}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                panelArticulos
                  ? modoOscuro ? 'bg-zinc-700 text-zinc-100' : 'bg-white shadow-sm text-zinc-900'
                  : modoOscuro ? 'text-zinc-300 hover:bg-zinc-700' : 'text-zinc-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              <i className="ti ti-book-2 text-base" />
            </button>
          </div>

          {busquedaAbierta && (
            <div className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg flex-shrink-0 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <i className={`ti ti-search text-sm ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setBusqueda('')
                    setBusquedaAbierta(false)
                  } else if (e.key === 'Enter' && coincidencias.length > 0) {
                    const siguiente = (indiceCoincidencia + 1) % coincidencias.length
                    setIndiceCoincidencia(siguiente)
                    irACoincidencia(coincidencias[siguiente])
                  }
                }}
                placeholder="Buscar en el mapa..."
                className={`bg-transparent outline-none text-sm w-36 ${modoOscuro ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`}
              />
              {busqueda && (
                <span className={`text-xs whitespace-nowrap flex-shrink-0 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {coincidencias.length === 0 ? 'sin resultados' : `${indiceCoincidencia + 1} de ${coincidencias.length}`}
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => {
              setBusquedaAbierta((v) => !v)
              if (busquedaAbierta) setBusqueda('')
            }}
            title="Buscar en el mapa"
            aria-label="Buscar en el mapa"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
              busquedaAbierta ? 'text-white' : modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
            }`}
            style={busquedaAbierta ? { background: VERDE } : undefined}
          >
            <i className="ti ti-search text-base" />
          </button>

          <div className={`flex items-center gap-0.5 p-0.5 rounded-lg flex-shrink-0 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <button
              onClick={undo}
              title="Deshacer (Ctrl+Z)"
              aria-label="Deshacer"
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                modoOscuro ? 'text-zinc-300 hover:bg-zinc-700' : 'text-zinc-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              <i className="ti ti-arrow-back-up text-base" />
            </button>
            <button
              onClick={redo}
              title="Rehacer (Ctrl+Y)"
              aria-label="Rehacer"
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                modoOscuro ? 'text-zinc-300 hover:bg-zinc-700' : 'text-zinc-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              <i className="ti ti-arrow-forward-up text-base" />
            </button>
          </div>
        </div>

        <div className="order-2 sm:order-3">
          <MenuCabeceraApunte
            icono="ti-dots"
            etiqueta="Más acciones del mapa"
            claseBoton={claseIconoCabecera}
            claseBotonAbierto={`${claseIconoCabecera} ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}
          >
            {(cerrar) => (
              <>
                {coleccionVinculada && (
                  <FilaMenuCabecera
                    icono="ti-stack-2"
                    titulo="Ver colección"
                    detalle={`Colección vinculada: «${coleccionVinculada.titulo}»`}
                    onClick={() => {
                      cerrar()
                      setColeccionActiva(coleccionVinculada.id)
                      setVistaActiva('colecciones')
                    }}
                  />
                )}
                <FilaMenuCabecera
                  icono="ti-sitemap"
                  titulo="Organizar automáticamente"
                  detalle={edges.length === 0 ? 'Primero conecta algunos nodos.' : 'Según las conexiones que ya hiciste. Sin IA.'}
                  onClick={
                    edges.length === 0
                      ? undefined
                      : () => {
                          cerrar()
                          organizarAutomatico()
                        }
                  }
                />
                <FilaMenuCabecera
                  icono="ti-printer"
                  titulo="Exportar a PDF"
                  detalle="Abre el diálogo de impresión: elige «Guardar como PDF»."
                  onClick={() => {
                    cerrar()
                    window.print()
                  }}
                />
                <FilaMenuCabecera
                  icono="ti-notes"
                  titulo="Crear apunte desde el mapa"
                  detalle="Cada rama pasa a ser una sección del apunte."
                  onClick={() => {
                    cerrar()
                    setCrearApunte(true)
                  }}
                />
                <div className="my-1 mx-3 border-t" style={{ borderColor: 'var(--neu-line)' }} />
                <FilaMenuCabecera
                  icono="ti-trash"
                  titulo="Eliminar mapa mental"
                  detalle="Se puede deshacer justo después."
                  onClick={() => {
                    cerrar()
                    eliminarMapaMentalConDeshacer(mapa.id)
                  }}
                />
              </>
            )}
          </MenuCabeceraApunte>
        </div>
      </div>

      <VistaImprimibleMapaMental mapa={mapa} />
      {crearApunte && <ModalApunteDesdeMapa mapa={mapa} onCerrar={() => setCrearApunte(false)} />}

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
      <div ref={wrapperRef} className="flex-1 relative min-w-0 min-h-0" onDoubleClick={alDobleClicLienzo}>
        <MentalContext.Provider value={ctxValue}>
          <ReactFlow
            onInit={(instance) => {
              rfRef.current = instance
            }}
            nodes={nodesVisibles}
            edges={edgesVisibles}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            snapToGrid
            snapGrid={[15, 15]}
            multiSelectionKeyCode="Shift"
            zoomOnDoubleClick={false}
            // "loose": permite arrastrar una conexión desde CUALQUIER lado
            // del nodo y soltarla en cualquier otro lado (sin esto, React
            // Flow exige que la conexión salga específicamente de un handle
            // "source" y entre a uno "target" — acá los 4 lados son "source"
            // para poder conectar por el costado, no solo arriba/abajo).
            connectionMode={ConnectionMode.Loose}
            // Piso de zoom bien bajo (default de la librería es 0.5): un mapa
            // de 50+ nodos no entra en pantalla ni de cerca con eso — "Ajustar
            // vista" y el "fit to view" antes de imprimir se topaban con este
            // límite y dejaban partes del mapa fuera, tanto en pantalla como
            // en el PDF impreso.
            minZoom={0.05}
            proOptions={{ hideAttribution: true }}
          >
            <Background color={modoOscuro ? '#27272a' : '#e4e4e7'} gap={20} />
            <Controls
              style={{
                background: modoOscuro ? '#18181b' : '#ffffff',
                borderRadius: 8,
                border: `1px solid ${modoOscuro ? '#27272a' : '#e4e4e7'}`,
              }}
            />
                      </ReactFlow>
        </MentalContext.Provider>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center pointer-events-auto max-w-xs px-4">
              <i className={`ti ti-hierarchy-2 text-4xl block mb-2 ${modoOscuro ? 'text-zinc-600' : 'text-zinc-300'}`} aria-hidden="true" />
              <p className={`text-sm font-medium mb-1 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Empieza por la idea central</p>
              <p className={`text-xs mb-4 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                Después, con el nodo elegido: Tab agrega una rama y Enter otra del mismo nivel. Doble clic en un espacio vacío crea un nodo suelto.
              </p>
              <button onClick={crearIdeaCentral} className="boton boton-primario">
                <i className="ti ti-plus" aria-hidden="true" />
                Agregar idea central
              </button>
            </div>
          </div>
        )}
        {nodes.length > 0 && nodes.length <= 6 && (
          <div className={`absolute left-3 bottom-3 pointer-events-none text-[11px] px-2.5 py-1 rounded-full ${modoOscuro ? 'bg-zinc-800 text-zinc-400' : 'bg-white/90 text-zinc-500 shadow-tarjeta'}`}>
            Tab: rama nueva · Enter: otro del mismo nivel · doble clic: nodo suelto
          </div>
        )}
      </div>
      {panelArticulos && (
        <PanelConsultaArticulos
          temaLectura={modoOscuro ? 'oscuro' : 'claro'}
          onCerrar={() => setPanelArticulos(false)}
          onAgregar={agregarArticulo}
          className="h-[46%] md:h-auto flex-shrink-0 border-t md:border-t-0 md:border-l md:w-[var(--ancho-panel,24rem)] lg:w-[var(--ancho-panel,27rem)]"
        />
      )}
      </div>
    </div>
  )
}

// ============= NODO COMPONENT =============

/** Estilos de caja por forma. Rectángulo y óvalo son casos directos de
 * border-radius; "ninguna" no tiene caja, solo el texto subrayado (ver más
 * abajo). Hubo también nube y rombo — se sacaron por no convencer
 * visualmente, ver FormaNodoMental en types/index.ts. */
function CuerpoNodo({
  forma,
  color,
  modoOscuro,
  seleccionado,
  ficha,
  children,
}: {
  ficha?: boolean
  forma: FormaNodoMental
  color: string
  modoOscuro: boolean
  seleccionado: boolean
  children: React.ReactNode
}) {
  // Relleno con un TINTE del propio color del nodo, no blanco/gris liso —
  // buscando ejemplos reales de mapas mentales de derecho (ver charla), el
  // patrón que se repite es burbujas de color sólido, no contornos vacíos;
  // acá va templado (14%/22%, no el color puro) para que el texto siga
  // legible y no termine viéndose como clip-art. Un nodo "neutro" (sin
  // color propio) usa el mismo criterio que ya usa el resto de la app para
  // teñir fondos con el acento (ver sidebar en index.css).
  const fondo = modoOscuro ? `color-mix(in srgb, ${color} 22%, #18181b)` : `color-mix(in srgb, ${color} 14%, #ffffff)`
  // Aro de selección: boxShadow de 2px sólido alrededor del borde recto; sin
  // seleccionar, una sombra un poco más marcada que antes (0 1px 3px se
  // sentía plano) para que el nodo se lea como una tarjeta "levantada".
  const sombraCaja = seleccionado
    ? `0 0 0 2px ${color}`
    : modoOscuro
    ? '0 2px 6px rgba(0,0,0,0.35)'
    : '0 2px 6px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)'
  if (ficha) {
    // Ficha de artículo: fondo neutro y una barra de color al costado (como la ficha del panel de consulta)
    return (
      <div
        className="w-full h-full flex items-center px-3 py-2"
        style={{
          background: modoOscuro ? '#18181b' : '#ffffff',
          border: `1px solid ${modoOscuro ? '#3f3f46' : '#e4e4e7'}`,
          borderLeft: `4px solid ${color}`,
          borderRadius: 8,
          boxShadow: sombraCaja,
        }}
      >
        {children}
      </div>
    )
  }
  if (forma === 'ninguna') {
    // Texto "pelado": sin caja ni fondo, solo subrayado — el nivel que en un
    // apunte de mano no se enmarca (ej. un subtítulo de sección). El aro de
    // selección de las otras formas no aplicaría acá (dibujaría una caja
    // fantasma alrededor de texto suelto); alcanza con el recuadro punteado
    // que ya pone NodeResizer al seleccionar cualquier nodo.
    return (
      <div className="relative w-full h-full flex items-center justify-center px-1 py-1">
        <div
          className="relative z-10 text-center"
          style={{ textDecorationLine: 'underline', textDecorationColor: color, textDecorationThickness: 2, textUnderlineOffset: 4 }}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center text-center px-3 py-2"
      style={{
        background: fondo,
        border: `2px solid ${color}`,
        borderRadius: forma === 'ovalo' ? '50%' : 12,
        boxShadow: sombraCaja,
      }}
    >
      {children}
    </div>
  )
}

const TAMANO_CLASE: Record<TamanoTextoMental, string> = {
  titulo: 'text-base font-bold',
  subtitulo: 'text-sm font-semibold',
  texto: 'text-xs font-normal',
}

/** Formato enriquecido MUY liviano dentro de un mismo nodo: `*negrita*` y
 * `_subrayado_`, sin anidar (ej. no `*_ambos_*`) ni cruzar líneas — no es un
 * editor WYSIWYG, es una convención de marcado que el usuario aplica con los
 * botones de la barra al editar (que envuelven la selección de texto), o
 * escribiéndola directo. Cubre el caso real (resaltar UNA palabra dentro de
 * una frase más larga) sin el costo de un editor de texto enriquecido de
 * verdad. */
function renderTextoEnriquecido(texto: string): React.ReactNode[] {
  const partes = texto.split(/(\*[^*\n]+\*|_[^_\n]+_)/g)
  return partes.map((parte, i) => {
    if (parte.length > 2 && parte.startsWith('*') && parte.endsWith('*')) {
      return <strong key={i}>{parte.slice(1, -1)}</strong>
    }
    if (parte.length > 2 && parte.startsWith('_') && parte.endsWith('_')) {
      return <u key={i}>{parte.slice(1, -1)}</u>
    }
    return parte
  })
}

function NodoMental(props: NodeProps<NodoFlow>) {
  const { id, data, selected } = props
  const { modoOscuro, callbacks, tieneHijos, estaColapsado, cantidadOcultosSi, toggleColapsado } = useMentalCtx()
  const { updateNode } = useReactFlow<NodoFlow, EdgeWithData>()
  const [editando, setEditando] = useState(false)
  const [mostrandoTamanos, setMostrandoTamanos] = useState(false)
  const [mostrandoFormas, setMostrandoFormas] = useState(false)
  const [mostrandoColores, setMostrandoColores] = useState(false)
  const [editandoNota, setEditandoNota] = useState(false)
  const [notaTmp, setNotaTmp] = useState(data.nota ?? '')
  const ref = useRef<HTMLTextAreaElement>(null)
  const medicionRef = useRef<HTMLDivElement>(null)

  const color = data.color ?? VERDE

  useEffect(() => {
    if (!editando) return
    // un nodo recién creado está oculto hasta que React Flow lo mide, y un
    // elemento oculto no puede recibir el foco: se reintenta unos instantes,
    // y solo mientras el foco no haya llegado (así no pisa lo que se escribe)
    const enfocar = () => {
      const el = ref.current
      if (!el || document.activeElement === el) return
      el.focus()
      if (document.activeElement === el) el.select()
    }
    enfocar()
    const t1 = window.setTimeout(enfocar, 60)
    const t2 = window.setTimeout(enfocar, 180)
    const t3 = window.setTimeout(enfocar, 400)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [editando])

  // un nodo recién creado con Tab, Enter o doble clic se abre listo para escribir
  useEffect(() => {
    if (!data.autoEditar) return
    setEditando(true)
    updateNode(id, (n) => ({ data: { ...n.data, autoEditar: false } }))
  }, [data.autoEditar, id, updateNode])

  // Auto-crecer el nodo con el texto: antes el textarea tenía 2 filas fijas
  // sin importar cuánto se escribiera, así que un texto largo simplemente no
  // se veía (había que agrandar el nodo A MANO con NodeResizer, y ni así el
  // textarea de adentro seguía ese tamaño). Ahora el textarea mide su propio
  // contenido (scrollHeight) en cada tecleo y, si no entra en la altura
  // actual del nodo, agranda EL NODO — nunca lo achica solo, así no compite
  // con un ajuste manual del usuario. Tope de 400px: pasado eso, el textarea
  // sigue creciendo el nodo hasta el tope y el resto se desplaza con scroll
  // interno (overflow-y-auto en el textarea), en vez de crecer sin límite.
  useLayoutEffect(() => {
    if (!editando) return
    const ta = ref.current
    if (!ta) return
    const ALTO_MAX = 400
    const PADDING_VERTICAL = 28
    ta.style.height = 'auto'
    const contenido = Math.min(ta.scrollHeight, ALTO_MAX - PADDING_VERTICAL)
    ta.style.height = `${contenido}px`
    const deseada = Math.min(ALTO_MAX, Math.max(MIN_TAMANO[data.forma].h, contenido + PADDING_VERTICAL))
    updateNode(id, (n) => {
      const actual = typeof n.style?.height === 'number' ? n.style.height : 0
      return deseada > actual ? { style: { ...n.style, height: deseada } } : {}
    })
  }, [data.texto, data.forma, editando, id, updateNode])

  // Mismo criterio que el efecto de arriba, pero para el modo VISTA (fuera
  // de edición) — sin esto, un nodo recién creado (plantilla, "usar
  // plantilla" o pegar/duplicar) se quedaba con el alto mínimo de CuerpoNodo
  // hasta que alguien lo abría para editar UNA vez: con texto largo, el
  // óvalo/rectángulo se veía "sin terminar de agrandar" (el texto real se
  // salía de la caja) y las conexiones apuntaban a los bordes de esa caja
  // chica en vez de a los del contenido real — de ahí que hiciera falta un
  // doble clic para que "el marco calzara con los puntos". Mide con
  // scrollHeight (como el de arriba), no con getBoundingClientRect(): el
  // lienzo puede estar zoomeado, y getBoundingClientRect() devuelve el alto
  // YA escalado por ese zoom, lo que daría un resultado distinto según con
  // cuánto zoom esté el mapa en ese momento.
  useLayoutEffect(() => {
    if (editando) return
    const el = medicionRef.current
    if (!el) return
    const PADDING_VERTICAL = data.forma === 'ninguna' ? 8 : 16 // ver py-1/py-2 en CuerpoNodo
    const deseada = Math.max(MIN_TAMANO[data.forma].h, Math.ceil(el.scrollHeight + PADDING_VERTICAL))
    updateNode(id, (n) => {
      const actual = typeof n.style?.height === 'number' ? n.style.height : 0
      return deseada > actual ? { style: { ...n.style, height: deseada } } : {}
    })
  }, [data.texto, data.forma, data.tamanoTexto, editando, id, updateNode])

  useEffect(() => {
    setNotaTmp(data.nota ?? '')
  }, [data.nota])

  const guardarNota = () => {
    callbacks.actualizar(id, { nota: notaTmp.trim() || undefined })
    setEditandoNota(false)
  }

  // Botones "Negrita"/"Subrayado" de la barra: envuelven la SELECCIÓN actual
  // del textarea con el marcador (o, si no hay nada seleccionado, insertan el
  // par de marcadores en el cursor y dejan el cursor entre medio, como
  // cualquier editor). `onMouseDown` con preventDefault en el botón (más
  // abajo) es lo que evita que el textarea pierda el foco (blur) ANTES de
  // que este click llegue a ejecutarse.
  const envolverSeleccion = (marcador: string) => {
    const ta = ref.current
    if (!ta) return
    const inicio = ta.selectionStart ?? 0
    const fin = ta.selectionEnd ?? 0
    const actual = data.texto
    const nuevo = actual.slice(0, inicio) + marcador + actual.slice(inicio, fin) + marcador + actual.slice(fin)
    callbacks.actualizar(id, { texto: nuevo })
    requestAnimationFrame(() => {
      ta.focus()
      if (inicio === fin) ta.setSelectionRange(inicio + marcador.length, inicio + marcador.length)
      else ta.setSelectionRange(inicio + marcador.length, fin + marcador.length)
    })
  }

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_TAMANO[data.forma].w}
        minHeight={MIN_TAMANO[data.forma].h}
        color={color}
        handleStyle={{ width: 10, height: 10, borderRadius: 3, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
        lineStyle={{ borderWidth: 2, borderStyle: 'dashed', opacity: 0.5 }}
      />

      <NodeToolbar isVisible={selected || editando} position={Position.Top} offset={10}>
        <div
          className={`flex items-center gap-0.5 px-1 py-1 rounded-lg shadow-lg ${
            modoOscuro ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
          }`}
        >
          {editando && (
            <>
              <ToolbarBtn
                icono="ti-bold"
                label="Negrita — selecciona texto y haz clic (sin selección, inserta las marcas en el cursor)"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => envolverSeleccion('*')}
                modoOscuro={modoOscuro}
              />
              <ToolbarBtn
                icono="ti-underline"
                label="Subrayado — selecciona texto y haz clic"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => envolverSeleccion('_')}
                modoOscuro={modoOscuro}
              />
              <div className={`w-px h-5 mx-0.5 ${modoOscuro ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
            </>
          )}
          <div className="relative">
            <ToolbarBtn icono="ti-typography" label="Tamaño de texto" onClick={() => setMostrandoTamanos((v) => !v)} modoOscuro={modoOscuro} />
            {mostrandoTamanos && (
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 flex gap-1 p-1.5 rounded-lg shadow-lg ${
                  modoOscuro ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
                }`}
              >
                {TAMANOS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      callbacks.actualizar(id, { tamanoTexto: t.id })
                      setMostrandoTamanos(false)
                    }}
                    title={t.label}
                    className={`w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold transition-colors ${
                      data.tamanoTexto === t.id
                        ? 'text-white'
                        : modoOscuro
                        ? 'text-zinc-300 hover:bg-zinc-700'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                    style={data.tamanoTexto === t.id ? { background: color } : undefined}
                  >
                    {t.muestra}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <ToolbarBtn icono="ti-shape" label="Forma" onClick={() => setMostrandoFormas((v) => !v)} modoOscuro={modoOscuro} />
            {mostrandoFormas && (
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 flex gap-1 p-1.5 rounded-lg shadow-lg ${
                  modoOscuro ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
                }`}
              >
                {FORMAS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      callbacks.actualizar(id, { forma: f.id })
                      setMostrandoFormas(false)
                    }}
                    title={f.label}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      data.forma === f.id
                        ? 'text-white'
                        : modoOscuro
                        ? 'text-zinc-300 hover:bg-zinc-700'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                    style={data.forma === f.id ? { background: color } : undefined}
                  >
                    <i className={`ti ${f.icono} text-sm`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <ToolbarBtn
              icono="ti-palette"
              label="Color con significado — pasá el mouse sobre cada uno"
              onClick={() => setMostrandoColores((v) => !v)}
              modoOscuro={modoOscuro}
            />
            {mostrandoColores && (
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 flex gap-1 p-1.5 rounded-lg shadow-lg ${
                  modoOscuro ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
                }`}
              >
                {PALETA_SEMANTICA.map((p) => (
                  <button
                    key={p.nombre}
                    onClick={() => {
                      callbacks.actualizar(id, { color: p.color ?? undefined })
                      setMostrandoColores(false)
                    }}
                    title={`${p.nombre} — ${p.significado}`}
                    style={{ background: p.color ?? (modoOscuro ? '#3f3f46' : '#e4e4e7') }}
                    className="relative w-5 h-5 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform flex items-center justify-center"
                  >
                    {p.color === null && (
                      <i className={`ti ti-x text-[9px] ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ToolbarBtn
            icono="ti-note"
            label="Nota al margen — una cita o ejemplo corto pegado a este nodo, sin crear otro nodo"
            onClick={() => setEditandoNota(true)}
            modoOscuro={modoOscuro}
          />

          <div className={`w-px h-5 mx-0.5 ${modoOscuro ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <ToolbarBtn icono="ti-copy" label="Duplicar" onClick={() => callbacks.duplicar(id)} modoOscuro={modoOscuro} />
          <ToolbarBtn
            icono="ti-copy-plus"
            label="Duplicar rama (este nodo y todo lo que cuelga de él)"
            onClick={() => callbacks.duplicarRama(id)}
            modoOscuro={modoOscuro}
          />
          <ToolbarBtn
            icono="ti-trash"
            label="Eliminar"
            onClick={() => {
              void confirmar({
                titulo: data.articulo ? '¿Eliminar esta ficha?' : '¿Eliminar este nodo?',
                mensaje: tieneHijos(id)
                  ? 'Se quitan también sus conexiones; las ramas que cuelgan de él quedan sueltas.'
                  : 'Se quitan también sus conexiones.',
                vistaPrevia: data.articulo ?? data.texto.replace(/\*([^*\n]+)\*/g, '$1').replace(/_([^_\n]+)_/g, '$1').trim(),
                nota: 'Puedes deshacerlo con Ctrl+Z.',
                etiquetaConfirmar: 'Eliminar',
                peligro: true,
                clave: 'eliminar-nodo',
              }).then((ok) => ok && callbacks.eliminar(id))
            }}
            modoOscuro={modoOscuro}
            destructivo
          />
        </div>
      </NodeToolbar>

      <div className="relative" style={{ width: '100%', height: '100%', minHeight: 60 }} onDoubleClick={() => setEditando(true)}>
        {HANDLES_POR_LADO.map((h) => (
          <Handle
            key={h.id}
            id={h.id}
            type="source"
            position={h.posicion}
            style={{ background: color, width: 8, height: 8, zIndex: 20 }}
          />
        ))}

        {/* Colapsar/expandir la rama — solo si este nodo tiene hijos. No
            forma parte del mapa guardado (ver colapsados en
            MapaMentalDetalle): es nada más para no tener que scrollear un
            mapa grande entero cuando en el momento solo hace falta mirar
            una rama. `nodrag` + parar la propagación: sin esto, el clic
            movía el nodo en vez de colapsar (mismo problema que el
            textarea de abajo).
            En la ESQUINA superior derecha, no pegado al medio del borde
            derecho: ahí es donde vive el Handle 'right' (ver
            HANDLES_POR_LADO más arriba) — con los dos superpuestos, el
            botón (z-index más alto) le ganaba el clic al handle, y no había
            forma de arrastrar una conexión NUEVA desde el lado derecho de
            un nodo que ya tuviera al menos un hijo. La esquina no compite
            con ninguno de los 4 handles (todos centrados en su lado). */}
        {tieneHijos(id) && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleColapsado(id)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title={
              estaColapsado(id)
                ? `Expandir esta rama (${cantidadOcultosSi(id)} nodo${cantidadOcultosSi(id) === 1 ? '' : 's'} oculto${cantidadOcultosSi(id) === 1 ? '' : 's'})`
                : 'Colapsar esta rama'
            }
            className="nodrag absolute z-30 flex items-center justify-center rounded-full border-2 shadow-sm"
            style={{
              right: -9,
              top: -9,
              minWidth: 19,
              height: 19,
              padding: estaColapsado(id) ? '0 5px' : 0,
              background: modoOscuro ? '#27272a' : '#ffffff',
              borderColor: color,
              color,
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {estaColapsado(id) ? `+${cantidadOcultosSi(id)}` : <i className="ti ti-chevron-up text-[10px]" />}
          </button>
        )}

        <CuerpoNodo ficha={!!data.articulo && !editando} forma={data.forma} color={color} modoOscuro={modoOscuro} seleccionado={!!selected}>
          {editando ? (
            <textarea
              ref={ref}
              value={data.texto}
              onChange={(e) => callbacks.actualizar(id, { texto: e.target.value })}
              onBlur={() => setEditando(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  setEditando(false)
                }
                if (e.key === 'Escape') setEditando(false)
              }}
              onClick={(e) => e.stopPropagation()}
              className={`nodrag w-full min-h-[28px] bg-transparent outline-none resize-none overflow-y-auto text-center ${TAMANO_CLASE[data.tamanoTexto]} ${
                modoOscuro ? 'text-white' : 'text-zinc-900'
              }`}
            />
          ) : (
            data.articulo ? (
              <div ref={medicionRef} className="w-full text-left">
                <div className="flex items-center gap-1.5 pb-1 mb-1 border-b" style={{ borderColor: modoOscuro ? '#3f3f46' : '#e4e4e7', color }}>
                  <i className="ti ti-book-2 text-sm flex-shrink-0" aria-hidden="true" />
                  <span className="text-[11px] font-bold uppercase tracking-wide truncate">{data.articulo}</span>
                </div>
                <div
                  className={`nodrag nowheel max-h-[220px] overflow-y-auto pr-1 text-[11px] leading-snug whitespace-pre-wrap break-words ${
                    modoOscuro ? 'text-zinc-100' : 'text-zinc-800'
                  }`}
                  style={{ fontFamily: 'var(--font-lectura)' }}
                >
                  {renderTextoEnriquecido(data.texto.replace(/^\*[^*\n]+\*\n?/, ''))}
                </div>
              </div>
            ) : (
              <div
                ref={medicionRef}
                className={`${TAMANO_CLASE[data.tamanoTexto]} whitespace-pre-wrap break-words ${
                  modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {data.texto ? renderTextoEnriquecido(data.texto) : 'Doble clic para escribir'}
              </div>
            )
          )}
        </CuerpoNodo>

        {/* Nota al margen: SIEMPRE visible (no hace falta pasar el mouse ni
            hacer clic para leerla, igual que la cita chica al lado de un
            concepto en un apunte de mano) — clic para editarla. Vive fuera
            de CuerpoNodo a propósito: no es parte de la figura, es una
            anotación pegada afuera, que es justo el punto (no requiere otro
            nodo + conexión para algo tan chico). */}
        {data.nota && !editandoNota && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditandoNota(true)
            }}
            title="Nota al margen — clic para editar"
            className="nodrag nopan absolute z-20 text-right text-[10px] leading-tight italic hover:underline cursor-text"
            style={{ top: '100%', right: -4, marginTop: 3, width: 150, color: '#dc2626' }}
          >
            {data.nota}
          </button>
        )}
        {editandoNota && (
          <div
            className={`nodrag nopan absolute z-30 p-2 rounded-lg shadow-lg border text-left ${
              modoOscuro ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
            }`}
            style={{ top: '100%', right: -4, marginTop: 3, width: 170 }}
          >
            <textarea
              autoFocus
              value={notaTmp}
              onChange={(e) => setNotaTmp(e.target.value)}
              onBlur={guardarNota}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setNotaTmp(data.nota ?? '')
                  setEditandoNota(false)
                }
              }}
              rows={2}
              placeholder="Nota al margen: cita, artículo o ejemplo corto..."
              className={`w-full text-[11px] bg-transparent outline-none resize-none ${
                modoOscuro ? 'text-white placeholder:text-zinc-500' : 'text-zinc-800 placeholder:text-zinc-400'
              }`}
            />
          </div>
        )}
      </div>
    </>
  )
}

const nodeTypes = { mental: NodoMental }

// ============= CUSTOM EDGE (mismo patrón que Canvas) =============

function EdgeEditable(props: EdgeProps<EdgeWithData>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, markerEnd } = props
  const { modoOscuro, callbacks } = useMentalCtx()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(typeof label === 'string' ? label : '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValor(typeof label === 'string' ? label : '')
  }, [label])
  useEffect(() => {
    if (editando) inputRef.current?.focus()
  }, [editando])

  // Bezier, no recta: el problema original ("la línea sale torcida") no era
  // la curva en sí, era que ANTES solo existían handles arriba/abajo, así
  // que una conexión a un nodo al costado se calculaba igual "sale para
  // abajo, entra por arriba" sin importar dónde estuviera el otro nodo. Con
  // los 4 lados (HANDLES_POR_LADO) la curva ahora arranca y llega por el
  // lado real que se usó, así que sale derecha cuando corresponde y se curva
  // suave cuando no — más parecida a una línea de apunte de mano que una
  // recta calculada, que es además el estilo que se ve en la maqueta.
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const stroke = modoOscuro ? '#52525b' : '#a1a1aa'

  const guardar = () => {
    callbacks.actualizarEtiqueta(id, valor.trim())
    setEditando(false)
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ stroke, strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div
          style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
          className="nodrag nopan"
        >
          {editando ? (
            <input
              ref={inputRef}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onBlur={guardar}
              onKeyDown={(e) => {
                if (e.key === 'Enter') guardar()
                if (e.key === 'Escape') setEditando(false)
              }}
              maxLength={40}
              placeholder="etiqueta..."
              className={`text-[11px] px-2 py-0.5 rounded outline-none border campo-foco ${
                modoOscuro ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white border-zinc-300 text-zinc-900'
              }`}
              style={{ width: 110 }}
            />
          ) : (
            <button
              onClick={() => setEditando(true)}
              className={`text-[11px] px-2 py-0.5 rounded shadow-sm border transition-opacity ${
                label
                  ? modoOscuro
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                    : 'bg-white border-zinc-200 text-zinc-700'
                  : modoOscuro
                  ? 'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 opacity-0 hover:opacity-100'
                  : 'bg-white/80 border-zinc-200 text-zinc-400 opacity-0 hover:opacity-100'
              }`}
            >
              {label || '+ etiqueta'}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const edgeTypes = { editable: EdgeEditable }

// ============= HELPERS =============

function ToolbarBtn({
  icono,
  label,
  onClick,
  modoOscuro,
  destructivo,
  onMouseDown,
}: {
  icono: string
  label: string
  onClick: () => void
  modoOscuro: boolean
  destructivo?: boolean
  onMouseDown?: (e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={label}
      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
        destructivo
          ? modoOscuro
            ? 'text-zinc-400 hover:bg-red-950/50 hover:text-red-400'
            : 'text-zinc-600 hover:bg-red-50 hover:text-red-600'
          : modoOscuro
          ? 'text-zinc-300 hover:bg-zinc-700'
          : 'text-zinc-700 hover:bg-zinc-100'
      }`}
    >
      <i className={`ti ${icono} text-sm`} />
    </button>
  )
}

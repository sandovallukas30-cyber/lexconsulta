import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  MiniMap,
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
import type { MapaMental, NodoMapaMental, ConexionMapaMental, FormaNodoMental, TamanoTextoMental } from '../../types'
import { MAPAS_MENTALES_PLANTILLA } from '../../data/mapasMentalesPlantilla'

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
  const actualizarMapaMental = useStore((s) => s.actualizarMapaMental)
  const eliminarMapaMental = useStore((s) => s.eliminarMapaMental)
  const setMapaMentalActivo = useStore((s) => s.setMapaMentalActivo)

  const mapaActivo = useMemo(() => mapas.find((m) => m.id === mapaActivoId) ?? null, [mapas, mapaActivoId])

  const usarPlantilla = (plantillaId: string) => {
    const plantilla = MAPAS_MENTALES_PLANTILLA.find((p) => p.id === plantillaId)
    if (!plantilla) return
    // Los ids de la plantilla son legibles ("raiz", "gub-1"...) pero no
    // únicos entre distintos mapas guardados — se resuelven a UUIDs reales
    // recién acá, al crear la copia propia (mismo criterio que
    // usarPlantilla en Colecciones: copia independiente, no un vínculo).
    const idsReales = new Map(plantilla.nodos.map((n) => [n.id, crypto.randomUUID()]))
    const posiciones = calcularLayoutMapaMental(
      plantilla.nodos.map((n) => n.id),
      plantilla.conexiones
    )
    const nodos: NodoMapaMental[] = plantilla.nodos.map((n) => ({
      id: idsReales.get(n.id)!,
      posicion: posiciones.get(n.id) ?? { x: 40, y: 40 },
      texto: n.texto,
      forma: n.forma,
      tamanoTexto: n.tamanoTexto,
      color: n.color,
      nota: n.nota,
      // Más ancho para los nodos "título" (normalmente la raíz): antes este
      // extra dependía de la forma (nube), ahora de la jerarquía tipográfica,
      // que es lo que en realidad predecía "esto va a llevar más texto".
      ancho: n.tamanoTexto === 'titulo' ? 220 : 170,
    }))
    const conexiones: ConexionMapaMental[] = plantilla.conexiones.map((c) => {
      const lados = elegirLadosConexion(
        posiciones.get(c.desde) ?? { x: 0, y: 0 },
        posiciones.get(c.hasta) ?? { x: 0, y: 0 }
      )
      return {
        id: crypto.randomUUID(),
        desde: idsReales.get(c.desde)!,
        hasta: idsReales.get(c.hasta)!,
        etiqueta: c.etiqueta,
        desdeHandle: lados.desdeHandle,
        hastaHandle: lados.hastaHandle,
      }
    })
    const id = crearMapaMental(plantilla.titulo)
    actualizarMapaMental(id, { nodos, conexiones })
    setMapaMentalActivo(id)
  }

  if (!mapaActivo) {
    return (
      <ListaMapas
        mapas={mapas}
        modoOscuro={modoOscuro}
        onAbrir={setMapaMentalActivo}
        onCrear={() => {
          const id = crearMapaMental('Nuevo mapa mental')
          setMapaMentalActivo(id)
        }}
        onUsarPlantilla={usarPlantilla}
        onEliminar={eliminarMapaMental}
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

function ListaMapas({
  mapas,
  modoOscuro,
  onAbrir,
  onCrear,
  onUsarPlantilla,
  onEliminar,
}: {
  mapas: MapaMental[]
  modoOscuro: boolean
  onAbrir: (id: string) => void
  onCrear: () => void
  onUsarPlantilla: (id: string) => void
  onEliminar: (id: string) => void
}) {
  return (
    <div className={`fuente-mapa-mental h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: modoOscuro
                ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
                : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
            }}
          >
            <i className="ti ti-hierarchy-2 text-lg" style={{ color: VERDE }} />
          </div>
          <h1 className={`text-xl font-serif font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            Mapas mentales
          </h1>
        </div>
        <p className={`text-sm mb-8 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Diagramas libres para estructurar un tema — formas, tamaños de texto y conexiones, sin depender del texto
          oficial de un artículo.
        </p>

        <button
          onClick={onCrear}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed text-sm font-medium mb-6 transition-colors"
          style={{ borderColor: modoOscuro ? '#3f3f46' : '#d4d4d8', color: VERDE }}
        >
          <i className="ti ti-plus text-base" />
          Nuevo mapa mental
        </button>

        {mapas.length === 0 ? (
          <p className={`text-center text-sm py-10 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Aún no tienes mapas mentales.
          </p>
        ) : (
          <div className="space-y-2">
            {mapas.map((m) => (
              <div
                key={m.id}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                  modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
                }`}
                onClick={() => onAbrir(m.id)}
              >
                <i className={`ti ti-hierarchy-2 text-lg flex-shrink-0 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`} />
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-medium truncate ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                    {m.titulo}
                  </h3>
                  <p className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {m.nodos.length} nodo{m.nodos.length === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`¿Eliminar "${m.titulo}"?`)) onEliminar(m.id)
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                    modoOscuro ? 'text-zinc-500 hover:bg-zinc-700 hover:text-red-400' : 'text-zinc-400 hover:bg-zinc-100 hover:text-red-500'
                  }`}
                >
                  <i className="ti ti-trash text-sm" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10">
          <h2 className={`text-sm font-semibold mb-3 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Plantillas para empezar
          </h2>
          <div className="space-y-2">
            {MAPAS_MENTALES_PLANTILLA.map((p) => (
              <button
                key={p.id}
                onClick={() => onUsarPlantilla(p.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  modoOscuro ? 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <i className="ti ti-template text-lg flex-shrink-0" style={{ color: VERDE }} />
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-medium truncate ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                    {p.titulo}
                  </h3>
                  <p className={`text-xs truncate ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>{p.descripcion}</p>
                </div>
                <i className={`ti ti-chevron-right text-sm flex-shrink-0 ${modoOscuro ? 'text-zinc-600' : 'text-zinc-300'}`} />
              </button>
            ))}
          </div>
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
 * Mismo algoritmo de layout por capas (barycenter, sin IA) que
 * calcularLayoutPorCapas en ColeccionesView.tsx — cada nodo va a la fila que
 * corresponde a la ruta más larga de conexiones que llega hasta él, y dentro
 * de cada fila se ordena por el promedio de X de sus padres, para que un
 * hijo quede alineado bajo lo que lo conecta en vez de disperso en orden de
 * creación. Trabaja sobre ids + conexiones (no sobre NodoFlow completo) para
 * poder reutilizarla también al posicionar una plantilla recién creada, que
 * todavía no tiene nodos "de verdad" en el lienzo.
 */
/** Hash determinístico simple (no criptográfico) para derivar un "jitter"
 * estable a partir del id del nodo: mismo id, mismo desplazamiento siempre
 * — así "Organizar" da resultados reproducibles (no salta cada vez que se
 * lo aprieta) pero igual rompe la grilla perfecta de fila/columna. */
function semillaDesdeId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

function calcularLayoutMapaMental(
  ids: string[],
  conexiones: { desde: string; hasta: string }[]
): Map<string, { x: number; y: number }> {
  const capa = new Map<string, number>()
  for (const id of ids) capa.set(id, 0)

  for (let iter = 0; iter < ids.length + 1; iter++) {
    let cambio = false
    for (const cx of conexiones) {
      if (!capa.has(cx.desde) || !capa.has(cx.hasta)) continue
      const nueva = capa.get(cx.desde)! + 1
      if (nueva > capa.get(cx.hasta)!) {
        capa.set(cx.hasta, nueva)
        cambio = true
      }
    }
    if (!cambio) break
  }

  const padresDe = new Map<string, string[]>()
  for (const cx of conexiones) {
    if (!padresDe.has(cx.hasta)) padresDe.set(cx.hasta, [])
    padresDe.get(cx.hasta)!.push(cx.desde)
  }

  const porCapa = new Map<number, string[]>()
  for (const id of ids) {
    const c = capa.get(id)!
    if (!porCapa.has(c)) porCapa.set(c, [])
    porCapa.get(c)!.push(id)
  }

  const ESPACIO_X = 220
  const ESPACIO_Y = 150
  const MARGEN = 40
  // Desplazamiento chico (mucho menor que ESPACIO_X/Y, no puede generar
  // superposición) para que el resultado se sienta más parecido a un mapa
  // mental hecho a mano y menos a un organigrama perfectamente cuadriculado.
  const JITTER_X = 22
  const JITTER_Y = 16
  const xAsignada = new Map<string, number>()
  const resultado = new Map<string, { x: number; y: number }>()

  for (const c of [...porCapa.keys()].sort((a, b) => a - b)) {
    const items = porCapa.get(c)!
    const conDeseada: { id: string; deseada: number }[] = []
    const sinDeseada: string[] = []
    items.forEach((id, i) => {
      const padres = (padresDe.get(id) ?? []).filter((k) => xAsignada.has(k))
      if (padres.length === 0) {
        sinDeseada.push(id)
      } else {
        const promedio = padres.reduce((suma, k) => suma + xAsignada.get(k)!, 0) / padres.length
        conDeseada.push({ id, deseada: promedio + i * 0.001 })
      }
    })
    conDeseada.sort((a, b) => a.deseada - b.deseada)
    const ordenados = [...conDeseada.map((x) => x.id), ...sinDeseada]
    const deseadaPorId = new Map(conDeseada.map((x) => [x.id, x.deseada]))

    let xPrevio: number | null = null
    ordenados.forEach((id) => {
      const deseada = deseadaPorId.get(id)
      const minimo = xPrevio === null ? MARGEN : xPrevio + ESPACIO_X
      const x = deseada !== undefined ? Math.max(deseada, minimo) : minimo
      // El espaciado ENTRE nodos (xAsignada/xPrevio, arriba) usa la grilla
      // limpia para no arriesgar superposiciones; el jitter se suma recién
      // acá, sobre la posición FINAL que se guarda — así nunca compone entre
      // nodos vecinos ni puede achicar el espacio ya calculado entre ellos.
      xAsignada.set(id, x)
      xPrevio = x
      const semilla = semillaDesdeId(id)
      const jitterX = ((semilla % 1000) / 1000 - 0.5) * 2 * JITTER_X
      const jitterY = (((semilla >>> 3) % 1000) / 1000 - 0.5) * 2 * JITTER_Y
      resultado.set(id, { x: x + jitterX, y: c * ESPACIO_Y + MARGEN + jitterY })
    })
  }
  return resultado
}

/** De qué lado sale/entra una conexión, según dónde queda el otro nodo DE
 * VERDAD — sin esto, tanto "usar plantilla" como "Organizar automático"
 * dejaban todo enganchado por default (sale abajo, entra arriba), sea cual
 * sea la posición real. Con el layout por capas la mayoría de los vecinos
 * quedan al costado (misma fila) más que abajo, así que ese default
 * producía justo la curva "torcida"/con loops que se ve en capturas reales
 * — el fix de handles por lado (HANDLES_POR_LADO) nunca llegaba a
 * aprovecharse en nada creado por plantilla o por el organizador, solo en
 * una conexión que el usuario arrastra a mano. Heurística simple: se
 * compara qué tan lejos están en X contra en Y, y se sale/entra por el eje
 * que predomina. */
function elegirLadosConexion(
  origen: { x: number; y: number },
  destino: { x: number; y: number }
): { desdeHandle: string; hastaHandle: string } {
  const dx = destino.x - origen.x
  const dy = destino.y - origen.y
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? { desdeHandle: 'right', hastaHandle: 'left' } : { desdeHandle: 'left', hastaHandle: 'right' }
  }
  return dy >= 0 ? { desdeHandle: 'bottom', hastaHandle: 'top' } : { desdeHandle: 'top', hastaHandle: 'bottom' }
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
  const eliminarMapaMental = useStore((s) => s.eliminarMapaMental)

  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [tituloTmp, setTituloTmp] = useState(mapa.titulo)

  const nodosIniciales: NodoFlow[] = useMemo(
    () =>
      mapa.nodos.map((n) => ({
        id: n.id,
        type: 'mental',
        position: n.posicion,
        data: { texto: n.texto, forma: migrarForma(n.forma), tamanoTexto: n.tamanoTexto, color: n.color, nota: n.nota },
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
      data: { texto: 'Nuevo', forma, tamanoTexto: 'texto' },
      style: { width: forma === 'ninguna' ? 140 : 160 },
    }
    setNodes((nds) => [...nds, nuevo])
  }

  // ============= ORGANIZAR AUTOMÁTICO =============
  const organizarAutomatico = useCallback(() => {
    if (nodesRef.current.length === 0) return
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
    setTimeout(() => rfRef.current?.fitView({ padding: 0.3, duration: 300 }), 50)
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

  // ============= EXPORTAR / IMPRIMIR =============
  // Ajusta la vista para que entre todo el mapa justo antes de que se abra
  // el diálogo de impresión — sin esto, imprime solo lo que estaba visible
  // en pantalla en ese momento (recortado por el pan/zoom actual).
  useEffect(() => {
    const antesDeImprimir = () => rfRef.current?.fitView({ padding: 0.1, duration: 0 })
    window.addEventListener('beforeprint', antesDeImprimir)
    return () => window.removeEventListener('beforeprint', antesDeImprimir)
  }, [])

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
    }),
    [modoOscuro, handleActualizar, handleEliminarNodo, handleDuplicar, handleDuplicarRama, handleActualizarEtiqueta]
  )

  const guardarTitulo = () => {
    const t = tituloTmp.trim()
    if (t) renombrarMapaMental(mapa.id, t)
    else setTituloTmp(mapa.titulo)
    setEditandoTitulo(false)
  }

  return (
    <div className={`fuente-mapa-mental h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div
        className={`flex items-center gap-3 px-6 py-3 border-b flex-shrink-0 ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <button
          onClick={onVolver}
          title="Volver a Mapas mentales"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
            modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
          }`}
        >
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
            className={`flex-1 min-w-0 bg-transparent outline-none border-b-2 text-lg font-serif font-semibold px-0.5 ${
              modoOscuro ? 'text-white' : 'text-zinc-900'
            }`}
            style={{ borderColor: VERDE }}
          />
        ) : (
          <button
            onClick={() => setEditandoTitulo(true)}
            className="group/title flex-1 min-w-0 text-left flex items-center gap-2"
          >
            <h1 className={`text-lg font-serif font-semibold truncate ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              {mapa.titulo}
            </h1>
            <i
              className={`ti ti-pencil text-xs opacity-0 group-hover/title:opacity-60 transition-opacity flex-shrink-0 ${
                modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            />
          </button>
        )}

        {/* Agregar nodo: un botón por forma, siempre visibles (son la acción principal acá). */}
        <div className={`flex items-center gap-0.5 p-0.5 rounded-lg flex-shrink-0 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          {FORMAS.map((f) => (
            <button
              key={f.id}
              onClick={() => agregarNodo(f.id)}
              title={`Agregar ${f.label}`}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                modoOscuro ? 'text-zinc-300 hover:bg-zinc-700' : 'text-zinc-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              <i className={`ti ${f.icono} text-base`} />
            </button>
          ))}
        </div>

        {busquedaAbierta && (
          <div
            className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg flex-shrink-0 ${
              modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'
            }`}
          >
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
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
            busquedaAbierta
              ? 'text-white'
              : modoOscuro
              ? 'text-zinc-400 hover:bg-zinc-800'
              : 'text-zinc-500 hover:bg-zinc-100'
          }`}
          style={busquedaAbierta ? { background: VERDE } : undefined}
        >
          <i className="ti ti-search text-base" />
        </button>

        <button
          onClick={organizarAutomatico}
          disabled={edges.length === 0}
          title="Organizar automáticamente según las conexiones (sin IA: solo usa lo que ya conectaste)"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
            modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
          }`}
        >
          <i className="ti ti-sitemap text-base" />
        </button>

        <div className={`flex items-center gap-0.5 p-0.5 rounded-lg flex-shrink-0 ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <button
            onClick={undo}
            title="Deshacer (Ctrl+Z)"
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              modoOscuro ? 'text-zinc-300 hover:bg-zinc-700' : 'text-zinc-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            <i className="ti ti-arrow-back-up text-base" />
          </button>
          <button
            onClick={redo}
            title="Rehacer (Ctrl+Y)"
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              modoOscuro ? 'text-zinc-300 hover:bg-zinc-700' : 'text-zinc-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            <i className="ti ti-arrow-forward-up text-base" />
          </button>
        </div>

        <button
          onClick={() => window.print()}
          title="Exportar a PDF: abre el diálogo de impresión, elegí 'Guardar como PDF'"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
            modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
          }`}
        >
          <i className="ti ti-printer text-base" />
        </button>

        <button
          onClick={() => {
            if (confirm(`¿Eliminar el mapa "${mapa.titulo}"?`)) {
              eliminarMapaMental(mapa.id)
            }
          }}
          title="Eliminar mapa mental"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
            modoOscuro ? 'text-zinc-500 hover:bg-zinc-800 hover:text-red-400' : 'text-zinc-400 hover:bg-zinc-100 hover:text-red-500'
          }`}
        >
          <i className="ti ti-trash text-base" />
        </button>
      </div>

      <div ref={wrapperRef} className="flex-1 relative imprimir-mapa-mental">
        <MentalContext.Provider value={ctxValue}>
          <ReactFlow
            onInit={(instance) => {
              rfRef.current = instance
            }}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            snapToGrid
            snapGrid={[15, 15]}
            multiSelectionKeyCode="Shift"
            // "loose": permite arrastrar una conexión desde CUALQUIER lado
            // del nodo y soltarla en cualquier otro lado (sin esto, React
            // Flow exige que la conexión salga específicamente de un handle
            // "source" y entre a uno "target" — acá los 4 lados son "source"
            // para poder conectar por el costado, no solo arriba/abajo).
            connectionMode={ConnectionMode.Loose}
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
            <MiniMap
              nodeColor={(n) => (n.data as NodoData).color ?? VERDE}
              maskColor={modoOscuro ? 'rgba(24,24,27,0.7)' : 'rgba(255,255,255,0.7)'}
              style={{
                background: modoOscuro ? '#18181b' : '#ffffff',
                border: `1px solid ${modoOscuro ? '#27272a' : '#e4e4e7'}`,
              }}
            />
          </ReactFlow>
        </MentalContext.Provider>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <i className={`ti ti-hierarchy-2 text-4xl block mb-2 ${modoOscuro ? 'text-zinc-700' : 'text-zinc-300'}`} />
              <p className={`text-sm ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Usá los botones de forma arriba para agregar el primer nodo
              </p>
            </div>
          </div>
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
  children,
}: {
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
      className="w-full h-full flex items-center justify-center text-center px-4 py-3"
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
  const { modoOscuro, callbacks } = useMentalCtx()
  const { updateNode } = useReactFlow<NodoFlow, EdgeWithData>()
  const [editando, setEditando] = useState(false)
  const [mostrandoTamanos, setMostrandoTamanos] = useState(false)
  const [mostrandoFormas, setMostrandoFormas] = useState(false)
  const [mostrandoColores, setMostrandoColores] = useState(false)
  const [editandoNota, setEditandoNota] = useState(false)
  const [notaTmp, setNotaTmp] = useState(data.nota ?? '')
  const ref = useRef<HTMLTextAreaElement>(null)

  const color = data.color ?? VERDE

  useEffect(() => {
    if (editando) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editando])

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
                label="Negrita — seleccioná texto y hacé clic (sin selección, inserta las marcas en el cursor)"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => envolverSeleccion('*')}
                modoOscuro={modoOscuro}
              />
              <ToolbarBtn
                icono="ti-underline"
                label="Subrayado — seleccioná texto y hacé clic"
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
              if (confirm('¿Eliminar este nodo?')) callbacks.eliminar(id)
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
        <CuerpoNodo forma={data.forma} color={color} modoOscuro={modoOscuro} seleccionado={!!selected}>
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
            <span
              className={`${TAMANO_CLASE[data.tamanoTexto]} whitespace-pre-wrap break-words ${
                modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
              }`}
            >
              {data.texto ? renderTextoEnriquecido(data.texto) : 'Doble clic para escribir'}
            </span>
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
              className={`text-[11px] px-2 py-0.5 rounded outline-none border ${
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

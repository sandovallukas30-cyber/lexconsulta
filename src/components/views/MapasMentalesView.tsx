import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  NodeToolbar,
  EdgeLabelRenderer,
  BaseEdge,
  getBezierPath,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useStore } from '../../store/useStore'
import type { MapaMental, NodoMapaMental, ConexionMapaMental, FormaNodoMental, TamanoTextoMental } from '../../types'

const VERDE = 'var(--accent-base)'
const COLORES_NODO = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#71717a']

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
}

interface NodoCallbacks {
  actualizar: (id: string, cambios: Partial<NodoData>) => void
  eliminar: (id: string) => void
  duplicar: (id: string) => void
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
  const eliminarMapaMental = useStore((s) => s.eliminarMapaMental)
  const setMapaMentalActivo = useStore((s) => s.setMapaMentalActivo)

  const mapaActivo = useMemo(() => mapas.find((m) => m.id === mapaActivoId) ?? null, [mapas, mapaActivoId])

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
  onEliminar,
}: {
  mapas: MapaMental[]
  modoOscuro: boolean
  onAbrir: (id: string) => void
  onCrear: () => void
  onEliminar: (id: string) => void
}) {
  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
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
      </div>
    </div>
  )
}

// ============= DETALLE =============

const FORMAS: { id: FormaNodoMental; icono: string; label: string }[] = [
  { id: 'rectangulo', icono: 'ti-square', label: 'Rectángulo — categoría principal' },
  { id: 'ovalo', icono: 'ti-circle', label: 'Óvalo — subcategoría' },
  { id: 'nube', icono: 'ti-cloud', label: 'Nube — tema raíz' },
  { id: 'rombo', icono: 'ti-diamond', label: 'Rombo — bifurcación / decisión' },
]

const TAMANOS: { id: TamanoTextoMental; label: string; muestra: string }[] = [
  { id: 'titulo', label: 'Título', muestra: 'T' },
  { id: 'subtitulo', label: 'Subtítulo', muestra: 't' },
  { id: 'texto', label: 'Texto', muestra: '·' },
]

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
        data: { texto: n.texto, forma: n.forma, tamanoTexto: n.tamanoTexto, color: n.color },
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
        type: 'editable',
        label: c.etiqueta,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<NodoFlow>(nodosIniciales)
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeWithData>(edgesIniciales)

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
      ancho: typeof n.style?.width === 'number' ? n.style.width : 180,
      alto: typeof n.style?.height === 'number' ? n.style.height : undefined,
    }))
    const conexionesPersist: ConexionMapaMental[] = edges.map((e) => ({
      id: e.id,
      desde: e.source,
      hasta: e.target,
      etiqueta: typeof e.label === 'string' ? e.label : undefined,
    }))
    actualizarMapaMental(mapa.id, { nodos: nodosPersist, conexiones: conexionesPersist })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  const handleActualizar = useCallback(
    (id: string, cambios: Partial<NodoData>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...cambios } } : n)))
    },
    [setNodes]
  )
  const handleEliminarNodo = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    },
    [setNodes, setEdges]
  )
  const handleDuplicar = useCallback(
    (id: string) => {
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
    [setNodes]
  )
  const handleActualizarEtiqueta = useCallback(
    (id: string, etiqueta: string) => {
      setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, label: etiqueta || undefined } : e)))
    },
    [setEdges]
  )

  const onConnect = useCallback(
    (conn: Connection) => setEdges((eds) => addEdge({ ...conn, type: 'editable' }, eds)),
    [setEdges]
  )

  const agregarNodo = (forma: FormaNodoMental) => {
    const nuevo: NodoFlow = {
      id: crypto.randomUUID(),
      type: 'mental',
      position: { x: Math.random() * 300 + 120, y: Math.random() * 200 + 100 },
      data: { texto: 'Nuevo', forma, tamanoTexto: 'texto' },
      style: { width: forma === 'nube' ? 200 : 160 },
    }
    setNodes((nds) => [...nds, nuevo])
  }

  const ctxValue = useMemo<MentalCtx>(
    () => ({
      modoOscuro,
      callbacks: {
        actualizar: handleActualizar,
        eliminar: handleEliminarNodo,
        duplicar: handleDuplicar,
        actualizarEtiqueta: handleActualizarEtiqueta,
      },
    }),
    [modoOscuro, handleActualizar, handleEliminarNodo, handleDuplicar, handleActualizarEtiqueta]
  )

  const guardarTitulo = () => {
    const t = tituloTmp.trim()
    if (t) renombrarMapaMental(mapa.id, t)
    else setTituloTmp(mapa.titulo)
    setEditandoTitulo(false)
  }

  return (
    <div className={`h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
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

      <div className="flex-1 relative">
        <MentalContext.Provider value={ctxValue}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            snapToGrid
            snapGrid={[15, 15]}
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
            <p className={`text-sm ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Usá los botones de forma arriba para agregar el primer nodo
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============= NODO COMPONENT =============

/** Estilos de caja por forma. Rectángulo y óvalo son casos directos de
 * border-radius; nube usa un SVG de fondo (un rectángulo "puro" no se lee
 * como nube con solo CSS); rombo rota un fondo detrás del texto SIN rotar
 * el texto en sí, para que siga siendo legible horizontal. */
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
  const fondo = modoOscuro ? '#27272a' : '#ffffff'
  const sombra = seleccionado ? `0 0 0 2px ${color}` : modoOscuro ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.1)'

  if (forma === 'nube') {
    return (
      <div className="relative w-full h-full flex items-center justify-center px-2 py-2">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          style={{ filter: `drop-shadow(${sombra.replace('0 0 0 2px', '0 0 0px').startsWith('0 1px') ? sombra : ''})` }}
        >
          <path
            d="M45 90 C20 90 10 70 22 55 C10 40 30 20 50 28 C58 10 90 8 100 25 C120 10 150 20 148 42 C175 40 182 68 160 80 C165 100 135 108 118 96 C105 112 65 112 55 96 C35 102 25 92 45 90 Z"
            fill={fondo}
            stroke={color}
            strokeWidth={seleccionado ? 3 : 2}
          />
        </svg>
        <div className="relative z-10 text-center px-4">{children}</div>
      </div>
    )
  }

  if (forma === 'rombo') {
    return (
      <div className="relative w-full h-full flex items-center justify-center px-3 py-3">
        <div
          className="absolute inset-0"
          style={{ background: fondo, border: `2px solid ${color}`, borderRadius: 6, transform: 'rotate(45deg)', boxShadow: sombra }}
        />
        <div className="relative z-10 text-center px-3 py-1 max-w-[65%]">{children}</div>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center text-center px-4 py-3"
      style={{
        background: fondo,
        border: `2px solid ${color}`,
        borderRadius: forma === 'ovalo' ? '50%' : 10,
        boxShadow: sombra,
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

function NodoMental(props: NodeProps<NodoFlow>) {
  const { id, data, selected } = props
  const { modoOscuro, callbacks } = useMentalCtx()
  const [editando, setEditando] = useState(false)
  const [mostrandoTamanos, setMostrandoTamanos] = useState(false)
  const [mostrandoFormas, setMostrandoFormas] = useState(false)
  const [mostrandoColores, setMostrandoColores] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  const color = data.color ?? VERDE

  useEffect(() => {
    if (editando) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editando])

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top} offset={10}>
        <div
          className={`flex items-center gap-0.5 px-1 py-1 rounded-lg shadow-lg ${
            modoOscuro ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
          }`}
        >
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
            <ToolbarBtn icono="ti-palette" label="Color" onClick={() => setMostrandoColores((v) => !v)} modoOscuro={modoOscuro} />
            {mostrandoColores && (
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 flex gap-1 p-1.5 rounded-lg shadow-lg ${
                  modoOscuro ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
                }`}
              >
                {COLORES_NODO.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      callbacks.actualizar(id, { color: c })
                      setMostrandoColores(false)
                    }}
                    style={{ background: c }}
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  />
                ))}
              </div>
            )}
          </div>

          <div className={`w-px h-5 mx-0.5 ${modoOscuro ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <ToolbarBtn icono="ti-copy" label="Duplicar" onClick={() => callbacks.duplicar(id)} modoOscuro={modoOscuro} />
          <ToolbarBtn
            icono="ti-trash"
            label="Eliminar"
            onClick={() => callbacks.eliminar(id)}
            modoOscuro={modoOscuro}
            destructivo
          />
        </div>
      </NodeToolbar>

      <div className="relative" style={{ width: '100%', height: '100%', minHeight: 60 }} onDoubleClick={() => setEditando(true)}>
        <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8, zIndex: 20 }} />
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
              rows={2}
              className={`nodrag w-full bg-transparent outline-none resize-none text-center ${TAMANO_CLASE[data.tamanoTexto]} ${
                modoOscuro ? 'text-white' : 'text-zinc-900'
              }`}
            />
          ) : (
            <span
              className={`${TAMANO_CLASE[data.tamanoTexto]} whitespace-pre-wrap break-words ${
                modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
              }`}
            >
              {data.texto || 'Doble clic para escribir'}
            </span>
          )}
        </CuerpoNodo>
        <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8, zIndex: 20 }} />
      </div>
    </>
  )
}

const nodeTypes = { mental: NodoMental }

// ============= CUSTOM EDGE (mismo patrón que Canvas) =============

function EdgeEditable(props: EdgeProps<EdgeWithData>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label } = props
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

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const stroke = modoOscuro ? '#52525b' : '#a1a1aa'

  const guardar = () => {
    callbacks.actualizarEtiqueta(id, valor.trim())
    setEditando(false)
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke, strokeWidth: 2 }} />
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
}: {
  icono: string
  label: string
  onClick: () => void
  modoOscuro: boolean
  destructivo?: boolean
}) {
  return (
    <button
      onClick={onClick}
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

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
  NodeResizer,
  NodeToolbar,
  EdgeLabelRenderer,
  BaseEdge,
  getBezierPath,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { generarConcepto, generarRelacion, type ResultadoConcepto } from '../../services/canvas'
import type { Canvas, NodoCanvas, ArticuloRelevante } from '../../types'

const VERDE = 'var(--accent-base)'
const COLOR_NEUTRO = '#6b7280'

const tipoColor: Record<string, string> = {
  concepto: VERDE,
  definicion: '#1E5AA8',
  articulos: '#8B4789',
  caso: '#B23A48',
  libre: COLOR_NEUTRO,
}

const tipoIcono: Record<string, string> = {
  concepto: 'ti-bulb',
  definicion: 'ti-book',
  articulos: 'ti-list',
  caso: 'ti-scale',
  libre: 'ti-note',
}

const COLORES_PICKER = [COLOR_NEUTRO, VERDE, '#1E5AA8', '#8B4789', '#B23A48', '#D97706', '#0891B2']

// ============= TYPES =============

type NodoData = {
  titulo: string
  contenido: string
  articulos?: ArticuloRelevante[]
  tipo: NodoCanvas['tipo']
  colorHeredado?: string
  colorOverride?: string
  colapsado: boolean
  nivelExpansion?: number // cuántas veces se ha profundizado este nodo
  expandiendo?: boolean
}

interface NodoCallbacks {
  actualizar: (id: string, cambios: Partial<NodoData>) => void
  eliminar: (id: string) => void
  duplicar: (id: string) => void
  toggleColapso: (id: string) => void
  cambiarColor: (id: string, color: string | undefined) => void
  actualizarEtiqueta: (id: string, etiqueta: string) => void
  profundizar: (id: string, modo: import('../../services/canvas').ModoProfundizacion) => Promise<void>
}

interface CanvasCtx {
  modoOscuro: boolean
  callbacks: NodoCallbacks
}

const CanvasContext = createContext<CanvasCtx | null>(null)

function useCanvasCtx(): CanvasCtx {
  const ctx = useContext(CanvasContext)
  if (!ctx) throw new Error('CanvasContext missing')
  return ctx
}

type NodoFlow = Node<NodoData>
type EdgeWithData = Edge

// ============= COMPONENT =============

export function CanvasView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const canvases = useStore((s) => s.canvases)
  const canvasActivoId = useStore((s) => s.canvasActivoId)
  const guardarCanvas = useStore((s) => s.guardarCanvas)
  const actualizarCanvas = useStore((s) => s.actualizarCanvas)
  const eliminarCanvas = useStore((s) => s.eliminarCanvas)
  const setCanvasActivo = useStore((s) => s.setCanvasActivo)

  const canvasActivo = useMemo(
    () => canvases.find((c) => c.id === canvasActivoId) ?? null,
    [canvases, canvasActivoId]
  )

  const [concepto, setConcepto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [generandoRelacion, setGenerandoRelacion] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarLista, setMostrarLista] = useState(false)
  const [seleccionados, setSeleccionados] = useState<string[]>([])

  const [nodes, setNodes, onNodesChange] = useNodesState<NodoFlow>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeWithData>([])

  const skipPersistRef = useRef(false)
  const nodesRef = useRef<NodoFlow[]>([])
  const edgesRef = useRef<EdgeWithData[]>([])
  nodesRef.current = nodes
  edgesRef.current = edges
  const history = useRef<{ nodes: NodoFlow[]; edges: EdgeWithData[] }[]>([])
  const historyIdx = useRef(-1)

  const pushHistory = useCallback(() => {
    const snap = {
      nodes: nodesRef.current.map((n) => ({ ...n, data: { ...n.data } })),
      edges: edgesRef.current.map((e) => ({ ...e })),
    }
    history.current = history.current.slice(0, historyIdx.current + 1)
    history.current.push(snap)
    if (history.current.length > 50) {
      history.current.shift()
    } else {
      historyIdx.current++
    }
  }, [])

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return
    historyIdx.current--
    const snap = history.current[historyIdx.current]
    skipPersistRef.current = true
    setNodes(snap.nodes)
    setEdges(snap.edges)
  }, [setNodes, setEdges])

  const redo = useCallback(() => {
    if (historyIdx.current >= history.current.length - 1) return
    historyIdx.current++
    const snap = history.current[historyIdx.current]
    skipPersistRef.current = true
    setNodes(snap.nodes)
    setEdges(snap.edges)
  }, [setNodes, setEdges])

  // ============= CALLBACKS =============

  const handleActualizar = useCallback(
    (id: string, cambios: Partial<NodoData>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...cambios } } : n)))
    },
    [setNodes]
  )

  const handleEliminar = useCallback(
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
          position: { x: original.position.x + 40, y: original.position.y + 40 },
          data: { ...original.data },
          selected: false,
        }
        return [...nds, copia]
      })
    },
    [setNodes, pushHistory]
  )

  const handleToggleColapso = useCallback(
    (id: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, colapsado: !n.data.colapsado } } : n))
      )
    },
    [setNodes]
  )

  const handleCambiarColor = useCallback(
    (id: string, color: string | undefined) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, colorOverride: color } } : n))
      )
    },
    [setNodes]
  )

  const handleActualizarEtiqueta = useCallback(
    (id: string, etiqueta: string) => {
      setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, label: etiqueta } : e)))
    },
    [setEdges]
  )

  const handleProfundizar = useCallback(
    async (id: string, modo: import('../../services/canvas').ModoProfundizacion) => {
      const nodo = nodesRef.current.find((n) => n.id === id)
      if (!nodo) return
      // marcar expandiendo
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, expandiendo: true } } : n))
      )
      try {
        const { profundizarNodo } = await import('../../services/canvas')
        const data = nodo.data
        const res = await profundizarNodo({
          tipoNodo: data.tipo === 'concepto' ? 'definicion' : data.tipo,
          titulo: data.titulo,
          contenidoActual: data.contenido,
          articulosActuales: data.articulos,
          modo,
        })
        pushHistory()
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== id) return n
            const articulosFusion = res.articulosNuevos && res.articulosNuevos.length > 0
              ? [...(n.data.articulos ?? []), ...res.articulosNuevos]
              : n.data.articulos
            const separador = `\n\n— ${res.etiquetaSeccion} —\n\n`
            const nuevoContenido = res.contenidoNuevo
              ? `${n.data.contenido}${separador}${res.contenidoNuevo}`
              : n.data.contenido
            // Liberar la altura fija para que el nodo se ajuste solo al
            // contenido nuevo. Mantenemos el ancho que el usuario haya
            // elegido. React Flow re-mide el nodo automáticamente cuando
            // style.height pasa a undefined.
            const { height: _altoViejo, ...restoStyle } = (n.style ?? {}) as Record<string, unknown>
            void _altoViejo
            return {
              ...n,
              style: restoStyle,
              data: {
                ...n.data,
                contenido: nuevoContenido,
                articulos: articulosFusion,
                nivelExpansion: (n.data.nivelExpansion ?? 0) + 1,
                expandiendo: false,
              },
            }
          })
        )
      } catch (e) {
        console.error('Error al profundizar nodo:', e)
        setNodes((nds) =>
          nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, expandiendo: false } } : n))
        )
        alert(e instanceof Error ? e.message : 'No se pudo profundizar el nodo. Intenta de nuevo.')
      }
    },
    [setNodes, pushHistory]
  )

  const callbacks: NodoCallbacks = useMemo(
    () => ({
      actualizar: handleActualizar,
      eliminar: handleEliminar,
      duplicar: handleDuplicar,
      toggleColapso: handleToggleColapso,
      cambiarColor: handleCambiarColor,
      actualizarEtiqueta: handleActualizarEtiqueta,
      profundizar: handleProfundizar,
    }),
    [handleActualizar, handleEliminar, handleDuplicar, handleToggleColapso, handleCambiarColor, handleActualizarEtiqueta, handleProfundizar]
  )

  const ctxValue = useMemo<CanvasCtx>(() => ({ modoOscuro, callbacks }), [modoOscuro, callbacks])

  // ============= LOAD ACTIVE CANVAS =============

  useEffect(() => {
    skipPersistRef.current = true
    if (!canvasActivo) {
      setNodes([])
      setEdges([])
      history.current = []
      historyIdx.current = -1
      return
    }
    const flowNodes: NodoFlow[] = canvasActivo.nodos.map((n) => ({
      id: n.id,
      type: n.tipo,
      position: n.posicion,
      data: {
        titulo: n.titulo,
        contenido: n.contenido,
        articulos: n.articulos,
        tipo: n.tipo,
        colorOverride: n.color,
        colapsado: n.colapsado ?? false,
      },
      style: { width: n.ancho ?? 280, height: n.altura },
    }))
    const flowEdges: EdgeWithData[] = canvasActivo.conexiones.map((c) => ({
      id: c.id,
      source: c.desde,
      target: c.hasta,
      type: 'editable',
      label: c.etiqueta,
    }))
    setNodes(flowNodes)
    setEdges(flowEdges)
    history.current = [
      {
        nodes: flowNodes.map((n) => ({ ...n, data: { ...n.data } })),
        edges: flowEdges.map((e) => ({ ...e })),
      },
    ]
    historyIdx.current = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasActivoId])

  // ============= COLOR DINÁMICO PARA NODOS LIBRES =============

  useEffect(() => {
    setNodes((nds) => {
      let changed = false
      const next = nds.map((n) => {
        if (n.data.tipo !== 'libre') return n
        // Find first connection to a non-libre node
        const adyacentes = edges.filter((e) => e.source === n.id || e.target === n.id)
        let heredado: string | undefined
        for (const e of adyacentes) {
          const otroId = e.source === n.id ? e.target : e.source
          const otro = nds.find((x) => x.id === otroId)
          if (otro && otro.data.tipo !== 'libre') {
            heredado = otro.data.colorOverride ?? tipoColor[otro.data.tipo]
            break
          }
        }
        if (n.data.colorHeredado !== heredado) {
          changed = true
          return { ...n, data: { ...n.data, colorHeredado: heredado } }
        }
        return n
      })
      return changed ? next : nds
    })
  }, [edges, setNodes])

  // ============= PERSIST TO STORE =============

  useEffect(() => {
    if (!canvasActivo) return
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    const nodosPersist: NodoCanvas[] = nodes.map((n) => ({
      id: n.id,
      tipo: n.data.tipo,
      posicion: n.position,
      titulo: n.data.titulo,
      contenido: n.data.contenido,
      articulos: n.data.articulos,
      ancho: typeof n.style?.width === 'number' ? n.style.width : 280,
      altura: typeof n.style?.height === 'number' ? n.style.height : undefined,
      colapsado: n.data.colapsado,
      color: n.data.colorOverride,
    }))
    const conexionesPersist = edges.map((e) => ({
      id: e.id,
      desde: e.source,
      hasta: e.target,
      etiqueta: typeof e.label === 'string' ? e.label : undefined,
    }))
    actualizarCanvas(canvasActivo.id, { nodos: nodosPersist, conexiones: conexionesPersist })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  // ============= CONNECT / KEYBOARD =============

  const onConnect = useCallback(
    (conn: Connection) => {
      pushHistory()
      setEdges((eds) => addEdge({ ...conn, type: 'editable' }, eds))
    },
    [setEdges, pushHistory]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  // Push history on drag stop
  const onNodeDragStop = useCallback(() => {
    pushHistory()
  }, [pushHistory])

  // Track selection for "Generar relación"
  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSeleccionados(params.nodes.map((n) => n.id))
  }, [])

  // ============= GENERATE =============

  const generar = async () => {
    const c = concepto.trim()
    if (!c || cargando) return
    setCargando(true)
    setError(null)
    try {
      const res = await generarConcepto(c)
      if (canvasActivo) {
        pushHistory()
        const maxX = nodes.reduce((m, n) => {
          const w = typeof n.style?.width === 'number' ? n.style.width : 280
          return Math.max(m, n.position.x + w)
        }, 0)
        const originX = maxX > 0 ? maxX + 60 : 0
        const bloque = construirBloqueConcepto(res, originX, 0)
        const flowNodes: NodoFlow[] = bloque.nodos.map((n) => ({
          id: n.id,
          type: n.tipo,
          position: n.posicion,
          data: {
            titulo: n.titulo,
            contenido: n.contenido,
            articulos: n.articulos,
            tipo: n.tipo,
            colapsado: n.colapsado ?? false,
          },
          style: { width: n.ancho ?? 280, height: n.altura },
        }))
        const flowEdges: EdgeWithData[] = bloque.conexiones.map((cn) => ({
          id: cn.id,
          source: cn.desde,
          target: cn.hasta,
          type: 'editable',
        }))
        setNodes((nds) => [...nds, ...flowNodes])
        setEdges((eds) => [...eds, ...flowEdges])
      } else {
        const canvas = construirCanvasDesdeResultado(res)
        guardarCanvas(canvas)
      }
      setConcepto('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando concepto')
    } finally {
      setCargando(false)
    }
  }

  const agregarNodoLibre = () => {
    if (!canvasActivo) return
    pushHistory()
    const nuevo: NodoFlow = {
      id: crypto.randomUUID(),
      type: 'libre',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
      data: {
        titulo: 'Nuevo nodo',
        contenido: 'Doble clic para editar',
        tipo: 'libre',
        colapsado: false,
      },
      style: { width: 240 },
    }
    setNodes((nds) => [...nds, nuevo])
  }

  const generarRelacionEntre = async () => {
    if (seleccionados.length !== 2 || generandoRelacion) return
    const a = nodes.find((n) => n.id === seleccionados[0])
    const b = nodes.find((n) => n.id === seleccionados[1])
    if (!a || !b) return
    setGenerandoRelacion(true)
    try {
      const etiqueta = await generarRelacion(a.data.titulo, b.data.titulo)
      pushHistory()
      setEdges((eds) =>
        addEdge(
          {
            id: `rel-${a.id}-${b.id}-${Date.now()}`,
            source: a.id,
            target: b.id,
            type: 'editable',
            label: etiqueta,
          },
          eds
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando relación')
    } finally {
      setGenerandoRelacion(false)
    }
  }

  const conceptoVacio = !canvasActivo

  return (
    <div className={`h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div
        className={`px-6 py-3 border-b flex items-center gap-3 flex-wrap ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div
          className={`flex-1 min-w-[280px] flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-colors ${
            modoOscuro
              ? 'bg-zinc-800 border-zinc-700 focus-within:border-zinc-600'
              : 'bg-white border-zinc-200 focus-within:border-[var(--accent-500)]'
          }`}
        >
          <i className="ti ti-bulb text-base" style={{ color: VERDE }} />
          <input
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generar()}
            disabled={cargando}
            placeholder={
              canvasActivo
                ? 'Agregar otro concepto al canvas...'
                : 'Escribe un concepto jurídico (ej: "fuero maternal")'
            }
            className={`flex-1 bg-transparent outline-none text-sm ${
              modoOscuro ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
            }`}
          />
          <button
            onClick={generar}
            disabled={!concepto.trim() || cargando}
            className="px-3 py-1 rounded-md text-xs font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: VERDE }}
          >
            {cargando ? (
              <i className="ti ti-loader-2 animate-spin text-base" />
            ) : canvasActivo ? (
              'Agregar'
            ) : (
              'Generar'
            )}
          </button>
        </div>

        {canvasActivo && (
          <>
            <button
              onClick={agregarNodoLibre}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                modoOscuro ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <i className="ti ti-plus text-sm" />
              Nodo libre
            </button>

            {seleccionados.length === 2 && (
              <button
                onClick={generarRelacionEntre}
                disabled={generandoRelacion}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity disabled:opacity-40 flex items-center gap-1.5"
                style={{ background: VERDE }}
              >
                {generandoRelacion ? (
                  <i className="ti ti-loader-2 animate-spin text-sm" />
                ) : (
                  <i className="ti ti-link text-sm" />
                )}
                Generar relación
              </button>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={historyIdx.current <= 0}
                title="Deshacer (Ctrl+Z)"
                aria-label="Deshacer"
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 ${
                  modoOscuro ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                }`}
              >
                <i className="ti ti-arrow-back-up text-base" />
              </button>
              <button
                onClick={redo}
                disabled={historyIdx.current >= history.current.length - 1}
                title="Rehacer (Ctrl+Y)"
                aria-label="Rehacer"
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 ${
                  modoOscuro ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                }`}
              >
                <i className="ti ti-arrow-forward-up text-base" />
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => setMostrarLista(!mostrarLista)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            modoOscuro ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          <i className="ti ti-stack-2 text-sm" />
          Mis canvas ({canvases.length})
        </button>
      </div>

      {error && (
        <div className={`px-6 py-2 text-xs ${modoOscuro ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">cerrar</button>
        </div>
      )}

      <div className="flex-1 relative">
        {conceptoVacio ? (
          <EmptyState modoOscuro={modoOscuro} onSugerencia={(s) => setConcepto(s)} />
        ) : (
          <CanvasContext.Provider value={ctxValue}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              snapToGrid
              snapGrid={[20, 20]}
              multiSelectionKeyCode="Shift"
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
          </CanvasContext.Provider>
        )}

        <AnimatePresence>
          {mostrarLista && (
            <ListaCanvases
              canvases={canvases}
              canvasActivoId={canvasActivoId}
              onSeleccionar={(id) => {
                setCanvasActivo(id)
                setMostrarLista(false)
              }}
              onEliminar={eliminarCanvas}
              onCerrar={() => setMostrarLista(false)}
              modoOscuro={modoOscuro}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============= NODO COMPONENT =============

function NodoBase(props: NodeProps<NodoFlow>) {
  const { id, data, selected } = props
  const { modoOscuro, callbacks } = useCanvasCtx()
  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [editandoContenido, setEditandoContenido] = useState(false)
  const [mostrandoColores, setMostrandoColores] = useState(false)
  const [mostrandoProfundizar, setMostrandoProfundizar] = useState(false)
  const refTit = useRef<HTMLInputElement>(null)
  const refCont = useRef<HTMLTextAreaElement>(null)

  const color =
    data.colorOverride ?? (data.tipo === 'libre' ? data.colorHeredado ?? COLOR_NEUTRO : tipoColor[data.tipo])
  const icono = tipoIcono[data.tipo] ?? 'ti-note'

  useEffect(() => {
    if (editandoTitulo) refTit.current?.focus()
  }, [editandoTitulo])
  useEffect(() => {
    if (editandoContenido) refCont.current?.focus()
  }, [editandoContenido])

  const tieneArticulos = data.tipo === 'articulos' && data.articulos && data.articulos.length > 0

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={180}
        minHeight={data.colapsado ? 60 : 120}
        color={color}
        handleStyle={{
          width: 14,
          height: 14,
          borderRadius: 3,
          border: '2px solid white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
        lineStyle={{ borderWidth: 2, borderStyle: 'dashed', opacity: 0.6 }}
      />

      <NodeToolbar isVisible={selected} position={Position.Top} offset={10}>
        <div
          className={`flex items-center gap-0.5 px-1 py-1 rounded-lg shadow-lg ${
            modoOscuro ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
          }`}
        >
          <ToolbarBtn
            icono={data.colapsado ? 'ti-arrows-maximize' : 'ti-arrows-minimize'}
            label={data.colapsado ? 'Expandir' : 'Colapsar'}
            onClick={() => callbacks.toggleColapso(id)}
            modoOscuro={modoOscuro}
          />
          <ToolbarBtn
            icono="ti-pencil"
            label="Editar"
            onClick={() => setEditandoContenido(true)}
            modoOscuro={modoOscuro}
          />
          <ToolbarBtn
            icono="ti-copy"
            label="Duplicar"
            onClick={() => callbacks.duplicar(id)}
            modoOscuro={modoOscuro}
          />
          <div className="relative">
            <ToolbarBtn
              icono="ti-palette"
              label="Color"
              onClick={() => setMostrandoColores(!mostrandoColores)}
              modoOscuro={modoOscuro}
            />
            {mostrandoColores && (
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 flex gap-1 p-1.5 rounded-lg shadow-lg ${
                  modoOscuro ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
                }`}
              >
                {COLORES_PICKER.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      callbacks.cambiarColor(id, c === COLOR_NEUTRO && data.tipo !== 'libre' ? undefined : c)
                      setMostrandoColores(false)
                    }}
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
                <button
                  onClick={() => {
                    callbacks.cambiarColor(id, undefined)
                    setMostrandoColores(false)
                  }}
                  className={`w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                    modoOscuro ? 'bg-zinc-700' : 'bg-zinc-200'
                  }`}
                  title="Reset"
                  aria-label="Restablecer color"
                >
                  <i className="ti ti-x text-[8px]" />
                </button>
              </div>
            )}
          </div>
          {data.tipo !== 'libre' && (
            <div className="relative">
              <ToolbarBtn
                icono={data.expandiendo ? 'ti-loader-2' : 'ti-sparkles'}
                label={(data.nivelExpansion ?? 0) >= 3 ? 'Límite' : 'Profundizar con IA'}
                onClick={() => {
                  if ((data.nivelExpansion ?? 0) < 3 && !data.expandiendo) {
                    setMostrandoProfundizar((v) => !v)
                  }
                }}
                modoOscuro={modoOscuro}
                deshabilitado={(data.nivelExpansion ?? 0) >= 3 || data.expandiendo}
              />
              {mostrandoProfundizar && (
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 w-44 rounded-lg shadow-lg overflow-hidden ${
                    modoOscuro ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
                  }`}
                >
                  <ProfundizarOpcion
                    icono="ti-zoom-in"
                    label="Más detalle"
                    descripcion="Profundidad doctrinal"
                    onClick={() => {
                      callbacks.profundizar(id, 'detalle')
                      setMostrandoProfundizar(false)
                    }}
                    modoOscuro={modoOscuro}
                  />
                  <ProfundizarOpcion
                    icono="ti-arrows-split"
                    label="Distinciones"
                    descripcion="Conceptos similares"
                    onClick={() => {
                      callbacks.profundizar(id, 'distinciones')
                      setMostrandoProfundizar(false)
                    }}
                    modoOscuro={modoOscuro}
                  />
                  <ProfundizarOpcion
                    icono="ti-bulb"
                    label="Casos prácticos"
                    descripcion="Ejemplos cotidianos"
                    onClick={() => {
                      callbacks.profundizar(id, 'ejemplos')
                      setMostrandoProfundizar(false)
                    }}
                    modoOscuro={modoOscuro}
                  />
                  <ProfundizarOpcion
                    icono="ti-books"
                    label="Más artículos"
                    descripcion="Normas relacionadas"
                    onClick={() => {
                      callbacks.profundizar(id, 'articulos')
                      setMostrandoProfundizar(false)
                    }}
                    modoOscuro={modoOscuro}
                  />
                  {(data.nivelExpansion ?? 0) > 0 && (
                    <div className={`px-2.5 py-1.5 text-[10px] border-t ${modoOscuro ? 'border-zinc-700 text-zinc-500' : 'border-zinc-100 text-zinc-400'}`}>
                      Profundizado {data.nivelExpansion} de 3 veces
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className={`w-px h-5 mx-0.5 ${modoOscuro ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
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

      <div
        className={`rounded-2xl shadow-md border-2 transition-shadow hover:shadow-lg flex flex-col overflow-hidden ${
          modoOscuro ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
        }`}
        style={{
          borderLeftWidth: 5,
          borderLeftColor: color,
          width: '100%',
          // Si el nodo es colapsado o no tiene altura fija, dejamos que crezca
          // con su contenido (auto). Si el usuario fijó una altura manual al
          // arrastrar el resizer, la respetamos llenándola con min-height.
          height: 'auto',
          minHeight: data.colapsado ? undefined : '100%',
        }}
      >
        <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8 }} />

        <div
          onDoubleClick={() => callbacks.toggleColapso(id)}
          className={`flex items-center gap-2 px-3 py-2 border-b cursor-pointer ${
            modoOscuro ? 'border-zinc-700' : 'border-zinc-100'
          }`}
        >
          <i className={`ti ${icono} text-sm`} style={{ color }} />
          {editandoTitulo ? (
            <input
              ref={refTit}
              value={data.titulo}
              onChange={(e) => callbacks.actualizar(id, { titulo: e.target.value })}
              onBlur={() => setEditandoTitulo(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditandoTitulo(false)}
              onClick={(e) => e.stopPropagation()}
              className={`nodrag flex-1 bg-transparent outline-none text-xs font-semibold ${
                modoOscuro ? 'text-white' : 'text-zinc-900'
              }`}
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEditandoTitulo(true)
              }}
              className={`flex-1 text-left text-xs font-semibold uppercase tracking-wide ${
                modoOscuro ? 'text-zinc-200' : 'text-zinc-800'
              }`}
              title="Doble clic en este texto para editar"
            >
              {data.titulo}
            </span>
          )}
          {data.colapsado && (
            <i className={`ti ti-chevron-down text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`} />
          )}
        </div>

        {!data.colapsado && (
          <div className="p-3 flex-1 overflow-y-auto min-h-0">
            {tieneArticulos ? (
              <ul className="space-y-2">
                {data.articulos!.map((art, i) => (
                  <li key={i} className="text-[12px] leading-snug">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-mono font-semibold" style={{ color }}>
                        {art.numero}
                      </span>
                      {art.codigo && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            modoOscuro ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {art.codigo}
                        </span>
                      )}
                    </div>
                    <span className={modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}>{art.relevancia}</span>
                  </li>
                ))}
              </ul>
            ) : editandoContenido ? (
              <textarea
                ref={refCont}
                value={data.contenido}
                onChange={(e) => callbacks.actualizar(id, { contenido: e.target.value })}
                onBlur={() => setEditandoContenido(false)}
                onClick={(e) => e.stopPropagation()}
                rows={4}
                className={`nodrag w-full h-full bg-transparent outline-none text-[13px] leading-relaxed resize-none ${
                  modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              />
            ) : (
              <p
                onDoubleClick={() => setEditandoContenido(true)}
                className={`text-[13px] leading-relaxed whitespace-pre-wrap ${
                  modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
                }`}
                title="Doble clic para editar"
              >
                {data.contenido || '(vacío — doble clic para editar)'}
              </p>
            )}
          </div>
        )}

        <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8 }} />
      </div>
    </>
  )
}

function ToolbarBtn({
  icono,
  label,
  onClick,
  modoOscuro,
  destructivo,
  deshabilitado,
}: {
  icono: string
  label: string
  onClick: () => void
  modoOscuro: boolean
  destructivo?: boolean
  deshabilitado?: boolean
}) {
  const cargando = icono === 'ti-loader-2'
  return (
    <button
      onClick={onClick}
      title={label}
      disabled={deshabilitado}
      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        destructivo
          ? modoOscuro
            ? 'text-zinc-400 hover:bg-red-950/50 hover:text-red-400'
            : 'text-zinc-600 hover:bg-red-50 hover:text-red-600'
          : modoOscuro
          ? 'text-zinc-300 hover:bg-zinc-700'
          : 'text-zinc-700 hover:bg-zinc-100'
      }`}
    >
      <i className={`ti ${icono} text-sm ${cargando ? 'animate-spin' : ''}`} />
    </button>
  )
}

function ProfundizarOpcion({
  icono,
  label,
  descripcion,
  onClick,
  modoOscuro,
}: {
  icono: string
  label: string
  descripcion: string
  onClick: () => void
  modoOscuro: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2.5 py-2 flex items-start gap-2 transition-colors ${
        modoOscuro ? 'hover:bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
      }`}
    >
      <i className={`ti ${icono} text-sm mt-0.5 flex-shrink-0`} style={{ color: VERDE }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium leading-tight">{label}</div>
        <div className={`text-[10px] leading-tight mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
          {descripcion}
        </div>
      </div>
    </button>
  )
}

const nodeTypes = {
  concepto: NodoBase,
  definicion: NodoBase,
  articulos: NodoBase,
  caso: NodoBase,
  libre: NodoBase,
}

// ============= CUSTOM EDGE =============

function EdgeEditable(props: EdgeProps<EdgeWithData>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label } = props
  const { modoOscuro, callbacks } = useCanvasCtx()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(typeof label === 'string' ? label : '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValor(typeof label === 'string' ? label : '')
  }, [label])

  useEffect(() => {
    if (editando) inputRef.current?.focus()
  }, [editando])

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

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
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
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
                modoOscuro
                  ? 'bg-zinc-800 border-zinc-600 text-white'
                  : 'bg-white border-zinc-300 text-zinc-900'
              }`}
              style={{ width: 120 }}
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

interface BloqueConcepto {
  nodos: NodoCanvas[]
  conexiones: { id: string; desde: string; hasta: string; etiqueta?: string }[]
  idConcepto: string
}

function construirBloqueConcepto(res: ResultadoConcepto, originX: number, originY: number): BloqueConcepto {
  const baseId = crypto.randomUUID()
  const idConcepto = `concepto-${baseId}`
  const idDef = `def-${baseId}`
  const idArts = `arts-${baseId}`
  const idCaso = `caso-${baseId}`
  return {
    idConcepto,
    nodos: [
      { id: idConcepto, tipo: 'concepto', posicion: { x: originX + 320, y: originY + 60 }, titulo: res.concepto, contenido: '', ancho: 280, altura: 100, colapsado: true },
      { id: idDef, tipo: 'definicion', posicion: { x: originX + 20, y: originY + 240 }, titulo: 'Definición', contenido: res.definicion, ancho: 280, altura: 200 },
      { id: idArts, tipo: 'articulos', posicion: { x: originX + 340, y: originY + 240 }, titulo: 'Artículos relevantes', contenido: '', articulos: res.articulos, ancho: 280, altura: 240 },
      { id: idCaso, tipo: 'caso', posicion: { x: originX + 660, y: originY + 240 }, titulo: 'Caso didáctico', contenido: res.caso, ancho: 280, altura: 200 },
    ],
    conexiones: [
      { id: `e1-${baseId}`, desde: idConcepto, hasta: idDef },
      { id: `e2-${baseId}`, desde: idConcepto, hasta: idArts },
      { id: `e3-${baseId}`, desde: idConcepto, hasta: idCaso },
    ],
  }
}

function construirCanvasDesdeResultado(res: ResultadoConcepto): Canvas {
  const ahora = new Date()
  const bloque = construirBloqueConcepto(res, 0, 0)
  return {
    id: crypto.randomUUID(),
    nombre: res.concepto,
    concepto: res.concepto,
    fechaCreacion: ahora,
    fechaModificacion: ahora,
    nodos: bloque.nodos,
    conexiones: bloque.conexiones,
  }
}

// ============= EMPTY STATE =============

function EmptyState({ modoOscuro, onSugerencia }: { modoOscuro: boolean; onSugerencia: (s: string) => void }) {
  const sugerencias = ['Fuero maternal', 'Causales de despido', 'Contrato a plazo fijo', 'Subcontratación', 'Tutela de derechos fundamentales']
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
        >
          <i className="ti ti-affiliate text-4xl" style={{ color: VERDE }} />
        </div>
        <h3 className={`text-2xl font-serif font-semibold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          Canvas jurídico inteligente
        </h3>
        <p className={`text-sm leading-relaxed mb-6 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Escribe un concepto y la IA generará un mapa con definición, artículos relevantes y un caso didáctico. Edita
          cada nodo libremente.
        </p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {sugerencias.map((s) => (
            <button
              key={s}
              onClick={() => onSugerencia(s)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                modoOscuro
                  ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                  : 'bg-white border-zinc-200 hover:border-[var(--accent-400)] text-zinc-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============= LISTA CANVASES =============

function ListaCanvases({
  canvases,
  canvasActivoId,
  onSeleccionar,
  onEliminar,
  onCerrar,
  modoOscuro,
}: {
  canvases: Canvas[]
  canvasActivoId: string | null
  onSeleccionar: (id: string) => void
  onEliminar: (id: string) => void
  onCerrar: () => void
  modoOscuro: boolean
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onCerrar}
      />
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className={`absolute right-4 top-4 bottom-4 w-80 z-50 rounded-xl shadow-2xl flex flex-col ${
          modoOscuro ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'
        }`}
      >
        <div className={`px-4 py-3 border-b flex items-center justify-between ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <h3 className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            Mis canvas ({canvases.length})
          </h3>
          <button onClick={onCerrar} aria-label="Cerrar lista de canvas" className={modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}>
            <i className="ti ti-x text-lg" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {canvases.length === 0 ? (
            <p className={`text-center text-xs py-8 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Aún no tienes canvas guardados
            </p>
          ) : (
            canvases.map((c) => {
              const activo = c.id === canvasActivoId
              return (
                <div
                  key={c.id}
                  className={`group rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                    activo
                      ? modoOscuro
                        ? 'bg-[var(--accent-950)]/40 border border-[var(--accent-800)]'
                        : 'bg-[var(--accent-50)] border border-[var(--accent-200)]'
                      : modoOscuro
                      ? 'hover:bg-zinc-800 border border-transparent'
                      : 'hover:bg-zinc-100 border border-transparent'
                  }`}
                  onClick={() => onSeleccionar(c.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                        {c.nombre}
                      </p>
                      <p className={`text-[11px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                        {c.nodos.length} nodos · {new Date(c.fechaModificacion).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('¿Eliminar este canvas?')) onEliminar(c.id)
                      }}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs ${
                        modoOscuro ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'
                      }`}
                    >
                      <i className="ti ti-trash text-sm" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </motion.div>
    </>
  )
}

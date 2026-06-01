import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { cargarCodigo, obtenerCodigo } from '../../services/codigos'
import {
  getGrafo,
  estadisticasGrafo,
  type Relacion,
  type TipoRelacion,
} from '../../services/relaciones'
import { SelectorCodigo } from '../ui/SelectorCodigo'
import type { Articulo, CodigoTipo } from '../../types'

const VERDE = 'var(--accent-base)'
const MORADO = '#8B4789'
const VISIBLES_POR_COLUMNA = 6
const ONBOARDING_KEY = 'prima-lex-mapa-onboarding-visto'

const tipoColor: Record<TipoRelacion, string> = {
  remite: VERDE,
  'sub-articulo': MORADO,
}

const tipoVerbo: Record<TipoRelacion, string> = {
  remite: 'menciona',
  'sub-articulo': 'forma parte de',
}

type MapaNodoData = {
  articulo: Articulo
  esRaiz: boolean
  modoOscuro: boolean
  onSeleccionar: (id: string) => void
  onHacerRaiz: (id: string) => void
}

type MasNodoData = {
  cantidad: number
  lado: 'incoming' | 'outgoing'
  modo: 'expandir' | 'colapsar'
  modoOscuro: boolean
  onAccion: () => void
}

type FlowNode = Node<MapaNodoData> | Node<MasNodoData>

interface ItemRelacion {
  otroId: string
  otro: Articulo
  tipo: TipoRelacion
  score: number
  mismaSeccion: boolean
}

export function MapaView() {
  const codigoElegido = useStore((s) => s.codigoMapaActivo)
  const setCodigoElegido = useStore((s) => s.setCodigoMapa)

  if (!codigoElegido) {
    return (
      <SelectorCodigo
        titulo="Mapa de relaciones"
        descripcion="Elige el código cuyas conexiones internas quieres visualizar"
        icono="ti-network"
        onElegir={(tipo) => setCodigoElegido(tipo)}
      />
    )
  }

  return <MapaInterno tipoActivo={codigoElegido} onCambiarCodigo={() => setCodigoElegido(null)} />
}

function MapaInterno({ tipoActivo, onCambiarCodigo }: { tipoActivo: CodigoTipo; onCambiarCodigo: () => void }) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [raiz, setRaiz] = useState<string | null>(null)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [soloMismoLibro, setSoloMismoLibro] = useState(false)
  const [tipos, setTipos] = useState<TipoRelacion[]>(['remite', 'sub-articulo'])
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false)
  const [expandirIncoming, setExpandirIncoming] = useState(false)
  const [expandirOutgoing, setExpandirOutgoing] = useState(false)
  const [modoLayout, setModoLayout] = useState<'bloque' | 'circular' | 'libre'>('bloque')
  const posicionesLibres = useRef<Map<string, { x: number; y: number }>>(new Map())

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setMostrarOnboarding(true)
    } catch {/* noop */}
  }, [])

  const cerrarOnboarding = () => {
    setMostrarOnboarding(false)
    try {
      localStorage.setItem(ONBOARDING_KEY, '1')
    } catch {/* noop */}
  }

  const [cargandoCodigo, setCargandoCodigo] = useState(!obtenerCodigo(tipoActivo))
  useEffect(() => {
    if (obtenerCodigo(tipoActivo)) {
      setCargandoCodigo(false)
      return
    }
    setCargandoCodigo(true)
    let cancelado = false
    cargarCodigo(tipoActivo).then(() => {
      if (!cancelado) setCargandoCodigo(false)
    })
    return () => {
      cancelado = true
    }
  }, [tipoActivo])

  const codigo = useMemo(() => obtenerCodigo(tipoActivo), [tipoActivo, cargandoCodigo])
  const grafo = useMemo(() => getGrafo(tipoActivo), [tipoActivo, cargandoCodigo])
  const stats = useMemo(() => estadisticasGrafo(tipoActivo), [tipoActivo])

  // Reset when switching code
  useEffect(() => {
    setRaiz(null)
    setSeleccionado(null)
    setExpandirIncoming(false)
    setExpandirOutgoing(false)
    posicionesLibres.current.clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoActivo])

  // Auto-pick default root: Art. 1 (first article)
  useEffect(() => {
    if (!grafo || raiz) return
    const elegido = grafo.articulos.has('Art. 1')
      ? 'Art. 1'
      : [...grafo.articulos.keys()][0]
    setRaiz(elegido)
    setSeleccionado(elegido)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grafo])

  const raizArticulo = useMemo(() => (grafo && raiz ? grafo.articulos.get(raiz) ?? null : null), [grafo, raiz])

  // Build prioritized item lists per side
  const { incomingTodos, outgoingTodos, incomingFiltradas, outgoingFiltradas } = useMemo(() => {
    if (!grafo || !raiz || !raizArticulo) {
      return { incomingTodos: [], outgoingTodos: [], incomingFiltradas: [], outgoingFiltradas: [] }
    }
    const incRaw = grafo.incoming.get(raiz) ?? []
    const outRaw = grafo.outgoing.get(raiz) ?? []

    const aItems = (rels: Relacion[], lado: 'incoming' | 'outgoing'): ItemRelacion[] => {
      const items = rels
        .filter((r) => tipos.includes(r.tipo))
        .map((r) => {
          const otroId = lado === 'incoming' ? r.desde : r.hasta
          const otro = grafo.articulos.get(otroId)
          if (!otro) return null
          return scoreItem(otro, r.tipo, raizArticulo)
        })
        .filter((x): x is ItemRelacion => x !== null)
      // dedupe by otroId
      const seen = new Set<string>()
      return items.filter((it) => {
        if (seen.has(it.otroId)) return false
        seen.add(it.otroId)
        return true
      })
    }

    const incomingTodosL = aItems(incRaw, 'incoming').sort((a, b) => b.score - a.score)
    const outgoingTodosL = aItems(outRaw, 'outgoing').sort((a, b) => b.score - a.score)

    const filtroLibro = (it: ItemRelacion) => !soloMismoLibro || it.mismaSeccion
    return {
      incomingTodos: incomingTodosL,
      outgoingTodos: outgoingTodosL,
      incomingFiltradas: incomingTodosL.filter(filtroLibro),
      outgoingFiltradas: outgoingTodosL.filter(filtroLibro),
    }
  }, [grafo, raiz, raizArticulo, tipos, soloMismoLibro])

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const handleSeleccionar = useCallback((id: string) => setSeleccionado(id), [])
  const handleHacerRaiz = useCallback((id: string) => {
    setRaiz(id)
    setSeleccionado(id)
    setExpandirIncoming(false)
    setExpandirOutgoing(false)
    posicionesLibres.current.clear()
  }, [])

  // Reset expansion cuando cambian los filtros
  useEffect(() => {
    setExpandirIncoming(false)
    setExpandirOutgoing(false)
    posicionesLibres.current.clear()
  }, [tipos, soloMismoLibro])

  // Si cambio de modo (saliendo de libre), limpiar posiciones para que la próxima vez arranque fresh
  useEffect(() => {
    if (modoLayout !== 'libre') {
      posicionesLibres.current.clear()
    }
  }, [modoLayout])

  // Build the graph layout
  useEffect(() => {
    if (!raizArticulo) {
      setNodes([])
      setEdges([])
      return
    }

    const visibIncoming = expandirIncoming
      ? incomingFiltradas
      : incomingFiltradas.slice(0, VISIBLES_POR_COLUMNA)
    const restoIncoming = expandirIncoming
      ? []
      : incomingFiltradas.slice(VISIBLES_POR_COLUMNA)
    const visibOutgoing = expandirOutgoing
      ? outgoingFiltradas
      : outgoingFiltradas.slice(0, VISIBLES_POR_COLUMNA)
    const restoOutgoing = expandirOutgoing
      ? []
      : outgoingFiltradas.slice(VISIBLES_POR_COLUMNA)

    const COL_CENTER = 0
    const ANCHOR_LEFT = -340
    const ANCHOR_RIGHT = 340
    const ROW_HEIGHT = 110
    const COL_WIDTH = 210

    const newNodes: FlowNode[] = []
    const newEdges: Edge[] = []

    // Decide cuántas columnas internas usar según cantidad (modo bloque)
    const internalCols = (n: number) => (n <= 6 ? 1 : n <= 18 ? 2 : n <= 40 ? 3 : 4)

    // Helper: posición según modo
    function getPos(
      defaultX: number,
      defaultY: number,
      nodeId: string
    ): { x: number; y: number } {
      if (modoLayout === 'libre') {
        const guardada = posicionesLibres.current.get(nodeId)
        if (guardada) return guardada
        return { x: defaultX, y: defaultY }
      }
      return { x: defaultX, y: defaultY }
    }

    // ===== POSICIONES DEL ROOT =====
    const rootPos = getPos(COL_CENTER, 0, raizArticulo.a)
    newNodes.push({
      id: raizArticulo.a,
      type: 'articulo',
      position: rootPos,
      data: {
        articulo: raizArticulo,
        esRaiz: true,
        modoOscuro,
        onSeleccionar: handleSeleccionar,
        onHacerRaiz: handleHacerRaiz,
      },
      style: { width: 240 },
    } as Node<MapaNodoData>)

    // Helper: calcular posición default según modo
    function calcPosicion(i: number, totalEnLado: number, lado: 'incoming' | 'outgoing'): { x: number; y: number } {
      if (modoLayout === 'circular') {
        // Semicírculo izquierdo para incoming (90° a 270°), derecho para outgoing (-90° a 90°)
        const radio = Math.max(320, 100 + totalEnLado * 28)
        const angStart = lado === 'incoming' ? Math.PI / 2 : -Math.PI / 2
        const angEnd = lado === 'incoming' ? (3 * Math.PI) / 2 : Math.PI / 2
        const step = totalEnLado > 1 ? (angEnd - angStart) / (totalEnLado - 1) : 0
        const ang = totalEnLado === 1 ? (angStart + angEnd) / 2 : angStart + i * step
        return { x: Math.cos(ang) * radio, y: Math.sin(ang) * radio }
      }
      // bloque (default) y libre arrancan desde bloque
      const cols = internalCols(totalEnLado)
      const filas = Math.ceil(totalEnLado / cols)
      const col = i % cols
      const row = Math.floor(i / cols)
      const x =
        lado === 'incoming'
          ? ANCHOR_LEFT - col * COL_WIDTH
          : ANCHOR_RIGHT + col * COL_WIDTH
      const y = (row - (filas - 1) / 2) * ROW_HEIGHT
      return { x, y }
    }

    // ===== LEFT (incoming) =====
    const tieneExtraIncoming = restoIncoming.length > 0 || (expandirIncoming && incomingFiltradas.length > VISIBLES_POR_COLUMNA)
    const visibConExtra = tieneExtraIncoming ? visibIncoming.length + 1 : visibIncoming.length

    visibIncoming.forEach((it, i) => {
      const defPos = calcPosicion(i, visibConExtra, 'incoming')
      const pos = getPos(defPos.x, defPos.y, it.otroId)
      newNodes.push({
        id: it.otroId,
        type: 'articulo',
        position: pos,
        data: {
          articulo: it.otro,
          esRaiz: false,
          modoOscuro,
          onSeleccionar: handleSeleccionar,
          onHacerRaiz: handleHacerRaiz,
        },
        style: { width: 200 },
      } as Node<MapaNodoData>)
      newEdges.push({
        id: `e-in-${it.otroId}`,
        source: it.otroId,
        target: raizArticulo.a,
        type: 'default',
        animated: false,
        label: tipoVerbo[it.tipo],
        labelStyle: { fontSize: 10, fontWeight: 600, fill: modoOscuro ? '#a1a1aa' : '#52525b' },
        labelBgStyle: { fill: modoOscuro ? '#18181b' : '#ffffff' },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: tipoColor[it.tipo], width: 18, height: 18 },
        style: {
          stroke: tipoColor[it.tipo],
          strokeWidth: 1.5,
          strokeDasharray: it.tipo === 'sub-articulo' ? '5 4' : undefined,
          opacity: visibConExtra > 12 ? 0.5 : 0.75,
        },
      })
    })
    if (tieneExtraIncoming) {
      const idx = visibIncoming.length
      const expandir = restoIncoming.length > 0
      const idNodo = expandir ? '__more-in' : '__less-in'
      const defPos = calcPosicion(idx, visibConExtra, 'incoming')
      const pos = getPos(defPos.x, defPos.y, idNodo)
      newNodes.push({
        id: idNodo,
        type: 'mas',
        position: pos,
        data: {
          cantidad: expandir ? restoIncoming.length : incomingFiltradas.length - VISIBLES_POR_COLUMNA,
          lado: 'incoming',
          modo: expandir ? 'expandir' : 'colapsar',
          modoOscuro,
          onAccion: () => setExpandirIncoming(expandir),
        },
        style: { width: 200 },
      } as Node<MasNodoData>)
    }

    // ===== RIGHT (outgoing) =====
    const tieneExtraOutgoing = restoOutgoing.length > 0 || (expandirOutgoing && outgoingFiltradas.length > VISIBLES_POR_COLUMNA)
    const visibConExtraOut = tieneExtraOutgoing ? visibOutgoing.length + 1 : visibOutgoing.length

    visibOutgoing.forEach((it, i) => {
      const defPos = calcPosicion(i, visibConExtraOut, 'outgoing')
      const pos = getPos(defPos.x, defPos.y, `out-${it.otroId}`)
      newNodes.push({
        id: `out-${it.otroId}`,
        type: 'articulo',
        position: pos,
        data: {
          articulo: it.otro,
          esRaiz: false,
          modoOscuro,
          onSeleccionar: () => handleSeleccionar(it.otroId),
          onHacerRaiz: () => handleHacerRaiz(it.otroId),
        },
        style: { width: 200 },
      } as Node<MapaNodoData>)
      newEdges.push({
        id: `e-out-${it.otroId}`,
        source: raizArticulo.a,
        target: `out-${it.otroId}`,
        type: 'default',
        label: tipoVerbo[it.tipo],
        labelStyle: { fontSize: 10, fontWeight: 600, fill: modoOscuro ? '#a1a1aa' : '#52525b' },
        labelBgStyle: { fill: modoOscuro ? '#18181b' : '#ffffff' },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: tipoColor[it.tipo], width: 18, height: 18 },
        style: {
          stroke: tipoColor[it.tipo],
          strokeWidth: 1.5,
          strokeDasharray: it.tipo === 'sub-articulo' ? '5 4' : undefined,
          opacity: visibConExtraOut > 12 ? 0.5 : 0.75,
        },
      })
    })
    if (tieneExtraOutgoing) {
      const idx = visibOutgoing.length
      const expandir = restoOutgoing.length > 0
      const idNodo = expandir ? '__more-out' : '__less-out'
      const defPos = calcPosicion(idx, visibConExtraOut, 'outgoing')
      const pos = getPos(defPos.x, defPos.y, idNodo)
      newNodes.push({
        id: idNodo,
        type: 'mas',
        position: pos,
        data: {
          cantidad: expandir ? restoOutgoing.length : outgoingFiltradas.length - VISIBLES_POR_COLUMNA,
          lado: 'outgoing',
          modo: expandir ? 'expandir' : 'colapsar',
          modoOscuro,
          onAccion: () => setExpandirOutgoing(expandir),
        },
        style: { width: 200 },
      } as Node<MasNodoData>)
    }

    setNodes(newNodes)
    setEdges(newEdges)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raizArticulo, incomingFiltradas, outgoingFiltradas, modoOscuro, expandirIncoming, expandirOutgoing, modoLayout])

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (modoLayout !== 'libre') return
      posicionesLibres.current.set(node.id, node.position)
    },
    [modoLayout]
  )

  const articuloSeleccionado = useMemo(() => {
    if (!grafo || !seleccionado) return null
    return grafo.articulos.get(seleccionado) ?? null
  }, [grafo, seleccionado])

  if (cargandoCodigo || !grafo || !codigo) {
    return (
      <div className={`h-full flex items-center justify-center ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
          >
            <i className="ti ti-loader-2 text-2xl" style={{ color: VERDE }} />
          </motion.div>
          <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>Cargando código...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div
        className={`flex flex-wrap items-center gap-3 px-6 py-3 border-b ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <button
          onClick={onCambiarCodigo}
          title="Cambiar código"
          className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors group ${
            modoOscuro ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
          }`}
        >
          <i className="ti ti-network text-base" style={{ color: VERDE }} />
          <span className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            {codigo.codigo}
          </span>
          {stats && (
            <span className={`text-[11px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              · {stats.totalArticulos} arts · {stats.totalRelaciones} relaciones
            </span>
          )}
          <i
            className={`ti ti-chevron-down text-xs opacity-0 group-hover:opacity-60 transition-opacity ${
              modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          />
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setBuscadorAbierto(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-w-[260px] ${
            modoOscuro ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          <i className="ti ti-target text-sm" style={{ color: VERDE }} />
          <span className="flex-1 text-left truncate">
            {raiz ? `Centro: ${raiz}` : 'Elegir artículo central...'}
          </span>
          <kbd className={`text-[9px] px-1 py-0.5 rounded font-mono ${modoOscuro ? 'bg-zinc-900' : 'bg-white border'}`}>
            cambiar
          </kbd>
        </button>

        <label
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
            soloMismoLibro
              ? modoOscuro
                ? 'bg-[var(--accent-950)]/60 text-[var(--accent-300)]'
                : 'bg-[var(--accent-50)] text-[var(--accent-800)]'
              : modoOscuro
              ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
          title="Mostrar solo artículos del mismo Libro"
        >
          <input
            type="checkbox"
            checked={soloMismoLibro}
            onChange={(e) => setSoloMismoLibro(e.target.checked)}
            className="sr-only"
          />
          <i className={`ti ${soloMismoLibro ? 'ti-checkbox' : 'ti-square'} text-sm`} />
          Solo mismo Libro
        </label>

        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <FiltroTipo tipo="remite" activo={tipos.includes('remite')} onToggle={() => toggleTipo('remite', tipos, setTipos)} modoOscuro={modoOscuro} />
          <FiltroTipo tipo="sub-articulo" activo={tipos.includes('sub-articulo')} onToggle={() => toggleTipo('sub-articulo', tipos, setTipos)} modoOscuro={modoOscuro} />
        </div>

        <div className={`flex items-center gap-0.5 p-0.5 rounded-lg ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <BotonModo modo="bloque" actual={modoLayout} icono="ti-layout-columns" label="Bloque" onClick={() => setModoLayout('bloque')} modoOscuro={modoOscuro} />
          <BotonModo modo="circular" actual={modoLayout} icono="ti-circle" label="Circular" onClick={() => setModoLayout('circular')} modoOscuro={modoOscuro} />
          <BotonModo modo="libre" actual={modoLayout} icono="ti-hand-grab" label="Libre" onClick={() => setModoLayout('libre')} modoOscuro={modoOscuro} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <PanelDetalle
          articulo={articuloSeleccionado}
          esRaiz={seleccionado === raiz}
          codigoNombre={codigo.codigo}
          incomingTotal={incomingTodos.length}
          incomingMostrados={Math.min(VISIBLES_POR_COLUMNA, incomingFiltradas.length)}
          outgoingTotal={outgoingTodos.length}
          outgoingMostrados={Math.min(VISIBLES_POR_COLUMNA, outgoingFiltradas.length)}
          onHacerRaiz={() => seleccionado && setRaiz(seleccionado)}
          soloMismoLibro={soloMismoLibro}
          modoOscuro={modoOscuro}
        />

        <div className="flex-1 relative">
          {raizArticulo && (
            <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold pointer-events-none ${modoOscuro ? 'bg-zinc-900/80 text-zinc-400' : 'bg-white/80 text-zinc-500'}`}>
              <span>Lo mencionan</span>
              <span>→</span>
              <span style={{ color: VERDE }}>Artículo central</span>
              <span>→</span>
              <span>Menciona a</span>
            </div>
          )}

          {nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={onNodeDragStop}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.3}
              maxZoom={1.5}
              nodesDraggable={modoLayout === 'libre'}
              nodesConnectable={false}
              edgesFocusable={false}
              snapToGrid={modoLayout === 'libre'}
              snapGrid={[20, 20]}
              proOptions={{ hideAttribution: true }}
            >
              <Background color={modoOscuro ? '#27272a' : '#e4e4e7'} gap={24} />
              <Controls
                showInteractive={false}
                style={{
                  background: modoOscuro ? '#18181b' : '#ffffff',
                  borderRadius: 8,
                  border: `1px solid ${modoOscuro ? '#27272a' : '#e4e4e7'}`,
                }}
              />
            </ReactFlow>
          ) : (
            <EmptyState modoOscuro={modoOscuro} onElegir={() => setBuscadorAbierto(true)} />
          )}

          {/* Leyenda */}
          <div
            className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-3 py-1.5 rounded-lg text-[11px] ${
              modoOscuro ? 'bg-zinc-900/90 border border-zinc-800' : 'bg-white/95 border border-zinc-200'
            }`}
          >
            <Leyenda color={VERDE} label="menciona" modoOscuro={modoOscuro} />
            <Leyenda color={MORADO} label="forma parte de" punteada modoOscuro={modoOscuro} />
            <span className={`text-[10px] ml-2 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Doble clic en un nodo → cambia el centro
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mostrarOnboarding && <OnboardingCard onCerrar={cerrarOnboarding} modoOscuro={modoOscuro} />}
      </AnimatePresence>

      <AnimatePresence>
        {buscadorAbierto && (
          <ModalBuscador
            articulos={[...grafo.articulos.values()]}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            onElegir={(id) => {
              setRaiz(id)
              setSeleccionado(id)
              setBuscadorAbierto(false)
              setBusqueda('')
            }}
            onCerrar={() => setBuscadorAbierto(false)}
            modoOscuro={modoOscuro}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============= SCORING & HELPERS =============

function scoreItem(otro: Articulo, tipo: TipoRelacion, raiz: Articulo): ItemRelacion {
  let score = 0
  // Sub-artículos siempre van primero (relación más estrecha que una simple mención)
  if (tipo === 'sub-articulo') score += 10000
  const mismaLibro = !!otro.libro && otro.libro === raiz.libro
  const mismaTitulo = !!otro.titulo && otro.titulo === raiz.titulo
  const mismaCapitulo = !!otro.capitulo && otro.capitulo === raiz.capitulo
  if (mismaLibro) score += 100
  if (mismaTitulo) score += 50
  if (mismaCapitulo) score += 30
  const numR = parseInt(raiz.a.match(/\d+/)?.[0] ?? '0', 10)
  const numO = parseInt(otro.a.match(/\d+/)?.[0] ?? '0', 10)
  const proximidad = Math.max(0, 50 - Math.abs(numR - numO))
  score += proximidad
  return {
    otroId: otro.a,
    otro,
    tipo,
    score,
    mismaSeccion: mismaLibro,
  }
}

function toggleTipo(t: TipoRelacion, actual: TipoRelacion[], set: (v: TipoRelacion[]) => void) {
  if (actual.includes(t)) {
    if (actual.length === 1) return
    set(actual.filter((x) => x !== t))
  } else {
    set([...actual, t])
  }
}

// ============= NODOS =============

function NodoArticuloMapa({ data }: NodeProps<Node<MapaNodoData>>) {
  const { articulo, esRaiz, modoOscuro, onSeleccionar, onHacerRaiz } = data
  const preview = articulo.t.split(/\s+/).slice(0, 9).join(' ') + (articulo.t.split(/\s+/).length > 9 ? '…' : '')
  return (
    <>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <button
        onClick={() => onSeleccionar(articulo.a)}
        onDoubleClick={() => onHacerRaiz(articulo.a)}
        className={`block w-full text-left rounded-xl border-2 transition-all hover:shadow-lg hover:scale-[1.02] ${
          esRaiz
            ? modoOscuro
              ? 'bg-[var(--accent-950)]/60 shadow-md'
              : 'bg-[var(--accent-50)]/90 shadow-md'
            : modoOscuro
            ? 'bg-zinc-800'
            : 'bg-white'
        }`}
        style={{
          borderColor: esRaiz ? VERDE : modoOscuro ? '#3f3f46' : '#e4e4e7',
          padding: esRaiz ? '14px' : '10px',
        }}
      >
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span
            className="font-mono text-xs font-bold"
            style={{ color: esRaiz ? VERDE : modoOscuro ? '#a3e635' : VERDE }}
          >
            {articulo.a}
          </span>
          {esRaiz && <i className="ti ti-target text-xs" style={{ color: VERDE }} />}
        </div>
        <p
          className={`text-[11px] leading-snug line-clamp-2 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}
        >
          {preview}
        </p>
      </button>
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </>
  )
}

function NodoMas({ data }: NodeProps<Node<MasNodoData>>) {
  const { cantidad, modo, modoOscuro, onAccion } = data
  const esExpandir = modo === 'expandir'
  return (
    <>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <button
        onClick={onAccion}
        className={`w-full rounded-xl border-2 border-dashed transition-all hover:scale-[1.02] hover:shadow-md ${
          modoOscuro
            ? 'bg-zinc-900 border-zinc-700 hover:border-[var(--accent-700)] text-zinc-300'
            : 'bg-white border-zinc-300 hover:border-[var(--accent-500)] text-zinc-700'
        }`}
        style={{ padding: '12px' }}
      >
        <div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
          <i
            className={`ti ${esExpandir ? 'ti-plus' : 'ti-minus'} text-base`}
            style={{ color: VERDE }}
          />
          {esExpandir ? `Ver ${cantidad} más` : `Mostrar menos`}
        </div>
        <div className={`text-[10px] mt-1 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
          {esExpandir ? 'Mostrar todos en el mapa' : `${cantidad} ocultos`}
        </div>
      </button>
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </>
  )
}

const nodeTypes = {
  articulo: NodoArticuloMapa as React.ComponentType<NodeProps>,
  mas: NodoMas as React.ComponentType<NodeProps>,
}

// ============= PANEL DETALLE =============

function PanelDetalle({
  articulo,
  esRaiz,
  codigoNombre,
  incomingTotal,
  incomingMostrados,
  outgoingTotal,
  outgoingMostrados,
  onHacerRaiz,
  soloMismoLibro,
  modoOscuro,
}: {
  articulo: Articulo | null
  esRaiz: boolean
  codigoNombre: string
  incomingTotal: number
  incomingMostrados: number
  outgoingTotal: number
  outgoingMostrados: number
  onHacerRaiz: () => void
  soloMismoLibro: boolean
  modoOscuro: boolean
}) {
  if (!articulo) {
    return (
      <aside
        className={`w-80 flex-shrink-0 border-r p-6 ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-white border-zinc-200 text-zinc-400'
        }`}
      >
        <p className="text-sm text-center mt-12">
          <i className="ti ti-pointer text-2xl block mb-2" />
          Selecciona un nodo del mapa para ver su detalle
        </p>
      </aside>
    )
  }

  return (
    <aside
      className={`w-80 flex-shrink-0 border-r flex flex-col overflow-hidden ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      <div className={`px-5 py-4 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="font-mono text-base font-bold" style={{ color: VERDE }}>
            {articulo.a}
          </span>
          {esRaiz ? (
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                modoOscuro ? 'bg-[var(--accent-950)]/60 text-[var(--accent-300)]' : 'bg-[var(--accent-50)] text-[var(--accent-800)]'
              }`}
            >
              Centro actual
            </span>
          ) : (
            <button
              onClick={onHacerRaiz}
              className="text-[10px] font-semibold text-white px-2 py-0.5 rounded"
              style={{ background: VERDE }}
            >
              Hacer centro
            </button>
          )}
        </div>
        <p className={`text-[10px] uppercase tracking-wider font-semibold ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
          {codigoNombre}
        </p>
        {(articulo.libro || articulo.titulo || articulo.capitulo) && (
          <p className={`text-[11px] mt-1.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {[
              articulo.libro && `L. ${articulo.libro.split(' — ')[0]}`,
              articulo.titulo && `T. ${articulo.titulo.split(' — ')[0]}`,
              articulo.capitulo && `C. ${articulo.capitulo.split(' — ')[0]}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <section className={`px-5 py-4 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <h4
            className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${
              modoOscuro ? 'text-zinc-500' : 'text-zinc-500'
            }`}
          >
            Texto
          </h4>
          <div
            className={`text-[13px] leading-relaxed ${modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {articulo.t.split(/\n{2,}/).map((parrafo, i) => (
              <p key={i} className="mb-2 last:mb-0 whitespace-pre-line" style={i === 0 ? undefined : { textIndent: '1rem' }}>
                {parrafo.trim()}
              </p>
            ))}
          </div>
        </section>

        {esRaiz && (
          <section className={`px-5 py-4 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            <ResumenColumna
              titulo="Lo mencionan"
              total={incomingTotal}
              visibles={incomingMostrados}
              soloMismoLibro={soloMismoLibro}
              icono="ti-arrow-left"
              color={VERDE}
              modoOscuro={modoOscuro}
            />
            <ResumenColumna
              titulo="Menciona a"
              total={outgoingTotal}
              visibles={outgoingMostrados}
              soloMismoLibro={soloMismoLibro}
              icono="ti-arrow-right"
              color={VERDE}
              modoOscuro={modoOscuro}
            />
            {(incomingTotal === 0 && outgoingTotal === 0) && (
              <p className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                Este artículo no tiene relaciones detectadas con otros del mismo código.
              </p>
            )}
          </section>
        )}
      </div>
    </aside>
  )
}

function ResumenColumna({
  titulo,
  total,
  visibles,
  soloMismoLibro,
  icono,
  color,
  modoOscuro,
}: {
  titulo: string
  total: number
  visibles: number
  soloMismoLibro: boolean
  icono: string
  color: string
  modoOscuro: boolean
}) {
  return (
    <div className={`mb-3 p-2.5 rounded-lg ${modoOscuro ? 'bg-zinc-800/50' : 'bg-zinc-100/60'}`}>
      <div className="flex items-baseline gap-2 mb-0.5">
        <i className={`ti ${icono} text-sm`} style={{ color }} />
        <span className={`text-xs font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
          {titulo}
        </span>
        <span className={`text-xs ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'} ml-auto`}>{total}</span>
      </div>
      <p className={`text-[10px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
        {visibles < total
          ? `${visibles} visibles en el mapa, ${total - visibles} en "+${total - visibles} más"`
          : visibles > 0
          ? `${visibles} visible${visibles !== 1 ? 's' : ''} en el mapa`
          : soloMismoLibro
          ? 'Ninguno del mismo Libro'
          : 'Ninguno'}
      </p>
    </div>
  )
}

// ============= LEYENDA =============

function Leyenda({
  color,
  label,
  punteada,
  modoOscuro,
}: {
  color: string
  label: string
  punteada?: boolean
  modoOscuro: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="24" height="8" viewBox="0 0 24 8">
        <line
          x1="0"
          y1="4"
          x2="20"
          y2="4"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray={punteada ? '4 3' : undefined}
        />
        <polygon points="20,1 24,4 20,7" fill={color} />
      </svg>
      <span className={modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}>{label}</span>
    </div>
  )
}

// ============= MODAL BUSCADOR =============

function ModalBuscador({
  articulos,
  busqueda,
  setBusqueda,
  onElegir,
  onCerrar,
  modoOscuro,
}: {
  articulos: Articulo[]
  busqueda: string
  setBusqueda: (s: string) => void
  onElegir: (id: string) => void
  onCerrar: () => void
  modoOscuro: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return articulos.slice(0, 50)
    const qNum = q.replace(/[^\d]/g, '')
    return articulos
      .filter((a) => {
        const numMatch = qNum && a.a.replace(/[^\d]/g, '').startsWith(qNum)
        const textMatch = a.t.toLowerCase().includes(q)
        const labelMatch = a.a.toLowerCase().includes(q)
        return numMatch || textMatch || labelMatch
      })
      .slice(0, 50)
  }, [articulos, busqueda])

  useEffect(() => setIdx(0), [busqueda])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCerrar()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIdx((i) => Math.min(i + 1, resultados.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIdx((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter') {
      const r = resultados[idx]
      if (r) onElegir(r.a)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] ${
          modoOscuro ? 'bg-zinc-900' : 'bg-white'
        }`}
      >
        <div
          className={`flex items-center gap-3 px-4 py-3 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}
        >
          <i className="ti ti-target text-lg" style={{ color: VERDE }} />
          <input
            ref={inputRef}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={onKey}
            placeholder='Elegir artículo central por número ("161") o palabra clave...'
            className={`flex-1 bg-transparent outline-none text-base ${
              modoOscuro ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
            }`}
          />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {resultados.map((a, i) => (
            <button
              key={a.a}
              onClick={() => onElegir(a.a)}
              onMouseEnter={() => setIdx(i)}
              className={`w-full text-left px-4 py-2.5 transition-colors ${
                i === idx ? (modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100') : ''
              }`}
            >
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="font-mono text-xs font-semibold" style={{ color: VERDE }}>
                  {a.a}
                </span>
              </div>
              <p className={`text-xs line-clamp-1 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {a.t.split(/\s+/).slice(0, 18).join(' ')}
              </p>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============= FILTROS =============

function BotonModo({
  modo,
  actual,
  icono,
  label,
  onClick,
  modoOscuro,
}: {
  modo: 'bloque' | 'circular' | 'libre'
  actual: 'bloque' | 'circular' | 'libre'
  icono: string
  label: string
  onClick: () => void
  modoOscuro: boolean
}) {
  const activo = modo === actual
  return (
    <button
      onClick={onClick}
      title={`Vista ${label}`}
      className={`w-8 h-7 rounded-md flex items-center justify-center transition-colors ${
        activo
          ? 'text-white'
          : modoOscuro
          ? 'text-zinc-400 hover:text-white'
          : 'text-zinc-500 hover:text-zinc-900'
      }`}
      style={activo ? { background: VERDE } : undefined}
    >
      <i className={`ti ${icono} text-base`} />
    </button>
  )
}

function FiltroTipo({
  tipo,
  activo,
  onToggle,
  modoOscuro,
}: {
  tipo: TipoRelacion
  activo: boolean
  onToggle: () => void
  modoOscuro: boolean
}) {
  const label = tipo === 'remite' ? 'menciona' : 'forma parte de'
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-opacity ${
        activo ? 'opacity-100' : 'opacity-40'
      } ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}
    >
      <span
        className="w-3 h-0.5"
        style={{
          background: tipoColor[tipo],
          borderTop: tipo === 'sub-articulo' ? `2px dashed ${tipoColor[tipo]}` : undefined,
          borderBottom: tipo === 'sub-articulo' ? `2px dashed transparent` : undefined,
        }}
      />
      {label}
    </button>
  )
}

// ============= ONBOARDING =============

function OnboardingCard({ onCerrar, modoOscuro }: { onCerrar: () => void; modoOscuro: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden ${
          modoOscuro ? 'bg-zinc-900' : 'bg-white'
        }`}
      >
        <div className="px-7 py-6 text-center" style={{ background: VERDE }}>
          <i className="ti ti-network text-white text-3xl mb-2 inline-block" />
          <h2 className="text-xl font-serif font-semibold text-white">Cómo leer este mapa</h2>
        </div>
        <div className="p-6 space-y-4">
          <Bullet
            num="1"
            titulo="Un artículo en el centro"
            texto="El artículo principal (en verde, con la diana) es el foco del mapa."
            modoOscuro={modoOscuro}
          />
          <Bullet
            num="2"
            titulo="A la izquierda, los que lo mencionan"
            texto="Otros artículos del código que hacen referencia al artículo central."
            modoOscuro={modoOscuro}
          />
          <Bullet
            num="3"
            titulo="A la derecha, lo que él menciona"
            texto="Artículos a los que el central remite o se relaciona."
            modoOscuro={modoOscuro}
          />
          <Bullet
            num="4"
            titulo="Doble clic para navegar"
            texto="Al hacer doble clic en cualquier nodo, ese pasa a ser el nuevo centro y el mapa se actualiza."
            modoOscuro={modoOscuro}
          />
        </div>
        <div className={`px-6 py-4 border-t flex justify-end ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            onClick={onCerrar}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: VERDE }}
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Bullet({ num, titulo, texto, modoOscuro }: { num: string; titulo: string; texto: string; modoOscuro: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ background: VERDE }}
      >
        {num}
      </span>
      <div>
        <p className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{titulo}</p>
        <p className={`text-xs leading-relaxed mt-0.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>{texto}</p>
      </div>
    </div>
  )
}

// ============= EMPTY STATE =============

function EmptyState({ modoOscuro, onElegir }: { modoOscuro: boolean; onElegir: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
        >
          <i className="ti ti-network text-4xl" style={{ color: VERDE }} />
        </div>
        <h3 className={`text-2xl font-serif font-semibold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          Mapa de relaciones
        </h3>
        <p className={`text-sm leading-relaxed mb-5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Visualiza cómo los artículos del código se conectan entre sí. Elige un artículo central y verás qué
          otros lo mencionan y a cuáles él hace referencia.
        </p>
        <button
          onClick={onElegir}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: VERDE }}
        >
          <i className="ti ti-target text-base" />
          Elegir artículo central
        </button>
      </div>
    </div>
  )
}

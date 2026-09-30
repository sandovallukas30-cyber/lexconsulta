import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { buscar } from '../../services/busqueda'
import { codigosCargados } from '../../services/codigos'
import { buscarEnApuntes, type FragmentoCoincidencia } from '../../services/buscarApuntes'
import type { CodigoTipo } from '../../types'

const VERDE = 'var(--accent-base)'

interface ResultadoBusqueda {
  tipo: 'articulo' | 'apunte' | 'consulta' | 'favorito'
  id: string
  titulo: string
  subtitulo?: string
  codigo?: CodigoTipo
  articulo?: string
  /** Solo apuntes: dónde está y el trozo de texto con la coincidencia. */
  moduloId?: string
  fragmento?: FragmentoCoincidencia | null
}

interface Props {
  onClose: () => void
}

export function Omnibar({ onClose }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const codigos = useStore((s) => s.codigos)
  const historial = useStore((s) => s.historial)
  const favoritos = useStore((s) => s.favoritos)
  const abrirArticuloEnExplorador = useStore((s) => s.abrirArticuloEnExplorador)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const academicoModulos = useStore((s) => s.academicoModulos)
  const ramos = useStore((s) => s.ramos)
  const abrirApunte = useStore((s) => s.abrirApunte)
  const cargarConsulta = useStore((s) => s.cargarConsulta)
  const setOmnibarAbierto = useStore((s) => s.setOmnibarAbierto)
  const agregarVisitado = useStore((s) => s.agregarVisitado)

  const [busqueda, setBusqueda] = useState('')
  // La búsqueda recorre artículos y TODOS los apuntes: se espera a que el
  // usuario deje de teclear 120 ms en vez de buscar en cada tecla.
  const [consulta, setConsulta] = useState('')
  useEffect(() => {
    const t = window.setTimeout(() => setConsulta(busqueda), busqueda ? 120 : 0)
    return () => window.clearTimeout(t)
  }, [busqueda])
  const listaRef = useRef<HTMLDivElement>(null)
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(0)
  // cada búsqueda nueva vuelve a seleccionar el primer resultado
  const [consultaPrevia, setConsultaPrevia] = useState(consulta)
  if (consulta !== consultaPrevia) {
    setConsultaPrevia(consulta)
    setIndiceSeleccionado(0)
  }
  const inputRef = useRef<HTMLInputElement>(null)

  // Autofocus en apertura
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Lógica de búsqueda (derivada: sin estado propio ni efecto)
  const resultados = useMemo<ResultadoBusqueda[]>(() => {
    if (!consulta.trim()) return []

    const busqueda = consulta
    const q = busqueda.toLowerCase()
    const nuevoResultados: ResultadoBusqueda[] = []

    // Buscar artículos reales usando el servicio de búsqueda
    const cargados = codigosCargados()
    const activos = codigos.filter((c) => c.activo && cargados.includes(c.tipo)).map((c) => c.tipo)
    if (activos.length > 0) {
      const articulosEncontrados = buscar(busqueda, activos)
      for (const r of articulosEncontrados.slice(0, 5)) {
        nuevoResultados.push({
          tipo: 'articulo',
          id: `${r.codigo}-${r.articulo.a}`,
          titulo: `${r.articulo.a} — ${r.nombreCodigo}`,
          subtitulo: r.articulo.t.slice(0, 80) + (r.articulo.t.length > 80 ? '…' : ''),
          codigo: r.codigo,
          articulo: r.articulo.a,
        })
      }
    }

    // Apuntes propios (texto completo, sin tildes ni mayúsculas)
    for (const a of buscarEnApuntes(academicoModulos, ramos, busqueda, 5)) {
      nuevoResultados.push({
        tipo: 'apunte',
        id: `apunte-${a.apunteId}`,
        titulo: a.titulo,
        subtitulo: a.ubicacion,
        moduloId: a.moduloId,
        articulo: a.apunteId,
        fragmento: a.fragmento,
      })
    }

    // Buscar en historial de consultas
    const consultasMatches = historial.filter((h) =>
      h.titulo.toLowerCase().includes(q) ||
      h.mensajes.some((m) => m.contenido.toLowerCase().includes(q))
    )
    for (const consulta of consultasMatches.slice(0, 3)) {
      nuevoResultados.push({
        tipo: 'consulta',
        id: consulta.id,
        titulo: consulta.titulo,
        subtitulo: new Date(consulta.fecha).toLocaleDateString('es-CL'),
      })
    }

    // Buscar en favoritos
    const favoritosMatches = favoritos.filter((f) =>
      f.titulo.toLowerCase().includes(q)
    )
    for (const favorito of favoritosMatches.slice(0, 3)) {
      nuevoResultados.push({
        tipo: 'favorito',
        id: favorito.id,
        titulo: favorito.titulo,
        subtitulo: favorito.tipo === 'articulo' ? `Art. favorito` : 'Consulta guardada',
      })
    }

    return nuevoResultados
  }, [consulta, codigos, historial, favoritos, academicoModulos, ramos])

  // El resultado elegido con las flechas siempre visible dentro de la lista
  useEffect(() => {
    listaRef.current?.querySelectorAll('button')[indiceSeleccionado]?.scrollIntoView({ block: 'nearest' })
  }, [indiceSeleccionado])

  // Manejo de teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setIndiceSeleccionado((i) => (i < resultados.length - 1 ? i + 1 : i))
        break
      case 'ArrowUp':
        e.preventDefault()
        setIndiceSeleccionado((i) => (i > 0 ? i - 1 : i))
        break
      case 'Enter':
        e.preventDefault()
        if (resultados[indiceSeleccionado]) {
          seleccionarResultado(resultados[indiceSeleccionado])
        }
        break
    }
  }

  const seleccionarResultado = (resultado: ResultadoBusqueda) => {
    switch (resultado.tipo) {
      case 'articulo':
        if (resultado.codigo) {
          // abre el artículo elegido, no solo el código
          abrirArticuloEnExplorador(resultado.codigo, resultado.articulo ?? '')
          agregarVisitado(resultado.articulo || '', resultado.codigo)
        }
        break
      case 'apunte':
        if (resultado.moduloId && resultado.articulo) abrirApunte(resultado.moduloId, resultado.articulo, busqueda)
        break
      case 'consulta':
        cargarConsulta(resultado.id)
        break
      case 'favorito':
        setVistaActiva('historial')
        break
    }
    setOmnibarAbierto(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[20vh] px-4"
      onClick={() => onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden ${
          modoOscuro ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'
        }`}
      >
        {/* Input */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${
          modoOscuro ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <i className="ti ti-search text-xl" style={{ color: VERDE }} />
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Busca artículos, apuntes, consultas… (Esc para cerrar)"
            className={`flex-1 outline-none text-sm py-2 ${
              modoOscuro
                ? 'bg-zinc-900 text-white placeholder-zinc-500'
                : 'bg-white text-zinc-900 placeholder-zinc-400'
            }`}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
              className={`text-sm px-2 py-1 rounded ${
                modoOscuro
                  ? 'text-zinc-400 hover:bg-zinc-800'
                  : 'text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        {/* Resultados */}
        <AnimatePresence>
          {resultados.length > 0 ? (
            <motion.div
              ref={listaRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`max-h-[60vh] sm:max-h-96 overflow-y-auto ${
                modoOscuro ? 'bg-zinc-800/50' : 'bg-zinc-50'
              }`}
            >
              {resultados.map((resultado, idx) => (
                <button
                  key={resultado.id}
                  onClick={() => seleccionarResultado(resultado)}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                    idx === indiceSeleccionado
                      ? modoOscuro
                        ? 'bg-zinc-700'
                        : 'bg-zinc-100'
                      : modoOscuro
                      ? 'hover:bg-zinc-700/50'
                      : 'hover:bg-zinc-100/50'
                  } ${idx < resultados.length - 1 ? (modoOscuro ? 'border-b border-zinc-700' : 'border-b border-zinc-200') : ''}`}
                >
                  {/* Icono por tipo */}
                  <div className="flex-shrink-0">
                    {resultado.tipo === 'articulo' && (
                      <i className="ti ti-book-2 text-lg" style={{ color: VERDE }} />
                    )}
                    {resultado.tipo === 'apunte' && (
                      <i className="ti ti-notes text-lg" style={{ color: VERDE }} />
                    )}
                    {resultado.tipo === 'consulta' && (
                      <i className="ti ti-messages text-lg" style={{ color: VERDE }} />
                    )}
                    {resultado.tipo === 'favorito' && (
                      <i className="ti ti-bookmark text-lg" style={{ color: VERDE }} />
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      modoOscuro ? 'text-white' : 'text-zinc-900'
                    }`}>
                      {resultado.titulo}
                    </div>
                    {resultado.subtitulo && (
                      <div className={`text-xs truncate ${
                        modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        {resultado.tipo === 'apunte' ? `Apunte · ${resultado.subtitulo}` : resultado.subtitulo}
                      </div>
                    )}
                    {resultado.fragmento && (
                      <div className={`text-xs mt-0.5 line-clamp-2 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {resultado.fragmento.antes}
                        <mark className="rounded px-0.5 bg-yellow-200 text-zinc-900">{resultado.fragmento.coincidencia}</mark>
                        {resultado.fragmento.despues}
                      </div>
                    )}
                  </div>

                  {/* Atajo */}
                  {idx === indiceSeleccionado && (
                    <div className={`text-xs px-2 py-1 rounded font-mono ${
                      modoOscuro
                        ? 'bg-zinc-600 text-zinc-200'
                        : 'bg-zinc-200 text-zinc-700'
                    }`}>
                      ↵
                    </div>
                  )}
                </button>
              ))}
            </motion.div>
          ) : consulta.trim() && consulta === busqueda ? (
            <div className={`px-4 py-8 text-center text-sm ${
              modoOscuro ? 'text-zinc-500' : 'text-zinc-500'
            }`}>
              No se encontraron resultados para "{busqueda}"
            </div>
          ) : (
            <div className={`px-4 py-6 text-center text-sm ${
              modoOscuro ? 'text-zinc-500' : 'text-zinc-500'
            }`}>
              Empieza a escribir para buscar...
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

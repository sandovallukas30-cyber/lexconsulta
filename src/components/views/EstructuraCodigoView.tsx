import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import codigoCivil from '../../data/codigoCivil.json'

type TabType = 'arbol' | 'visual'

interface Estructura {
  libro: string | null
  titulos: {
    titulo: string
    articulos: string[]
  }[]
  totalArticulos: number
}

export default function EstructuraCodigoView() {
  const [activeTab, setActiveTab] = useState<TabType>('arbol')
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set(['PRELIMINAR']))
  const [expandedTitles, setExpandedTitles] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Construir estructura
  const estructura = useMemo(() => {
    const map: Record<string, Estructura> = {}

    codigoCivil.articulos.forEach((art) => {
      const libro = art.libro || 'PRELIMINAR'
      const titulo = art.titulo || 'General'

      if (!map[libro]) {
        map[libro] = { libro, titulos: [], totalArticulos: 0 }
      }

      let titIdx = map[libro].titulos.findIndex((t) => t.titulo === titulo)
      if (titIdx === -1) {
        titIdx = map[libro].titulos.length
        map[libro].titulos.push({ titulo, articulos: [] })
      }

      map[libro].titulos[titIdx].articulos.push(art.a)
      map[libro].totalArticulos++
    })

    return map
  }, [])

  const libros = useMemo(() => {
    const order = ['PRELIMINAR', 'PRIMERO — DE LAS PERSONAS', 'SEGUNDO — DE LOS BIENES, Y DE SU DOMINIO, POSESION, USO Y GOCE', 'TERCERO — DE LA SUCESION POR CAUSA DE MUERTE, Y DE LAS DONACIONES ENTRE VIVOS', 'CUARTO — DE LAS OBLIGACIONES EN GENERAL Y DE LOS CONTRATOS']
    return order.map((k) => estructura[k]).filter(Boolean)
  }, [estructura])

  const totalArticulos = libros.reduce((s, l) => s + l.totalArticulos, 0)

  const toggleBook = (libro: string) => {
    const newSet = new Set(expandedBooks)
    if (newSet.has(libro)) newSet.delete(libro)
    else newSet.add(libro)
    setExpandedBooks(newSet)
  }

  const toggleTitle = (titulo: string) => {
    const newSet = new Set(expandedTitles)
    if (newSet.has(titulo)) newSet.delete(titulo)
    else newSet.add(titulo)
    setExpandedTitles(newSet)
  }

  const filteredLibros = useMemo(() => {
    if (!searchQuery.trim()) return libros

    const query = searchQuery.toLowerCase()
    return libros
      .map((libro) => ({
        ...libro,
        titulos: libro.titulos.filter(
          (t) =>
            t.titulo.toLowerCase().includes(query) ||
            t.articulos.some((a) => a.toLowerCase().includes(query))
        ),
      }))
      .filter((l) => l.titulos.length > 0)
  }, [searchQuery, libros])

  const getLibroColor = (idx: number) => {
    const colors = ['from-emerald-500', 'from-blue-500', 'from-purple-500', 'from-amber-500', 'from-rose-500']
    return colors[idx] || colors[0]
  }

  const getLibroLabel = (libro: string) => {
    if (libro === 'PRELIMINAR') return 'PRELIMINAR'
    const match = libro.match(/^([A-Z]+)/)
    return match ? match[1] : 'LIBRO'
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-800">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Estructura del Código Civil
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('arbol')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'arbol'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-600'
            }`}
          >
            📑 Índice Jerárquico
          </button>
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'visual'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-600'
            }`}
          >
            📊 Análisis Visual
          </button>
        </div>

        {/* Stats */}
        <div className="text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-white">{totalArticulos}</span> artículos • <span className="font-semibold text-slate-900 dark:text-white">{libros.length}</span> libros
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'arbol' ? (
            <motion.div key="arbol" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Buscador */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Buscar título o artículo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Árbol */}
              <div className="space-y-3">
                {filteredLibros.map((libro, libroIdx) => (
                  <div key={libro.libro} className="border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                    {/* Libro Header */}
                    <button
                      onClick={() => toggleBook(libro.libro!)}
                      className={`w-full px-4 py-3 flex items-center gap-3 font-semibold bg-gradient-to-r ${getLibroColor(libroIdx)} to-slate-50 dark:to-zinc-800 text-left hover:opacity-90 transition-opacity text-white`}
                    >
                      <span className={`transform transition-transform ${expandedBooks.has(libro.libro!) ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                      <span className="text-xs font-bold bg-white bg-opacity-30 px-2 py-1 rounded">
                        {getLibroLabel(libro.libro!)}
                      </span>
                      <span className="flex-1 truncate text-sm">{libro.libro}</span>
                      <span className="text-xs bg-white bg-opacity-30 px-2 py-1 rounded">
                        {libro.totalArticulos} art
                      </span>
                    </button>

                    {/* Títulos */}
                    <AnimatePresence>
                      {expandedBooks.has(libro.libro!) && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="border-t border-slate-200 dark:border-zinc-700 divide-y divide-slate-100 dark:divide-zinc-700">
                            {libro.titulos.map((titulo) => (
                              <div key={titulo.titulo} className="bg-slate-50 dark:bg-zinc-900">
                                <button
                                  onClick={() => toggleTitle(titulo.titulo)}
                                  className="w-full px-6 py-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-left"
                                >
                                  <span className={`transform transition-transform text-xs ${expandedTitles.has(titulo.titulo) ? 'rotate-90' : ''}`}>
                                    ▶
                                  </span>
                                  <span className="flex-1">{titulo.titulo}</span>
                                  <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                                    {titulo.articulos.length}
                                  </span>
                                </button>

                                {/* Artículos */}
                                <AnimatePresence>
                                  {expandedTitles.has(titulo.titulo) && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white dark:bg-zinc-950">
                                      <div className="px-8 py-2 space-y-1">
                                        {titulo.articulos.map((art) => (
                                          <div key={art} className="text-xs text-slate-600 dark:text-slate-400 py-1 border-l-2 border-emerald-300 dark:border-emerald-700 pl-3">
                                            {art}
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="visual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Análisis Visual */}
              <div className="space-y-6">
                {/* Gráfico de barras */}
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-zinc-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Distribución de Artículos por Libro</h2>

                  <div className="space-y-4">
                    {libros.map((libro, idx) => {
                      const percentage = (libro.totalArticulos / totalArticulos) * 100
                      const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500']

                      return (
                        <div key={libro.libro} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                              {getLibroLabel(libro.libro!)} — {libro.libro?.replace(/^[A-Z]+ — /, '') || 'PRELIMINAR'}
                            </span>
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                              {libro.totalArticulos} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-8 bg-slate-100 dark:bg-zinc-700 rounded-lg overflow-hidden flex items-center">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className={`h-full ${colors[idx]} flex items-center justify-end pr-3 text-white text-xs font-bold`}
                            >
                              {percentage > 10 && `${percentage.toFixed(0)}%`}
                            </motion.div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Comparativa de títulos */}
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-zinc-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Cantidad de Títulos por Libro</h2>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {libros.map((libro) => (
                      <div key={libro.libro} className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-700 dark:to-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-600">
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{libro.titulos.length}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{getLibroLabel(libro.libro!)} Títulos</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabla de estadísticas */}
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-zinc-700 overflow-x-auto">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Estadísticas Detalladas</h2>

                  <table className="w-full text-sm">
                    <thead className="border-b-2 border-slate-300 dark:border-zinc-600">
                      <tr>
                        <th className="text-left py-2 px-3 text-slate-700 dark:text-slate-300 font-semibold">Libro</th>
                        <th className="text-center py-2 px-3 text-slate-700 dark:text-slate-300 font-semibold">Artículos</th>
                        <th className="text-center py-2 px-3 text-slate-700 dark:text-slate-300 font-semibold">Títulos</th>
                        <th className="text-center py-2 px-3 text-slate-700 dark:text-slate-300 font-semibold">Prom. Art/Título</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-700">
                      {libros.map((libro) => (
                        <tr key={libro.libro} className="hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors">
                          <td className="py-3 px-3 text-slate-900 dark:text-white font-medium text-xs">
                            {getLibroLabel(libro.libro!)} — {libro.libro?.replace(/^[A-Z]+ — /, '') || 'PRELIMINAR'}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                            <span className="inline-block bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded font-semibold">
                              {libro.totalArticulos}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                            <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-semibold">
                              {libro.titulos.length}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400 font-semibold">
                            {(libro.totalArticulos / libro.titulos.length).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 dark:bg-zinc-700 font-bold">
                        <td className="py-3 px-3 text-slate-900 dark:text-white">TOTAL</td>
                        <td className="py-3 px-3 text-center text-emerald-700 dark:text-emerald-400">{totalArticulos}</td>
                        <td className="py-3 px-3 text-center text-blue-700 dark:text-blue-400">
                          {libros.reduce((s, l) => s + l.titulos.length, 0)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300">
                          {(totalArticulos / libros.reduce((s, l) => s + l.titulos.length, 0)).toFixed(1)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

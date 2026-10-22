import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { cargarCodigo, codigosCargados, obtenerCodigo } from '../../services/codigos'
import { obtenerMetadata } from '../../data/codigosMetadata'
import type { CodigoTipo } from '../../types'


const CATEGORIAS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'fundamentales', etiqueta: 'Fundamentales' },
  { id: 'sustantivos', etiqueta: 'Sustantivos' },
  { id: 'procedimentales', etiqueta: 'Procedimentales' },
  { id: 'especiales', etiqueta: 'Leyes especiales' },
]

interface Props {
  titulo: string
  descripcion: string
  icono: string
  onElegir: (tipo: CodigoTipo) => void
}

export function SelectorCodigo({ titulo, descripcion, onElegir }: Props) {
  const codigos = useStore((s) => s.codigos)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const cargados = codigosCargados()
  const [tratadosAbierto, setTratadosAbierto] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [catFiltro, setCatFiltro] = useState<string>('todos')
  const [verTodosCodigos, setVerTodosCodigos] = useState(false)
  const abrirArticulo = useStore((s) => s.abrirArticuloEnExplorador)

  const lista = useMemo(() => {
    return codigos.map((c) => {
      const cargado = cargados.includes(c.tipo)
      const data = cargado ? obtenerCodigo(c.tipo) : null
      return {
        tipo: c.tipo,
        nombre: c.nombre,
        descripcion: c.descripcion,
        categoria: c.categoria,
        bloqueado: c.bloqueado,
        cargado,
        totalArts: data ? data.total_articulos + (data.total_transitorios ?? 0) : 0,
        norma: obtenerMetadata(c.tipo)?.norma ?? '',
      }
    })
  }, [codigos, cargados])

  // Con 54 normas la lista ya no se recorre de un vistazo: filtro por nombre,
  // número de ley o descripción, sin distinguir mayúsculas ni tildes, y
  // tolerando "19496" o "19.496".
  // Cada palabra del filtro debe ser el COMIENZO de alguna palabra ("pacto"
  // no debe traer "impacto ambiental").
  const q = normalizarBusqueda(filtro)
  const palabrasFiltro = q.split(/\s+/).filter(Boolean)
  const coincide = (c: { nombre: string; descripcion: string; norma: string }) => {
    if (palabrasFiltro.length === 0) return true
    const palabras = normalizarBusqueda(`${c.nombre} ${c.descripcion} ${c.norma}`).split(/[^a-z0-9ñ]+/)
    return palabrasFiltro.every((f) => palabras.some((p) => p.startsWith(f)))
  }

  const disponibles = lista.filter((c) => c.cargado && coincide(c))
  const pendientes = lista.filter((c) => !c.cargado)
  // Tres secciones: Códigos (fundamentales + sustantivos + procedimentales),
  // Leyes especiales, y Tratados internacionales.
  const todosLosCodigos = disponibles.filter((c) => c.categoria !== 'especiales' && c.categoria !== 'tratados')
  const codigosDisponibles = catFiltro === 'todos' || catFiltro === 'especiales' ? todosLosCodigos : todosLosCodigos.filter((c) => c.categoria === catFiltro)
  const mostrarCodigos = catFiltro !== 'especiales'
  const leyesEspeciales = catFiltro === 'todos' || catFiltro === 'especiales' ? disponibles.filter((c) => c.categoria === 'especiales') : []
  const tratadosDisponibles = catFiltro === 'todos' ? disponibles.filter((c) => c.categoria === 'tratados') : []
  const cuentaCat = (cat: string) => (cat === 'todos' ? todosLosCodigos.length : cat === 'especiales' ? disponibles.filter((c) => c.categoria === 'especiales').length : todosLosCodigos.filter((c) => c.categoria === cat).length)
  const LIMITE_INICIAL = 6
  const codigosVisibles = verTodosCodigos || q || catFiltro !== 'todos' ? codigosDisponibles : codigosDisponibles.slice(0, LIMITE_INICIAL)

  // «Seguir leyendo»: el último artículo que se abrió en el Explorador (solo en este dispositivo)
  const seguir = useMemo(() => {
    try {
      const v = JSON.parse(localStorage.getItem('prima-lex-seguir') ?? 'null') as { codigo: CodigoTipo; art: string } | null
      if (v && lista.some((c) => c.tipo === v.codigo)) return v
    } catch {
      /* sin almacenamiento */
    }
    return null
  }, [lista])
  const nombreSeguir = seguir ? lista.find((c) => c.tipo === seguir.codigo)?.nombre : null

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mb-5">
          <h1 className="titulo-pagina">{titulo}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--neu-ink2)' }}>{descripcion}</p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-base" style={{ color: 'var(--neu-ink3)' }} aria-hidden />
            <input
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Nombre o número (ej. 18.290)"
              aria-label="Filtrar códigos y leyes"
              className={`w-full rounded-xl pl-10 pr-3 min-h-[48px] text-sm outline-none border campo-foco transition-colors focus:border-[var(--accent-base)] ${
                modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
              }`}
            />
          </div>
          <div role="group" aria-label="Tipo de norma" className="inline-flex flex-wrap gap-1 p-1 rounded-xl" style={{ background: 'var(--neu-bg3)' }}>
            {CATEGORIAS.map((cat) => {
              const activa = catFiltro === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setCatFiltro(cat.id)}
                  aria-pressed={activa}
                  className={`sin-tactil pointer-coarse:min-h-11 min-h-10 px-3.5 rounded-lg text-sm font-semibold transition-colors ${activa ? 'shadow-sm' : 'text-[var(--neu-ink3)]'}`}
                  style={activa ? { background: 'var(--neu-card)', color: 'var(--neu-ink)' } : undefined}
                >
                  {cat.etiqueta}
                  {cat.id === 'todos' && <span className="ml-1.5 text-[12px] tabular-nums opacity-70">{cuentaCat('todos')}</span>}
                </button>
              )
            })}
          </div>
        </div>

        {seguir && nombreSeguir && !q && catFiltro === 'todos' && (
          <section
            aria-label="Seguir leyendo"
            className="rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-4"
            style={{ background: 'color-mix(in srgb, var(--accent-base) 12%, var(--neu-bg))', border: '1px solid var(--neu-line)' }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--accent-texto)' }}>Seguir leyendo</p>
              <p className="text-[20px] font-bold truncate" style={{ color: 'var(--neu-ink)', fontFamily: 'Georgia, serif' }}>
                {nombreSeguir} · {seguir.art}
              </p>
            </div>
            <button onClick={() => abrirArticulo(seguir.codigo, seguir.art)} className="boton boton-primario px-6">
              Continuar
            </button>
          </section>
        )}

        {q && disponibles.length === 0 && (
          <p className={`text-center text-sm mb-8 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Ningún código o ley coincide con “{filtro}”.
          </p>
        )}

        {mostrarCodigos && codigosDisponibles.length > 0 && (
          <section className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-[17px] font-bold" style={{ color: 'var(--neu-ink)' }}>Códigos</h2>
              <span className="text-[13px]" style={{ color: 'var(--neu-ink3)' }}>
                fundamentales, sustantivos y procedimentales
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {codigosVisibles.map((c, i) => (
                <CodigoCard
                  key={c.tipo}
                  codigo={c}
                  onClick={() => onElegir(c.tipo)}
                  modoOscuro={modoOscuro}
                  delay={Math.min(i, 8) * 0.03}
                />
              ))}
            </div>
            {codigosDisponibles.length > LIMITE_INICIAL && !q && catFiltro === 'todos' && (
              <button
                onClick={() => setVerTodosCodigos((v) => !v)}
                aria-expanded={verTodosCodigos}
                className="mt-3 min-h-11 px-1 text-[14px] font-semibold hover:underline"
                style={{ color: 'var(--accent-texto)' }}
              >
                {verTodosCodigos ? 'Ver menos' : `Ver los ${codigosDisponibles.length - LIMITE_INICIAL} códigos restantes`} <i className={`ti ${verTodosCodigos ? 'ti-chevron-up' : 'ti-chevron-right'} text-sm`} aria-hidden />
              </button>
            )}
          </section>
        )}

        {leyesEspeciales.length > 0 && (
          <section className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2
                className={`text-[11px] uppercase tracking-wider font-semibold ${
                  modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                Leyes especiales ({leyesEspeciales.length})
              </h2>
              <span className={`text-[10px] ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                normas que regulan materias específicas
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {leyesEspeciales.map((c, i) => (
                <CodigoCard
                  key={c.tipo}
                  codigo={c}
                  onClick={() => onElegir(c.tipo)}
                  modoOscuro={modoOscuro}
                  delay={Math.min(i, 8) * 0.03}
                />
              ))}
            </div>
          </section>
        )}

        {tratadosDisponibles.length > 0 && (
          <section className="mb-8">
            <div className="flex items-baseline gap-2 mb-3">
              <h2
                className={`text-[11px] uppercase tracking-wider font-semibold ${
                  modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                Tratados internacionales
              </h2>
              <span className={`text-[10px] ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                convenios ratificados por Chile (Art. 5 inc. 2° CPR)
              </span>
            </div>

            {/* Card-acordeón: una sola entrada que al abrirse despliega los tratados específicos. */}
            <button
              onClick={() => setTratadosAbierto((v) => !v)}
              className={`w-full text-left rounded-xl border-2 p-5 transition-all ${
                modoOscuro
                  ? 'bg-zinc-800/40 border-zinc-800 hover:border-emerald-700'
                  : 'bg-white border-zinc-200 hover:border-emerald-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)' : 'color-mix(in srgb, var(--accent-base) 8%, transparent)' }}
                >
                  <i className="ti ti-world text-xl" style={{ color: 'var(--accent-base)' }} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-[19px] font-serif font-semibold leading-tight ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                    Tratados internacionales
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {tratadosDisponibles.length} tratado{tratadosDisponibles.length !== 1 ? 's' : ''} indexado{tratadosDisponibles.length !== 1 ? 's' : ''}
                    {' · '}
                    {tratadosAbierto ? 'haz clic para ocultar' : 'haz clic para ver el detalle'}
                  </p>
                </div>
                <i
                  className={`ti ti-chevron-down text-xl transition-transform flex-shrink-0 ${tratadosAbierto ? 'rotate-180' : ''} ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}
                />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {(tratadosAbierto || !!q) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="pl-6 pt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {tratadosDisponibles.map((c, i) => (
                      <CodigoCard
                        key={c.tipo}
                        codigo={c}
                        onClick={() => onElegir(c.tipo)}
                        modoOscuro={modoOscuro}
                        delay={Math.min(i, 8) * 0.03}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {pendientes.length > 0 && (
          <section>
            <h2
              className={`text-[11px] uppercase tracking-wider font-semibold mb-3 ${
                modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            >
              Próximamente ({pendientes.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {pendientes.map((c) => (
                <div
                  key={c.tipo}
                  className={`px-3 py-2.5 rounded-lg border opacity-40 ${
                    modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}
                >
                  <p className={`text-xs font-semibold ${modoOscuro ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {c.nombre}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    {c.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

interface CodigoCardProps {
  codigo: {
    tipo: CodigoTipo
    nombre: string
    descripcion: string
    categoria: string
    bloqueado?: boolean
    totalArts: number
    norma: string
  }
  onClick: () => void
  modoOscuro: boolean
  delay: number
}

function CodigoCard({ codigo, onClick, modoOscuro, delay }: CodigoCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      onClick={onClick}
      // precarga: el JSON empieza a bajar al pasar el mouse o enfocar la
      // tarjeta, así al hacer clic el código suele estar listo
      onMouseEnter={() => void cargarCodigo(codigo.tipo).catch(() => {})}
      onFocus={() => void cargarCodigo(codigo.tipo).catch(() => {})}
      className={`group text-left rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
        modoOscuro
          ? 'bg-[var(--neu-card)] border-[var(--neu-line)] hover:border-[var(--accent-700)]'
          : 'bg-white border-[var(--neu-line)] hover:border-[var(--accent-500)]'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)' : 'color-mix(in srgb, var(--accent-base) 8%, transparent)' }}
        >
          <i className="ti ti-book-2 text-xl" style={{ color: 'var(--accent-texto)' }} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className={`text-[19px] font-serif font-semibold leading-tight ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            {codigo.nombre}
          </h3>
          <p className={`text-[12px] mt-0.5 capitalize ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {codigo.categoria}
            {codigo.bloqueado && (
              <span className="ml-2">
                <i className="ti ti-lock text-[10px]" />
              </span>
            )}
          </p>
        </div>
      </div>

      <p className={`text-xs leading-relaxed mb-3 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {codigo.descripcion}
      </p>

      <div
        className={`flex items-center justify-between gap-3 text-[11px] pt-3 border-t ${
          modoOscuro ? 'border-zinc-800' : 'border-zinc-100'
        }`}
      >
        <span className={`min-w-0 text-left ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
          {codigo.totalArts > 0 ? `${codigo.totalArts} artículos` : codigo.norma}
        </span>
        <span
          className="flex items-center gap-1 font-semibold transition-colors flex-shrink-0"
          style={{ color: 'var(--accent-texto)' }}
        >
          Abrir
          <i className="ti ti-arrow-right text-sm group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </motion.button>
  )
}

function normalizarBusqueda(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(\d)\.(\d)/g, '$1$2')
    .trim()
}

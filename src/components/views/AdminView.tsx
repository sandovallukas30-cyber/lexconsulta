import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { ORGANISMOS_CHILE, type EntradaJurisprudencia, type CodigoTipo } from '../../types'

const VERDE = '#0F6E56'

export function AdminView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const jurisprudencia = useStore((s) => s.jurisprudencia)
  const codigos = useStore((s) => s.codigos)
  const agregar = useStore((s) => s.agregarJurisprudencia)
  const actualizar = useStore((s) => s.actualizarJurisprudencia)
  const eliminar = useStore((s) => s.eliminarJurisprudencia)

  const [busqueda, setBusqueda] = useState('')
  const [filtroOrgano, setFiltroOrgano] = useState<string>('todos')
  const [filtroCodigo, setFiltroCodigo] = useState<CodigoTipo | 'todos'>('todos')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<EntradaJurisprudencia | null>(null)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return jurisprudencia.filter((j) => {
      if (filtroOrgano !== 'todos' && j.organo !== filtroOrgano) return false
      if (filtroCodigo !== 'todos' && j.codigo !== filtroCodigo) return false
      if (!q) return true
      return (
        j.organo.toLowerCase().includes(q) ||
        j.referencia.toLowerCase().includes(q) ||
        j.materia.toLowerCase().includes(q) ||
        j.resumen.toLowerCase().includes(q)
      )
    })
  }, [jurisprudencia, busqueda, filtroOrgano, filtroCodigo])

  const stats = useMemo(() => {
    const porCodigo = new Map<string, number>()
    const porOrgano = new Map<string, number>()
    for (const j of jurisprudencia) {
      porCodigo.set(j.codigo, (porCodigo.get(j.codigo) ?? 0) + 1)
      porOrgano.set(j.organo, (porOrgano.get(j.organo) ?? 0) + 1)
    }
    return { porCodigo, porOrgano }
  }, [jurisprudencia])

  const abrirNuevo = () => {
    setEditando(null)
    setModalAbierto(true)
  }
  const abrirEditar = (j: EntradaJurisprudencia) => {
    setEditando(j)
    setModalAbierto(true)
  }
  const guardar = (data: Omit<EntradaJurisprudencia, 'id' | 'fechaCarga'>) => {
    if (editando) {
      actualizar(editando.id, data)
    } else {
      agregar({
        ...data,
        id: crypto.randomUUID(),
        fechaCarga: new Date().toISOString(),
      })
    }
    setModalAbierto(false)
    setEditando(null)
  }

  const organismosUsados = useMemo(() => {
    const set = new Set<string>()
    for (const j of jurisprudencia) set.add(j.organo)
    return [...set]
  }, [jurisprudencia])

  const codigosUsados = useMemo(() => {
    const set = new Set<CodigoTipo>()
    for (const j of jurisprudencia) set.add(j.codigo)
    return [...set]
  }, [jurisprudencia])

  return (
    <div className={`h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className={`px-6 py-4 border-b ${modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className={`text-lg font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              Gestión de jurisprudencia
            </h2>
            <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Carga sentencias, dictámenes y oficios verificados que enriquecen las respuestas de IA
            </p>
          </div>
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: VERDE }}
          >
            <i className="ti ti-plus text-base" />
            Nueva entrada
          </button>
        </div>

        {jurisprudencia.length > 0 && (
          <div
            className={`grid grid-cols-3 gap-3 p-3 rounded-lg ${
              modoOscuro ? 'bg-zinc-800/50' : 'bg-zinc-100/60'
            }`}
          >
            <Stat
              label="Total"
              valor={jurisprudencia.length}
              modoOscuro={modoOscuro}
              icono="ti-stack-2"
            />
            <Stat
              label="Organismos"
              valor={stats.porOrgano.size}
              modoOscuro={modoOscuro}
              icono="ti-building"
            />
            <Stat
              label="Códigos cubiertos"
              valor={stats.porCodigo.size}
              modoOscuro={modoOscuro}
              icono="ti-books"
            />
          </div>
        )}

        {jurisprudencia.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div
              className={`flex-1 min-w-[200px] flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'
              }`}
            >
              <i className={`ti ti-search text-base ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por organismo, referencia, materia..."
                className={`flex-1 bg-transparent outline-none text-sm ${
                  modoOscuro ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
                }`}
              />
            </div>
            <Select
              value={filtroOrgano}
              onChange={setFiltroOrgano}
              options={[
                { value: 'todos', label: `Todos los organismos (${jurisprudencia.length})` },
                ...organismosUsados.map((o) => ({
                  value: o,
                  label: `${o} (${stats.porOrgano.get(o) ?? 0})`,
                })),
              ]}
              modoOscuro={modoOscuro}
            />
            <Select
              value={filtroCodigo}
              onChange={(v) => setFiltroCodigo(v as CodigoTipo | 'todos')}
              options={[
                { value: 'todos', label: 'Todos los códigos' },
                ...codigosUsados.map((c) => {
                  const meta = codigos.find((cc) => cc.tipo === c)
                  return {
                    value: c,
                    label: `${meta?.nombreCorto ?? c} (${stats.porCodigo.get(c) ?? 0})`,
                  }
                }),
              ]}
              modoOscuro={modoOscuro}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {jurisprudencia.length === 0 ? (
          <EmptyState modoOscuro={modoOscuro} onCrear={abrirNuevo} />
        ) : filtrados.length === 0 ? (
          <div className={`text-center py-16 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <i className="ti ti-search-off text-3xl mb-2 block" />
            <p className="text-sm">Sin resultados con esos filtros</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-5 space-y-2.5">
            <AnimatePresence initial={false}>
              {filtrados.map((j) => (
                <EntradaCard
                  key={j.id}
                  entrada={j}
                  codigoNombre={codigos.find((c) => c.tipo === j.codigo)?.nombreCorto ?? j.codigo}
                  onEditar={() => abrirEditar(j)}
                  onEliminar={() => eliminar(j.id)}
                  modoOscuro={modoOscuro}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalAbierto && (
          <ModalEntrada
            entrada={editando}
            codigos={codigos.map((c) => ({ tipo: c.tipo, nombre: c.nombre }))}
            onGuardar={guardar}
            onCerrar={() => {
              setModalAbierto(false)
              setEditando(null)
            }}
            modoOscuro={modoOscuro}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ label, valor, modoOscuro, icono }: { label: string; valor: number; modoOscuro: boolean; icono: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: modoOscuro ? '#0F6E5630' : '#0F6E5615' }}
      >
        <i className={`ti ${icono} text-base`} style={{ color: VERDE }} />
      </div>
      <div>
        <p className={`text-[10px] uppercase tracking-wider font-semibold ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {label}
        </p>
        <p className={`text-xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{valor}</p>
      </div>
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
  modoOscuro,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  modoOscuro: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
        modoOscuro
          ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
          : 'bg-white border-zinc-200 text-zinc-700'
      }`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function EntradaCard({
  entrada,
  codigoNombre,
  onEditar,
  onEliminar,
  modoOscuro,
}: {
  entrada: EntradaJurisprudencia
  codigoNombre: string
  onEditar: () => void
  onEliminar: () => void
  modoOscuro: boolean
}) {
  const [expandido, setExpandido] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.15 }}
      className={`group rounded-xl border overflow-hidden ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: modoOscuro ? '#92400e30' : '#fef3c7' }}
          >
            <i className="ti ti-gavel text-base" style={{ color: '#92400e' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
              <span className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                {entrada.organo}
              </span>
              <span className={`text-xs font-mono ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {entrada.referencia}
              </span>
              {entrada.fecha && (
                <span className={`text-[11px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  · {entrada.fecha}
                </span>
              )}
            </div>
            <div className={`flex flex-wrap gap-1.5 mb-2`}>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  modoOscuro ? 'bg-emerald-950/50 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {codigoNombre}
              </span>
              {entrada.materia && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    modoOscuro ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {entrada.materia}
                </span>
              )}
              {entrada.articulosRelacionados && entrada.articulosRelacionados.length > 0 && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    modoOscuro ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {entrada.articulosRelacionados.join(', ')}
                </span>
              )}
            </div>
            <p className={`text-sm leading-relaxed ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {entrada.resumen}
            </p>
            {entrada.texto_completo && (
              <button
                onClick={() => setExpandido(!expandido)}
                className={`mt-2 text-xs font-semibold flex items-center gap-1 ${
                  modoOscuro ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-800'
                }`}
              >
                {expandido ? 'Ocultar texto completo' : 'Ver texto completo'}
                <i className={`ti ti-chevron-down text-xs transition-transform ${expandido ? 'rotate-180' : ''}`} />
              </button>
            )}
            <AnimatePresence initial={false}>
              {expandido && entrada.texto_completo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className={`mt-2 p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                      modoOscuro ? 'bg-zinc-800/60 text-zinc-300' : 'bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    {entrada.texto_completo}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {entrada.url && (
              <a
                href={entrada.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-7 h-7 rounded-md flex items-center justify-center ${
                  modoOscuro ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
                title="Abrir fuente"
              >
                <i className="ti ti-external-link text-sm" />
              </a>
            )}
            <button
              onClick={onEditar}
              className={`w-7 h-7 rounded-md flex items-center justify-center ${
                modoOscuro ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
              title="Editar"
            >
              <i className="ti ti-pencil text-sm" />
            </button>
            <button
              onClick={() => {
                if (confirm('¿Eliminar esta entrada?')) onEliminar()
              }}
              className={`w-7 h-7 rounded-md flex items-center justify-center ${
                modoOscuro ? 'text-zinc-400 hover:bg-red-950/50 hover:text-red-400' : 'text-zinc-500 hover:bg-red-50 hover:text-red-500'
              }`}
              title="Eliminar"
            >
              <i className="ti ti-trash text-sm" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState({ modoOscuro, onCrear }: { modoOscuro: boolean; onCrear: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: modoOscuro ? '#0F6E5625' : '#0F6E5610' }}
        >
          <i className="ti ti-gavel text-4xl" style={{ color: VERDE }} />
        </div>
        <h3 className={`text-2xl font-serif font-semibold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          Tu base de jurisprudencia
        </h3>
        <p className={`text-sm leading-relaxed mb-6 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Aquí cargas dictámenes, oficios y sentencias verificadas. Cuando hagas una consulta, la IA podrá
          apoyarse en estas fuentes reales en lugar de inventar referencias.
        </p>
        <button
          onClick={onCrear}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: VERDE }}
        >
          <i className="ti ti-plus text-base" />
          Cargar primera entrada
        </button>
      </div>
    </div>
  )
}

// ============= MODAL FORM =============

function ModalEntrada({
  entrada,
  codigos,
  onGuardar,
  onCerrar,
  modoOscuro,
}: {
  entrada: EntradaJurisprudencia | null
  codigos: { tipo: CodigoTipo; nombre: string }[]
  onGuardar: (data: Omit<EntradaJurisprudencia, 'id' | 'fechaCarga'>) => void
  onCerrar: () => void
  modoOscuro: boolean
}) {
  const [organo, setOrgano] = useState(entrada?.organo ?? 'Dirección del Trabajo')
  const [referencia, setReferencia] = useState(entrada?.referencia ?? '')
  const [fecha, setFecha] = useState(entrada?.fecha ?? '')
  const [codigo, setCodigo] = useState<CodigoTipo>(entrada?.codigo ?? 'lab')
  const [materia, setMateria] = useState(entrada?.materia ?? '')
  const [resumen, setResumen] = useState(entrada?.resumen ?? '')
  const [textoCompleto, setTextoCompleto] = useState(entrada?.texto_completo ?? '')
  const [articulosTxt, setArticulosTxt] = useState((entrada?.articulosRelacionados ?? []).join(', '))
  const [url, setUrl] = useState(entrada?.url ?? '')

  const valido = organo.trim() && referencia.trim() && resumen.trim()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return
    const articulos = articulosTxt
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
    onGuardar({
      organo: organo.trim(),
      referencia: referencia.trim(),
      fecha: fecha.trim(),
      codigo,
      materia: materia.trim(),
      resumen: resumen.trim(),
      texto_completo: textoCompleto.trim() || undefined,
      articulosRelacionados: articulos.length > 0 ? articulos : undefined,
      url: url.trim() || undefined,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCerrar}
    >
      <motion.form
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className={`max-w-2xl w-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          modoOscuro ? 'bg-zinc-900' : 'bg-white'
        }`}
      >
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            modoOscuro ? 'border-zinc-800' : 'border-zinc-200'
          }`}
        >
          <div>
            <h2 className={`text-lg font-serif font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              {entrada ? 'Editar entrada' : 'Nueva entrada de jurisprudencia'}
            </h2>
            <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Los campos con * son obligatorios
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            <i className="ti ti-x text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Organismo *" modoOscuro={modoOscuro}>
              <input
                list="organismos"
                value={organo}
                onChange={(e) => setOrgano(e.target.value)}
                className={inputCls(modoOscuro)}
                placeholder="Dirección del Trabajo"
              />
              <datalist id="organismos">
                {ORGANISMOS_CHILE.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </Field>
            <Field label="Referencia *" modoOscuro={modoOscuro}>
              <input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className={inputCls(modoOscuro)}
                placeholder="Ord. N° 1234/2024"
              />
            </Field>
            <Field label="Fecha" modoOscuro={modoOscuro}>
              <input
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputCls(modoOscuro)}
                placeholder="15-03-2024"
              />
            </Field>
            <Field label="Código *" modoOscuro={modoOscuro}>
              <select
                value={codigo}
                onChange={(e) => setCodigo(e.target.value as CodigoTipo)}
                className={inputCls(modoOscuro)}
              >
                {codigos.map((c) => (
                  <option key={c.tipo} value={c.tipo}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Materia" modoOscuro={modoOscuro}>
            <input
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className={inputCls(modoOscuro)}
              placeholder="Despido por necesidades de la empresa"
            />
          </Field>

          <Field label="Artículos relacionados" modoOscuro={modoOscuro} hint="Separados por coma">
            <input
              value={articulosTxt}
              onChange={(e) => setArticulosTxt(e.target.value)}
              className={inputCls(modoOscuro)}
              placeholder="Art. 161, Art. 162"
            />
          </Field>

          <Field label="Resumen *" modoOscuro={modoOscuro} hint="2-4 oraciones que capturen lo esencial">
            <textarea
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              rows={3}
              className={inputCls(modoOscuro) + ' resize-none'}
              placeholder="La causal de necesidades de la empresa requiere..."
            />
          </Field>

          <Field label="Texto completo" modoOscuro={modoOscuro} hint="Opcional — texto íntegro del dictamen/sentencia">
            <textarea
              value={textoCompleto}
              onChange={(e) => setTextoCompleto(e.target.value)}
              rows={5}
              className={inputCls(modoOscuro) + ' resize-none font-mono text-xs'}
              placeholder="Pega aquí el texto completo si lo tienes..."
            />
          </Field>

          <Field label="URL fuente" modoOscuro={modoOscuro}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputCls(modoOscuro)}
              placeholder="https://www.dt.gob.cl/..."
            />
          </Field>
        </div>

        <div
          className={`px-6 py-3 border-t flex items-center justify-end gap-2 ${
            modoOscuro ? 'border-zinc-800' : 'border-zinc-200'
          }`}
        >
          <button
            type="button"
            onClick={onCerrar}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!valido}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: VERDE }}
          >
            {entrada ? 'Guardar cambios' : 'Crear entrada'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}

function Field({
  label,
  hint,
  modoOscuro,
  children,
}: {
  label: string
  hint?: string
  modoOscuro: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className={`text-xs font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>{label}</span>
        {hint && (
          <span className={`text-[10px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{hint}</span>
        )}
      </div>
      {children}
    </label>
  )
}

function inputCls(modoOscuro: boolean): string {
  return `w-full px-3 py-2 rounded-lg text-sm outline-none border transition-colors ${
    modoOscuro
      ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-600'
      : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600'
  }`
}

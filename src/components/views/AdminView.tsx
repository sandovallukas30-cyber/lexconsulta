import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { nombreCortoMetadata } from '../../data/codigosMetadata'
import { ORGANISMOS_CHILE } from '../../types'
import type { EntradaJurisprudencia, CodigoTipo } from '../../types'

const VERDE = 'var(--accent-base)'

interface FormState {
  organo: string
  referencia: string
  fecha: string
  codigo: CodigoTipo | ''
  materia: string
  resumen: string
  texto_completo: string
  articulosRelacionados: string
  url: string
}

const FORM_VACIO: FormState = {
  organo: '',
  referencia: '',
  fecha: '',
  codigo: '',
  materia: '',
  resumen: '',
  texto_completo: '',
  articulosRelacionados: '',
  url: '',
}

export function AdminView() {
  const jurisprudencia = useStore((s) => s.jurisprudencia)
  const agregar = useStore((s) => s.agregarJurisprudencia)
  const actualizar = useStore((s) => s.actualizarJurisprudencia)
  const eliminar = useStore((s) => s.eliminarJurisprudencia)
  const codigos = useStore((s) => s.codigos)
  const modoOscuro = useStore((s) => s.modoOscuro)

  const [formAbierto, setFormAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(FORM_VACIO)
  const [busqueda, setBusqueda] = useState('')

  function abrirNuevo() {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setFormAbierto(true)
  }

  function abrirEdicion(entrada: EntradaJurisprudencia) {
    setEditandoId(entrada.id)
    setForm({
      organo: entrada.organo,
      referencia: entrada.referencia,
      fecha: entrada.fecha,
      codigo: entrada.codigo ?? '',
      materia: entrada.materia,
      resumen: entrada.resumen,
      texto_completo: entrada.texto_completo ?? '',
      articulosRelacionados: entrada.articulosRelacionados?.join(', ') ?? '',
      url: entrada.url ?? '',
    })
    setFormAbierto(true)
  }

  function cerrarForm() {
    setFormAbierto(false)
    setEditandoId(null)
    setForm(FORM_VACIO)
  }

  function guardar() {
    if (!form.organo.trim() || !form.referencia.trim() || !form.fecha || !form.materia.trim() || !form.resumen.trim()) {
      return
    }
    const articulosRelacionados = form.articulosRelacionados
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)

    if (editandoId) {
      actualizar(editandoId, {
        organo: form.organo.trim(),
        referencia: form.referencia.trim(),
        fecha: form.fecha,
        codigo: form.codigo || undefined,
        materia: form.materia.trim(),
        resumen: form.resumen.trim(),
        texto_completo: form.texto_completo.trim() || undefined,
        articulosRelacionados: articulosRelacionados.length ? articulosRelacionados : undefined,
        url: form.url.trim() || undefined,
      })
    } else {
      agregar({
        id: crypto.randomUUID(),
        organo: form.organo.trim(),
        referencia: form.referencia.trim(),
        fecha: form.fecha,
        codigo: form.codigo || undefined,
        materia: form.materia.trim(),
        resumen: form.resumen.trim(),
        texto_completo: form.texto_completo.trim() || undefined,
        articulosRelacionados: articulosRelacionados.length ? articulosRelacionados : undefined,
        url: form.url.trim() || undefined,
        fechaCarga: new Date().toISOString().slice(0, 10),
      })
    }
    cerrarForm()
  }

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return [...jurisprudencia]
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .filter((j) => {
        if (!q) return true
        return (
          j.organo.toLowerCase().includes(q) ||
          j.referencia.toLowerCase().includes(q) ||
          j.materia.toLowerCase().includes(q) ||
          j.resumen.toLowerCase().includes(q)
        )
      })
  }, [jurisprudencia, busqueda])

  const inputClass = `w-full px-3 py-2 rounded-lg text-sm outline-none border transition-colors ${
    modoOscuro
      ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[var(--accent-600)]'
      : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-[var(--accent-500)]'
  }`
  const labelClass = `block text-[11px] font-semibold uppercase tracking-wider mb-1 ${
    modoOscuro ? 'text-zinc-500' : 'text-zinc-500'
  }`

  return (
    <div className={`h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div
        className={`px-6 py-4 border-b flex items-center gap-3 flex-wrap ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div className="flex-1 min-w-[200px]">
          <h1 className={`text-lg font-serif font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
            Administración de jurisprudencia
          </h1>
          <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {jurisprudencia.length} {jurisprudencia.length === 1 ? 'resolución cargada' : 'resoluciones cargadas'}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            modoOscuro ? 'bg-zinc-800' : 'bg-zinc-100'
          }`}
        >
          <i className={`ti ti-search text-sm ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por órgano, materia..."
            className={`bg-transparent outline-none text-sm w-48 ${
              modoOscuro ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
            }`}
          />
        </div>
        <button
          onClick={formAbierto && !editandoId ? cerrarForm : abrirNuevo}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: VERDE }}
        >
          <i className={`ti ${formAbierto && !editandoId ? 'ti-x' : 'ti-plus'} text-base`} />
          {formAbierto && !editandoId ? 'Cancelar' : 'Agregar resolución'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          <AnimatePresence initial={false}>
            {formAbierto && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div
                  className={`rounded-xl border p-5 space-y-4 ${
                    modoOscuro ? 'bg-zinc-800/40 border-zinc-700' : 'bg-white border-zinc-200'
                  }`}
                >
                  <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                    {editandoId ? 'Editar resolución' : 'Nueva resolución'}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Órgano *</label>
                      <input
                        list="admin-organos"
                        value={form.organo}
                        onChange={(e) => setForm((f) => ({ ...f, organo: e.target.value }))}
                        placeholder="Dirección del Trabajo"
                        className={inputClass}
                      />
                      <datalist id="admin-organos">
                        {ORGANISMOS_CHILE.map((o) => (
                          <option key={o} value={o} />
                        ))}
                        <option value="Segundo Tribunal Ambiental" />
                        <option value="Juzgado de Familia" />
                        <option value="Juzgado de Letras del Trabajo" />
                      </datalist>
                    </div>
                    <div>
                      <label className={labelClass}>Referencia *</label>
                      <input
                        value={form.referencia}
                        onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
                        placeholder="ORD. N°319/30 · Rol R-505-2025"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fecha *</label>
                      <input
                        type="date"
                        value={form.fecha}
                        onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Código asociado</label>
                      <select
                        value={form.codigo}
                        onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value as CodigoTipo | '' }))}
                        className={inputClass}
                      >
                        <option value="">— Sin código asociado —</option>
                        {codigos.map((c) => (
                          <option key={c.tipo} value={c.tipo}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Materia *</label>
                    <input
                      value={form.materia}
                      onChange={(e) => setForm((f) => ({ ...f, materia: e.target.value }))}
                      placeholder="Negociación colectiva, cambio de afiliación sindical"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Resumen *</label>
                    <textarea
                      value={form.resumen}
                      onChange={(e) => setForm((f) => ({ ...f, resumen: e.target.value }))}
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Texto completo (opcional)</label>
                    <textarea
                      value={form.texto_completo}
                      onChange={(e) => setForm((f) => ({ ...f, texto_completo: e.target.value }))}
                      rows={4}
                      className={`${inputClass} resize-none font-mono text-xs`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Artículos relacionados</label>
                      <input
                        value={form.articulosRelacionados}
                        onChange={(e) => setForm((f) => ({ ...f, articulosRelacionados: e.target.value }))}
                        placeholder="Art. 340, Art. 229 (separados por coma)"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>URL fuente</label>
                      <input
                        value={form.url}
                        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button
                      onClick={cerrarForm}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardar}
                      className="px-3.5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{ background: VERDE }}
                    >
                      {editandoId ? 'Guardar cambios' : 'Agregar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {filtradas.length === 0 && !formAbierto ? (
            <EmptyState modoOscuro={modoOscuro} onAgregar={abrirNuevo} />
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {filtradas.map((j) => (
                  <EntradaCard
                    key={j.id}
                    entrada={j}
                    modoOscuro={modoOscuro}
                    onEditar={() => abrirEdicion(j)}
                    onEliminar={() => {
                      if (confirm(`¿Eliminar "${j.referencia}" de ${j.organo}?`)) eliminar(j.id)
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EntradaCard({
  entrada,
  modoOscuro,
  onEditar,
  onEliminar,
}: {
  entrada: EntradaJurisprudencia
  modoOscuro: boolean
  onEditar: () => void
  onEliminar: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.2 }}
      className={`group rounded-xl border p-4 ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              color: VERDE,
              background: modoOscuro
                ? 'color-mix(in srgb, var(--accent-base) 19%, transparent)'
                : 'color-mix(in srgb, var(--accent-base) 8%, transparent)',
            }}
          >
            {entrada.organo}
          </span>
          {entrada.codigo && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${modoOscuro ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
              {nombreCortoMetadata(entrada.codigo)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {entrada.url && (
            <a
              href={entrada.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-7 h-7 rounded-md flex items-center justify-center ${
                modoOscuro ? 'text-zinc-500 hover:bg-zinc-800 hover:text-white' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
              title="Abrir fuente"
            >
              <i className="ti ti-external-link text-sm" />
            </a>
          )}
          <button
            onClick={onEditar}
            className={`w-7 h-7 rounded-md flex items-center justify-center ${
              modoOscuro ? 'text-zinc-500 hover:bg-zinc-800 hover:text-white' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
            title="Editar"
            aria-label="Editar"
          >
            <i className="ti ti-pencil text-sm" />
          </button>
          <button
            onClick={onEliminar}
            className={`w-7 h-7 rounded-md flex items-center justify-center ${
              modoOscuro ? 'text-zinc-500 hover:bg-zinc-800 hover:text-red-400' : 'text-zinc-400 hover:bg-zinc-100 hover:text-red-500'
            }`}
            title="Eliminar"
            aria-label="Eliminar"
          >
            <i className="ti ti-trash text-sm" />
          </button>
        </div>
      </div>

      <h3 className={`text-sm font-semibold leading-snug ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
        {entrada.referencia} — {entrada.materia}
      </h3>
      <p className={`text-xs leading-snug mt-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {entrada.resumen}
      </p>
      <div className={`flex items-center gap-2 mt-2 text-[11px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
        <i className="ti ti-calendar text-[11px]" />
        {formatearFecha(entrada.fecha)}
        {entrada.articulosRelacionados && entrada.articulosRelacionados.length > 0 && (
          <>
            <span>·</span>
            <span>{entrada.articulosRelacionados.join(', ')}</span>
          </>
        )}
      </div>
    </motion.div>
  )
}

function EmptyState({ modoOscuro, onAgregar }: { modoOscuro: boolean; onAgregar: () => void }) {
  return (
    <div className="text-center py-16">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
      >
        <i className="ti ti-shield-cog text-4xl" style={{ color: VERDE }} />
      </div>
      <h3 className={`text-xl font-serif font-semibold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
        Aún no hay resoluciones cargadas
      </h3>
      <p className={`text-sm leading-relaxed mb-6 max-w-sm mx-auto ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
        Carga dictámenes de la Dirección del Trabajo, oficios del SII, sentencias de tribunales u otras resoluciones verificadas.
      </p>
      <button
        onClick={onAgregar}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: VERDE }}
      >
        <i className="ti ti-plus text-base" />
        Agregar la primera
      </button>
    </div>
  )
}

function formatearFecha(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

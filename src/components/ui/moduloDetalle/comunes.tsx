import type { SesionClase } from '../../../types'
import { diasHasta, formatearCountdown, urgenciaDe } from '../../../services/modulosAcademico'
import { VERDE, colorUrgencia, formatearFechaCorta } from './utilidades'

/** Fecha + countdown lado a lado, con color según urgencia -- se usa en
 *  Clases y Exámenes para no repetirlo dos veces. */
export function FechaConCountdown({ fecha, modoOscuro }: { fecha: string; modoOscuro: boolean }) {
  const dias = diasHasta(fecha)
  const u = urgenciaDe(dias)
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={`text-xs font-mono ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>{formatearFechaCorta(fecha)}</span>
      <span className={`text-xs font-medium ${colorUrgencia(u, modoOscuro)}`}>{formatearCountdown(dias)}</span>
    </span>
  )
}

export function EstadoVacio({ icono, texto, modoOscuro }: { icono: string; texto: string; modoOscuro: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 rounded-xl border border-dashed ${
      modoOscuro ? 'border-zinc-800 text-zinc-500' : 'border-zinc-300 text-zinc-400'
    }`}>
      <i className={`ti ${icono} text-3xl mb-2 opacity-60`} />
      <p className="text-sm">{texto}</p>
    </div>
  )
}

export function BotonAgregar({ label, onClick, modoOscuro }: { label: string; onClick: () => void; modoOscuro: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
        modoOscuro ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      <i className="ti ti-plus text-sm" />
      {label}
    </button>
  )
}

export function CampoTexto({
  label, valor, onChange, tipo = 'text', modoOscuro, placeholder,
}: {
  label: string
  valor: string
  onChange: (v: string) => void
  tipo?: string
  modoOscuro: boolean
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className={`block text-xs font-medium mb-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>{label}</span>
      <input
        type={tipo}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg px-3 py-2 text-sm outline-none border ${
          modoOscuro
            ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600'
            : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
        }`}
        style={{ colorScheme: modoOscuro ? 'dark' : 'light' }}
      />
    </label>
  )
}

export function CampoSelectClase({
  label, valor, onChange, clases, modoOscuro,
}: {
  label: string
  valor: string
  onChange: (v: string) => void
  clases: SesionClase[]
  modoOscuro: boolean
}) {
  const ordenadas = [...clases].sort((a, b) => a.fecha.localeCompare(b.fecha))
  return (
    <label className="block">
      <span className={`block text-xs font-medium mb-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>{label}</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg px-3 py-2 text-sm outline-none border ${
          modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        <option value="">Sin vincular a una clase</option>
        {ordenadas.map((c) => (
          <option key={c.id} value={c.id}>{formatearFechaCorta(c.fecha)} — {c.tema}</option>
        ))}
      </select>
    </label>
  )
}

export function EtiquetaClase({ clase, modoOscuro }: { clase: SesionClase | undefined; modoOscuro: boolean }) {
  if (!clase) return null
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md ${
      modoOscuro ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
    }`}>
      <i className="ti ti-calendar-event text-xs" />
      {clase.tema}
    </span>
  )
}

export function EtiquetaArticulo({ articulo, modoOscuro }: { articulo: string | undefined; modoOscuro: boolean }) {
  if (!articulo) return null
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md ${
      modoOscuro ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
    }`}>
      <i className="ti ti-file-text text-xs" />
      {articulo}
    </span>
  )
}

export function BotonEliminar({ onClick, modoOscuro }: { onClick: () => void; modoOscuro: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Eliminar"
      aria-label="Eliminar"
      className={`w-10 h-10 sm:w-7 sm:h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
        modoOscuro ? 'text-zinc-500 hover:bg-zinc-700 hover:text-red-400' : 'text-zinc-400 hover:bg-zinc-100 hover:text-red-600'
      }`}
    >
      <i className="ti ti-trash text-sm" />
    </button>
  )
}

export function BotonesFormulario({
  onCancelar, onGuardar, modoOscuro, error,
}: {
  onCancelar: () => void
  onGuardar: () => void
  modoOscuro: boolean
  error?: string | null
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : <span />}
      <div className="flex justify-end gap-2">
        <button onClick={onCancelar} className={`px-3 py-1.5 rounded-lg text-xs ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>Cancelar</button>
        <button onClick={onGuardar} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: VERDE }}>Guardar</button>
      </div>
    </div>
  )
}

export function CampoArea({
  label, valor, onChange, modoOscuro, placeholder,
}: {
  label: string
  valor: string
  onChange: (v: string) => void
  modoOscuro: boolean
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className={`block text-xs font-medium mb-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>{label}</span>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className={`w-full rounded-lg px-3 py-2 text-sm outline-none border resize-y ${
          modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
        }`}
      />
    </label>
  )
}

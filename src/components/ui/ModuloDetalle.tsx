import { useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Modulo, SesionClase, EvaluacionModulo, TextoObligatorio, ApunteModulo, CuadernoApuntes, BriefCaso } from '../../types'
import { diasHasta, formatearCountdown, urgenciaDe, calcularPonderacionTotal, type Urgencia } from '../../services/modulosAcademico'

const VERDE = 'var(--accent-base)'

export type Tab = 'resumen' | 'clases' | 'examenes' | 'textos' | 'apuntes' | 'casos'

const TABS: { id: Tab; label: string; icono: string }[] = [
  { id: 'resumen', label: 'Resumen', icono: 'ti-layout-dashboard' },
  { id: 'clases', label: 'Clases', icono: 'ti-calendar-event' },
  { id: 'examenes', label: 'Exámenes', icono: 'ti-clipboard-check' },
  { id: 'textos', label: 'Textos', icono: 'ti-books' },
  { id: 'apuntes', label: 'Apuntes', icono: 'ti-notes' },
  { id: 'casos', label: 'Casos', icono: 'ti-gavel' },
]

function formatearFechaCorta(iso: string): string {
  if (!iso) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function colorUrgencia(u: Urgencia): string {
  if (u === 'vencido') return 'text-zinc-400'
  if (u === 'urgente') return 'text-red-600'
  if (u === 'proximo') return 'text-amber-600'
  return ''
}

/** Fecha + countdown lado a lado, con color según urgencia -- se usa en
 *  Clases y Exámenes para no repetirlo dos veces. */
function FechaConCountdown({ fecha, modoOscuro }: { fecha: string; modoOscuro: boolean }) {
  const dias = diasHasta(fecha)
  const u = urgenciaDe(dias)
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={`text-xs font-mono ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>{formatearFechaCorta(fecha)}</span>
      <span className={`text-xs font-medium ${colorUrgencia(u)}`}>{formatearCountdown(dias)}</span>
    </span>
  )
}

interface Props {
  modulo: Modulo
  modoOscuro: boolean
  onVolver: () => void
  tabInicial?: Tab
}

export function ModuloDetalle({ modulo, modoOscuro, onVolver, tabInicial }: Props) {
  const [tab, setTab] = useState<Tab>(tabInicial ?? 'resumen')
  const setCodigoExplorador = useStore((s) => s.setCodigoExplorador)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const datos = useStore((s) => s.academicoModulos[modulo.id]) ?? { clases: [], evaluaciones: [], textos: [], apuntes: [], cuadernos: [], briefs: [] }

  const abrirCodigo = () => {
    if (!modulo.codigoRelacionado) return
    setCodigoExplorador(modulo.codigoRelacionado)
    setVistaActiva('explorador')
  }

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={onVolver}
          className={`flex items-center gap-1.5 text-xs font-medium mb-5 transition-colors ${
            modoOscuro ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <i className="ti ti-arrow-left text-sm" />
          Todos los módulos
        </button>

        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: modulo.color + '20' }}
            >
              <i className={`ti ${modulo.icono} text-xl`} style={{ color: modulo.color }} />
            </div>
            <div className="min-w-0">
              <h1 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                {modulo.nombre}
              </h1>
              <p className={`text-xs truncate ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                {modulo.descripcion}
              </p>
            </div>
          </div>
          {modulo.codigoRelacionado && (
            <button
              onClick={abrirCodigo}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                modoOscuro ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <i className="ti ti-book-2 text-sm" />
              Ver código
            </button>
          )}
        </div>

        <div className={`flex gap-1 mb-6 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-current'
                  : 'border-transparent'
              } ${
                tab === t.id
                  ? modoOscuro ? 'text-white' : 'text-zinc-900'
                  : modoOscuro ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'
              }`}
              style={tab === t.id ? { color: VERDE, borderColor: VERDE } : undefined}
            >
              <i className={`ti ${t.icono} text-base`} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'resumen' && <TabResumen datos={datos} modoOscuro={modoOscuro} onIrA={setTab} />}
        {tab === 'clases' && <TabClases moduloId={modulo.id} clases={datos.clases} modoOscuro={modoOscuro} />}
        {tab === 'examenes' && <TabExamenes moduloId={modulo.id} evaluaciones={datos.evaluaciones} modoOscuro={modoOscuro} />}
        {tab === 'textos' && <TabTextos moduloId={modulo.id} textos={datos.textos} clases={datos.clases} modoOscuro={modoOscuro} />}
        {tab === 'apuntes' && <TabApuntes moduloId={modulo.id} apuntes={datos.apuntes} clases={datos.clases} cuadernos={datos.cuadernos} modoOscuro={modoOscuro} />}
        {tab === 'casos' && <TabCasos moduloId={modulo.id} briefs={datos.briefs} clases={datos.clases} modoOscuro={modoOscuro} />}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Piezas compartidas
// ------------------------------------------------------------------

function EstadoVacio({ icono, texto, modoOscuro }: { icono: string; texto: string; modoOscuro: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 rounded-xl border border-dashed ${
      modoOscuro ? 'border-zinc-800 text-zinc-500' : 'border-zinc-300 text-zinc-400'
    }`}>
      <i className={`ti ${icono} text-3xl mb-2 opacity-60`} />
      <p className="text-sm">{texto}</p>
    </div>
  )
}

function BotonAgregar({ label, onClick, modoOscuro }: { label: string; onClick: () => void; modoOscuro: boolean }) {
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

function CampoTexto({
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

function CampoSelectClase({
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

function EtiquetaClase({ clase, modoOscuro }: { clase: SesionClase | undefined; modoOscuro: boolean }) {
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

function BotonEliminar({ onClick, modoOscuro }: { onClick: () => void; modoOscuro: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Eliminar"
      className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
        modoOscuro ? 'text-zinc-500 hover:bg-zinc-700 hover:text-red-400' : 'text-zinc-400 hover:bg-zinc-100 hover:text-red-600'
      }`}
    >
      <i className="ti ti-trash text-sm" />
    </button>
  )
}

function BotonesFormulario({
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

// ------------------------------------------------------------------
// Resumen
// ------------------------------------------------------------------

function TabResumen({
  datos, modoOscuro, onIrA,
}: {
  datos: { clases: SesionClase[]; evaluaciones: EvaluacionModulo[]; textos: TextoObligatorio[]; apuntes: ApunteModulo[]; briefs: BriefCaso[] }
  modoOscuro: boolean
  onIrA: (tab: Tab) => void
}) {
  const proximaClase = [...datos.clases]
    .filter((c) => !c.completada)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  const proximoExamen = [...datos.evaluaciones]
    .filter((e) => e.nota === null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  const textosLeidos = datos.textos.filter((t) => t.leido).length

  const tarjetas = [
    {
      tab: 'clases' as Tab,
      icono: 'ti-calendar-event',
      label: 'Clases',
      valor: `${datos.clases.length}`,
      detalle: proximaClase
        ? `Próxima: ${formatearCountdown(diasHasta(proximaClase.fecha)).toLowerCase()}`
        : datos.clases.length > 0
        ? 'Todas completadas'
        : 'Sin sesiones registradas',
    },
    {
      tab: 'examenes' as Tab,
      icono: 'ti-clipboard-check',
      label: 'Exámenes',
      valor: `${datos.evaluaciones.length}`,
      detalle: proximoExamen
        ? `${proximoExamen.nombre} · ${formatearCountdown(diasHasta(proximoExamen.fecha)).toLowerCase()}`
        : datos.evaluaciones.length > 0
        ? 'Todas calificadas'
        : 'Sin evaluaciones registradas',
    },
    { tab: 'textos' as Tab, icono: 'ti-books', label: 'Textos', valor: `${textosLeidos}/${datos.textos.length}`, detalle: 'leídos' },
    { tab: 'apuntes' as Tab, icono: 'ti-notes', label: 'Apuntes', valor: `${datos.apuntes.length}`, detalle: datos.apuntes.length === 1 ? 'apunte guardado' : 'apuntes guardados' },
    { tab: 'casos' as Tab, icono: 'ti-gavel', label: 'Casos', valor: `${datos.briefs.length}`, detalle: datos.briefs.length === 1 ? 'caso analizado' : 'casos analizados' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tarjetas.map((t) => (
        <button
          key={t.tab}
          onClick={() => onIrA(t.tab)}
          className={`text-left p-4 rounded-xl border transition-colors ${
            modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <i className={`ti ${t.icono} text-base`} style={{ color: VERDE }} />
            <span className={`text-xs font-medium ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>{t.label}</span>
          </div>
          <div className={`text-xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{t.valor}</div>
          <div className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{t.detalle}</div>
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------
// Clases
// ------------------------------------------------------------------

function TabClases({ moduloId, clases, modoOscuro }: { moduloId: string; clases: SesionClase[]; modoOscuro: boolean }) {
  const setClasesModulo = useStore((s) => s.setClasesModulo)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [fecha, setFecha] = useState('')
  const [tema, setTema] = useState('')
  const [notas, setNotas] = useState('')

  const ordenadas = [...clases].sort((a, b) => a.fecha.localeCompare(b.fecha))

  const iniciarNuevo = () => {
    setEditandoId(null)
    setFecha('')
    setTema('')
    setNotas('')
    setMostrarForm(true)
  }

  const iniciarEdicion = (c: SesionClase) => {
    setEditandoId(c.id)
    setFecha(c.fecha)
    setTema(c.tema)
    setNotas(c.notas ?? '')
    setMostrarForm(true)
  }

  const guardar = () => {
    if (!fecha || !tema.trim()) return
    if (editandoId) {
      setClasesModulo(moduloId, clases.map((c) => (c.id === editandoId ? { ...c, fecha, tema: tema.trim(), notas: notas.trim() || undefined } : c)))
    } else {
      const nueva: SesionClase = { id: crypto.randomUUID(), fecha, tema: tema.trim(), notas: notas.trim() || undefined, completada: false }
      setClasesModulo(moduloId, [...clases, nueva])
    }
    setMostrarForm(false)
    setEditandoId(null)
  }

  const toggleCompletada = (id: string) => {
    setClasesModulo(moduloId, clases.map((c) => (c.id === id ? { ...c, completada: !c.completada } : c)))
  }

  const eliminar = (id: string) => {
    setClasesModulo(moduloId, clases.filter((c) => c.id !== id))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Cronograma de clases</h2>
        <BotonAgregar label="Agregar clase" onClick={iniciarNuevo} modoOscuro={modoOscuro} />
      </div>

      {mostrarForm && (
        <div className={`p-4 rounded-xl border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto label="Fecha" tipo="date" valor={fecha} onChange={setFecha} modoOscuro={modoOscuro} />
            <CampoTexto label="Tema" valor={tema} onChange={setTema} modoOscuro={modoOscuro} placeholder="Ej: Teoría del acto jurídico" />
          </div>
          <CampoTexto label="Notas (opcional)" valor={notas} onChange={setNotas} modoOscuro={modoOscuro} placeholder="Lo que quieras recordar de esta sesión" />
          <BotonesFormulario onCancelar={() => { setMostrarForm(false); setEditandoId(null) }} onGuardar={guardar} modoOscuro={modoOscuro} />
        </div>
      )}

      {ordenadas.length === 0 ? (
        <EstadoVacio icono="ti-calendar-event" texto="Aún no has agregado sesiones de clase." modoOscuro={modoOscuro} />
      ) : (
        <div className="space-y-2">
          {ordenadas.map((c) => (
            <div key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <button onClick={() => toggleCompletada(c.id)} className="mt-0.5 flex-shrink-0">
                <i
                  className={`ti ${c.completada ? 'ti-square-rounded-check' : 'ti-square-rounded'} text-lg`}
                  style={{ color: c.completada ? VERDE : undefined }}
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  {c.completada ? (
                    <span className={`text-xs font-mono ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>{formatearFechaCorta(c.fecha)}</span>
                  ) : (
                    <FechaConCountdown fecha={c.fecha} modoOscuro={modoOscuro} />
                  )}
                  <button onClick={() => iniciarEdicion(c)} className={`text-sm font-medium text-left hover:underline ${c.completada ? 'line-through opacity-60' : ''} ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {c.tema}
                  </button>
                </div>
                {c.notas && <p className={`text-xs mt-1 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{c.notas}</p>}
              </div>
              <BotonEliminar onClick={() => eliminar(c.id)} modoOscuro={modoOscuro} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Exámenes
// ------------------------------------------------------------------

function calcularNotaNecesaria(evaluaciones: EvaluacionModulo[], objetivo: number) {
  let sumaPonderada = 0
  let ponderacionEvaluada = 0
  for (const ev of evaluaciones) {
    if (ev.nota !== null) {
      const notaNormalizada = (ev.nota / ev.notaMaxima) * 7
      sumaPonderada += notaNormalizada * ev.ponderacion
      ponderacionEvaluada += ev.ponderacion
    }
  }
  const ponderacionPendiente = Math.max(0, 100 - ponderacionEvaluada)
  const promedioActual = ponderacionEvaluada > 0 ? sumaPonderada / ponderacionEvaluada : null
  const notaNecesaria = ponderacionPendiente > 0 ? (objetivo * 100 - sumaPonderada) / ponderacionPendiente : null
  return { promedioActual, ponderacionEvaluada, ponderacionPendiente, notaNecesaria }
}

function TabExamenes({ moduloId, evaluaciones, modoOscuro }: { moduloId: string; evaluaciones: EvaluacionModulo[]; modoOscuro: boolean }) {
  const setEvaluacionesModulo = useStore((s) => s.setEvaluacionesModulo)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState('')
  const [ponderacion, setPonderacion] = useState('')
  const [nota, setNota] = useState('')
  const [objetivo, setObjetivo] = useState('4')
  const [error, setError] = useState<string | null>(null)

  const ordenadas = [...evaluaciones].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const objetivoNum = Number(objetivo) || 4
  const ponderacionCargada = calcularPonderacionTotal(evaluaciones, editandoId ?? undefined)

  const iniciarNuevo = () => {
    setEditandoId(null)
    setNombre('')
    setFecha('')
    setPonderacion('')
    setNota('')
    setError(null)
    setMostrarForm(true)
  }

  const iniciarEdicion = (e: EvaluacionModulo) => {
    setEditandoId(e.id)
    setNombre(e.nombre)
    setFecha(e.fecha)
    setPonderacion(String(e.ponderacion))
    setNota(e.nota === null ? '' : String(e.nota))
    setError(null)
    setMostrarForm(true)
  }

  const guardar = () => {
    const pond = Number(ponderacion)
    if (!nombre.trim() || !fecha || !Number.isFinite(pond) || pond <= 0) {
      setError('Completa nombre, fecha y una ponderación válida.')
      return
    }
    if (ponderacionCargada + pond > 100) {
      setError(`Con ${pond}% superarías el 100% (ya tienes ${ponderacionCargada}% cargado).`)
      return
    }
    const notaNum = nota.trim() === '' ? null : Number(nota)
    if (editandoId) {
      setEvaluacionesModulo(moduloId, evaluaciones.map((e) => (e.id === editandoId
        ? { ...e, nombre: nombre.trim(), fecha, ponderacion: pond, nota: notaNum !== null && Number.isFinite(notaNum) ? notaNum : null }
        : e)))
    } else {
      const nueva: EvaluacionModulo = {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        fecha,
        ponderacion: pond,
        notaMaxima: 7,
        nota: notaNum !== null && Number.isFinite(notaNum) ? notaNum : null,
      }
      setEvaluacionesModulo(moduloId, [...evaluaciones, nueva])
    }
    setMostrarForm(false)
    setEditandoId(null)
    setError(null)
  }

  const eliminar = (id: string) => {
    setEvaluacionesModulo(moduloId, evaluaciones.filter((e) => e.id !== id))
  }

  const { promedioActual, ponderacionEvaluada, ponderacionPendiente, notaNecesaria } = calcularNotaNecesaria(evaluaciones, objetivoNum)
  const ponderacionTotalActual = calcularPonderacionTotal(evaluaciones)

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-baseline gap-2">
          <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Exámenes y evaluaciones</h2>
          {evaluaciones.length > 0 && (
            <span className={`text-xs ${ponderacionTotalActual === 100 ? 'text-emerald-600' : modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {ponderacionTotalActual}% de 100% cargado
            </span>
          )}
        </div>
        <BotonAgregar label="Agregar evaluación" onClick={iniciarNuevo} modoOscuro={modoOscuro} />
      </div>

      {mostrarForm && (
        <div className={`p-4 rounded-xl border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto label="Nombre" valor={nombre} onChange={setNombre} modoOscuro={modoOscuro} placeholder="Ej: Solemne 1" />
            <CampoTexto label="Fecha" tipo="date" valor={fecha} onChange={setFecha} modoOscuro={modoOscuro} />
            <CampoTexto label="Ponderación (%)" tipo="number" valor={ponderacion} onChange={setPonderacion} modoOscuro={modoOscuro} placeholder="Ej: 30" />
            <CampoTexto label="Nota (opcional, escala 1-7)" tipo="number" valor={nota} onChange={setNota} modoOscuro={modoOscuro} placeholder="Déjalo vacío si aún no la rindes" />
          </div>
          <BotonesFormulario onCancelar={() => { setMostrarForm(false); setEditandoId(null); setError(null) }} onGuardar={guardar} modoOscuro={modoOscuro} error={error} />
        </div>
      )}

      {ordenadas.length === 0 ? (
        <EstadoVacio icono="ti-clipboard-check" texto="Aún no has agregado evaluaciones." modoOscuro={modoOscuro} />
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {ordenadas.map((e) => (
              <div key={e.id} className={`flex items-center gap-3 p-3 rounded-xl border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {e.nota === null ? (
                      <FechaConCountdown fecha={e.fecha} modoOscuro={modoOscuro} />
                    ) : (
                      <span className={`text-xs font-mono ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>{formatearFechaCorta(e.fecha)}</span>
                    )}
                    <button onClick={() => iniciarEdicion(e)} className={`text-sm font-medium text-left hover:underline ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {e.nombre}
                    </button>
                  </div>
                  <span className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{e.ponderacion}% de la nota final</span>
                </div>
                <div
                  className={`px-2.5 py-1 rounded-lg text-sm font-semibold ${
                    e.nota === null
                      ? modoOscuro ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
                      : e.nota / e.notaMaxima * 7 >= 4
                      ? 'text-emerald-600 bg-emerald-500/10'
                      : 'text-red-600 bg-red-500/10'
                  }`}
                >
                  {e.nota === null ? 'Pendiente' : e.nota.toFixed(1)}
                </div>
                <BotonEliminar onClick={() => eliminar(e.id)} modoOscuro={modoOscuro} />
              </div>
            ))}
          </div>

          <div className={`p-4 rounded-xl border ${modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className={`text-xs font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-600'}`}>Calculadora de nota necesaria</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>Objetivo:</span>
                <input
                  type="number"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  step="0.1"
                  className={`w-14 rounded-md px-1.5 py-0.5 text-xs text-center border ${
                    modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                  }`}
                />
              </div>
            </div>
            {promedioActual !== null && (
              <p className={`text-xs mb-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Promedio parcial: <strong>{promedioActual.toFixed(2)}</strong> con {ponderacionEvaluada}% de la nota ya evaluado.
              </p>
            )}
            {ponderacionPendiente === 0 ? (
              <p className={`text-sm font-medium ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                Ya está toda la ponderación evaluada — nota final: {(promedioActual ?? 0).toFixed(2)}
              </p>
            ) : notaNecesaria !== null && notaNecesaria <= 1 ? (
              <p className="text-sm font-medium text-emerald-600">Ya tienes el ramo matemáticamente aprobado.</p>
            ) : notaNecesaria !== null && notaNecesaria > 7 ? (
              <p className="text-sm font-medium text-red-600">
                No alcanzas un {objetivoNum} aunque saques 7.0 en el {ponderacionPendiente}% restante.
              </p>
            ) : (
              <p className={`text-sm font-medium ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                Necesitas un promedio de <span style={{ color: VERDE }}>{notaNecesaria?.toFixed(2)}</span> en el {ponderacionPendiente}% que falta para lograr un {objetivoNum}.
              </p>
            )}
            {ponderacionTotalActual < 100 && (
              <p className={`text-xs mt-2 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                Ojo: solo tienes {ponderacionTotalActual}% de evaluaciones cargadas — falta agregar el {100 - ponderacionTotalActual}% restante para que el cálculo sea exacto.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Textos obligatorios
// ------------------------------------------------------------------

function TabTextos({ moduloId, textos, clases, modoOscuro }: { moduloId: string; textos: TextoObligatorio[]; clases: SesionClase[]; modoOscuro: boolean }) {
  const setTextosModulo = useStore((s) => s.setTextosModulo)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [enlace, setEnlace] = useState('')
  const [claseId, setClaseId] = useState('')

  const iniciarNuevo = () => {
    setEditandoId(null)
    setTitulo('')
    setAutor('')
    setEnlace('')
    setClaseId('')
    setMostrarForm(true)
  }

  const iniciarEdicion = (t: TextoObligatorio) => {
    setEditandoId(t.id)
    setTitulo(t.titulo)
    setAutor(t.autor ?? '')
    setEnlace(t.enlace ?? '')
    setClaseId(t.claseId ?? '')
    setMostrarForm(true)
  }

  const guardar = () => {
    if (!titulo.trim()) return
    if (editandoId) {
      setTextosModulo(moduloId, textos.map((t) => (t.id === editandoId
        ? { ...t, titulo: titulo.trim(), autor: autor.trim() || undefined, enlace: enlace.trim() || undefined, claseId: claseId || undefined }
        : t)))
    } else {
      const nuevo: TextoObligatorio = {
        id: crypto.randomUUID(),
        titulo: titulo.trim(),
        autor: autor.trim() || undefined,
        enlace: enlace.trim() || undefined,
        claseId: claseId || undefined,
        leido: false,
      }
      setTextosModulo(moduloId, [...textos, nuevo])
    }
    setMostrarForm(false)
    setEditandoId(null)
  }

  const toggleLeido = (id: string) => {
    setTextosModulo(moduloId, textos.map((t) => (t.id === id ? { ...t, leido: !t.leido } : t)))
  }

  const eliminar = (id: string) => {
    setTextosModulo(moduloId, textos.filter((t) => t.id !== id))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Textos obligatorios</h2>
        <BotonAgregar label="Agregar texto" onClick={iniciarNuevo} modoOscuro={modoOscuro} />
      </div>

      {mostrarForm && (
        <div className={`p-4 rounded-xl border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <CampoTexto label="Título" valor={titulo} onChange={setTitulo} modoOscuro={modoOscuro} placeholder="Ej: Tratado de las obligaciones, T. I" />
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto label="Autor (opcional)" valor={autor} onChange={setAutor} modoOscuro={modoOscuro} placeholder="Ej: René Abeliuk" />
            <CampoTexto label="Enlace (opcional)" valor={enlace} onChange={setEnlace} modoOscuro={modoOscuro} placeholder="https://..." />
          </div>
          {clases.length > 0 && (
            <CampoSelectClase label="Lectura para la clase (opcional)" valor={claseId} onChange={setClaseId} clases={clases} modoOscuro={modoOscuro} />
          )}
          <BotonesFormulario onCancelar={() => { setMostrarForm(false); setEditandoId(null) }} onGuardar={guardar} modoOscuro={modoOscuro} />
        </div>
      )}

      {textos.length === 0 ? (
        <EstadoVacio icono="ti-books" texto="Aún no has agregado textos obligatorios." modoOscuro={modoOscuro} />
      ) : (
        <div className="space-y-2">
          {textos.map((t) => (
            <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <button onClick={() => toggleLeido(t.id)} className="mt-0.5 flex-shrink-0">
                <i
                  className={`ti ${t.leido ? 'ti-square-rounded-check' : 'ti-square-rounded'} text-lg`}
                  style={{ color: t.leido ? VERDE : undefined }}
                />
              </button>
              <div className="flex-1 min-w-0">
                <button onClick={() => iniciarEdicion(t)} className={`text-sm font-medium block text-left hover:underline ${t.leido ? 'line-through opacity-60' : ''} ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {t.titulo}
                </button>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {t.autor && <span className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{t.autor}</span>}
                  <EtiquetaClase clase={clases.find((c) => c.id === t.claseId)} modoOscuro={modoOscuro} />
                </div>
                {t.enlace && (
                  <a href={t.enlace} target="_blank" rel="noopener noreferrer" className="text-xs block mt-0.5 hover:underline" style={{ color: VERDE }}>
                    Ver enlace
                  </a>
                )}
              </div>
              <BotonEliminar onClick={() => eliminar(t.id)} modoOscuro={modoOscuro} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Apuntes
// ------------------------------------------------------------------

function TabApuntes({
  moduloId, apuntes, clases, cuadernos, modoOscuro,
}: {
  moduloId: string
  apuntes: ApunteModulo[]
  clases: SesionClase[]
  cuadernos: CuadernoApuntes[]
  modoOscuro: boolean
}) {
  const setApuntesModulo = useStore((s) => s.setApuntesModulo)
  const setCuadernosModulo = useStore((s) => s.setCuadernosModulo)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [claseId, setClaseId] = useState('')
  const [cuadernoId, setCuadernoId] = useState('')
  const [filtro, setFiltro] = useState<string>('todos')
  const [mostrarNuevoCuaderno, setMostrarNuevoCuaderno] = useState(false)
  const [nombreNuevoCuaderno, setNombreNuevoCuaderno] = useState('')

  const ordenados = [...apuntes].sort((a, b) => b.fechaModificacion - a.fechaModificacion)
  const filtrados = ordenados.filter((a) => {
    if (filtro === 'todos') return true
    if (filtro === 'sin-cuaderno') return !a.cuadernoId
    return a.cuadernoId === filtro
  })

  const iniciarNuevo = () => {
    setEditandoId(null)
    setTitulo('')
    setContenido('')
    setClaseId('')
    setCuadernoId(filtro !== 'todos' && filtro !== 'sin-cuaderno' ? filtro : '')
    setMostrarForm(true)
  }

  const iniciarEdicion = (a: ApunteModulo) => {
    setEditandoId(a.id)
    setTitulo(a.titulo)
    setContenido(a.contenido)
    setClaseId(a.claseId ?? '')
    setCuadernoId(a.cuadernoId ?? '')
    setMostrarForm(true)
  }

  const guardar = () => {
    if (!titulo.trim()) return
    const ahora = Date.now()
    if (editandoId) {
      setApuntesModulo(moduloId, apuntes.map((a) => (a.id === editandoId ? { ...a, titulo: titulo.trim(), contenido, claseId: claseId || undefined, cuadernoId: cuadernoId || undefined, fechaModificacion: ahora } : a)))
    } else {
      const nuevo: ApunteModulo = { id: crypto.randomUUID(), titulo: titulo.trim(), contenido, claseId: claseId || undefined, cuadernoId: cuadernoId || undefined, fechaCreacion: ahora, fechaModificacion: ahora }
      setApuntesModulo(moduloId, [...apuntes, nuevo])
    }
    setMostrarForm(false)
    setEditandoId(null)
  }

  const eliminar = (id: string) => {
    setApuntesModulo(moduloId, apuntes.filter((a) => a.id !== id))
  }

  const crearCuaderno = () => {
    if (!nombreNuevoCuaderno.trim()) return
    const nuevo: CuadernoApuntes = { id: crypto.randomUUID(), nombre: nombreNuevoCuaderno.trim() }
    setCuadernosModulo(moduloId, [...cuadernos, nuevo])
    setCuadernoId(nuevo.id)
    setNombreNuevoCuaderno('')
    setMostrarNuevoCuaderno(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Apuntes propios</h2>
        <BotonAgregar label="Nuevo apunte" onClick={iniciarNuevo} modoOscuro={modoOscuro} />
      </div>

      {cuadernos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[{ id: 'todos', nombre: 'Todos' }, { id: 'sin-cuaderno', nombre: 'Sin cuaderno' }, ...cuadernos].map((c) => (
            <button
              key={c.id}
              onClick={() => setFiltro(c.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filtro === c.id
                  ? 'text-white border-transparent'
                  : modoOscuro ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
              style={filtro === c.id ? { background: VERDE } : undefined}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      {mostrarForm && (
        <div className={`p-4 rounded-xl border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <CampoTexto label="Título" valor={titulo} onChange={setTitulo} modoOscuro={modoOscuro} placeholder="Ej: Clase 3 — Modos de extinguir" />
          <label className="block">
            <span className={`block text-xs font-medium mb-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>Contenido</span>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={6}
              className={`w-full rounded-lg px-3 py-2 text-sm outline-none border resize-y ${
                modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
              }`}
              placeholder="Escribe tu apunte..."
            />
          </label>
          {clases.length > 0 && (
            <CampoSelectClase label="Clase a la que pertenece (opcional)" valor={claseId} onChange={setClaseId} clases={clases} modoOscuro={modoOscuro} />
          )}
          <div>
            <span className={`block text-xs font-medium mb-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>Cuaderno (opcional)</span>
            {mostrarNuevoCuaderno ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={nombreNuevoCuaderno}
                  onChange={(e) => setNombreNuevoCuaderno(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') crearCuaderno() }}
                  placeholder="Ej: Cuaderno de audiencias"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none border ${
                    modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                  }`}
                />
                <button onClick={crearCuaderno} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: VERDE }}>Crear</button>
                <button onClick={() => setMostrarNuevoCuaderno(false)} className={`px-3 py-1.5 rounded-lg text-xs ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>Cancelar</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={cuadernoId}
                  onChange={(e) => setCuadernoId(e.target.value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none border ${
                    modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                  }`}
                >
                  <option value="">Sin cuaderno</option>
                  {cuadernos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button onClick={() => setMostrarNuevoCuaderno(true)} className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${modoOscuro ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>
                  + Nuevo
                </button>
              </div>
            )}
          </div>
          <BotonesFormulario onCancelar={() => { setMostrarForm(false); setEditandoId(null) }} onGuardar={guardar} modoOscuro={modoOscuro} />
        </div>
      )}

      {filtrados.length === 0 ? (
        <EstadoVacio icono="ti-notes" texto={apuntes.length === 0 ? 'Aún no tienes apuntes en este módulo.' : 'No hay apuntes en este cuaderno.'} modoOscuro={modoOscuro} />
      ) : (
        <div className="space-y-2">
          {filtrados.map((a) => {
            const cuaderno = cuadernos.find((c) => c.id === a.cuadernoId)
            return (
              <div key={a.id} className={`p-3 rounded-xl border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => iniciarEdicion(a)} className={`text-sm font-medium text-left hover:underline ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {a.titulo}
                    </button>
                    {cuaderno && (
                      <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md ${modoOscuro ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
                        <i className="ti ti-notebook text-xs" />
                        {cuaderno.nombre}
                      </span>
                    )}
                    <EtiquetaClase clase={clases.find((c) => c.id === a.claseId)} modoOscuro={modoOscuro} />
                  </div>
                  <BotonEliminar onClick={() => eliminar(a.id)} modoOscuro={modoOscuro} />
                </div>
                {a.contenido && (
                  <p className={`text-xs whitespace-pre-wrap line-clamp-3 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>{a.contenido}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Casos (brief IRAC/FIRAC)
// ------------------------------------------------------------------

function campoBriefVacio() {
  return { caratula: '', tribunal: '', fecha: '', hechos: '', cuestionJuridica: '', normaAplicable: '', analisis: '', conclusion: '', claseId: '' }
}

function CampoArea({
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

function TabCasos({ moduloId, briefs, clases, modoOscuro }: { moduloId: string; briefs: BriefCaso[]; clases: SesionClase[]; modoOscuro: boolean }) {
  const setBriefsModulo = useStore((s) => s.setBriefsModulo)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [campos, setCampos] = useState(campoBriefVacio())
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  const ordenados = [...briefs].sort((a, b) => b.fechaModificacion - a.fechaModificacion)

  const set = (campo: keyof ReturnType<typeof campoBriefVacio>) => (valor: string) => setCampos((c) => ({ ...c, [campo]: valor }))

  const iniciarNuevo = () => {
    setEditandoId(null)
    setCampos(campoBriefVacio())
    setMostrarForm(true)
  }

  const iniciarEdicion = (b: BriefCaso) => {
    setEditandoId(b.id)
    setCampos({
      caratula: b.caratula,
      tribunal: b.tribunal ?? '',
      fecha: b.fecha ?? '',
      hechos: b.hechos,
      cuestionJuridica: b.cuestionJuridica,
      normaAplicable: b.normaAplicable,
      analisis: b.analisis,
      conclusion: b.conclusion,
      claseId: b.claseId ?? '',
    })
    setMostrarForm(true)
  }

  const guardar = () => {
    if (!campos.caratula.trim()) return
    const ahora = Date.now()
    const limpiar = (v: string) => v.trim() || undefined
    if (editandoId) {
      setBriefsModulo(moduloId, briefs.map((b) => (b.id === editandoId
        ? {
            ...b,
            caratula: campos.caratula.trim(),
            tribunal: limpiar(campos.tribunal),
            fecha: limpiar(campos.fecha),
            hechos: campos.hechos,
            cuestionJuridica: campos.cuestionJuridica,
            normaAplicable: campos.normaAplicable,
            analisis: campos.analisis,
            conclusion: campos.conclusion,
            claseId: campos.claseId || undefined,
            fechaModificacion: ahora,
          }
        : b)))
    } else {
      const nuevo: BriefCaso = {
        id: crypto.randomUUID(),
        caratula: campos.caratula.trim(),
        tribunal: limpiar(campos.tribunal),
        fecha: limpiar(campos.fecha),
        hechos: campos.hechos,
        cuestionJuridica: campos.cuestionJuridica,
        normaAplicable: campos.normaAplicable,
        analisis: campos.analisis,
        conclusion: campos.conclusion,
        claseId: campos.claseId || undefined,
        fechaCreacion: ahora,
        fechaModificacion: ahora,
      }
      setBriefsModulo(moduloId, [...briefs, nuevo])
    }
    setMostrarForm(false)
    setEditandoId(null)
  }

  const eliminar = (id: string) => {
    setBriefsModulo(moduloId, briefs.filter((b) => b.id !== id))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Casos (brief IRAC)</h2>
          <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
            Hechos, Cuestión jurídica, Norma aplicable, Análisis y Conclusión de un fallo.
          </p>
        </div>
        <BotonAgregar label="Agregar caso" onClick={iniciarNuevo} modoOscuro={modoOscuro} />
      </div>

      {mostrarForm && (
        <div className={`p-4 rounded-xl border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto label="Carátula / rol" valor={campos.caratula} onChange={set('caratula')} modoOscuro={modoOscuro} placeholder="Ej: Rol 12.345-2023, Corte Suprema" />
            <CampoTexto label="Tribunal (opcional)" valor={campos.tribunal} onChange={set('tribunal')} modoOscuro={modoOscuro} />
          </div>
          <CampoTexto label="Fecha del fallo (opcional)" tipo="date" valor={campos.fecha} onChange={set('fecha')} modoOscuro={modoOscuro} />
          <CampoArea label="Hechos" valor={campos.hechos} onChange={set('hechos')} modoOscuro={modoOscuro} placeholder="Qué pasó, quiénes son las partes" />
          <CampoArea label="Cuestión jurídica (Issue)" valor={campos.cuestionJuridica} onChange={set('cuestionJuridica')} modoOscuro={modoOscuro} placeholder="La pregunta de derecho que el tribunal debe resolver" />
          <CampoArea label="Norma aplicable (Rule)" valor={campos.normaAplicable} onChange={set('normaAplicable')} modoOscuro={modoOscuro} placeholder="Artículos, normas o principios que rigen el caso" />
          <CampoArea label="Análisis (Application)" valor={campos.analisis} onChange={set('analisis')} modoOscuro={modoOscuro} placeholder="Cómo el tribunal aplicó la norma a estos hechos" />
          <CampoArea label="Conclusión" valor={campos.conclusion} onChange={set('conclusion')} modoOscuro={modoOscuro} placeholder="Qué resolvió el tribunal" />
          {clases.length > 0 && (
            <CampoSelectClase label="Clase a la que pertenece (opcional)" valor={campos.claseId} onChange={set('claseId')} clases={clases} modoOscuro={modoOscuro} />
          )}
          <BotonesFormulario onCancelar={() => { setMostrarForm(false); setEditandoId(null) }} onGuardar={guardar} modoOscuro={modoOscuro} />
        </div>
      )}

      {ordenados.length === 0 ? (
        <EstadoVacio icono="ti-gavel" texto="Aún no has analizado ningún caso en este módulo." modoOscuro={modoOscuro} />
      ) : (
        <div className="space-y-2">
          {ordenados.map((b) => {
            const expandido = expandidoId === b.id
            return (
              <div key={b.id} className={`rounded-xl border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className="flex items-start justify-between gap-2 p-3">
                  <button onClick={() => setExpandidoId(expandido ? null : b.id)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{b.caratula}</span>
                      <EtiquetaClase clase={clases.find((c) => c.id === b.claseId)} modoOscuro={modoOscuro} />
                    </div>
                    {(b.tribunal || b.fecha) && (
                      <span className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                        {[b.tribunal, b.fecha ? formatearFechaCorta(b.fecha) : null].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => iniciarEdicion(b)} className={`w-7 h-7 rounded-md flex items-center justify-center ${modoOscuro ? 'text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'}`}>
                      <i className="ti ti-pencil text-sm" />
                    </button>
                    <BotonEliminar onClick={() => eliminar(b.id)} modoOscuro={modoOscuro} />
                  </div>
                </div>
                {expandido && (
                  <div className={`px-3 pb-3 space-y-2 border-t pt-3 ${modoOscuro ? 'border-zinc-700' : 'border-zinc-100'}`}>
                    {[
                      ['Hechos', b.hechos],
                      ['Cuestión jurídica', b.cuestionJuridica],
                      ['Norma aplicable', b.normaAplicable],
                      ['Análisis', b.analisis],
                      ['Conclusión', b.conclusion],
                    ].filter(([, v]) => v).map(([label, valor]) => (
                      <div key={label}>
                        <span className={`block text-[11px] font-semibold uppercase tracking-wide ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>{label}</span>
                        <p className={`text-xs whitespace-pre-wrap ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>{valor}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

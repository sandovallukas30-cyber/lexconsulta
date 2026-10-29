import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import { eliminarDeListaConDeshacer } from '../../../services/deshacer'
import type { SesionClase } from '../../../types'
import { VERDE, formatearFechaCorta } from './utilidades'
import { BotonAgregar, BotonEliminar, BotonesFormulario, CampoTexto, EstadoVacio, FechaConCountdown, FormularioRapido } from './comunes'
import { hoyISO, sumarDiasISO } from '../../../services/tareasPlan'
import { GenerarClases } from './GenerarClases'
import { ASISTENCIA_MIN_DEFECTO, resumenAsistencia } from '../../../services/asistencia'

export function TabClases({ moduloId, clases, modoOscuro }: { moduloId: string; clases: SesionClase[]; modoOscuro: boolean }) {
  const setClasesModulo = useStore((s) => s.setClasesModulo)
  const ramo = useStore((s) => s.ramos.find((r) => r.id === moduloId))
  const hayHorario = (ramo?.bloques?.length ?? 0) > 0
  const asistencia = resumenAsistencia(clases, ramo?.asistenciaMin ?? ASISTENCIA_MIN_DEFECTO)
  const hoy = hoyISO()
  const [generando, setGenerando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [fecha, setFecha] = useState('')
  const [tema, setTema] = useState('')
  const [notas, setNotas] = useState('')
  const [reenfocar, setReenfocar] = useState(0)

  const ordenadas = [...clases].sort((a, b) => a.fecha.localeCompare(b.fecha))

  const iniciarNuevo = () => {
    setEditandoId(null)
    // fecha por defecto: una semana después de la última clase cargada (o hoy)
    setFecha(ordenadas.length > 0 ? sumarDiasISO(ordenadas[ordenadas.length - 1].fecha, 7) : hoyISO())
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
      // seguir cargando: el formulario queda abierto con la fecha de la
      // semana siguiente y el foco en el tema
      setFecha(sumarDiasISO(fecha, 7))
      setTema('')
      setNotas('')
      setReenfocar((n) => n + 1)
      return
    }
    setMostrarForm(false)
    setEditandoId(null)
  }

  const toggleCompletada = (id: string) => {
    setClasesModulo(moduloId, clases.map((c) => (c.id === id ? { ...c, completada: !c.completada } : c)))
  }

  /** Fui / Falté: tocar de nuevo el mismo botón lo deja sin registrar. */
  const marcarAsistencia = (id: string, valor: boolean) => {
    setClasesModulo(moduloId, clases.map((c) => (c.id === id ? { ...c, asistio: c.asistio === valor ? undefined : valor, completada: valor ? true : c.completada } : c)))
  }

  const eliminar = (id: string) => {
    eliminarDeListaConDeshacer(
      id,
      () => useStore.getState().academicoModulos[moduloId]?.clases ?? [],
      (lista) => setClasesModulo(moduloId, lista),
      'Clase eliminada'
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Cronograma de clases</h2>
        <div className="flex items-center gap-2">
          {hayHorario && (
            <button onClick={() => { setGenerando(true); setMostrarForm(false) }} className="boton boton-borde boton-chico">
              <i className="ti ti-wand text-sm" aria-hidden="true" />
              Generar semestre
            </button>
          )}
          <BotonAgregar label="Agregar clase" onClick={() => { setGenerando(false); iniciarNuevo() }} modoOscuro={modoOscuro} />
        </div>
      </div>

      {generando && <GenerarClases moduloId={moduloId} clases={clases} modoOscuro={modoOscuro} onCerrar={() => setGenerando(false)} />}

      {mostrarForm && (
        <FormularioRapido
          onGuardar={guardar}
          onCancelar={() => { setMostrarForm(false); setEditandoId(null) }}
          reenfocar={reenfocar}
          className={`p-4 rounded-tarjeta border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoTexto label="Fecha" tipo="date" valor={fecha} onChange={setFecha} modoOscuro={modoOscuro} />
            <CampoTexto label="Tema" valor={tema} onChange={setTema} modoOscuro={modoOscuro} placeholder="Ej: Teoría del acto jurídico" foco />
          </div>
          <CampoTexto label="Notas (opcional)" valor={notas} onChange={setNotas} modoOscuro={modoOscuro} placeholder="Lo que quieras recordar de esta sesión" />
          <BotonesFormulario onCancelar={() => { setMostrarForm(false); setEditandoId(null) }} onGuardar={guardar} modoOscuro={modoOscuro} />
          {!editandoId && (
            <p className={`text-[11px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Enter guarda y deja listo el formulario para la clase de la semana siguiente. Esc cierra.
            </p>
          )}
        </FormularioRapido>
      )}

      {ordenadas.length > 0 && <PanelAsistencia r={asistencia} modoOscuro={modoOscuro} />}

      {ordenadas.length === 0 ? (
        <EstadoVacio
          icono="ti-calendar-event"
          texto="Aún no has agregado sesiones de clase."
          detalle={hayHorario ? 'Tienes tu horario definido: genera todas las clases del semestre de una vez.' : ramo ? 'Tip: define tu horario en Editar asignatura y generas todas las clases del semestre de una vez.' : 'Agrega el cronograma del semestre: verás cuánto falta para cada clase y podrás vincular apuntes y lecturas.'}
          acciones={[
            ...(hayHorario ? [{ label: 'Generar las clases del semestre', icono: 'ti-wand', onClick: () => setGenerando(true) }] : []),
            { label: 'Agregar clase', icono: 'ti-plus', onClick: iniciarNuevo },
          ]}
          modoOscuro={modoOscuro}
        />
      ) : (
        <div className="space-y-2">
          {ordenadas.map((c) => (
            <div key={c.id} className={`flex items-start gap-3 p-3 rounded-tarjeta border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
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
                  {c.hora && <span className={`text-xs font-mono ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{c.hora}</span>}
                  <button onClick={() => iniciarEdicion(c)} className={`text-sm font-medium text-left hover:underline ${c.completada ? 'line-through opacity-60' : ''} ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {c.tema}
                  </button>
                </div>
                {c.notas && <p className={`text-xs mt-1 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{c.notas}</p>}
                {c.fecha <= hoy && (
                  <div className="flex gap-1.5 mt-1.5" role="group" aria-label="Asistencia">
                    <button onClick={() => marcarAsistencia(c.id, true)} aria-pressed={c.asistio === true} className="boton boton-chico boton-suave">
                      Fui
                    </button>
                    <button
                      onClick={() => marcarAsistencia(c.id, false)}
                      aria-pressed={c.asistio === false}
                      className={`boton boton-chico ${c.asistio === false ? '' : 'boton-suave'}`}
                      style={c.asistio === false ? { background: '#dc2626', color: '#fff' } : undefined}
                    >
                      Falté
                    </button>
                  </div>
                )}
              </div>
              <BotonEliminar onClick={() => eliminar(c.id)} modoOscuro={modoOscuro} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PanelAsistencia({ r, modoOscuro }: { r: ReturnType<typeof resumenAsistencia>; modoOscuro: boolean }) {
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  const color = r.estado === 'riesgo' ? 'text-red-600' : r.estado === 'cuidado' ? (modoOscuro ? 'text-amber-400' : 'text-amber-700') : r.estado === 'bien' ? (modoOscuro ? 'text-emerald-400' : 'text-emerald-700') : suave
  let linea: string
  if (r.pct === null) linea = 'Marca «Fui» o «Falté» en cada clase para llevar tu asistencia.'
  else if (!r.margenConfiable) linea = `Carga todo el cronograma del semestre para saber cuántas faltas te quedan (mínimo ${r.min}%).`
  else if (r.margen >= 0) linea = `Te ${r.margen === 1 ? 'queda' : 'quedan'} ${r.margen} ${r.margen === 1 ? 'falta' : 'faltas'} para mantener el ${r.min}% de asistencia.`
  else linea = `Ya superaste el límite de faltas por ${-r.margen} (mínimo ${r.min}%).`
  return (
    <div className={`flex items-center gap-4 p-4 rounded-tarjeta border mb-4 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{r.pct === null ? '—' : `${r.pct}%`}</div>
      <div className="min-w-0">
        <div className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>
          Asistencia{r.registradas > 0 ? ` · fuiste a ${r.presentes} de ${r.registradas}` : ''}
        </div>
        <div className={`text-xs ${r.estado === 'riesgo' ? 'text-red-600 font-medium' : suave}`}>{linea}</div>
      </div>
    </div>
  )
}

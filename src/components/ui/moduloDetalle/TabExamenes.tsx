import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../../store/useStore'
import { eliminarDeListaConDeshacer } from '../../../services/deshacer'
import type { EvaluacionModulo } from '../../../types'
import { calcularPonderacionTotal } from '../../../services/modulosAcademico'
import { formatoNota, NOTA_APROBAR, simular } from '../../../services/notas'
import { formatearFechaCorta } from './utilidades'
import { BotonAgregar, BotonEliminar, BotonesFormulario, CampoTexto, EstadoVacio, FechaConCountdown, FormularioRapido } from './comunes'

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

export function TabExamenes({
  moduloId, evaluaciones, modoOscuro, enfocarId,
}: {
  moduloId: string
  evaluaciones: EvaluacionModulo[]
  modoOscuro: boolean
  /** Abrir esta evaluación en edición al montar (una sola vez). */
  enfocarId?: string
}) {
  const setEvaluacionesModulo = useStore((s) => s.setEvaluacionesModulo)
  // Si se llegó desde "Próximas evaluaciones", el formulario abre ya con esa
  // evaluación cargada (estado inicial, no un efecto: solo al montar).
  const [inicial] = useState(() => (enfocarId ? evaluaciones.find((e) => e.id === enfocarId) : undefined))
  const [mostrarForm, setMostrarForm] = useState(!!inicial)
  const [editandoId, setEditandoId] = useState<string | null>(inicial?.id ?? null)
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [fecha, setFecha] = useState(inicial?.fecha ?? '')
  const [ponderacion, setPonderacion] = useState(inicial ? String(inicial.ponderacion) : '')
  const [nota, setNota] = useState(inicial?.nota != null ? String(inicial.nota) : '')
  const refForm = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (inicial) refForm.current?.scrollIntoView({ block: 'center' })
  }, [inicial])
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
    const faltan = [!nombre.trim() && 'el nombre', !fecha && 'la fecha', (!Number.isFinite(pond) || pond <= 0) && 'la ponderación (un número mayor que 0, p. ej. 30)'].filter(Boolean)
    if (faltan.length > 0) {
      setError(`Falta ${faltan.join(', ')}.`)
      return
    }
    if (ponderacionCargada + pond > 100) {
      setError(`Con ${pond}% superarías el 100% (ya tienes ${ponderacionCargada}% cargado).`)
      return
    }
    const notaNum = nota.trim() === '' ? null : Number(nota.replace(',', '.'))
    if (notaNum !== null && (!Number.isFinite(notaNum) || notaNum < 1 || notaNum > 7)) {
      setError('La nota debe estar entre 1,0 y 7,0 (o déjala vacía si aún no la tienes).')
      return
    }
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
    eliminarDeListaConDeshacer(
      id,
      () => useStore.getState().academicoModulos[moduloId]?.evaluaciones ?? [],
      (lista) => setEvaluacionesModulo(moduloId, lista),
      'Evaluación eliminada'
    )
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
        <div ref={refForm}>
        <FormularioRapido
          onGuardar={guardar}
          onCancelar={() => { setMostrarForm(false); setEditandoId(null); setError(null) }}
          className={`p-4 rounded-tarjeta border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoTexto label="Nombre" valor={nombre} onChange={setNombre} modoOscuro={modoOscuro} placeholder="Ej: Solemne 1" foco />
            <CampoTexto label="Fecha" tipo="date" valor={fecha} onChange={setFecha} modoOscuro={modoOscuro} />
            <CampoTexto label="Ponderación (%)" tipo="number" valor={ponderacion} onChange={setPonderacion} modoOscuro={modoOscuro} placeholder={`Queda ${Math.max(0, 100 - ponderacionCargada)}% por repartir`} />
            <CampoTexto label="Nota (opcional, escala 1-7)" tipo="number" valor={nota} onChange={setNota} modoOscuro={modoOscuro} placeholder="Déjalo vacío si aún no la rindes" />
          </div>
          <BotonesFormulario onCancelar={() => { setMostrarForm(false); setEditandoId(null); setError(null) }} onGuardar={guardar} modoOscuro={modoOscuro} error={error} />
        </FormularioRapido>
        </div>
      )}

      {ordenadas.length === 0 ? (
        <EstadoVacio
          icono="ti-clipboard-check"
          texto="Aún no has agregado evaluaciones."
          detalle="Con fecha y ponderación de cada una, te avisamos cuáles se acercan y calculamos la nota que necesitas."
          acciones={[{ label: 'Agregar evaluación', icono: 'ti-plus', onClick: iniciarNuevo }]}
          modoOscuro={modoOscuro}
        />
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {ordenadas.map((e) => (
              <div key={e.id} className={`flex items-center gap-3 p-3 rounded-tarjeta border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
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

          <div className={`p-4 rounded-tarjeta border ${modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
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
                No alcanzas un {objetivoNum} aunque saques 7.0 en lo que falta por evaluar ({ponderacionPendiente}% de la nota final).
              </p>
            ) : (
              <p className={`text-sm font-medium ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                Necesitas un promedio de <span style={{ color: 'var(--accent-texto)' }}>{notaNecesaria?.toFixed(2)}</span> en lo que falta por evaluar ({ponderacionPendiente}% de la nota final) para lograr un {objetivoNum}.
              </p>
            )}
            {ponderacionTotalActual < 100 && (
              <p className={`text-xs mt-2 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                Ojo: solo cargaste evaluaciones por el {ponderacionTotalActual}% de la nota — agrega el {100 - ponderacionTotalActual}% restante para que el cálculo sea exacto.
              </p>
            )}
          </div>
          <Simulador evaluaciones={evaluaciones} modoOscuro={modoOscuro} />
        </>
      )}
    </div>
  )
}

/** "¿Y si saco…?": notas hipotéticas en lo pendiente y qué nota final resultaría. */
function Simulador({ evaluaciones, modoOscuro }: { evaluaciones: EvaluacionModulo[]; modoOscuro: boolean }) {
  const pendientes = evaluaciones.filter((e) => e.nota === null).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const [hip, setHip] = useState<Record<string, string>>({})
  if (pendientes.length === 0) return null
  const nums: Record<string, number> = {}
  for (const [id, v] of Object.entries(hip)) {
    const n = Number(v.replace(',', '.'))
    if (v.trim() !== '' && Number.isFinite(n)) nums[id] = Math.min(7, Math.max(1, n))
  }
  const r = simular(evaluaciones, nums)
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  return (
    <div className={`p-4 rounded-tarjeta border mt-3 ${modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
      <span className={`text-xs font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-600'}`}>¿Y si saco…?</span>
      <ul className="mt-2 space-y-1.5">
        {pendientes.map((e) => (
          <li key={e.id} className="flex items-center gap-3">
            <span className={`flex-1 min-w-0 text-sm truncate ${modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {e.nombre} <span className={`text-xs ${suave}`}>({e.ponderacion}%)</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={7}
              step={0.1}
              aria-label={`Nota hipotética en ${e.nombre}`}
              placeholder="nota"
              value={hip[e.id] ?? ''}
              onChange={(ev) => setHip((h) => ({ ...h, [e.id]: ev.target.value }))}
              className={`w-20 rounded-control px-2 py-1.5 text-sm text-center border outline-none campo-foco ${
                modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            />
          </li>
        ))}
      </ul>
      <p className={`text-sm mt-3 font-medium ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
        {r.final !== null ? (
          <>
            Nota final:{' '}
            <span className={r.final >= NOTA_APROBAR ? 'text-emerald-600' : 'text-red-600'}>
              {formatoNota(r.final)} · {r.final >= NOTA_APROBAR ? 'aprobado' : 'reprobado'}
            </span>
          </>
        ) : r.promedio !== null && Object.keys(nums).length > 0 ? (
          <>
            Promedio con esas notas: {formatoNota(r.promedio)} <span className={`font-normal text-xs ${suave}`}>(cubre el {Math.round(r.pesoCubierto)}% de la nota)</span>
          </>
        ) : (
          <span className={`font-normal text-xs ${suave}`}>Escribe una nota en cada evaluación pendiente y ves cómo quedaría tu promedio.</span>
        )}
      </p>
    </div>
  )
}

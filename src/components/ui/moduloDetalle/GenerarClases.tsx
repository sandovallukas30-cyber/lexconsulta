import { useMemo, useState } from 'react'
import { useStore } from '../../../store/useStore'
import { avisar } from '../../../store/useAvisos'
import type { SesionClase } from '../../../types'
import { formatearHorario, generarFechasClases } from '../../../services/horario'
import { hoyISO, sumarDiasISO } from '../../../services/tareasPlan'
import { CampoTexto, FormularioRapido } from './comunes'

/** Genera las clases de todo el semestre a partir del horario del ramo:
 *  una fecha y hora por bloque y semana, en vez de cargarlas una por una. */
export function GenerarClases({
  moduloId, clases, modoOscuro, onCerrar,
}: {
  moduloId: string
  clases: SesionClase[]
  modoOscuro: boolean
  onCerrar: () => void
}) {
  const ramo = useStore((s) => s.ramos.find((r) => r.id === moduloId))
  const setClasesModulo = useStore((s) => s.setClasesModulo)
  const bloques = useMemo(() => ramo?.bloques ?? [], [ramo])
  const [desde, setDesde] = useState(hoyISO())
  // un semestre dura unas 16 semanas
  const [hasta, setHasta] = useState(() => sumarDiasISO(hoyISO(), 16 * 7 - 1))
  const [omitirFeriados, setOmitirFeriados] = useState(true)

  const nuevas = useMemo(
    () => generarFechasClases({ desde, hasta, bloques, omitirFeriados, fechasExistentes: new Set(clases.map((c) => c.fecha)) }),
    [desde, hasta, bloques, omitirFeriados, clases]
  )

  const generar = () => {
    if (nuevas.length === 0) return
    const previas = clases
    const creadas: SesionClase[] = nuevas.map((n) => ({ id: crypto.randomUUID(), fecha: n.fecha, hora: n.hora, ...(n.sala ? { sala: n.sala } : {}), tema: '', completada: false }))
    // numeradas por orden de fecha, contando también las que ya había
    const todas = [...previas, ...creadas].sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))
    const numeradas = todas.map((c, i) => (c.tema === '' ? { ...c, tema: `Clase ${i + 1}` } : c))
    setClasesModulo(moduloId, numeradas)
    avisar.conDeshacer(`${creadas.length} clases generadas`, () => setClasesModulo(moduloId, previas))
    onCerrar()
  }

  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'

  return (
    <FormularioRapido
      onGuardar={generar}
      onCancelar={onCerrar}
      className={`p-4 rounded-tarjeta border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}
    >
      <div>
        <h3 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>Generar las clases del semestre</h3>
        <p className={`text-xs mt-0.5 ${suave}`}>
          Según tu horario: {formatearHorario(bloques)}. Después le pones el tema a cada una cuando quieras.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CampoTexto label="Desde" tipo="date" valor={desde} onChange={setDesde} modoOscuro={modoOscuro} foco />
        <CampoTexto label="Hasta" tipo="date" valor={hasta} onChange={setHasta} modoOscuro={modoOscuro} />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={omitirFeriados}
          onChange={(e) => setOmitirFeriados(e.target.checked)}
          style={{ accentColor: 'var(--accent-base)' }}
          className="w-4 h-4"
        />
        <span className={modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}>Saltar feriados de Chile</span>
      </label>
      <p className={`text-[11px] ${suave}`}>
        Incluye los de fecha fija y Semana Santa; revisa el calendario de tu universidad por semanas de receso y feriados que cambian de día.
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-medium ${nuevas.length === 0 ? 'text-red-600' : modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>
          {nuevas.length === 0 ? 'No hay clases por crear en ese rango' : `Se crearán ${nuevas.length} clases`}
        </span>
        <div className="flex gap-2">
          <button onClick={onCerrar} className="boton boton-fantasma boton-chico">Cancelar</button>
          <button onClick={generar} disabled={nuevas.length === 0} className="boton boton-primario boton-chico">Generar</button>
        </div>
      </div>
    </FormularioRapido>
  )
}

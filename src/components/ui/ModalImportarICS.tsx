import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { avisar } from '../../store/useAvisos'
import { useDialogo } from '../../hooks/useDialogo'
import { SelectPrima } from './SelectPrima'
import { nombreEvaluacion, sugerirRamo, yaExiste, type EventoICS } from '../../services/icsImportar'
import type { EvaluacionModulo } from '../../types'

interface Fila {
  clave: number
  incluir: boolean
  nombre: string
  fecha: string
  ramoId: string
}

const fechaCorta = (iso: string) =>
  new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8))).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })

/** Revisión antes de importar: cada fecha del archivo con la asignatura sugerida;
 *  se puede cambiar la asignatura, el nombre o dejar una fuera. */
export function ModalImportarICS({ eventos, onCerrar }: { eventos: EventoICS[]; onCerrar: () => void }) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const ramos = useStore((s) => s.ramos)
  const academico = useStore((s) => s.academicoModulos)
  const setEvaluacionesModulo = useStore((s) => s.setEvaluacionesModulo)
  const dialogoRef = useDialogo<HTMLDivElement>(true, onCerrar)

  const existe = (f: Pick<Fila, 'ramoId' | 'nombre' | 'fecha'>) => !!f.ramoId && yaExiste(academico[f.ramoId]?.evaluaciones ?? [], f.nombre, f.fecha)
  const [filas, setFilas] = useState<Fila[]>(() =>
    eventos.map((ev, i) => {
      const f = { clave: i, nombre: nombreEvaluacion(ev), fecha: ev.fecha, ramoId: sugerirRamo(ev.titulo, ramos) ?? '' }
      return { ...f, incluir: !!f.ramoId && !existe(f) }
    })
  )
  const cambiar = (clave: number, cambio: Partial<Fila>) =>
    setFilas((prev) =>
      prev.map((f) => {
        if (f.clave !== clave) return f
        const n = { ...f, ...cambio }
        // al elegir asignatura por primera vez, se marca sola
        if (cambio.ramoId !== undefined) n.incluir = !!n.ramoId && !existe(n)
        return n
      })
    )

  const aImportar = filas.filter((f) => f.incluir && f.ramoId && f.nombre.trim() && !existe(f))
  const importar = () => {
    const porRamo = new Map<string, EvaluacionModulo[]>()
    for (const f of aImportar) {
      const lista = porRamo.get(f.ramoId) ?? []
      lista.push({ id: crypto.randomUUID(), nombre: f.nombre.trim(), fecha: f.fecha, ponderacion: 0, notaMaxima: 7, nota: null })
      porRamo.set(f.ramoId, lista)
    }
    for (const [ramoId, nuevas] of porRamo) {
      setEvaluacionesModulo(ramoId, [...(useStore.getState().academicoModulos[ramoId]?.evaluaciones ?? []), ...nuevas])
    }
    avisar.exito(`${aImportar.length} ${aImportar.length === 1 ? 'evaluación agregada' : 'evaluaciones agregadas'}. Ponles su porcentaje en cada asignatura.`)
    onCerrar()
  }

  const borde = modoOscuro ? 'border-zinc-800' : 'border-zinc-200'
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCerrar}
    >
      <motion.div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-importar-ics"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className={`max-w-2xl w-full max-h-[85vh] rounded-2xl shadow-flotante overflow-hidden flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-white'}`}
      >
        <div className={`px-5 py-4 border-b ${borde}`}>
          <h2 id="titulo-importar-ics" className={`text-lg font-bold ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Importar fechas
          </h2>
          <p className={`text-sm mt-0.5 ${suave}`}>
            {eventos.length} {eventos.length === 1 ? 'fecha' : 'fechas'} en el archivo. Revisa a qué asignatura va cada una; las que no son tuyas, déjalas sin marcar.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {ramos.length === 0 ? (
            <p className={`text-sm py-6 text-center ${suave}`}>Primero crea tus asignaturas en «Mis asignaturas» y vuelve a importar.</p>
          ) : (
            <ul className="space-y-2">
              {filas.map((f) => {
                const repetida = existe(f)
                return (
                  <li key={f.clave} className={`flex flex-wrap sm:flex-nowrap items-center gap-2 py-2 border-b last:border-0 ${borde}`}>
                    <input
                      type="checkbox"
                      checked={f.incluir && !repetida}
                      disabled={!f.ramoId || repetida}
                      onChange={(ev) => cambiar(f.clave, { incluir: ev.target.checked })}
                      aria-label={`Importar ${f.nombre}`}
                      className="w-5 h-5 shrink-0"
                    />
                    <div className="flex-1 min-w-[10rem]">
                      <input
                        value={f.nombre}
                        onChange={(ev) => cambiar(f.clave, { nombre: ev.target.value })}
                        aria-label="Nombre de la evaluación"
                        className="w-full h-9 px-2 text-sm rounded-control border"
                      />
                      <p className={`text-xs mt-0.5 capitalize ${suave}`}>
                        {fechaCorta(f.fecha)}
                        {repetida && <span className="normal-case"> · ya está en esa asignatura</span>}
                      </p>
                    </div>
                    <SelectPrima
                      value={f.ramoId}
                      onChange={(ev) => cambiar(f.clave, { ramoId: ev.target.value })}
                      aria-label={`Asignatura de ${f.nombre}`}
                      className="w-full sm:w-56 h-9 px-2 rounded-control border text-sm"
                    >
                      <option value="">No es mía</option>
                      {ramos.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </SelectPrima>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className={`px-5 py-3 border-t flex items-center justify-end gap-2 ${borde}`}>
          <button className="boton boton-fantasma" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="boton boton-primario" disabled={aImportar.length === 0} onClick={importar} data-autofocus>
            {aImportar.length === 0 ? 'Importar' : `Importar ${aImportar.length}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

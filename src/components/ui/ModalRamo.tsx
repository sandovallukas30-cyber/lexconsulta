import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { eliminarRamoConDeshacer } from '../../services/deshacer'
import { avisar } from '../../store/useAvisos'
import { MODULOS } from '../../data/modulos'
import { ICONO_RAMO_DEFECTO } from '../../services/modulosAcademico'
import { useDialogo } from '../../hooks/useDialogo'
import { DIAS_LARGOS, formatearHorario } from '../../services/horario'
import type { BloqueHorario, Ramo } from '../../types'

const VERDE = 'var(--accent-base)'

/** Mismo criterio visual que los íconos/colores ya usados en MODULOS (ver
 *  data/modulos.ts) -- así un Ramo propio, sin ningún módulo afín, igual
 *  puede verse "de la casa" en vez de gris/anónimo. */
const ICONOS_RAMO = [
  ICONO_RAMO_DEFECTO,
  'ti-scale',
  'ti-gavel',
  'ti-book',
  'ti-books',
  'ti-files',
  'ti-briefcase',
  'ti-coin',
  'ti-building-store',
  'ti-building',
  'ti-home-shield',
  'ti-certificate',
  'ti-notebook',
  'ti-users-group',
  'ti-world',
  'ti-building-bank',
]

const COLORES_RAMO = [VERDE, '#dc2626', '#9333ea', '#0891b2', '#ea580c', '#7c3aed', '#0284c7', '#059669', '#d97706']

interface Props {
  abierto: boolean
  ramoEditando: Ramo | null
  onCerrar: () => void
}

function campoVacio() {
  return { nombre: '', semestre: '', codigoCurso: '', profesor: '', email: '', horario: '', sala: '', syllabusUrl: '' }
}

function estadoDesdeRamo(r: Ramo | null): ReturnType<typeof campoVacio> {
  if (!r) return campoVacio()
  return {
    nombre: r.nombre,
    semestre: r.semestre ?? '',
    codigoCurso: r.codigoCurso ?? '',
    profesor: r.profesor ?? '',
    email: r.email ?? '',
    horario: r.horario ?? '',
    sala: r.sala ?? '',
    syllabusUrl: r.syllabusUrl ?? '',
  }
}

/** ¿Tiene datos más allá del nombre? Si sí, "Más detalles" abre desplegado. */
function tieneDetalles(r: Ramo | null): boolean {
  return !!r && !!((r.bloques?.length ?? 0) > 0 || r.asistenciaMin || r.semestre || r.codigoCurso || r.profesor || r.email || r.horario || r.sala || r.syllabusUrl || r.modulosVinculados.length)
}

export function ModalRamo({ abierto, ramoEditando, onCerrar }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const crearRamo = useStore((s) => s.crearRamo)
  const actualizarRamo = useStore((s) => s.actualizarRamo)
  const ramosExistentes = useStore((s) => s.ramos.length)

  const [campos, setCampos] = useState(() => estadoDesdeRamo(ramoEditando))
  const [modulosVinculados, setModulosVinculados] = useState<string[]>(ramoEditando?.modulosVinculados ?? [])
  const [icono, setIcono] = useState<string>(ramoEditando?.icono ?? ICONO_RAMO_DEFECTO)
  const [color, setColor] = useState<string>(ramoEditando?.color ?? VERDE)
  const [verDetalles, setVerDetalles] = useState(() => tieneDetalles(ramoEditando))
  const [bloques, setBloques] = useState<BloqueHorario[]>(ramoEditando?.bloques ?? [])
  const [asistenciaMin, setAsistenciaMin] = useState(ramoEditando?.asistenciaMin ? String(ramoEditando.asistenciaMin) : '')
  const dialogoRef = useDialogo<HTMLDivElement>(abierto, onCerrar)

  // Reinicia el formulario cada vez que se abre (crear nuevo o editar otro
  // ramo). Normalizado a '' en ambos lados -- comparar ramoEditando?.id
  // (undefined en modo "crear") contra un useState inicializado con ?? null
  // deja la condición siempre true en modo "crear" (undefined !== null no
  // cambia nunca) y dispara un loop infinito de re-renders.
  const idComparable = ramoEditando?.id ?? ''
  const [ultimoId, setUltimoId] = useState(idComparable)
  const [estabaAbierto, setEstabaAbierto] = useState(abierto)
  if (abierto && (idComparable !== ultimoId || !estabaAbierto)) {
    setUltimoId(idComparable)
    setEstabaAbierto(true)
    setCampos(estadoDesdeRamo(ramoEditando))
    setModulosVinculados(ramoEditando?.modulosVinculados ?? [])
    setIcono(ramoEditando?.icono ?? ICONO_RAMO_DEFECTO)
    // un ramo nuevo parte con un color distinto al del anterior
    setColor(ramoEditando?.color ?? COLORES_RAMO[ramosExistentes % COLORES_RAMO.length])
    setVerDetalles(tieneDetalles(ramoEditando))
    setBloques(ramoEditando?.bloques ?? [])
    setAsistenciaMin(ramoEditando?.asistenciaMin ? String(ramoEditando.asistenciaMin) : '')
  }
  if (!abierto && estabaAbierto) setEstabaAbierto(false)

  if (!abierto) return null

  const set = (campo: keyof ReturnType<typeof campoVacio>) => (valor: string) => setCampos((c) => ({ ...c, [campo]: valor }))

  const toggleModulo = (id: string) => {
    setModulosVinculados((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  const limpiar = (v: string) => v.trim() || undefined

  const guardar = () => {
    if (!campos.nombre.trim()) return
    const datos = {
      nombre: campos.nombre.trim(),
      semestre: limpiar(campos.semestre),
      codigoCurso: limpiar(campos.codigoCurso),
      profesor: limpiar(campos.profesor),
      email: limpiar(campos.email),
      bloques: bloques.length > 0 ? bloques : undefined,
      asistenciaMin: Number(asistenciaMin) >= 1 && Number(asistenciaMin) <= 100 ? Math.round(Number(asistenciaMin)) : undefined,
      // el texto del horario se deriva de los bloques; si no hay, se respeta el que ya tenía
      horario: bloques.length > 0 ? formatearHorario(bloques) : limpiar(campos.horario),
      sala: limpiar(campos.sala),
      syllabusUrl: limpiar(campos.syllabusUrl),
      modulosVinculados,
      icono,
      color,
    }
    if (ramoEditando) {
      actualizarRamo(ramoEditando.id, datos)
      avisar.exito('Ramo actualizado')
    } else {
      crearRamo(datos)
      avisar.exito(`Ramo "${datos.nombre}" creado`)
    }
    onCerrar()
  }

  const eliminar = () => {
    if (ramoEditando) eliminarRamoConDeshacer(ramoEditando.id)
    onCerrar()
  }

  const inputClase = `w-full rounded-lg px-3 py-2 text-sm outline-none border campo-foco ${
    modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
  }`
  const labelClase = `block text-xs font-medium mb-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`

  // Enter en cualquier campo de una línea guarda (antes había que ir al botón)
  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault()
      guardar()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onCerrar}
      >
        <motion.div
          ref={dialogoRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-ramo"
          onKeyDown={alTeclear}
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className={`max-w-lg w-full max-h-[85vh] rounded-2xl shadow-flotante overflow-hidden flex flex-col ${
            modoOscuro ? 'bg-zinc-900' : 'bg-white'
          }`}
        >
          <div className={`px-6 py-4 border-b flex items-center justify-between ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <h2 id="titulo-modal-ramo" className={`text-lg font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              {ramoEditando ? 'Editar ramo' : 'Nuevo ramo'}
            </h2>
            <button
              onClick={onCerrar}
              aria-label="Cerrar"
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <i className="ti ti-x text-lg" aria-hidden="true" />
            </button>
          </div>

          <div className="px-6 py-4 overflow-y-auto space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: color + '20' }}
              >
                <i className={`ti ${icono} text-xl`} style={{ color }} aria-hidden="true" />
              </div>
              <label className="block flex-1">
                <span className={labelClase}>Nombre del ramo</span>
                <input
                  data-autofocus
                  className={inputClase}
                  value={campos.nombre}
                  onChange={(e) => set('nombre')(e.target.value)}
                  placeholder="Ej: Derecho Civil I"
                  maxLength={120}
                />
              </label>
            </div>

            <div>
              <span className={labelClase}>Color</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Color del ramo">
                {COLORES_RAMO.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Color ${i + 1}`}
                    aria-pressed={c === color}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform"
                    style={{
                      background: c,
                      transform: c === color ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: c === color ? `0 0 0 2px ${modoOscuro ? '#121620' : '#ffffff'}, 0 0 0 4px ${c}` : 'none',
                    }}
                  >
                    {c === color && <i className="ti ti-check text-xs text-white" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setVerDetalles((v) => !v)}
              aria-expanded={verDetalles}
              className={`flex items-center gap-1.5 text-xs font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-600'}`}
            >
              <i className={`ti ti-chevron-right text-sm transition-transform ${verDetalles ? 'rotate-90' : ''}`} aria-hidden="true" />
              Más detalles (profesor, horario, ícono…)
            </button>

            {verDetalles && (
              <div className="space-y-3">
                <div>
                  <span className={labelClase}>Ícono</span>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ícono del ramo">
                    {ICONOS_RAMO.map((ic) => {
                      const activo = ic === icono
                      return (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setIcono(ic)}
                          aria-label={`Ícono ${ic.replace('ti-', '')}`}
                          aria-pressed={activo}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
                          style={
                            activo
                              ? { background: color + '20', color, borderColor: color }
                              : { borderColor: modoOscuro ? '#323c4e' : '#e0e5ed', color: modoOscuro ? '#8d97aa' : '#5a6579' }
                          }
                        >
                          <i className={`ti ${ic} text-sm`} aria-hidden="true" />
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelClase}>Semestre</span>
                    <input className={inputClase} value={campos.semestre} onChange={(e) => set('semestre')(e.target.value)} placeholder="Ej: 2do 2026" />
                  </label>
                  <label className="block">
                    <span className={labelClase}>Código de curso</span>
                    <input className={inputClase} value={campos.codigoCurso} onChange={(e) => set('codigoCurso')(e.target.value)} placeholder="Ej: DPRI080-23" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelClase}>Profesor</span>
                    <input className={inputClase} value={campos.profesor} onChange={(e) => set('profesor')(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className={labelClase}>Email del profesor</span>
                    <input className={inputClase} type="email" value={campos.email} onChange={(e) => set('email')(e.target.value)} />
                  </label>
                </div>
                <div>
                  <span className={labelClase}>Horario de clases</span>
                  {bloques.length === 0 && ramoEditando?.horario && (
                    <p className={`text-[11px] mb-1.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      Tenías escrito «{ramoEditando.horario}». Define los bloques para poder generar las clases del semestre.
                    </p>
                  )}
                  <div className="space-y-2">
                    {bloques.map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          aria-label="Día"
                          value={b.dia}
                          onChange={(e) => setBloques((l) => l.map((x, j) => (j === i ? { ...x, dia: Number(e.target.value) } : x)))}
                          className={inputClase}
                        >
                          {DIAS_LARGOS.map((n, d) => (
                            <option key={n} value={d}>{n}</option>
                          ))}
                        </select>
                        <input
                          type="time"
                          aria-label="Hora de inicio"
                          value={b.inicio}
                          onChange={(e) => setBloques((l) => l.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)))}
                          className={inputClase}
                        />
                        <input
                          type="time"
                          aria-label="Hora de término"
                          value={b.fin ?? ''}
                          onChange={(e) => setBloques((l) => l.map((x, j) => (j === i ? { ...x, fin: e.target.value || undefined } : x)))}
                          className={inputClase}
                        />
                        <input
                          type="text"
                          aria-label="Sala o lugar"
                          placeholder="Sala o lugar"
                          maxLength={80}
                          value={b.sala ?? ''}
                          onChange={(e) => setBloques((l) => l.map((x, j) => (j === i ? { ...x, sala: e.target.value || undefined } : x)))}
                          className={`${inputClase} min-w-[120px] flex-1`}
                        />
                        <button
                          type="button"
                          aria-label="Quitar bloque"
                          onClick={() => setBloques((l) => l.filter((_, j) => j !== i))}
                          className="boton boton-fantasma boton-chico boton-icono"
                        >
                          <i className="ti ti-x" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setBloques((l) => [...l, { dia: Math.min(6, l.length > 0 ? (l[l.length - 1].dia + 2) % 5 : 0), inicio: '08:30', fin: '09:50' }])
                    }
                    className="boton boton-borde boton-chico mt-2"
                  >
                    <i className="ti ti-plus text-sm" aria-hidden="true" />
                    Agregar bloque
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelClase}>Sala</span>
                    <input className={inputClase} value={campos.sala} onChange={(e) => set('sala')(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className={labelClase}>Asistencia mínima (%)</span>
                    <input
                      className={inputClase}
                      type="number"
                      min={1}
                      max={100}
                      value={asistenciaMin}
                      onChange={(e) => setAsistenciaMin(e.target.value)}
                      placeholder="75"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={labelClase}>Syllabus (enlace, opcional)</span>
                  <input className={inputClase} value={campos.syllabusUrl} onChange={(e) => set('syllabusUrl')(e.target.value)} placeholder="https://..." />
                </label>

                <div>
                  <span className={labelClase}>Áreas del derecho que toca</span>
                  <div className="flex flex-wrap gap-1.5">
                    {MODULOS.map((m) => {
                      const activo = modulosVinculados.includes(m.id)
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleModulo(m.id)}
                          aria-pressed={activo}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors"
                          style={
                            activo
                              ? { background: m.color + '20', color: m.color, borderColor: m.color }
                              : { borderColor: modoOscuro ? '#323c4e' : '#e0e5ed', color: modoOscuro ? '#8d97aa' : '#5a6579' }
                          }
                        >
                          <i className={`ti ${m.icono} text-xs`} aria-hidden="true" />
                          {m.nombre}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`px-6 py-4 border-t flex items-center justify-between gap-2 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
            {ramoEditando ? (
              <button onClick={eliminar} className="text-xs font-medium text-red-600 hover:underline">Eliminar ramo</button>
            ) : <span />}
            <div className="flex gap-2">
              <button onClick={onCerrar} className="boton boton-fantasma boton-chico">Cancelar</button>
              <button onClick={guardar} disabled={!campos.nombre.trim()} className="boton boton-primario boton-chico">
                {ramoEditando ? 'Guardar' : 'Crear ramo'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

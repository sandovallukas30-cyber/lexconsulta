import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { MODULOS } from '../../data/modulos'
import { ICONO_RAMO_DEFECTO } from '../../services/modulosAcademico'
import type { Ramo } from '../../types'

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
  'ti-landmark',
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

export function ModalRamo({ abierto, ramoEditando, onCerrar }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const crearRamo = useStore((s) => s.crearRamo)
  const actualizarRamo = useStore((s) => s.actualizarRamo)
  const eliminarRamo = useStore((s) => s.eliminarRamo)

  const [campos, setCampos] = useState(() => estadoDesdeRamo(ramoEditando))
  const [modulosVinculados, setModulosVinculados] = useState<string[]>(ramoEditando?.modulosVinculados ?? [])
  const [icono, setIcono] = useState<string>(ramoEditando?.icono ?? ICONO_RAMO_DEFECTO)
  const [color, setColor] = useState<string>(ramoEditando?.color ?? VERDE)

  // Reinicia el formulario cada vez que se abre (crear nuevo o editar otro
  // ramo). Normalizado a '' en ambos lados -- comparar ramoEditando?.id
  // (undefined en modo "crear") contra un useState inicializado con ?? null
  // deja la condición siempre true en modo "crear" (undefined !== null no
  // cambia nunca) y dispara un loop infinito de re-renders.
  const idComparable = ramoEditando?.id ?? ''
  const [ultimoId, setUltimoId] = useState(idComparable)
  if (abierto && idComparable !== ultimoId) {
    setUltimoId(idComparable)
    setCampos(estadoDesdeRamo(ramoEditando))
    setModulosVinculados(ramoEditando?.modulosVinculados ?? [])
    setIcono(ramoEditando?.icono ?? ICONO_RAMO_DEFECTO)
    setColor(ramoEditando?.color ?? VERDE)
  }

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
      horario: limpiar(campos.horario),
      sala: limpiar(campos.sala),
      syllabusUrl: limpiar(campos.syllabusUrl),
      modulosVinculados,
      icono,
      color,
    }
    if (ramoEditando) actualizarRamo(ramoEditando.id, datos)
    else crearRamo(datos)
    onCerrar()
  }

  const eliminar = () => {
    if (ramoEditando) eliminarRamo(ramoEditando.id)
    onCerrar()
  }

  const inputClase = `w-full rounded-lg px-3 py-2 text-sm outline-none border ${
    modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
  }`
  const labelClase = `block text-xs font-medium mb-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`

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
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className={`max-w-lg w-full max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
            modoOscuro ? 'bg-zinc-900' : 'bg-white'
          }`}
        >
          <div className={`px-6 py-4 border-b flex items-center justify-between ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <h2 className={`text-lg font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              {ramoEditando ? 'Editar ramo' : 'Agregar ramo'}
            </h2>
            <button onClick={onCerrar} className={`w-8 h-8 rounded-lg flex items-center justify-center ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}>
              <i className="ti ti-x text-lg" />
            </button>
          </div>

          <div className="px-6 py-4 overflow-y-auto space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: color + '20' }}
              >
                <i className={`ti ${icono} text-xl`} style={{ color }} />
              </div>
              <label className="block flex-1">
                <span className={labelClase}>Nombre del ramo</span>
                <input className={inputClase} value={campos.nombre} onChange={(e) => set('nombre')(e.target.value)} placeholder="Ej: Principios Fundamentales del Derecho Privado" />
              </label>
            </div>

            <div>
              <span className={labelClase}>Ícono</span>
              <div className="flex flex-wrap gap-1.5">
                {ICONOS_RAMO.map((ic) => {
                  const activo = ic === icono
                  return (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcono(ic)}
                      title={ic}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
                      style={
                        activo
                          ? { background: color + '20', color, borderColor: color }
                          : { borderColor: modoOscuro ? '#3f3f46' : '#e4e4e7', color: modoOscuro ? '#a1a1aa' : '#71717a' }
                      }
                    >
                      <i className={`ti ${ic} text-sm`} />
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className={labelClase}>Color</span>
              <div className="flex flex-wrap gap-1.5">
                {COLORES_RAMO.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={c}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform"
                    style={{
                      background: c,
                      transform: c === color ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: c === color ? `0 0 0 2px ${modoOscuro ? '#18181b' : '#ffffff'}, 0 0 0 4px ${c}` : 'none',
                    }}
                  >
                    {c === color && <i className="ti ti-check text-xs text-white" />}
                  </button>
                ))}
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
                <span className={labelClase}>Email</span>
                <input className={inputClase} type="email" value={campos.email} onChange={(e) => set('email')(e.target.value)} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClase}>Horario</span>
                <input className={inputClase} value={campos.horario} onChange={(e) => set('horario')(e.target.value)} placeholder="Ej: Martes 10:00" />
              </label>
              <label className="block">
                <span className={labelClase}>Sala</span>
                <input className={inputClase} value={campos.sala} onChange={(e) => set('sala')(e.target.value)} />
              </label>
            </div>
            <label className="block">
              <span className={labelClase}>Syllabus (enlace, opcional)</span>
              <input className={inputClase} value={campos.syllabusUrl} onChange={(e) => set('syllabusUrl')(e.target.value)} placeholder="https://..." />
            </label>

            <div>
              <span className={labelClase}>Módulos vinculados</span>
              <div className="flex flex-wrap gap-1.5">
                {MODULOS.map((m) => {
                  const activo = modulosVinculados.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModulo(m.id)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors"
                      style={
                        activo
                          ? { background: m.color + '20', color: m.color, borderColor: m.color }
                          : { borderColor: modoOscuro ? '#3f3f46' : '#e4e4e7', color: modoOscuro ? '#a1a1aa' : '#71717a' }
                      }
                    >
                      <i className={`ti ${m.icono} text-xs`} />
                      {m.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className={`px-6 py-4 border-t flex items-center justify-between gap-2 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
            {ramoEditando ? (
              <button onClick={eliminar} className="text-xs font-medium text-red-600 hover:underline">Eliminar ramo</button>
            ) : <span />}
            <div className="flex gap-2">
              <button onClick={onCerrar} className={`px-3 py-1.5 rounded-lg text-xs ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}>Cancelar</button>
              <button onClick={guardar} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: VERDE }}>Guardar</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

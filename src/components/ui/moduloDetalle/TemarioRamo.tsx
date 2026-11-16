import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import { agregarUnidades, apuntesPorUnidad, limpiarUnidadesBorradas, MAX_NOMBRE_UNIDAD, MAX_UNIDADES, parsearTemario, SIN_UNIDAD } from '../../../services/temario'
import type { ApunteModulo, EvaluacionModulo, UnidadRamo } from '../../../types'

/** Temario del ramo: las unidades del programa del curso. Sirve para ordenar los apuntes, marcar qué entra en cada
 *  evaluación y armar el simulacro solo con lo que entra. Todo opcional. */
export function TemarioRamo({
  moduloId, unidades, apuntes, evaluaciones, modoOscuro,
}: {
  moduloId: string
  unidades: UnidadRamo[]
  apuntes: ApunteModulo[]
  evaluaciones: EvaluacionModulo[]
  modoOscuro: boolean
}) {
  const setUnidadesModulo = useStore((s) => s.setUnidadesModulo)
  const setApuntesModulo = useStore((s) => s.setApuntesModulo)
  const setEvaluacionesModulo = useStore((s) => s.setEvaluacionesModulo)
  const [abierto, setAbierto] = useState(false)
  const [pegado, setPegado] = useState('')
  const [nueva, setNueva] = useState('')
  const conteo = apuntesPorUnidad(apuntes, unidades)
  const sinUnidad = conteo.get(SIN_UNIDAD) ?? 0
  const nombresPegados = parsearTemario(pegado)

  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-600'
  const campo = `rounded-control px-3 min-h-[40px] text-sm outline-none border campo-foco ${modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`

  const guardarLista = (lista: UnidadRamo[]) => setUnidadesModulo(moduloId, lista)

  const agregarPegado = () => {
    if (nombresPegados.length === 0) return
    guardarLista(agregarUnidades(unidades, nombresPegados))
    setPegado('')
  }
  const agregarUna = () => {
    const n = nueva.trim().slice(0, MAX_NOMBRE_UNIDAD)
    if (!n) return
    guardarLista(agregarUnidades(unidades, [n]))
    setNueva('')
  }
  const renombrar = (id: string, nombre: string) => {
    const limpio = nombre.trim().slice(0, MAX_NOMBRE_UNIDAD)
    if (!limpio) return
    guardarLista(unidades.map((u) => (u.id === id ? { ...u, nombre: limpio } : u)))
  }
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= unidades.length) return
    const copia = [...unidades]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    guardarLista(copia)
  }
  const borrar = (id: string) => {
    const resto = unidades.filter((u) => u.id !== id)
    const limpio = limpiarUnidadesBorradas(resto, evaluaciones, apuntes)
    guardarLista(resto)
    setEvaluacionesModulo(moduloId, limpio.evaluaciones)
    setApuntesModulo(moduloId, limpio.apuntes)
  }

  return (
    <section aria-label="Temario del ramo" className={`mb-4 rounded-tarjeta border ${modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
      <button onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left min-h-[44px]">
        <i className="ti ti-list-numbers text-base" aria-hidden="true" style={{ color: 'var(--accent-texto)' }} />
        <span className={`flex-1 text-sm font-semibold ${modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>
          Temario {unidades.length > 0 ? `(${unidades.length} ${unidades.length === 1 ? 'unidad' : 'unidades'})` : ''}
        </span>
        <span className={`text-xs ${suave}`}>{unidades.length === 0 ? 'Pega el programa del curso' : abierto ? 'Cerrar' : 'Editar'}</span>
        <i className={`ti ${abierto ? 'ti-chevron-up' : 'ti-chevron-down'} text-base ${suave}`} aria-hidden="true" />
      </button>
      {abierto && (
        <div className="px-3.5 pb-3.5 space-y-3">
          <p className={`text-xs ${suave}`}>
            Con las unidades ordenas tus apuntes, marcas <strong>qué entra</strong> en cada evaluación y el simulacro puede preguntarte solo eso.
          </p>
          {unidades.length > 0 && (
            <ul className="space-y-1.5">
              {unidades.map((u, i) => (
                <li key={u.id} className="flex items-center gap-1.5">
                  <input
                    defaultValue={u.nombre}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value.trim() !== u.nombre) renombrar(u.id, e.target.value)
                      else e.target.value = u.nombre
                    }}
                    maxLength={MAX_NOMBRE_UNIDAD}
                    aria-label={`Nombre de la unidad ${i + 1}`}
                    className={`${campo} flex-1 min-w-0`}
                  />
                  <span className={`text-xs w-16 text-right flex-shrink-0 ${suave}`}>
                    {conteo.get(u.id) ?? 0} {(conteo.get(u.id) ?? 0) === 1 ? 'apunte' : 'apuntes'}
                  </span>
                  <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${u.nombre}`} className="boton boton-fantasma boton-chico boton-icono">
                    <i className="ti ti-arrow-up" aria-hidden="true" />
                  </button>
                  <button onClick={() => mover(i, 1)} disabled={i === unidades.length - 1} aria-label={`Bajar ${u.nombre}`} className="boton boton-fantasma boton-chico boton-icono">
                    <i className="ti ti-arrow-down" aria-hidden="true" />
                  </button>
                  <button onClick={() => borrar(u.id)} aria-label={`Quitar la unidad ${u.nombre}`} className="boton boton-fantasma boton-chico boton-icono">
                    <i className="ti ti-x" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {unidades.length > 0 && sinUnidad > 0 && (
            <p className={`text-xs ${suave}`}>
              {sinUnidad} {sinUnidad === 1 ? 'apunte sin unidad' : 'apuntes sin unidad'}. Asígnalos desde «⋯ → Mover o asignar unidad».
            </p>
          )}
          {unidades.length < MAX_UNIDADES && (
            <>
              <div className="flex gap-1.5">
                <input
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      agregarUna()
                    }
                  }}
                  placeholder="Nueva unidad, ej: Unidad 3: Los actos jurídicos"
                  maxLength={MAX_NOMBRE_UNIDAD}
                  aria-label="Nombre de la nueva unidad"
                  className={`${campo} flex-1 min-w-0`}
                />
                <button onClick={agregarUna} disabled={!nueva.trim()} className="boton boton-suave">
                  Agregar
                </button>
              </div>
              <label className="block">
                <span className={`block text-xs font-medium mb-1 ${suave}`}>O pega el programa completo (una unidad por línea)</span>
                <textarea
                  value={pegado}
                  onChange={(e) => setPegado(e.target.value)}
                  rows={4}
                  placeholder={'1. Fuentes del derecho\n2. Los actos jurídicos\n3. La prueba'}
                  className={`${campo} w-full py-2`}
                />
              </label>
              <button onClick={agregarPegado} disabled={nombresPegados.length === 0} className="boton boton-primario">
                {nombresPegados.length > 0 ? `Agregar ${nombresPegados.length} al temario` : 'Agregar al temario'}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  )
}

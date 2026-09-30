import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import { eliminarDeListaConDeshacer } from '../../../services/deshacer'
import type { SesionClase } from '../../../types'
import { VERDE, formatearFechaCorta } from './utilidades'
import { BotonAgregar, BotonEliminar, BotonesFormulario, CampoTexto, EstadoVacio, FechaConCountdown } from './comunes'

export function TabClases({ moduloId, clases, modoOscuro }: { moduloId: string; clases: SesionClase[]; modoOscuro: boolean }) {
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

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../../store/useStore'
import { avisar } from '../../../store/useAvisos'
import { MODULOS } from '../../../data/modulos'
import { descargarApunteMd } from '../../../services/apunteArchivo'
import { moverApunte } from '../../../services/accionesApunte'
import type { ApunteModulo, CuadernoApuntes } from '../../../types'
import { VERDE } from './utilidades'

/** Menú "⋯" de cada apunte de la lista. */
export function MenuAccionesApunte({
  apunte, onDuplicar, onMover, modoOscuro,
}: {
  apunte: ApunteModulo
  onDuplicar: () => void
  onMover: () => void
  modoOscuro: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuera)
      window.removeEventListener('keydown', esc)
    }
  }, [abierto])

  const item = `w-full flex items-center gap-2 px-3 min-h-[40px] text-sm text-left transition-colors ${
    modoOscuro ? 'text-zinc-200 hover:bg-zinc-700' : 'text-zinc-700 hover:bg-zinc-100'
  }`
  const elegir = (accion: () => void) => () => {
    setAbierto(false)
    accion()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label={`Más acciones para "${apunte.titulo}"`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className={`w-9 h-9 rounded-md flex items-center justify-center ${modoOscuro ? 'text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'}`}
      >
        <i className="ti ti-dots text-base" />
      </button>
      {abierto && (
        <div
          role="menu"
          className={`absolute right-0 top-full mt-1 z-20 w-52 py-1 rounded-xl border shadow-lg ${
            modoOscuro ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
          }`}
        >
          <button role="menuitem" className={item} onClick={elegir(onDuplicar)}>
            <i className="ti ti-copy text-base" /> Duplicar
          </button>
          <button role="menuitem" className={item} onClick={elegir(onMover)}>
            <i className="ti ti-folder-symlink text-base" /> Mover a…
          </button>
          <button
            role="menuitem"
            className={item}
            onClick={elegir(() => {
              descargarApunteMd(apunte)
              avisar.exito('Apunte exportado a .md')
            })}
          >
            <i className="ti ti-file-download text-base" /> Exportar a .md
          </button>
        </div>
      )}
    </div>
  )
}

/** Diálogo para elegir módulo/ramo y cuaderno de destino. */
export function ModalMoverApunte({
  moduloId, apunte, onCerrar, modoOscuro,
}: {
  moduloId: string
  apunte: ApunteModulo
  onCerrar: () => void
  modoOscuro: boolean
}) {
  const ramos = useStore((s) => s.ramos)
  const academicoModulos = useStore((s) => s.academicoModulos)
  const setCuadernosModulo = useStore((s) => s.setCuadernosModulo)
  const [destino, setDestino] = useState(moduloId)
  const [cuaderno, setCuaderno] = useState(apunte.cuadernoId ?? '')
  const [nuevoCuaderno, setNuevoCuaderno] = useState('')

  const opciones = useMemo(
    () => [
      ...ramos.map((r) => ({ id: r.id, nombre: r.nombre, grupo: 'Mis ramos' })),
      ...MODULOS.map((m) => ({ id: m.id, nombre: m.nombre, grupo: 'Módulos' })),
    ],
    [ramos]
  )
  const cuadernos: CuadernoApuntes[] = academicoModulos[destino]?.cuadernos ?? []

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const confirmar = () => {
    let cuadernoFinal = cuaderno || undefined
    if (cuaderno === '__nuevo__') {
      const nombre = nuevoCuaderno.trim()
      if (!nombre) return
      const nuevo = { id: crypto.randomUUID(), nombre }
      setCuadernosModulo(destino, [...cuadernos, nuevo])
      cuadernoFinal = nuevo.id
    }
    if (destino === moduloId && cuadernoFinal === apunte.cuadernoId) {
      onCerrar()
      return
    }
    moverApunte(moduloId, apunte, destino, cuadernoFinal)
    onCerrar()
  }

  const campo = `w-full rounded-lg px-3 min-h-[44px] text-sm outline-none border ${
    modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
  }`
  const etiqueta = `block text-xs font-medium mb-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCerrar}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Mover apunte"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className={`max-w-md w-full rounded-2xl shadow-2xl p-5 space-y-4 ${modoOscuro ? 'bg-zinc-900' : 'bg-white'}`}
      >
        <div>
          <h2 className={`text-lg font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>Mover apunte</h2>
          <p className={`text-xs mt-0.5 truncate ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>{apunte.titulo}</p>
        </div>
        <label className="block">
          <span className={etiqueta}>Ramo o módulo</span>
          <select
            className={campo}
            value={destino}
            onChange={(e) => {
              setDestino(e.target.value)
              setCuaderno('')
            }}
          >
            {['Mis ramos', 'Módulos'].map((g) => {
              const deGrupo = opciones.filter((o) => o.grupo === g)
              if (deGrupo.length === 0) return null
              return (
                <optgroup key={g} label={g}>
                  {deGrupo.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre}
                      {o.id === moduloId ? ' (actual)' : ''}
                    </option>
                  ))}
                </optgroup>
              )
            })}
          </select>
        </label>
        <label className="block">
          <span className={etiqueta}>Cuaderno</span>
          <select className={campo} value={cuaderno} onChange={(e) => setCuaderno(e.target.value)}>
            <option value="">Sin cuaderno</option>
            {cuadernos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
            <option value="__nuevo__">+ Cuaderno nuevo…</option>
          </select>
        </label>
        {cuaderno === '__nuevo__' && (
          <input
            autoFocus
            className={campo}
            placeholder="Nombre del cuaderno"
            value={nuevoCuaderno}
            onChange={(e) => setNuevoCuaderno(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmar()
            }}
          />
        )}
        {destino !== moduloId && apunte.claseId && (
          <p className="text-xs text-amber-600">La clase vinculada es de este ramo: al moverlo el apunte queda sin clase.</p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onCerrar} className={`px-3 min-h-[40px] rounded-lg text-sm ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}>
            Cancelar
          </button>
          <button onClick={confirmar} className="px-4 min-h-[40px] rounded-lg text-sm font-medium text-white" style={{ background: VERDE }}>
            Mover
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

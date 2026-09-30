import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../../store/useStore'
import { avisar } from '../../../store/useAvisos'
import { MODULOS } from '../../../data/modulos'
import { descargarApunteMd } from '../../../services/apunteArchivo'
import { moverApunte } from '../../../services/accionesApunte'
import type { ApunteModulo, CuadernoApuntes } from '../../../types'

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
  // Abrir hacia arriba si el menú no cabe bajo el botón (último apunte de la
  // lista en un celular).
  const [haciaArriba, setHaciaArriba] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const refMenu = useRef<HTMLDivElement>(null)

  const alternar = () => {
    if (!abierto) {
      const r = ref.current?.getBoundingClientRect()
      setHaciaArriba(!!r && window.innerHeight - r.bottom < 170)
    }
    setAbierto((v) => !v)
  }

  // Teclado: foco al primer ítem al abrir, flechas para moverse
  useEffect(() => {
    if (abierto) refMenu.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()
  }, [abierto])
  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(refMenu.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
  }

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
        onClick={alternar}
        aria-label={`Más acciones para "${apunte.titulo}"`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="boton boton-fantasma boton-chico boton-icono"
      >
        <i className="ti ti-dots text-base" />
      </button>
      {abierto && (
        <div
          ref={refMenu}
          role="menu"
          onKeyDown={alTeclear}
          className={`absolute right-0 ${haciaArriba ? 'bottom-full mb-1' : 'top-full mt-1'} z-20 w-52 py-1 rounded-tarjeta border shadow-lg ${
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

  const campo = `w-full rounded-control px-3 min-h-[44px] text-sm outline-none border campo-foco ${
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
          <button onClick={onCerrar} className="boton boton-fantasma">
            Cancelar
          </button>
          <button onClick={confirmar} className="boton boton-primario px-4">
            Mover
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

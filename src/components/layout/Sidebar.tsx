import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { ModalCodigos } from '../ui/ModalCodigos'
import { ModalAcercaDe } from '../ui/ModalAcercaDe'
import type { VistaId } from '../../types'

interface ItemMenu {
  id: VistaId
  icono: string
  label: string
}

const items: ItemMenu[] = [
  { id: 'consultar', icono: 'ti-messages', label: 'Consultar' },
  { id: 'situacion', icono: 'ti-list-numbers', label: 'Situación' },
  { id: 'canvas', icono: 'ti-affiliate', label: 'Canvas' },
  { id: 'comparar', icono: 'ti-versions', label: 'Comparar' },
  { id: 'mapa', icono: 'ti-network', label: 'Mapa' },
  { id: 'explorador', icono: 'ti-book-2', label: 'Explorador' },
  { id: 'practica', icono: 'ti-puzzle', label: 'Práctica' },
  { id: 'historial', icono: 'ti-history', label: 'Historial' },
  { id: 'admin', icono: 'ti-settings-2', label: 'Admin' },
]

const VERDE = 'var(--accent-base)'

export function Sidebar() {
  const vistaActiva = useStore((s) => s.vistaActiva)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const codigos = useStore((s) => s.codigos)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const colapsado = useStore((s) => s.sidebarColapsado)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const [modalCodigos, setModalCodigos] = useState(false)
  const acercaAbierto = useStore((s) => s.acercaAbierto)
  const acercaPestana = useStore((s) => s.acercaPestana)
  const abrirAcerca = useStore((s) => s.abrirAcerca)
  const cerrarAcerca = useStore((s) => s.cerrarAcerca)

  // Atajo: Ctrl/Cmd + B para colapsar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleSidebar])

  const activos = codigos.filter((c) => c.activo).length
  const total = codigos.length

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: colapsado ? 68 : 256 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`flex flex-col border-r overflow-hidden ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div
          className={`flex items-center border-b ${
            colapsado ? 'justify-center px-2 py-4' : 'justify-between px-4 py-4'
          } ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}
        >
          {colapsado ? (
            <button
              onClick={toggleSidebar}
              title="Expandir (Ctrl+B)"
              aria-label="Expandir menú lateral"
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-zinc-800/10 transition-colors"
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: VERDE }}
              >
                <i className="ti ti-scale text-lg text-white" />
              </span>
            </button>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <h1
                  className={`text-xl font-serif font-bold leading-tight ${
                    modoOscuro ? 'text-white' : 'text-zinc-900'
                  }`}
                >
                  Prima<span style={{ color: VERDE }}> Lex</span>
                </h1>
                <p className={`text-[11px] mt-0.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Consultor jurídico con IA
                </p>
              </div>
              <button
                onClick={toggleSidebar}
                title="Colapsar (Ctrl+B)"
                aria-label="Colapsar menú lateral"
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  modoOscuro
                    ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <i className="ti ti-layout-sidebar-left-collapse text-lg" />
              </button>
            </>
          )}
        </div>

        <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${colapsado ? 'px-2' : 'px-3'}`}>
          {items.map((item) => {
            const activo = vistaActiva === item.id
            return (
              <button
                key={item.id}
                onClick={() => setVistaActiva(item.id)}
                title={colapsado ? item.label : undefined}
                className={`w-full rounded-lg text-sm font-medium transition-colors text-left relative flex items-center ${
                  colapsado ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  activo
                    ? modoOscuro
                      ? 'bg-zinc-800 text-white'
                      : 'bg-[var(--accent-50)] text-[var(--accent-900)]'
                    : modoOscuro
                    ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                {activo && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
                    style={{ background: VERDE }}
                  />
                )}
                <i className={`ti ${item.icono} text-xl flex-shrink-0`} />
                <AnimatePresence initial={false}>
                  {!colapsado && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </nav>

        <div className={`border-t ${colapsado ? 'p-2' : 'p-3'} ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            onClick={() => setModalCodigos(true)}
            title={colapsado ? `Códigos · ${activos} de ${total} activos (incluye leyes especiales)` : undefined}
            className={`w-full rounded-lg text-sm font-medium transition-colors text-left flex items-center ${
              colapsado ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
            } ${
              modoOscuro ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative"
              style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
            >
              <i className="ti ti-books text-base" style={{ color: VERDE }} />
              {colapsado && (
                <span
                  className={`absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 text-white`}
                  style={{ background: VERDE }}
                >
                  {activos}
                </span>
              )}
            </span>
            <AnimatePresence initial={false}>
              {!colapsado && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 overflow-hidden whitespace-nowrap"
                >
                  <span className="block">Códigos</span>
                  <span className={`block text-[11px] font-normal ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {activos} de {total} activos · incl. leyes
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
            {!colapsado && (
              <i className={`ti ti-chevron-right text-sm flex-shrink-0 ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`} />
            )}
          </button>

          <button
            onClick={() => abrirAcerca('acerca')}
            title={colapsado ? 'Configuración · Apariencia, aviso legal, privacidad' : undefined}
            className={`w-full mt-1 rounded-lg text-xs transition-colors flex items-center ${
              colapsado ? 'justify-center px-0 py-2' : 'gap-2 px-3 py-2'
            } ${
              modoOscuro ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700'
            }`}
          >
            <i className="ti ti-settings text-base flex-shrink-0" />
            <AnimatePresence initial={false}>
              {!colapsado && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Configuración
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      <ModalCodigos abierto={modalCodigos} onCerrar={() => setModalCodigos(false)} />
      <ModalAcercaDe abierto={acercaAbierto} onCerrar={cerrarAcerca} pestanaInicial={acercaPestana} />
    </>
  )
}

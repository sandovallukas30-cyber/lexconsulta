import { precargarVista } from '../../vistas'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { ModalCodigos } from '../ui/ModalCodigos'
import { ModalAcercaDe } from '../ui/ModalAcercaDe'
import { esAdmin } from '../../config/admin'
import { useEsMovil } from '../../hooks/useEsMovil'
import { BotonCuenta } from '../ui/ModalCuenta'
import { cuentasDisponibles } from '../../services/supabase'
import type { VistaId } from '../../types'

interface ItemMenu {
  id: VistaId
  icono: string
  label: string
}

// Menú centrado en estudiantes: herramientas de estudio.
const itemsSemana: ItemMenu[] = [
  { id: 'hoy', icono: 'ti-sun', label: 'Hoy' },
  { id: 'tareas', icono: 'ti-checkbox', label: 'Tareas' },
  { id: 'calendario', icono: 'ti-calendar', label: 'Calendario' },
  { id: 'enfoque', icono: 'ti-hourglass-high', label: 'Enfoque' },
]

const itemsAcademicos: ItemMenu[] = [
  { id: 'modulos', icono: 'ti-layout-grid', label: 'Módulos' },
  { id: 'explorador', icono: 'ti-book-2', label: 'Explorador' },
  { id: 'colecciones', icono: 'ti-stack-2', label: 'Colecciones' },
  { id: 'mapasmentales', icono: 'ti-hierarchy-2', label: 'Mapas mentales' },
  { id: 'practica', icono: 'ti-puzzle', label: 'Práctica' },
]

const itemAdmin: ItemMenu = { id: 'admin', icono: 'ti-settings-2', label: 'Admin' }

const VERDE = 'var(--accent-base)'

export function Sidebar() {
  const vistaActiva = useStore((s) => s.vistaActiva)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const codigos = useStore((s) => s.codigos)
  const usuarioEmail = useStore((s) => s.usuarioEmail)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const toggleModoOscuro = useStore((s) => s.toggleModoOscuro)
  const colapsadoEscritorio = useStore((s) => s.sidebarColapsado)
  const toggleSidebarEscritorio = useStore((s) => s.toggleSidebar)
  const menuMovilAbierto = useStore((s) => s.menuMovilAbierto)
  const setMenuMovilAbierto = useStore((s) => s.setMenuMovilAbierto)
  // En móvil el sidebar es un panel que se superpone al contenido (antes
  // medía siempre 256 px y dejaba 118 px de contenido a 375 px): nunca
  // colapsado, y "colapsar" = cerrarlo.
  const esMovil = useEsMovil()
  const colapsado = esMovil ? false : colapsadoEscritorio
  const toggleSidebar = esMovil ? () => setMenuMovilAbierto(false) : toggleSidebarEscritorio
  const irA = (id: VistaId) => {
    setVistaActiva(id)
    if (esMovil) setMenuMovilAbierto(false)
  }
  const [modalCodigos, setModalCodigos] = useState(false)
  const acercaAbierto = useStore((s) => s.acercaAbierto)
  const acercaPestana = useStore((s) => s.acercaPestana)
  const abrirAcerca = useStore((s) => s.abrirAcerca)
  const cerrarAcerca = useStore((s) => s.cerrarAcerca)

  // Atajo: Ctrl/Cmd + B para colapsar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // defaultPrevented: el campo de un apunte ya usó Ctrl+B para negrita
      // (antes además colapsaba el menú)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !e.defaultPrevented) {
        e.preventDefault()
        if (esMovil) setMenuMovilAbierto(false)
        else toggleSidebarEscritorio()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [esMovil, setMenuMovilAbierto, toggleSidebarEscritorio])

  // Esc cierra el panel móvil
  useEffect(() => {
    if (!esMovil || !menuMovilAbierto) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuMovilAbierto(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [esMovil, menuMovilAbierto, setMenuMovilAbierto])

  const activos = codigos.filter((c) => c.activo).length
  const total = codigos.length
  // el número exacto crece con cada ley que se agrega: en pantalla va con tope (el exacto queda en el tooltip)
  const topeVisible = (n: number) => (n > 9 ? '9+' : String(n))
  const grupoAcademico = esAdmin(usuarioEmail) ? [...itemsAcademicos, itemAdmin] : itemsAcademicos

  return (
    <>
      <AnimatePresence>
        {esMovil && menuMovilAbierto && (
          <motion.div
            key="fondo-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[65] bg-black/40"
            onClick={() => setMenuMovilAbierto(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>
      <motion.aside
        initial={false}
        animate={esMovil ? { x: menuMovilAbierto ? 0 : -320, width: 312 } : { x: 0, width: colapsado ? 96 : 296 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        aria-label="Menú principal"
        // en móvil se cierra también deslizándolo hacia la izquierda
        drag={esMovil && menuMovilAbierto ? 'x' : false}
        dragConstraints={{ left: -320, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.x < -70 || info.velocity.x < -400) setMenuMovilAbierto(false)
        }}
        // en móvil, cerrado = fuera de la pantalla e inerte (no se puede tabular a él)
        inert={esMovil && !menuMovilAbierto ? true : undefined}
        className={`flex flex-col gap-5 overflow-y-auto overflow-x-hidden p-4 ${
          esMovil ? 'fixed inset-y-0 left-0 z-[70] shadow-2xl bg-[var(--neu-bg)]' : 'relative flex-shrink-0 pr-1'
        }`}
      >
        <div
          className={`neu-raised flex-shrink-0 flex items-center ${
            colapsado ? 'justify-center px-2 py-3' : 'justify-between pl-4 pr-2 py-4'
          }`}
        >
          {colapsado ? (
            <button
              onClick={toggleSidebar}
              title="Expandir (Ctrl+B)"
              aria-label="Expandir menú lateral"
              className="w-11 h-11 rounded-xl flex items-center justify-center"
            >
              <span
                className="w-11 h-11 rounded-[14px] flex items-center justify-center shadow-[4px_4px_9px_var(--neu-sd),-4px_-4px_9px_var(--neu-sl)]"
                style={{ background: VERDE }}
              >
                <i className="ti ti-scale text-lg text-white" />
              </span>
            </button>
          ) : (
            <>
              <div className="flex-1 min-w-0 flex items-center gap-2.5">
                <span
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0 shadow-[4px_4px_9px_var(--neu-sd),-4px_-4px_9px_var(--neu-sl)]"
                  style={{ background: VERDE }}
                  aria-hidden="true"
                >
                  <i className="ti ti-scale text-lg text-white" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-[17px] font-extrabold leading-tight" style={{ color: 'var(--neu-ink)' }}>
                    Prima Lex
                  </h1>
                  <p className="text-[11px]" style={{ color: 'var(--neu-ink3)' }}>Tu cuaderno de Derecho</p>
                </div>
              </div>
              <button
                onClick={toggleSidebar}
                title={esMovil ? 'Cerrar menú' : 'Colapsar (Ctrl+B)'}
                aria-label={esMovil ? 'Cerrar menú' : 'Colapsar menú lateral'}
                className="boton boton-fantasma boton-chico boton-icono"
              >
                <i className={`ti ${esMovil ? 'ti-x' : 'ti-layout-sidebar-left-collapse'} text-lg`} />
              </button>
            </>
          )}
        </div>

        <nav className={`neu-raised flex-shrink-0 py-3 ${colapsado ? 'px-2' : 'px-3'}`}>
          <div className="space-y-1">
            {itemsSemana.map((item) => (
              <BotonNav
                key={item.id}
                item={item}
                activo={vistaActiva === item.id}
                colapsado={colapsado}
                onClick={() => irA(item.id)}
              />
            ))}
          </div>

          <div
            aria-hidden="true"
            className={`h-px my-3 ${colapsado ? 'mx-2' : 'mx-3'}`}
            style={{ background: 'var(--neu-line)' }}
          />

          <div className="space-y-1">
            {grupoAcademico.map((item) => (
              <BotonNav
                key={item.id}
                item={item}
                activo={vistaActiva === item.id}
                colapsado={colapsado}
                onClick={() => irA(item.id)}
              />
            ))}
          </div>
        </nav>

        <div className={`neu-flat mt-auto flex-shrink-0 ${colapsado ? 'p-2' : 'p-2.5'}`}>
          <button
            onClick={() => setModalCodigos(true)}
            title={`Códigos · ${activos} de ${total} activos (incluye leyes especiales)`}
            className={`w-full min-h-control rounded-control text-sm font-medium transition-colors text-left flex items-center ${
              colapsado ? 'justify-center px-0 py-1' : 'gap-3 px-3 py-1'
            } ${
              modoOscuro ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative"
              style={{ background: modoOscuro ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)' : 'color-mix(in srgb, var(--accent-base) 6%, transparent)' }}
            >
              <i className="ti ti-books text-base" style={{ color: 'var(--accent-texto)' }} />
              {colapsado && (
                <span
                  className={`absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 text-white`}
                  style={{ background: VERDE }}
                >
                  {topeVisible(activos)}
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
                  <span className={`block text-[11px] font-normal truncate ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {topeVisible(activos)} activos
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
            className={`w-full mt-1 min-h-control rounded-control text-xs transition-colors flex items-center ${
              colapsado ? 'justify-center px-0' : 'gap-3 px-3'
            } ${
              modoOscuro ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
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

          {/* cuenta y modo oscuro: al pie del menú, fuera de la franja superior */}
          <div
            className={`mt-2 pt-2 border-t flex items-center ${colapsado ? 'flex-col gap-2' : 'justify-between gap-2 px-1'}`}
            style={{ borderColor: 'var(--neu-line)' }}
          >
            {cuentasDisponibles && <BotonCuenta compacto={colapsado} />}
            <button
              onClick={toggleModoOscuro}
              className="boton boton-suave boton-icono"
              title={modoOscuro ? 'Modo claro' : 'Modo oscuro'}
              aria-label={modoOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              <i className={`ti ${modoOscuro ? 'ti-sun' : 'ti-moon'} text-lg`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.aside>

      <ModalCodigos abierto={modalCodigos} onCerrar={() => setModalCodigos(false)} />
      <ModalAcercaDe abierto={acercaAbierto} onCerrar={cerrarAcerca} pestanaInicial={acercaPestana} />
    </>
  )
}

function BotonNav({
  item,
  activo,
  colapsado,
  onClick,
}: {
  item: ItemMenu
  activo: boolean
  colapsado: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={colapsado ? item.label : undefined}
      aria-current={activo ? 'page' : undefined}
      // C8: bajar el código de la vista antes del clic (~100-300 ms antes)
      onPointerEnter={() => precargarVista(item.id)}
      onFocus={() => precargarVista(item.id)}
      className={`w-full min-h-[46px] rounded-[14px] text-[14.5px] transition-all text-left relative flex items-center ${
        colapsado ? 'justify-center px-0' : 'gap-3 px-3.5'
      } ${
        activo
          ? 'font-semibold text-[var(--accent-texto)] shadow-[inset_4px_4px_8px_var(--neu-sd),inset_-4px_-4px_8px_var(--neu-sl)] bg-[var(--neu-bg)]'
          : 'font-semibold text-[var(--neu-ink2)] hover:text-[var(--neu-ink)] hover:shadow-[3px_3px_6px_var(--neu-sd),-3px_-3px_6px_var(--neu-sl)]'
      }`}
    >
      <i className={`ti ${item.icono} text-[19px] flex-shrink-0`} />
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
}

import { precargarVista } from '../../vistas'
import { useEffect, useState } from 'react'
import { useDialogo } from '../../hooks/useDialogo'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { ModalCodigos } from '../ui/ModalCodigos'
import { ModalAcercaDe } from '../ui/ModalAcercaDe'
import { EnfoqueEnMenu } from './EnfoqueEnMenu'
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
  { id: 'modulos', icono: 'ti-layout-grid', label: 'Mis ramos' },
  { id: 'explorador', icono: 'ti-book-2', label: 'Explorador' },
  { id: 'colecciones', icono: 'ti-stack-2', label: 'Colecciones' },
  { id: 'mapasmentales', icono: 'ti-hierarchy-2', label: 'Mapas mentales' },
  { id: 'practica', icono: 'ti-puzzle', label: 'Práctica' },
]

// secciones del menú, con su título (se ocultan al retraer el menú)
const GRUPOS: { titulo: string; items: ItemMenu[] }[] = [
  { titulo: 'Planificar', items: itemsSemana },
  { titulo: 'Estudiar', items: itemsAcademicos.filter((i) => i.id === 'modulos' || i.id === 'practica') },
  { titulo: 'Biblioteca jurídica', items: itemsAcademicos.filter((i) => i.id === 'explorador' || i.id === 'colecciones' || i.id === 'mapasmentales') },
]

const VERDE = 'var(--accent-base)'

export function Sidebar() {
  const vistaActiva = useStore((s) => s.vistaActiva)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const codigos = useStore((s) => s.codigos)
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
  // en móvil el menú es un panel: el foco entra, Tab no se escapa a la página de atrás y Esc lo cierra
  const refMenu = useDialogo<HTMLElement>(esMovil && menuMovilAbierto, () => setMenuMovilAbierto(false))
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
        ref={refMenu}
        role={esMovil && menuMovilAbierto ? 'dialog' : undefined}
        aria-modal={esMovil && menuMovilAbierto ? true : undefined}
        initial={false}
        animate={esMovil ? { x: menuMovilAbierto ? 0 : -320, width: 312 } : { x: 0, width: colapsado ? 96 : 296 }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
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
              className="anim-aparece w-11 h-11 rounded-xl flex items-center justify-center"
            >
              <span
                className="w-11 h-11 rounded-[14px] flex items-center justify-center"
                style={{ background: VERDE }}
              >
                <i className="ti ti-scale text-lg text-white" />
              </span>
            </button>
          ) : (
            <>
              <div className="anim-aparece flex-1 min-w-0 flex items-center gap-2.5">
                <span
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0"
                  style={{ background: VERDE }}
                  aria-hidden="true"
                >
                  <i className="ti ti-scale text-lg text-white" />
                </span>
                <div className="min-w-0">
                  <p className="text-[17px] font-extrabold leading-tight" style={{ color: 'var(--neu-ink)' }}>
                    Prima Lex
                  </p>
                  <p className="sidebar-tagline text-[11px]" style={{ color: 'var(--neu-ink3)' }}>Tu cuaderno de Derecho</p>
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

        <nav className={`neu-raised min-h-0 overflow-y-auto py-3 ${colapsado ? 'px-2' : 'px-3'}`}>
          {GRUPOS.map((g, i) => (
            <div key={g.titulo} className={i > 0 ? 'mt-3' : ''}>
              {colapsado ? (
                i > 0 && <div aria-hidden="true" className="h-px mx-2 mb-2" style={{ background: 'var(--neu-line)' }} />
              ) : (
                <p className="px-3.5 pt-1 pb-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--neu-ink3)' }}>
                  {g.titulo}
                </p>
              )}
              <div className="space-y-1">
                {g.items.map((item) => (
                  <BotonNav
                    key={item.id}
                    item={item}
                    activo={vistaActiva === item.id}
                    colapsado={colapsado}
                    onClick={() => irA(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}        </nav>

        <div className={`neu-flat mt-auto flex-shrink-0 ${colapsado ? 'p-2' : 'p-2.5'}`} data-pie-menu>
          <button
            onClick={() => {
              if (esMovil) setMenuMovilAbierto(false)
              setModalCodigos(true)
            }}
            title={`Códigos · ${activos} de ${total} activos (incluye leyes especiales)`}
            className={`w-full min-h-control rounded-control text-sm font-medium transition-colors text-left flex items-center ${
              colapsado ? 'justify-center px-0 py-1' : 'px-3 py-1'
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
            <Etiqueta visible={!colapsado} className={colapsado ? '' : 'flex-1'}>
              <span className="block">Códigos</span>
              <span className={`block text-[11px] font-normal truncate ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {activos} activos
              </span>
            </Etiqueta>
            {!colapsado && (
              <i className={`ti ti-chevron-right text-sm flex-shrink-0 ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`} />
            )}
          </button>

          <button
            onClick={() => {
              if (esMovil) setMenuMovilAbierto(false)
              abrirAcerca('acerca')
            }}
            title={colapsado ? 'Configuración · Apariencia, aviso legal, privacidad' : undefined}
            className={`w-full mt-1 min-h-control rounded-control text-xs transition-colors flex items-center ${
              colapsado ? 'justify-center px-0' : 'px-3'
            } ${
              modoOscuro ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
            }`}
          >
            <i className="ti ti-settings text-base flex-shrink-0" />
            <Etiqueta visible={!colapsado}>Configuración</Etiqueta>
          </button>

          {!colapsado && (
            <p className={`pie-legal mt-1 px-3 text-[13px] leading-snug ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Gratis por ahora ·{' '}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">Privacidad</a>
              {' · '}
              <a href="/terminos" target="_blank" rel="noopener noreferrer" className="underline">Términos</a>
            </p>
          )}

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
              <IlustracionTema oscuro={modoOscuro} />
            </button>
          </div>
        </div>
      </motion.aside>

      <ModalCodigos abierto={modalCodigos} onCerrar={() => setModalCodigos(false)} />
      <ModalAcercaDe abierto={acercaAbierto} onCerrar={cerrarAcerca} pestanaInicial={acercaPestana} />
    </>
  )
}

/** Texto que se pliega con el menú: siempre montado, el ancho y la opacidad pasan por CSS (sin
 *  desmontar, que era lo que se veía a saltos). Con el menú colapsado queda en 0 y oculto a lectores. */
function Etiqueta({ visible, children, className = '' }: { visible: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span
      aria-hidden={!visible}
      className={`grid min-w-0 overflow-hidden ${className}`}
      style={{
        gridTemplateColumns: visible ? '1fr' : '0fr',
        opacity: visible ? 1 : 0,
        marginLeft: visible ? '0.75rem' : 0,
        transition: 'grid-template-columns var(--dur-media) var(--ease-estandar), opacity var(--dur-rapida) var(--ease-estandar), margin-left var(--dur-media) var(--ease-estandar)',
      }}
    >
      <span className="min-w-0 overflow-hidden whitespace-nowrap">{children}</span>
    </span>
  )
}

/** Ilustración simple del cambio de tema: muestra a qué modo se pasa (sol si estás en oscuro, luna si estás en claro). */
function IlustracionTema({ oscuro }: { oscuro: boolean }) {
  return oscuro ? (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="5.2" fill="#F6B73C" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4
        return (
          <line
            key={i}
            x1={13 + Math.cos(a) * 8.4}
            y1={13 + Math.sin(a) * 8.4}
            x2={13 + Math.cos(a) * 11}
            y2={13 + Math.sin(a) * 11}
            stroke="#F6B73C"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  ) : (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <path d="M20.5 15.6A8.6 8.6 0 0 1 10.4 5.5a8.6 8.6 0 1 0 10.1 10.1Z" fill="#6D74D9" />
      <circle cx="19.6" cy="6.4" r="1.2" fill="#6D74D9" />
      <circle cx="22.4" cy="10.2" r="0.8" fill="#6D74D9" />
    </svg>
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
      aria-label={colapsado ? item.label : undefined}
      className={`w-full min-h-[46px] rounded-[14px] text-[14.5px] text-left relative flex items-center transition-[padding,background-color,color] ${
        colapsado ? 'justify-center px-0' : 'px-3.5'
      } ${
        activo
          ? 'font-semibold text-[var(--accent-texto)] bg-[color-mix(in_srgb,var(--accent-base)_12%,transparent)]'
          : 'font-semibold text-[var(--neu-ink2)] hover:text-[var(--neu-ink)] hover:bg-[var(--neu-bg3)]'
      }`}
    >
      <i className={`ti ${item.icono} text-[19px] flex-shrink-0`} />
      <Etiqueta visible={!colapsado}>{item.label}</Etiqueta>
      {item.id === 'enfoque' && <EnfoqueEnMenu colapsado={colapsado} />}
    </button>
  )
}

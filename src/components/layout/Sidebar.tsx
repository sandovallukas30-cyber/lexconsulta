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
  /** número que se muestra a la derecha (tareas pendientes, códigos activos) */
  insignia?: number
}

const VERDE = 'var(--accent-base)'

export function Sidebar() {
  const vistaActiva = useStore((s) => s.vistaActiva)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const codigos = useStore((s) => s.codigos)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const toggleModoOscuro = useStore((s) => s.toggleModoOscuro)
  const tareasPendientes = useStore((s) => s.tareasPlan.filter((t) => !t.hecha).length)
  const setOmnibarAbierto = useStore((s) => s.setOmnibarAbierto)
  const menuMovilAbierto = useStore((s) => s.menuMovilAbierto)
  const setMenuMovilAbierto = useStore((s) => s.setMenuMovilAbierto)
  // En móvil el menú es un panel que se superpone al contenido; en escritorio es fijo (sin colapsar)
  const esMovil = useEsMovil()
  // en móvil el menú es un panel: el foco entra, Tab no se escapa a la página de atrás y Esc lo cierra
  const refMenu = useDialogo<HTMLElement>(esMovil && menuMovilAbierto, () => setMenuMovilAbierto(false))
  const cerrarSiMovil = () => {
    if (esMovil) setMenuMovilAbierto(false)
  }
  const irA = (id: VistaId) => {
    setVistaActiva(id)
    cerrarSiMovil()
  }
  const [modalCodigos, setModalCodigos] = useState(false)
  const acercaAbierto = useStore((s) => s.acercaAbierto)
  const acercaPestana = useStore((s) => s.acercaPestana)
  const abrirAcerca = useStore((s) => s.abrirAcerca)
  const cerrarAcerca = useStore((s) => s.cerrarAcerca)

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

  const grupos: { titulo: string; items: ItemMenu[] }[] = [
    {
      titulo: 'Planificar',
      items: [
        { id: 'hoy', icono: 'ti-sun', label: 'Hoy' },
        { id: 'tareas', icono: 'ti-checkbox', label: 'Tareas', insignia: tareasPendientes },
        { id: 'calendario', icono: 'ti-calendar', label: 'Calendario' },
        { id: 'enfoque', icono: 'ti-hourglass-high', label: 'Enfoque' },
      ],
    },
    {
      titulo: 'Estudiar',
      items: [
        { id: 'modulos', icono: 'ti-layout-grid', label: 'Mis ramos' },
        { id: 'practica', icono: 'ti-puzzle', label: 'Práctica' },
      ],
    },
    {
      titulo: 'Biblioteca jurídica',
      items: [
        { id: 'explorador', icono: 'ti-book-2', label: 'Explorador', insignia: activos },
        { id: 'colecciones', icono: 'ti-stack-2', label: 'Colecciones' },
        { id: 'mapasmentales', icono: 'ti-hierarchy-2', label: 'Mapas mentales' },
      ],
    },
  ]

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
        animate={esMovil ? { x: menuMovilAbierto ? 0 : -320, width: 312 } : { x: 0, width: 248 }}
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
        className={`flex flex-col gap-3 overflow-y-auto overflow-x-hidden px-3 py-4 border-r bg-[var(--neu-card)] ${
          esMovil ? 'fixed inset-y-0 left-0 z-[70] shadow-2xl' : 'relative flex-shrink-0'
        }`}
        style={{ borderColor: 'var(--neu-line)' }}
      >
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-1">
          <div className="min-w-0 flex items-center gap-2.5">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: VERDE }}
              aria-hidden="true"
            >
              <i className="ti ti-scale text-lg text-white" />
            </span>
            <p className="text-[18px] font-extrabold leading-tight truncate" style={{ color: 'var(--neu-ink)', fontFamily: 'var(--font-head)' }}>
              Prima Lex
            </p>
          </div>
          {esMovil && (
            <button onClick={() => setMenuMovilAbierto(false)} aria-label="Cerrar menú" className="boton boton-fantasma boton-chico boton-icono">
              <i className="ti ti-x text-lg" />
            </button>
          )}
        </div>

        <button
          onClick={() => {
            cerrarSiMovil()
            setOmnibarAbierto(true)
          }}
          className="flex-shrink-0 w-full min-h-[44px] rounded-xl border px-3 flex items-center gap-2 text-sm text-left transition-colors hover:bg-[var(--neu-bg3)]"
          style={{ borderColor: 'var(--neu-line)', color: 'var(--neu-ink3)', background: 'var(--neu-bg)' }}
          aria-label="Buscar artículos, apuntes y secciones"
        >
          <i className="ti ti-search text-base flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 truncate">Buscar…</span>
          <kbd className="solo-teclado text-[11px] px-1.5 py-0.5 rounded-md border font-sans" style={{ borderColor: 'var(--neu-line)', background: 'var(--neu-card)' }}>
            Ctrl K
          </kbd>
        </button>

        <nav className="min-h-0 overflow-y-auto" aria-label="Secciones">
          {grupos.map((g) => (
            <div key={g.titulo} className="mb-3 last:mb-0">
              <p className="px-2 pt-2 pb-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--neu-ink3)' }}>
                {g.titulo}
              </p>
              <div className="space-y-0.5">
                {g.items.map((item) => (
                  <BotonNav key={item.id} item={item} activo={vistaActiva === item.id} onClick={() => irA(item.id)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto flex-shrink-0 space-y-1" data-pie-menu>
          <button
            onClick={() => {
              cerrarSiMovil()
              setModalCodigos(true)
            }}
            title={`Códigos · ${activos} de ${total} activos (incluye leyes especiales)`}
            className="w-full min-h-[44px] rounded-[10px] px-2.5 text-sm font-semibold text-left flex items-center gap-3 transition-colors text-[var(--neu-ink2)] hover:text-[var(--neu-ink)] hover:bg-[var(--neu-bg3)]"
          >
            <i className="ti ti-books text-[18px] flex-shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">Códigos activos</span>
          </button>
          <button
            onClick={() => {
              cerrarSiMovil()
              abrirAcerca('acerca')
            }}
            className="w-full min-h-[44px] rounded-[10px] px-2.5 text-sm font-semibold text-left flex items-center gap-3 transition-colors text-[var(--neu-ink2)] hover:text-[var(--neu-ink)] hover:bg-[var(--neu-bg3)]"
          >
            <i className="ti ti-adjustments-horizontal text-[18px] flex-shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">Configuración</span>
          </button>

          {cuentasDisponibles && (
            <div className="px-0.5">
              <BotonCuenta compacto={false} />
            </div>
          )}

          <div
            role="group"
            aria-label="Tema de la interfaz"
            className="grid grid-cols-2 gap-1 p-1 rounded-xl"
            style={{ background: 'var(--neu-bg3)' }}
          >
            {([false, true] as const).map((oscuro) => {
              const activo = modoOscuro === oscuro
              return (
                <button
                  key={String(oscuro)}
                  onClick={() => {
                    if (!activo) toggleModoOscuro()
                  }}
                  aria-pressed={activo}
                  className={`min-h-[40px] rounded-lg text-sm font-semibold transition-colors ${
                    activo ? 'shadow-sm' : 'text-[var(--neu-ink3)]'
                  }`}
                  style={activo ? { background: 'var(--neu-card)', color: 'var(--neu-ink)' } : undefined}
                >
                  {oscuro ? 'Oscuro' : 'Claro'}
                </button>
              )
            })}
          </div>

          <p className="pie-legal px-2 pt-1 text-[13px] leading-snug" style={{ color: 'var(--neu-ink3)' }}>
            Gratis por ahora ·{' '}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">Privacidad</a>
            {' · '}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="underline">Términos</a>
          </p>
        </div>
      </motion.aside>

      <ModalCodigos abierto={modalCodigos} onCerrar={() => setModalCodigos(false)} />
      <ModalAcercaDe abierto={acercaAbierto} onCerrar={cerrarAcerca} pestanaInicial={acercaPestana} />
    </>
  )
}

function BotonNav({ item, activo, onClick }: { item: ItemMenu; activo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={activo ? 'page' : undefined}
      // C8: bajar el código de la vista antes del clic (~100-300 ms antes)
      onPointerEnter={() => precargarVista(item.id)}
      onFocus={() => precargarVista(item.id)}
      className={`w-full min-h-[44px] rounded-[10px] px-2.5 text-[14.5px] text-left relative flex items-center gap-3 transition-colors ${
        activo
          ? 'font-semibold text-[var(--accent-texto)] bg-[color-mix(in_srgb,var(--accent-base)_12%,transparent)]'
          : 'font-semibold text-[var(--neu-ink2)] hover:text-[var(--neu-ink)] hover:bg-[var(--neu-bg3)]'
      }`}
    >
      <i className={`ti ${item.icono} text-[18px] flex-shrink-0`} aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.insignia !== undefined && item.insignia > 0 && (
        <span
          className="min-w-[24px] h-[22px] px-1.5 rounded-full text-[12px] font-bold flex items-center justify-center tabular-nums flex-shrink-0"
          style={{ background: 'var(--neu-bg3)', color: 'var(--neu-ink2)' }}
        >
          <span className="sr-only">{item.id === 'tareas' ? 'pendientes: ' : 'activos: '}</span>
          {item.insignia}
        </span>
      )}
      {item.id === 'enfoque' && <EnfoqueEnMenu colapsado={false} />}
    </button>
  )
}

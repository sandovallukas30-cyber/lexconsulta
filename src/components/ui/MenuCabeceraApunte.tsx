import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  icono: string
  etiqueta: string
  /** Clases del botón que abre el menú (las pone la pantalla, según el tema de lectura). */
  claseBoton: string
  /** Clases del botón cuando el menú está abierto. */
  claseBotonAbierto: string
  /** Contenido del menú; recibe una función para cerrarlo. */
  children: (cerrar: () => void) => ReactNode
}

/** Botón de la cabecera del apunte que abre un menú con varias opciones. En celular el menú ocupa el ancho de la pantalla,
 *  debajo de la cabecera; en pantallas anchas cuelga del botón. Se cierra con Esc (sin cerrar el apunte) o al tocar fuera. */
export function MenuCabeceraApunte({ icono, etiqueta, claseBoton, claseBotonAbierto, children }: Props) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setAbierto(false)
      }
    }
    document.addEventListener('pointerdown', fuera)
    window.addEventListener('keydown', esc, true)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      window.removeEventListener('keydown', esc, true)
    }
  }, [abierto])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={etiqueta}
        title={etiqueta}
        className={abierto ? claseBotonAbierto : claseBoton}
      >
        <i className={`ti ${icono} text-lg`} aria-hidden="true" />
      </button>
      {abierto && (
        <div
          role="menu"
          className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 z-30 max-h-[calc(100dvh-5rem)] overflow-y-auto py-1.5 rounded-2xl border shadow-2xl"
          style={{ background: 'var(--neu-card)', borderColor: 'var(--neu-line)' }}
        >
          {children(() => setAbierto(false))}
        </div>
      )}
    </div>
  )
}

/** Una fila de esos menús: ícono, título y, si hace falta, una línea de detalle. */
export function FilaMenuCabecera({ icono, titulo, detalle, onClick, derecha }: { icono: string; titulo: string; detalle?: string; onClick?: () => void; derecha?: ReactNode }) {
  const contenido = (
    <>
      <i className={`ti ${icono} text-lg flex-shrink-0`} style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>{titulo}</span>
        {detalle && <span className="block text-xs mt-0.5" style={{ color: 'var(--neu-ink2)' }}>{detalle}</span>}
      </span>
      {derecha}
    </>
  )
  const clase = 'w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] transition-colors'
  return onClick ? (
    <button role="menuitem" onClick={onClick} className={`${clase} hover:bg-[var(--neu-bg3)]`}>
      {contenido}
    </button>
  ) : (
    <div className={clase}>{contenido}</div>
  )
}

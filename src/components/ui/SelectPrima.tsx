import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { useAjustes } from '../../store/useAjustes'
import { opcionesDe } from './opcionesSelect'

/** Lista desplegable propia de Prima Lex, en lugar del <select> del sistema: se ve igual en laptop, iPad y celular
 *  (con la estética de la app, modo oscuro incluido) y los textos largos se recortan en vez de salirse de la pantalla.
 *
 *  Se usa igual que un <select>: mismas etiquetas <option> y <optgroup> adentro, mismo `value`, y `onChange`
 *  recibe algo con `target.value` y `currentTarget.value`, así que los usos existentes no cambian. */

type EventoCambio = { target: { value: string }; currentTarget: { value: string } }

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'children' | 'defaultValue' | 'multiple' | 'size'> {
  value: string | number
  onChange?: (e: EventoCambio) => void
  children?: ReactNode
}

const ALTO_LISTA = 288

export function SelectPrima({ value, onChange, children, className = '', disabled, id, style, title, onBlur, onFocus, ...resto }: Props) {
  const opciones = useMemo(() => opcionesDe(children), [children])
  const actual = String(value)
  const seleccionada = opciones.findIndex((o) => o.valor === actual)
  const [abierto, setAbierto] = useState(false)
  const [indice, setIndice] = useState(0)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number; ancho: number } | null>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const lista = useRef<HTMLDivElement>(null)
  const idLista = useId()
  const buscar = useRef({ texto: '', t: 0 })

  const posicionar = () => {
    const r = boton.current?.getBoundingClientRect()
    if (!r) return
    // la interfaz puede estar a otro tamaño (zoom de la app): las coordenadas de pantalla se llevan a las de la página
    const z = useAjustes.getState().zoom || 1
    const arriba = r.bottom / z + ALTO_LISTA > window.innerHeight / z
    const aDerecha = r.left > window.innerWidth / 2
    setPos({
      ...(arriba ? { bottom: (window.innerHeight - r.top) / z + 4 } : { top: r.bottom / z + 4 }),
      ...(aDerecha ? { right: (window.innerWidth - r.right) / z } : { left: r.left / z }),
      ancho: r.width / z,
    })
  }

  const abrir = () => {
    if (disabled) return
    posicionar()
    setIndice(seleccionada >= 0 ? seleccionada : Math.max(0, opciones.findIndex((o) => !o.deshabilitada)))
    setAbierto(true)
  }
  const cerrar = () => setAbierto(false)

  const elegir = (i: number) => {
    const o = opciones[i]
    if (!o || o.deshabilitada) return
    cerrar()
    if (o.valor !== actual) onChange?.({ target: { value: o.valor }, currentTarget: { value: o.valor } })
    boton.current?.focus()
  }

  // mientras está abierta: se cierra al tocar fuera, con Escape (sin cerrar también el diálogo de abajo) y al cambiar el tamaño de la pantalla
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: Event) => {
      const t = e.target as Node
      if (!boton.current?.contains(t) && !lista.current?.contains(t)) cerrar()
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      cerrar()
      boton.current?.focus()
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('touchstart', fuera, { passive: true })
    window.addEventListener('keydown', escape, true)
    window.addEventListener('resize', cerrar)
    window.addEventListener('scroll', posicionar, true)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('touchstart', fuera)
      window.removeEventListener('keydown', escape, true)
      window.removeEventListener('resize', cerrar)
      window.removeEventListener('scroll', posicionar, true)
    }
  }, [abierto])

  // la opción activa siempre a la vista
  useEffect(() => {
    if (abierto) lista.current?.querySelector('[data-activa="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [abierto, indice])

  const mover = (paso: 1 | -1, desde: number) => {
    for (let k = 1; k <= opciones.length; k++) {
      const i = (desde + paso * k + opciones.length * k) % opciones.length
      if (!opciones[i].deshabilitada) return i
    }
    return desde
  }

  const alTeclear = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || opciones.length === 0) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!abierto) abrir()
      else setIndice((i) => mover(e.key === 'ArrowDown' ? 1 : -1, i))
    } else if (e.key === 'Home' || e.key === 'End') {
      if (!abierto) return
      e.preventDefault()
      setIndice(e.key === 'Home' ? mover(1, -1) : mover(-1, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!abierto) abrir()
      else elegir(indice)
    } else if (e.key === 'Tab') {
      if (abierto) cerrar()
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // escribir letras salta a la opción que empieza así
      const ahora = Date.now()
      buscar.current.texto = ahora - buscar.current.t > 700 ? e.key.toLowerCase() : buscar.current.texto + e.key.toLowerCase()
      buscar.current.t = ahora
      const i = opciones.findIndex((o) => !o.deshabilitada && o.texto.toLowerCase().startsWith(buscar.current.texto))
      if (i >= 0) {
        if (abierto) setIndice(i)
        else if (opciones[i].valor !== actual) onChange?.({ target: { value: opciones[i].valor }, currentTarget: { value: opciones[i].valor } })
      }
    }
  }

  const textoBoton = seleccionada >= 0 ? opciones[seleccionada].texto : ''

  return (
    <>
      <button
        {...(resto as object)}
        ref={boton}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-activedescendant={abierto ? `${idLista}-${indice}` : undefined}
        disabled={disabled}
        title={title ?? (textoBoton.length > 40 ? textoBoton : undefined)}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={alTeclear}
        onBlur={(e) => onBlur?.(e as never)}
        onFocus={(e) => onFocus?.(e as never)}
        style={style}
        className={`select-prima flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">{textoBoton || ' '}</span>
        <i className="ti ti-chevron-down flex-shrink-0 opacity-60" aria-hidden="true" style={{ fontSize: '0.9em' }} />
      </button>
      {abierto &&
        pos &&
        createPortal(
          <div
            ref={lista}
            id={idLista}
            role="listbox"
            className="fixed z-[120] overflow-y-auto rounded-2xl p-1.5"
            style={{
              ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
              ...(pos.left !== undefined ? { left: pos.left } : { right: pos.right }),
              minWidth: Math.max(pos.ancho, 140),
              maxWidth: 'min(28rem, 92vw)',
              maxHeight: ALTO_LISTA,
              background: 'var(--neu-card, #fff)',
              boxShadow: '8px 8px 24px rgba(15, 20, 50, 0.22), 0 0 0 1px rgba(120,130,170,0.18)',
              color: 'var(--neu-ink, #1f2344)',
            }}
          >
            {opciones.map((o, i) => {
              const cabecera = o.grupo !== null && (i === 0 || opciones[i - 1].grupo !== o.grupo) ? o.grupo : null
              const activa = i === indice
              const elegida = i === seleccionada
              return (
                <Fragment key={`${o.valor}-${i}`}>
                  {cabecera && (
                    <p role="presentation" className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--neu-ink3, #8a92b0)' }}>
                      {cabecera}
                    </p>
                  )}
                  <div
                    id={`${idLista}-${i}`}
                    role="option"
                    aria-selected={elegida}
                    aria-disabled={o.deshabilitada || undefined}
                    data-activa={activa}
                    title={o.texto.length > 60 ? o.texto : undefined}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      elegir(i)
                    }}
                    onMouseEnter={() => !o.deshabilitada && setIndice(i)}
                    className="flex items-start gap-2 px-2.5 py-2 rounded-xl text-sm cursor-pointer"
                    style={{
                      background: activa ? 'color-mix(in srgb, var(--accent-base) 12%, transparent)' : 'transparent',
                      fontWeight: elegida ? 700 : 500,
                      opacity: o.deshabilitada ? 0.45 : 1,
                      cursor: o.deshabilitada ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span className="min-w-0 flex-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>
                      {o.texto || ' '}
                    </span>
                    {elegida && <i className="ti ti-check flex-shrink-0 mt-0.5" aria-hidden="true" style={{ color: 'var(--accent-texto)' }} />}
                  </div>
                </Fragment>
              )
            })}
          </div>,
          document.body
        )}
    </>
  )
}

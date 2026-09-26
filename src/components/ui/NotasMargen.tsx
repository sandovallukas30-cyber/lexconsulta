import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TemaApunte } from './ApunteContenido'

const TARJETA: Record<TemaApunte, string> = {
  claro: 'bg-sky-50 border-sky-200 text-sky-900',
  oscuro: 'bg-sky-400/10 border-sky-400/30 text-sky-100',
  papel: 'bg-[#efe3bf] border-[#d9c79a] text-[#4a3a20]',
}

const ANCHO_MARGEN = 224
const SEPARACION = 16

interface Ancla {
  texto: string
  top: number
  alto: number
}

interface Props {
  /** Elemento relativo que envuelve la columna de texto: el margen se dibuja a su derecha. */
  columna: HTMLElement | null
  /** Elemento que contiene las anclas `[data-nota]` (puede ser el mismo). */
  raiz: HTMLElement | null
  /** Cambia cuando cambia el contenido (para volver a medir). */
  version: unknown
  tema: TemaApunte
  /** Si se pasa, las notas se pueden editar y borrar desde el margen. */
  onCambiar?: (indice: number, texto: string) => void
  onEliminar?: (indice: number) => void
}

/** Notas al margen de un apunte. Las anclas son `<span data-nota="…">` dentro
 *  del texto (las dibuja ApunteContenido al leer y el editor al escribir). Si
 *  hay lugar a la derecha, cada nota se acomoda al lado de su ancla; si no
 *  (pantalla angosta), se abre como globo al tocar el texto anclado. */
export function NotasMargen({ columna, raiz, version, tema, onCambiar, onEliminar }: Props) {
  const [anclas, setAnclas] = useState<Ancla[]>([])
  const [tops, setTops] = useState<number[]>([])
  const [hayMargen, setHayMargen] = useState(false)
  const [abierta, setAbierta] = useState<number | null>(null)
  const [editando, setEditando] = useState<number | null>(null)
  const refsTarjetas = useRef<(HTMLDivElement | null)[]>([])
  const editable = Boolean(onCambiar)

  const medir = useCallback(() => {
    if (!columna || !raiz) return
    const cRect = columna.getBoundingClientRect()
    const elementos = [...raiz.querySelectorAll<HTMLElement>('[data-nota]')]
    setAnclas(
      elementos.map((el) => {
        const r = el.getBoundingClientRect()
        return { texto: el.dataset.nota ?? '', top: r.top - cRect.top, alto: r.height }
      }),
    )
    setHayMargen(cRect.right + SEPARACION + ANCHO_MARGEN <= window.innerWidth - 8)
  }, [columna, raiz])

  // medir al cambiar el contenido y al cambiar el tamaño de la columna/ventana
  // Medir el DOM y guardarlo en estado es justamente sincronizar con un sistema externo.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    medir()
  }, [medir, version, tema])

  useEffect(() => {
    if (!columna) return
    const obs = new ResizeObserver(() => medir())
    obs.observe(columna)
    window.addEventListener('resize', medir)
    return () => {
      obs.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [columna, medir])

  // segunda pasada: con las alturas reales, correr hacia abajo las que se pisan
  useLayoutEffect(() => {
    if (!hayMargen) return
    let libre = 0
    const nuevos = anclas.map((a, i) => {
      const top = Math.max(a.top, libre)
      libre = top + (refsTarjetas.current[i]?.offsetHeight ?? 60) + 8
      return top
    })
    setTops((prev) => (prev.length === nuevos.length && prev.every((v, i) => v === nuevos[i]) ? prev : nuevos))
  }, [anclas, hayMargen, editando])

  // en pantalla angosta: tocar el texto anclado abre la nota
  useEffect(() => {
    if (!raiz || hayMargen) return
    const alTocar = (e: Event) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-nota]')
      if (!el) return setAbierta(null)
      const idx = [...raiz.querySelectorAll('[data-nota]')].indexOf(el)
      setAbierta((prev) => (prev === idx ? null : idx))
    }
    raiz.addEventListener('click', alTocar)
    return () => raiz.removeEventListener('click', alTocar)
  }, [raiz, hayMargen])

  if (anclas.length === 0) return null

  const tarjeta = (a: Ancla, i: number) => (
    <div
      key={i}
      ref={(el) => {
        refsTarjetas.current[i] = el
      }}
      className={`rounded-lg border px-3 py-2 text-xs leading-snug shadow-sm ${TARJETA[tema]}`}
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {editando === i ? (
        <textarea
          autoFocus
          defaultValue={a.texto}
          rows={3}
          onBlur={(e) => {
            const v = e.target.value.trim()
            setEditando(null)
            if (v && v !== a.texto) onCambiar?.(i, v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditando(null)
            if (e.key === 'Enter' && !e.shiftKey) e.currentTarget.blur()
          }}
          className="w-full resize-none rounded bg-transparent outline-none border border-current/30 px-1 py-0.5"
        />
      ) : (
        <div className="flex items-start gap-1.5">
          <i className="ti ti-message-2 text-sm flex-shrink-0 mt-px opacity-70" aria-hidden />
          <p className="flex-1 min-w-0 whitespace-pre-wrap break-words">{a.texto}</p>
          {editable && (
            <span className="flex gap-0.5 flex-shrink-0">
              <button
                type="button"
                title="Editar nota"
                aria-label="Editar nota"
                onClick={() => setEditando(i)}
                className="w-5 h-5 rounded flex items-center justify-center opacity-60 hover:opacity-100"
              >
                <i className="ti ti-pencil text-xs" />
              </button>
              <button
                type="button"
                title="Quitar nota"
                aria-label="Quitar nota"
                onClick={() => onEliminar?.(i)}
                className="w-5 h-5 rounded flex items-center justify-center opacity-60 hover:opacity-100"
              >
                <i className="ti ti-x text-xs" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )

  if (hayMargen) {
    return (
      <div className="absolute top-0 pointer-events-none" style={{ left: `calc(100% + ${SEPARACION}px)`, width: ANCHO_MARGEN }} aria-label="Notas al margen">
        {anclas.map((a, i) => (
          <div key={i} className="absolute left-0 right-0 pointer-events-auto" style={{ top: tops[i] ?? a.top }}>
            {tarjeta(a, i)}
          </div>
        ))}
      </div>
    )
  }

  if (abierta === null || !anclas[abierta]) return null
  const a = anclas[abierta]
  return (
    <div className="absolute left-4 right-4 z-10 max-w-sm" style={{ top: a.top + a.alto + 6 }}>
      {tarjeta(a, abierta)}
    </div>
  )
}

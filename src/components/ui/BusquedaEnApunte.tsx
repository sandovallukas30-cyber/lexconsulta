import { useEffect, useRef, useState } from 'react'
import { rangosDeCoincidencias } from '../../services/resaltado'
import { TEMAS_LECTURA } from '../../services/lecturaTema'
import type { TemaLectura } from '../../types'

type ApiResaltado = { highlights?: Map<string, unknown> }
type ConstructorResaltado = new (...r: Range[]) => unknown

const TOPE = 500

function limpiarMarcas() {
  const api = (globalThis as { CSS?: ApiResaltado }).CSS?.highlights
  api?.delete('prima-busqueda')
  api?.delete('prima-busqueda-actual')
}

interface Props {
  /** Contenedor del texto del apunte (donde se busca). */
  raiz: HTMLElement | null
  /** Área con scroll del apunte. */
  scrollRef: React.RefObject<HTMLElement | null>
  temaLectura: TemaLectura
  onCerrar: () => void
}

/** Buscador de palabras dentro del apunte abierto: marca todas las apariciones, dice «3 de 12» y salta de una a otra con
 *  Enter / Mayús+Enter o con las flechas. Si escribes varias palabras busca la frase y, si no está, cada palabra por
 *  separado. No distingue mayúsculas ni tildes. */
export function BusquedaEnApunte({ raiz, scrollRef, temaLectura, onCerrar }: Props) {
  const tema = TEMAS_LECTURA[temaLectura]
  const [consulta, setConsulta] = useState('')
  const [rangos, setRangos] = useState<Range[]>([])
  const [indice, setIndice] = useState(0)
  const refInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    refInput.current?.focus()
    refInput.current?.select()
    return limpiarMarcas
  }, [])

  // Buscar al escribir (con una pausa corta, para no recalcular en cada letra de un apunte largo)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const encontrados = raiz && consulta.trim().length >= 2 ? rangosDeCoincidencias(raiz, consulta, TOPE) : []
      setRangos(encontrados)
      setIndice(0)
    }, 120)
    return () => window.clearTimeout(t)
  }, [consulta, raiz])

  // Marcar todas las apariciones y destacar la actual
  useEffect(() => {
    limpiarMarcas()
    if (rangos.length === 0) return
    const actual = rangos[Math.min(indice, rangos.length - 1)]
    const api = (globalThis as { CSS?: ApiResaltado }).CSS?.highlights
    const Resaltado = (globalThis as { Highlight?: ConstructorResaltado }).Highlight
    if (api && Resaltado) {
      api.set('prima-busqueda', new Resaltado(...rangos))
      api.set('prima-busqueda-actual', new Resaltado(actual))
    } else {
      // sin la API de resaltado (navegadores antiguos) queda seleccionada la coincidencia actual
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(actual)
    }
    // llevar la actual al centro del área de lectura
    const caja = actual.getBoundingClientRect()
    const area = scrollRef.current
    if (area) {
      const base = area.getBoundingClientRect()
      area.scrollTo({ top: area.scrollTop + (caja.top - base.top) - base.height / 2 + caja.height / 2 })
    }
  }, [rangos, indice, scrollRef])

  const ir = (delta: 1 | -1) => {
    if (rangos.length === 0) return
    setIndice((i) => (i + delta + rangos.length) % rangos.length)
  }

  const hayConsulta = consulta.trim().length >= 2
  const resumen = !hayConsulta ? '' : rangos.length === 0 ? 'Sin resultados' : `${Math.min(indice, rangos.length - 1) + 1} de ${rangos.length}${rangos.length >= TOPE ? '+' : ''}`

  return (
    <div role="search" className={`flex items-center gap-2 px-3 sm:px-5 py-2 border-b flex-shrink-0 print:hidden ${tema.bg} ${tema.border}`}>
      <i className={`ti ti-search text-lg flex-shrink-0 ${tema.textSoft}`} aria-hidden="true" />
      <input
        ref={refInput}
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ir(e.shiftKey ? -1 : 1)
          } else if (e.key === 'Escape') {
            e.stopPropagation() // cierra solo la búsqueda, no el apunte
            onCerrar()
          }
        }}
        aria-label="Buscar una palabra en el apunte"
        placeholder="Buscar en el apunte…"
        autoComplete="off"
        className={`flex-1 min-w-0 bg-transparent outline-none text-sm py-1.5 ${tema.text}`}
      />
      <span aria-live="polite" className={`text-xs tabular-nums flex-shrink-0 ${tema.textSoft}`}>
        {resumen}
      </span>
      <button onClick={() => ir(-1)} disabled={rangos.length === 0} aria-label="Resultado anterior" title="Anterior (Mayús+Enter)" className={`w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-30 ${tema.textSoft} ${tema.hoverSuave}`}>
        <i className="ti ti-chevron-up text-lg" />
      </button>
      <button onClick={() => ir(1)} disabled={rangos.length === 0} aria-label="Resultado siguiente" title="Siguiente (Enter)" className={`w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-30 ${tema.textSoft} ${tema.hoverSuave}`}>
        <i className="ti ti-chevron-down text-lg" />
      </button>
      <button onClick={onCerrar} aria-label="Cerrar la búsqueda" title="Cerrar (Esc)" className={`w-9 h-9 rounded-lg flex items-center justify-center ${tema.textSoft} ${tema.hoverSuave}`}>
        <i className="ti ti-x text-lg" />
      </button>
    </div>
  )
}

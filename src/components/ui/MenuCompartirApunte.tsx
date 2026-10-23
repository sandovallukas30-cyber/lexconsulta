import { useEffect, useRef, useState } from 'react'
import { avisar } from '../../store/useAvisos'
import { descargarApunteMd } from '../../services/apunteArchivo'
import {
  compartirApunte,
  copiarApunteConFormato,
  descargarApunteHtml,
  descargarApunteWord,
  puedeCompartirArchivos,
} from '../../services/apunteExportar'
import type { ApunteModulo } from '../../types'

interface Props {
  apunte: Pick<ApunteModulo, 'titulo' | 'contenido' | 'fechaModificacion'>
  /** Si se pasa, aparece «Imprimir o guardar como PDF» (solo donde la vista imprimible está montada). */
  onImprimir?: () => void
  /** Clases del botón que abre el menú (cada pantalla lo viste a su manera). */
  claseBoton: string
}

const CLASE_FILA = 'w-full flex items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--neu-bg3)] min-h-[44px]'

function Fila({ icono, titulo, detalle, onClick }: { icono: string; titulo: string; detalle: string; onClick: () => void }) {
  return (
    <button role="menuitem" className={CLASE_FILA} onClick={onClick}>
      <i className={`ti ${icono} text-lg mt-0.5 flex-shrink-0`} style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>{titulo}</span>
        <span className="block text-xs mt-0.5" style={{ color: 'var(--neu-ink2)' }}>{detalle}</span>
      </span>
    </button>
  )
}

/** Todo lo que se puede hacer para sacar un apunte de Prima Lex CON su formato: PDF, copiar con formato, compartir,
 *  página web, Word y texto con marcas. Visible también en el celular. */
export function MenuCompartirApunte({ apunte, onImprimir, claseBoton }: Props) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const refMenu = useRef<HTMLDivElement>(null)
  const [compartible] = useState(() => puedeCompartirArchivos())

  useEffect(() => {
    if (!abierto) return
    refMenu.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()
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

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(refMenu.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
  }

  const elegir = (accion: () => void | Promise<void>) => () => {
    setAbierto(false)
    void accion()
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Compartir o exportar el apunte"
        title="Compartir o exportar: PDF, copiar con formato, Word…"
        className={claseBoton}
      >
        <i className="ti ti-share text-lg" aria-hidden="true" />
      </button>
      {abierto && (
        <div
          ref={refMenu}
          role="menu"
          onKeyDown={alTeclear}
          className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 z-30 max-h-[calc(100dvh-5rem)] overflow-y-auto py-1.5 rounded-2xl border shadow-2xl"
          style={{ background: 'var(--neu-card)', borderColor: 'var(--neu-line)' }}
        >
          {onImprimir && (
            <Fila icono="ti-printer" titulo="Imprimir o guardar como PDF" detalle="Con colores, negritas y recuadros. En el celular: «Compartir» → «Guardar PDF»." onClick={elegir(onImprimir)} />
          )}
          <Fila
            icono="ti-clipboard-text"
            titulo="Copiar con formato"
            detalle="Pégalo en Word, Google Docs, Notion o un correo y se ve igual. En WhatsApp queda con *negritas*."
            onClick={elegir(async () => {
              const ok = await copiarApunteConFormato(apunte)
              if (ok) avisar.exito('Apunte copiado con formato')
              else avisar.error('No se pudo copiar. Prueba con «Descargar página web».')
            })}
          />
          {compartible && (
            <Fila
              icono="ti-share"
              titulo="Compartir…"
              detalle="WhatsApp, AirDrop, correo o guardarlo en Archivos, como página web."
              onClick={elegir(async () => {
                await compartirApunte(apunte)
              })}
            />
          )}
          <Fila
            icono="ti-world"
            titulo="Descargar página web (.html)"
            detalle="Un archivo que cualquiera abre en su navegador, con todo el formato."
            onClick={elegir(() => {
              descargarApunteHtml(apunte)
              avisar.exito('Apunte descargado como página web')
            })}
          />
          <Fila
            icono="ti-file-text"
            titulo="Descargar para Word (.doc)"
            detalle="Se abre en Word con el mismo formato y se puede seguir editando."
            onClick={elegir(() => {
              descargarApunteWord(apunte)
              avisar.exito('Apunte descargado para Word')
            })}
          />
          <Fila
            icono="ti-file-download"
            titulo="Texto con marcas (.md)"
            detalle="Para guardarlo o pasarlo a otra cuenta de Prima Lex; en otras apps se ven las marcas."
            onClick={elegir(() => {
              descargarApunteMd(apunte)
              avisar.exito('Apunte exportado a .md')
            })}
          />
        </div>
      )}
    </div>
  )
}

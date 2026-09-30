import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'

/** Panel de atajos de teclado (C7): se abre con "?" desde cualquier vista
 *  (menos mientras se escribe en un campo). Lista SOLO atajos que existen en
 *  el código; si se agrega uno, sumarlo acá. */

const ATAJOS: { grupo: string; items: [string[], string][] }[] = [
  {
    grupo: 'En toda la app',
    items: [
      [['Ctrl', 'K'], 'Buscar en todo (artículos, apuntes, consultas)'],
      [['Ctrl', 'B'], 'Mostrar u ocultar el menú lateral'],
      [['?'], 'Abrir esta ayuda'],
      [['Esc'], 'Cerrar el panel o diálogo abierto'],
    ],
  },
  {
    grupo: 'Explorador de códigos',
    items: [
      [['Ctrl', 'K'], 'Buscar en el código o ir a un artículo ("183-A", "4 bis")'],
      [['↑', '↓', '↵'], 'Moverse por los resultados y abrir'],
      [['←', '→'], 'Artículo anterior / siguiente (en Modo lectura)'],
    ],
  },
  {
    grupo: 'Módulos y apuntes',
    items: [
      [['←', '→'], 'Cambiar de pestaña (con el foco en las pestañas)'],
      [['Ctrl', 'S'], 'Guardar el apunte ahora'],
      [['Ctrl', 'B'], 'Negrita (en el campo de un apunte)'],
      [['Ctrl', 'I'], 'Cursiva (en el campo de un apunte)'],
      [['Ctrl', 'U'], 'Subrayado (en el campo de un apunte)'],
    ],
  },
  {
    grupo: 'Repaso de tarjetas',
    items: [
      [['Espacio'], 'Dar vuelta la tarjeta'],
      [['→', '2'], 'La sabía'],
      [['←', '1'], 'No la sabía'],
    ],
  },
  {
    grupo: 'Mapas mentales',
    items: [
      [['Ctrl', 'Z'], 'Deshacer'],
      [['Ctrl', 'Y'], 'Rehacer'],
      [['Ctrl', 'D'], 'Duplicar el nodo'],
      [['Supr'], 'Borrar el nodo seleccionado'],
    ],
  },
]

function escribiendo(el: EventTarget | null): boolean {
  const e = el as HTMLElement | null
  if (!e) return false
  return e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)
}

export function PanelAtajos() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [abierto, setAbierto] = useState(false)
  const refCerrar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !escribiendo(e.target)) {
        e.preventDefault()
        setAbierto((v) => !v)
      } else if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    if (!abierto) return
    const anterior = document.activeElement as HTMLElement | null
    refCerrar.current?.focus()
    return () => anterior?.focus?.()
  }, [abierto])

  const tecla = `inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1.5 rounded-md border text-[11px] font-mono ${
    modoOscuro ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
  }`

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setAbierto(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-atajos"
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg max-h-[85dvh] flex flex-col rounded-panel shadow-flotante ${modoOscuro ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-900'}`}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <h2 id="titulo-atajos" className="text-base font-semibold">Atajos de teclado</h2>
              <button ref={refCerrar} onClick={() => setAbierto(false)} aria-label="Cerrar atajos" className="boton boton-fantasma boton-chico boton-icono">
                <i className="ti ti-x text-base" aria-hidden />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-5">
              {ATAJOS.map((g) => (
                <section key={g.grupo}>
                  <h3 className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{g.grupo}</h3>
                  <dl className="space-y-1.5">
                    {g.items.map(([teclas, desc]) => (
                      <div key={g.grupo + desc} className="flex items-center justify-between gap-4">
                        <dt className={`text-sm ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>{desc}</dt>
                        <dd className="flex items-center gap-1 flex-shrink-0">
                          {teclas.map((k) => (
                            <kbd key={k} className={tecla}>{k}</kbd>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
              <p className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>En Mac, Cmd en vez de Ctrl.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

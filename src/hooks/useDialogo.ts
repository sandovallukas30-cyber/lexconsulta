import { useEffect, useRef } from 'react'

const FOCALIZABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Comportamiento accesible de un diálogo modal (M1 de la auditoría):
 *  - al abrir, el foco entra al diálogo (al elemento con `data-autofocus` o,
 *    si no hay, al primer control);
 *  - Tab y Mayús+Tab se quedan dentro (trampa de foco);
 *  - Escape cierra;
 *  - al cerrar, el foco vuelve a quien lo abrió.
 *  Devuelve el `ref` que va en el contenedor del diálogo, que además debe
 *  llevar role="dialog", aria-modal y aria-labelledby. */
export function useDialogo<T extends HTMLElement = HTMLDivElement>(abierto: boolean, onCerrar: () => void) {
  const ref = useRef<T>(null)
  // el callback cambia en cada render del padre: se guarda en un ref para
  // que el efecto no se reinicie (y le robe el foco al usuario) cada vez
  const cerrarRef = useRef(onCerrar)
  useEffect(() => {
    cerrarRef.current = onCerrar
  })

  useEffect(() => {
    if (!abierto) return
    const previo = document.activeElement as HTMLElement | null
    const el = ref.current
    // un instante después de montar: el diálogo suele entrar con animación
    const t = window.setTimeout(() => {
      const destino = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(FOCALIZABLE)
      destino?.focus()
    }, 40)

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        cerrarRef.current()
        return
      }
      if (e.key !== 'Tab' || !el) return
      const lista = [...el.querySelectorAll<HTMLElement>(FOCALIZABLE)].filter((x) => x.offsetParent !== null)
      if (lista.length === 0) return
      const primero = lista[0]
      const ultimo = lista[lista.length - 1]
      if (e.shiftKey && (document.activeElement === primero || !el.contains(document.activeElement))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (document.activeElement === ultimo || !el.contains(document.activeElement))) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alTeclear)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', alTeclear)
      previo?.focus?.()
    }
  }, [abierto])

  return ref
}

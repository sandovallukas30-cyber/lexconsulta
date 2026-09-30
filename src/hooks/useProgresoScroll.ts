import { useCallback, useEffect, useState, type RefObject } from 'react'

/** Progreso de lectura (0-1) de un contenedor con scroll, más cuántos px
 *  lleva recorridos -- para barras de progreso y "volver arriba" (C1). Se
 *  actualiza con requestAnimationFrame (un cálculo por frame, no por evento). */
export function useProgresoScroll(ref: RefObject<HTMLElement | null>, dependencia?: unknown) {
  const [estado, setEstado] = useState({ ratio: 0, scrollTop: 0, desplazable: false })

  const medir = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    setEstado({
      ratio: max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0,
      scrollTop: el.scrollTop,
      desplazable: max > 40,
    })
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const alScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(medir)
    }
    el.addEventListener('scroll', alScroll, { passive: true })
    const ro = new ResizeObserver(alScroll)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    alScroll()
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', alScroll)
      ro.disconnect()
    }
  }, [ref, medir, dependencia])

  return estado
}

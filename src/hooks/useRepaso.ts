import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { listarItems, resumirCola, type ItemRepaso, type ResumenRepaso } from '../services/repaso'

/** Todo lo repasable (apuntes + artículos guardados + preguntas) y el
 *  resumen de la cola de hoy. Se recalcula solo cuando cambia alguna de las
 *  cinco fuentes; las tarjetas de cada apunte están en caché (tarjetasDe). */
export function useRepaso(): { items: ItemRepaso[]; resumen: ResumenRepaso } {
  const academicoModulos = useStore((s) => s.academicoModulos)
  const ramos = useStore((s) => s.ramos)
  const colecciones = useStore((s) => s.colecciones)
  const repasoApuntes = useStore((s) => s.repasoApuntes)
  const repasoPreguntas = useStore((s) => s.repasoPreguntas)
  const items = useMemo(
    () => listarItems({ academicoModulos, ramos, colecciones, repasoApuntes, repasoPreguntas }),
    [academicoModulos, ramos, colecciones, repasoApuntes, repasoPreguntas]
  )
  const resumen = useMemo(() => resumirCola(items), [items])
  return { items, resumen }
}

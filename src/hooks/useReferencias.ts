import { useEffect, useMemo, useState } from 'react'
import type { CodigoTipo } from '../types'
import { precargar } from '../services/codigos'
import { detectarReferencias, filtrarReferenciasExistentes, type CoincidenciaReferencia } from '../services/referencias'

/**
 * Detecta las referencias a otros artículos en cada párrafo y las filtra a
 * las que de verdad existen en los datos — pero una referencia a OTRO
 * código (ej. "el artículo 391 del Código Penal" leído desde el Código
 * Civil) fallaría esa verificación de existencia si ese código todavía no
 * se cargó nunca en memoria, no porque la referencia esté mal. Este hook
 * precarga en segundo plano cualquier código distinto al actual que
 * aparezca mencionado, y vuelve a filtrar cuando termina — mismo patrón que
 * useArticulosResueltos en ColeccionesView.tsx.
 */
export function useReferenciasFiltradas(
  parrafos: string[],
  codigo: CodigoTipo,
  articulo: string
): CoincidenciaReferencia[][] {
  const crudasPorParrafo = useMemo(
    () => parrafos.map((p) => detectarReferencias(p, codigo, articulo)),
    [parrafos, codigo, articulo]
  )

  const codigosAPrecargar = useMemo(() => {
    const set = new Set<CodigoTipo>()
    for (const coincidencias of crudasPorParrafo) {
      for (const c of coincidencias) {
        if (c.referencia.codigo !== codigo) set.add(c.referencia.codigo)
      }
    }
    return Array.from(set)
  }, [crudasPorParrafo, codigo])

  const [recarga, forzarActualizacion] = useState(0)
  useEffect(() => {
    if (codigosAPrecargar.length === 0) return
    let cancelado = false
    precargar(codigosAPrecargar).then(() => {
      if (!cancelado) forzarActualizacion((v) => v + 1)
    })
    return () => {
      cancelado = true
    }
  }, [codigosAPrecargar])

  // `recarga` no se usa dentro del cuerpo del map, pero tiene que estar en
  // las dependencias: es la señal de "ya cargó lo que faltaba, filtrar de
  // nuevo" — filtrarReferenciasExistentes lee el estado ACTUAL de los
  // códigos en memoria, no algo memoizado que cambie solo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => crudasPorParrafo.map(filtrarReferenciasExistentes), [crudasPorParrafo, recarga])
}

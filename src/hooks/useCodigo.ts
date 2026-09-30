import { useCallback, useEffect, useState } from 'react'
import { cargarCodigo, codigosCargados, obtenerCodigo } from '../services/codigos'
import type { CodigoData, CodigoTipo } from '../types'

export interface EstadoCodigo {
  codigo: CodigoData | null
  cargando: boolean
  error: string | null
  /** Vuelve a intentar la carga (tras un error de red). */
  reintentar: () => void
}

/** Hook async: carga el JSON del código dinámicamente con loading state. */
export function useCodigo(tipo: CodigoTipo | null): EstadoCodigo {
  const cacheado = tipo ? obtenerCodigo(tipo) : null
  const [intento, setIntento] = useState(0)
  const reintentar = useCallback(() => setIntento((n) => n + 1), [])
  const [estado, setEstado] = useState<Omit<EstadoCodigo, 'reintentar'>>({
    codigo: cacheado,
    cargando: !cacheado && !!tipo,
    error: null,
  })

  useEffect(() => {
    if (!tipo) {
      setEstado({ codigo: null, cargando: false, error: null })
      return
    }
    const ya = obtenerCodigo(tipo)
    if (ya) {
      setEstado({ codigo: ya, cargando: false, error: null })
      return
    }
    setEstado({ codigo: null, cargando: true, error: null })
    let cancelado = false
    cargarCodigo(tipo)
      .then((data) => {
        if (cancelado) return
        setEstado({ codigo: data, cargando: false, error: null })
      })
      .catch((err) => {
        if (cancelado) return
        setEstado({ codigo: null, cargando: false, error: err?.message ?? 'Error cargando código' })
      })
    return () => {
      cancelado = true
    }
  }, [tipo, intento])

  // si la carga falló por red, reintentar solo cuando vuelve la conexión
  const fallo = !!estado.error
  useEffect(() => {
    if (!fallo) return
    window.addEventListener('online', reintentar)
    return () => window.removeEventListener('online', reintentar)
  }, [fallo, reintentar])

  // Al cambiar `tipo`, el estado de arriba todavía es el del código anterior
  // durante un render (el efecto aún no corrió): nunca devolver un código
  // que no es el pedido. Si el nuevo ya está en caché, se entrega al tiro.
  const enCache = tipo ? obtenerCodigo(tipo) : null
  if (enCache) return { codigo: enCache, cargando: false, error: null, reintentar }
  if (estado.codigo && estado.codigo.tipo !== tipo) return { codigo: null, cargando: !!tipo, error: null, reintentar }
  return { ...estado, reintentar }
}

export function listarCodigosCargados(): CodigoTipo[] {
  return codigosCargados()
}

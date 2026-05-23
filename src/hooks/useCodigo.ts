import { useEffect, useState } from 'react'
import { cargarCodigo, codigosCargados, obtenerCodigo } from '../services/codigos'
import type { CodigoData, CodigoTipo } from '../types'

export interface EstadoCodigo {
  codigo: CodigoData | null
  cargando: boolean
  error: string | null
}

/** Hook async: carga el JSON del código dinámicamente con loading state. */
export function useCodigo(tipo: CodigoTipo | null): EstadoCodigo {
  const cacheado = tipo ? obtenerCodigo(tipo) : null
  const [estado, setEstado] = useState<EstadoCodigo>({
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
        setEstado({ codigo: null, cargando: false, error: err.message ?? 'Error cargando código' })
      })
    return () => {
      cancelado = true
    }
  }, [tipo])

  return estado
}

export function listarCodigosCargados(): CodigoTipo[] {
  return codigosCargados()
}

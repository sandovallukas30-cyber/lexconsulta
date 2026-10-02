import { useCallback, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { SesionRepaso } from './SesionRepaso'
import { construirCola, itemsDeApunte, TARJETAS_POR_SESION } from '../../services/repaso'
import type { ApunteModulo } from '../../types'

interface Props {
  apunte: ApunteModulo
  onCerrar: () => void
}

/** Repaso de UN apunte (B5): las tarjetas que salen de su texto, con el
 *  mismo motor de sesión que la cola de hoy (SesionRepaso). */
export function RepasoApunte({ apunte, onCerrar }: Props) {
  const todas = useCallback(() => itemsDeApunte(apunte, null, useStore.getState().repasoApuntes), [apunte])
  // se arma una vez al abrir: responder no debe reordenar la sesión en curso
  const { items, total, nPendientes } = useMemo(() => {
    const todasAhora = todas()
    const cola = construirCola(todasAhora)
    // si nada toca hoy, se ofrecen todas (como siempre)
    return { items: (cola.length > 0 ? cola : todasAhora).slice(0, TARJETAS_POR_SESION), total: todasAhora.length, nPendientes: cola.length }
  }, [todas])
  const pendientes = useCallback(async () => {
    const cola = construirCola(todas())
    return { total: cola.length, lote: cola.slice(0, TARJETAS_POR_SESION) }
  }, [todas])

  return (
    <SesionRepaso
      titulo={`Repaso · ${apunte.titulo}`}
      subtitulo={`${total} tarjeta${total === 1 ? '' : 's'} · ${nPendientes} para hoy`}
      items={items}
      pendientes={pendientes}
      todas={todas}
      onCerrar={onCerrar}
      vacio={
        total === 0 ? (
          <>
            <p className="text-base font-semibold mb-2">Este apunte aún no tiene tarjetas</p>
            <p className="mb-3">Las tarjetas se crean solas a partir de dos formatos del apunte:</p>
            <pre className="text-xs rounded-lg p-3 mb-3 whitespace-pre-wrap bg-black/5">
              {'- **Obligación:** vínculo jurídico entre personas determinadas\n> 🎯 El contrato es ley para las partes (art. 1545)'}
            </pre>
            <p>Cada viñeta que empieza con un término en negrita seguido de dos puntos es una tarjeta, y cada recuadro 🎯 o 💡 es una tarjeta de idea clave.</p>
          </>
        ) : undefined
      }
    />
  )
}

import { etiquetaLugar, useNavegacion, volverAtras, type Lugar } from '../../services/navegacion'

/** "← Derecho Civil I": vuelve al lugar desde el que se llegó (C7). No se
 *  muestra si no hay historial o si `ocultarSi` dice que ya hay otra forma
 *  obvia de volver (p. ej. "Todos los módulos"). */
export function BotonVolver({ ocultarSi }: { ocultarSi?: (l: Lugar) => boolean }) {
  const destino = useNavegacion((s) => s.pila[s.pila.length - 1])
  if (!destino || ocultarSi?.(destino)) return null
  const etiqueta = etiquetaLugar(destino)
  return (
    <button
      onClick={volverAtras}
      title={`Volver a ${etiqueta}`}
      aria-label={`Volver a ${etiqueta}`}
      className="boton boton-fantasma boton-chico gap-1 max-sm:boton-icono min-w-0"
    >
      <i className="ti ti-arrow-left text-sm" aria-hidden />
      <span className="hidden sm:inline truncate max-w-[12rem]">{etiqueta}</span>
    </button>
  )
}

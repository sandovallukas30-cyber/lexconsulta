import { SelectPrima } from './SelectPrima'
import { useStore } from '../../store/useStore'
import { MODULOS } from '../../data/modulos'

/** Selector de ramo: los propios primero y después las áreas del catálogo. */
export function SelectorRamo({
  valor,
  onChange,
  className,
  etiqueta = 'Asignatura',
  textoVacio = 'Sin asignatura',
}: {
  valor: string | null
  onChange: (v: string | null) => void
  className?: string
  etiqueta?: string
  textoVacio?: string
}) {
  const ramos = useStore((s) => s.ramos)
  return (
    <SelectPrima aria-label={etiqueta} value={valor ?? ''} onChange={(e) => onChange(e.target.value || null)} className={className}>
      <option value="">{textoVacio}</option>
      {ramos.length > 0 && (
        <optgroup label="Mis asignaturas">
          {ramos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Áreas del derecho">
        {MODULOS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
      </optgroup>
    </SelectPrima>
  )
}

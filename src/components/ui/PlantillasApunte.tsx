import { PLANTILLAS_APUNTE, type PlantillaApunte } from '../../data/plantillasApunte'

/** Franja sobre el editor de un apunte vacío: «Empieza con una plantilla». Al elegir una, el apunte parte con esa
 *  estructura (y con su título, si aún no tenía). Desaparece apenas hay contenido. */
export function PlantillasApunte({
  onElegir,
  claseBorde,
  claseSuave,
  claseTexto,
  claseChip,
}: {
  onElegir: (p: PlantillaApunte) => void
  claseBorde: string
  claseSuave: string
  claseTexto: string
  claseChip: string
}) {
  return (
    <div className={`flex items-center gap-2 px-4 sm:px-6 py-2 border-b overflow-x-auto flex-shrink-0 ${claseBorde}`} role="group" aria-label="Plantillas de apunte">
      <span className={`text-xs flex-shrink-0 ${claseSuave}`}>Empieza con una plantilla:</span>
      {PLANTILLAS_APUNTE.map((p) => (
        <button
          key={p.id}
          onClick={() => onElegir(p)}
          title={p.descripcion}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-full text-sm font-medium whitespace-nowrap ${claseChip} ${claseTexto}`}
        >
          <i className={`ti ${p.icono} text-base`} aria-hidden="true" />
          {p.nombre}
        </button>
      ))}
    </div>
  )
}

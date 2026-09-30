import { memo, useMemo } from 'react'
import { resumenDe } from '../../../services/apunteFormato'
import { estaPendiente, type TarjetaRepaso } from '../../../services/tarjetasApunte'
import type { ApunteModulo, CuadernoApuntes, EstadoTarjetaRepaso, SesionClase } from '../../../types'
import { BotonEliminar, EtiquetaArticulo, EtiquetaClase } from './comunes'
import { MenuAccionesApunte } from './AccionesApunte'
import { VERDE } from './utilidades'

export interface AccionesListaApuntes {
  abrir: (a: ApunteModulo, editar: boolean) => void
  repasar: (a: ApunteModulo) => void
  duplicar: (a: ApunteModulo) => void
  mover: (a: ApunteModulo) => void
  eliminar: (id: string) => void
}

interface Props {
  apuntes: ApunteModulo[]
  cuadernos: CuadernoApuntes[]
  clases: SesionClase[]
  modoOscuro: boolean
  tarjetasPorApunte: Map<string, TarjetaRepaso[]>
  repasoApuntes: Record<string, EstadoTarjetaRepaso>
  /** Debe ser estable (useMemo en quien la pasa): si no, memo no sirve. */
  acciones: AccionesListaApuntes
}

/** Lista de apuntes (B6). Separada y memoizada porque TabApuntes se
 *  re-renderiza en CADA tecla del formulario de edición: antes eso recalculaba
 *  el resumen (texto plano) de todos los apuntes en cada tecla -- con una
 *  veintena de apuntes largos, ~64 ms por tecla. */
export const ListaApuntes = memo(function ListaApuntes({ apuntes, cuadernos, clases, modoOscuro, tarjetasPorApunte, repasoApuntes, acciones }: Props) {
  return (
    <div className="space-y-2">
      {apuntes.map((a) => {
        const ts = tarjetasPorApunte.get(a.id) ?? []
        return (
          <FilaApunte
            key={a.id}
            apunte={a}
            cuaderno={cuadernos.find((c) => c.id === a.cuadernoId)}
            clase={clases.find((c) => c.id === a.claseId)}
            modoOscuro={modoOscuro}
            nTarjetas={ts.length}
            pendientes={ts.filter((t) => estaPendiente(repasoApuntes[t.id])).length}
            acciones={acciones}
          />
        )
      })}
    </div>
  )
})

const FilaApunte = memo(function FilaApunte({
  apunte: a, cuaderno, clase, modoOscuro, nTarjetas, pendientes, acciones,
}: {
  apunte: ApunteModulo
  cuaderno?: CuadernoApuntes
  clase?: SesionClase
  modoOscuro: boolean
  nTarjetas: number
  pendientes: number
  acciones: AccionesListaApuntes
}) {
  const resumen = useMemo(() => (a.contenido ? resumenDe(a.contenido) : ''), [a.contenido])
  return (
    <div className={`p-3 rounded-tarjeta border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <button
            onClick={() => acciones.abrir(a, false)}
            className={`text-sm font-medium text-left hover:underline ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}
          >
            {a.titulo}
          </button>
          {cuaderno && (
            <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md ${modoOscuro ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
              <i className="ti ti-notebook text-xs" />
              {cuaderno.nombre}
            </span>
          )}
          <EtiquetaArticulo articulo={a.articuloRelacionado} modoOscuro={modoOscuro} />
          <EtiquetaClase clase={clase} modoOscuro={modoOscuro} />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => acciones.abrir(a, true)}
            title="Editar"
            aria-label={`Editar "${a.titulo}"`}
            className="boton boton-fantasma boton-chico boton-icono"
          >
            <i className="ti ti-pencil text-sm" />
          </button>
          {nTarjetas > 0 && (
            <button
              onClick={() => acciones.repasar(a)}
              title={`Repasar ${nTarjetas} tarjeta${nTarjetas === 1 ? '' : 's'} (${pendientes} para hoy)`}
              aria-label={`Repasar "${a.titulo}": ${nTarjetas} tarjetas, ${pendientes} para hoy`}
              className="boton boton-fantasma boton-chico gap-1 px-2"
            >
              <i className="ti ti-cards text-sm" style={{ color: pendientes > 0 ? VERDE : undefined }} />
              {pendientes > 0 ? pendientes : nTarjetas}
            </button>
          )}
          <MenuAccionesApunte apunte={a} onDuplicar={() => acciones.duplicar(a)} onMover={() => acciones.mover(a)} modoOscuro={modoOscuro} />
          <BotonEliminar onClick={() => acciones.eliminar(a.id)} modoOscuro={modoOscuro} />
        </div>
      </div>
      {resumen && <p className={`text-xs line-clamp-3 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>{resumen}</p>}
    </div>
  )
})

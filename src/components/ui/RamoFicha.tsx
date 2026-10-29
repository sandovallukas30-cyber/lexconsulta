import { useMemo } from 'react'
import type { Ramo, Modulo } from '../../types'
import { useStore } from '../../store/useStore'
import { ICONO_RAMO_DEFECTO, diasHasta, formatearCountdown, urgenciaDe } from '../../services/modulosAcademico'
import { disenoDe, profesoresDe, resumenProfesores, tintaPastel } from '../../services/disenoRamo'
import { formatoNota, resumenNotas } from '../../services/notas'
import { hoyISO } from '../../services/tareasPlan'
import { BandaRamo } from './BandaRamo'

const VERDE = 'var(--accent-base)'

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
function cuando(fecha: string, hora?: string): string {
  const [a, m, d] = fecha.split('-').map(Number)
  const dias = diasHasta(fecha)
  const dia = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${DIAS[new Date(a, m - 1, d).getDay()]} ${d}`
  return hora ? `${dia} ${hora}` : dia
}

function Chip({ icono, texto, tono }: { icono: string; texto: string; tono?: 'urgente' | 'proximo' | 'bien' }) {
  const fondo = tono === 'urgente' ? 'var(--neu-danger)' : tono === 'proximo' ? 'var(--neu-warn)' : tono === 'bien' ? 'var(--neu-ok)' : null
  return (
    <span
      className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-full max-w-full"
      style={
        fondo
          ? { background: `color-mix(in srgb, ${fondo} 16%, transparent)`, color: `color-mix(in srgb, ${fondo} 38%, var(--neu-ink))` }
          : { background: 'var(--neu-bg3)', color: 'var(--neu-ink2)' }
      }
    >
      <i className={`ti ${icono} text-[13px]`} aria-hidden="true" />
      <span className="truncate">{texto}</span>
    </span>
  )
}

interface Props {
  ramo: Ramo
  modulos: Modulo[]
  onClick: () => void
  onEditar: () => void
}

/** Ficha de un ramo, al estilo de las de Classroom: franja de color con diseño arriba y,
 *  debajo, lo que importa hoy (próxima clase, próxima evaluación, nota, apuntes y tareas). */
export function RamoFicha({ ramo, modulos, onClick, onEditar }: Props) {
  const datos = useStore((s) => s.academicoModulos[ramo.id])
  const tareas = useStore((s) => s.tareasPlan)
  const color = ramo.color ?? VERDE
  const icono = ramo.icono ?? ICONO_RAMO_DEFECTO
  const tinta = tintaPastel(color) // la franja es pastel: el texto va en un tono oscuro del mismo color
  const profesores = profesoresDe(ramo)

  const resumen = useMemo(() => {
    const hoy = hoyISO()
    const evals = datos?.evaluaciones ?? []
    const clases = datos?.clases ?? []
    const proxEval = evals.filter((e) => e.nota === null && e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
    const proxClase = clases.filter((c) => !c.completada && c.fecha >= hoy).sort((a, b) => (a.fecha + (a.hora ?? '')).localeCompare(b.fecha + (b.hora ?? '')))[0]
    return {
      proxEval,
      proxClase,
      notas: resumenNotas(evals),
      apuntes: datos?.apuntes.length ?? 0,
      pendientes: tareas.filter((t) => t.ramoId === ramo.id && !t.hecha).length,
    }
  }, [datos, tareas, ramo.id])

  const { proxEval, proxClase, notas } = resumen
  const dias = proxEval ? diasHasta(proxEval.fecha) : null
  const lugar = [ramo.horario, ramo.sala].filter(Boolean).join(' · ')

  // La ficha y el lápiz son botones hermanos (un botón dentro de otro no es válido ni accesible).
  return (
    <div className="group relative neu-raised overflow-hidden">
      <button onClick={onClick} className="sin-neu flex flex-col justify-start items-stretch w-full h-full text-left">
        <BandaRamo color={color} diseno={disenoDe(ramo)} className="h-[96px]">
          <div className="h-full flex items-end justify-between gap-3 p-3.5" style={{ color: tinta }}>
            <div className="min-w-0">
              {ramo.semestre && <div className="text-[11px] font-semibold opacity-90 mb-0.5">{ramo.semestre}</div>}
              <h3 className="text-[17px] font-extrabold leading-tight line-clamp-2" style={{ fontFamily: 'var(--font-head)' }}>{ramo.nombre}</h3>
            </div>
            <i className={`ti ${icono} text-3xl flex-shrink-0 opacity-90`} aria-hidden="true" />
          </div>
        </BandaRamo>

        <div className="p-3.5 space-y-2.5 flex-1 flex flex-col">
          <div className="space-y-1 text-[12.5px]" style={{ color: 'var(--neu-ink2)' }}>
            {profesores.length > 0 && (
              <div className="flex items-start gap-1.5" title={profesores.join(', ')}>
                <i className="ti ti-user text-[14px] mt-px flex-shrink-0" aria-hidden="true" />
                <span className="line-clamp-2">{resumenProfesores(profesores)}</span>
              </div>
            )}
            {lugar && (
              <div className="flex items-start gap-1.5">
                <i className="ti ti-map-pin text-[14px] mt-px flex-shrink-0" aria-hidden="true" />
                <span className="line-clamp-2">{lugar}</span>
              </div>
            )}
          </div>

          {(proxEval || notas.promedio !== null || notas.estado !== 'sin-datos') && (
            <div className="flex flex-wrap gap-1.5">
              {proxEval && dias !== null && (
                <Chip
                  icono="ti-flag"
                  texto={`${proxEval.nombre} · ${formatearCountdown(dias).toLowerCase()}`}
                  tono={urgenciaDe(dias) === 'urgente' ? 'urgente' : urgenciaDe(dias) === 'proximo' ? 'proximo' : undefined}
                />
              )}
              {notas.promedio !== null && <Chip icono="ti-chart-line" texto={`Promedio ${formatoNota(notas.promedio)}`} />}
              {notas.estado === 'posible' && notas.necesaria !== null && (
                <Chip icono="ti-target" texto={`Necesitas ${formatoNota(notas.necesaria)}`} tono={notas.necesaria >= 6 ? 'urgente' : notas.necesaria >= 5 ? 'proximo' : undefined} />
              )}
              {notas.estado === 'asegurado' && <Chip icono="ti-check" texto="Aprobado asegurado" tono="bien" />}
              {notas.estado === 'imposible' && <Chip icono="ti-alert-triangle" texto="No alcanza el 4,0" tono="urgente" />}
              {notas.estado === 'completo' && notas.promedio !== null && (
                <Chip icono={notas.promedio >= 4 ? 'ti-check' : 'ti-alert-triangle'} texto={notas.promedio >= 4 ? 'Aprobado' : 'Reprobado'} tono={notas.promedio >= 4 ? 'bien' : 'urgente'} />
              )}
            </div>
          )}

          {proxClase && (
            <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--neu-ink2)' }}>
              <i className="ti ti-calendar-event text-[14px] flex-shrink-0" aria-hidden="true" />
              <span className="truncate">
                Próxima clase: <strong style={{ color: 'var(--neu-ink)' }}>{cuando(proxClase.fecha, proxClase.hora)}</strong>
              </span>
            </div>
          )}

          {modulos.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {modulos.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md" style={{ background: m.color + '20', color: `color-mix(in srgb, ${m.color} 70%, var(--neu-ink))` }}>
                  <i className={`ti ${m.icono} text-xs`} aria-hidden="true" />
                  {m.nombre}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2 mt-auto border-t text-[12px] font-semibold" style={{ borderColor: 'var(--neu-line)', color: 'var(--neu-ink2)' }}>
            <span className="inline-flex items-center gap-1.5"><i className="ti ti-notes text-[14px]" aria-hidden="true" />{resumen.apuntes} {resumen.apuntes === 1 ? 'apunte' : 'apuntes'}</span>
            <span className="inline-flex items-center gap-1.5"><i className="ti ti-checkbox text-[14px]" aria-hidden="true" />{resumen.pendientes} {resumen.pendientes === 1 ? 'tarea' : 'tareas'}</span>
          </div>
        </div>
      </button>
      <button
        onClick={onEditar}
        title="Editar asignatura"
        aria-label={`Editar asignatura ${ramo.nombre}`}
        className="sin-neu absolute top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        style={{ background: 'rgba(255,255,255,.65)', color: tinta, backdropFilter: 'blur(4px)' }}
      >
        <i className="ti ti-pencil text-sm" aria-hidden="true" />
      </button>
    </div>
  )
}

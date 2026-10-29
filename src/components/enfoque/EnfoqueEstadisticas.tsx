import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useEnfoque } from '../../store/useEnfoque'
import { horasMin, minutosPorDia, minutosPorRamo, rachaMeta } from '../../services/enfoque'
import {
  calidadPromedio, mapaSemanaHora, mejorRacha, patrones, porHora, resumenFoco, serieSemanas, totalMinutos,
} from '../../services/enfoqueStats'
import { colorRamo, hoyISO, nombreRamo, sumarDiasISO } from '../../services/tareasPlan'
import { DIAS_CORTOS } from '../../services/horario'
import { Segmentado } from '../ui/Segmentado'
import { Estrellas } from '../ui/CalificarSesion'
import { AmbienteQueFunciona } from './AmbienteQueFunciona'

const dec = (n: number) => n.toFixed(1).replace('.', ',')
const corto = (f: string) => {
  const [a, m, d] = f.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '')
}
const letraDia = (f: string) => {
  const [a, m, d] = f.split('-').map(Number)
  return DIAS_CORTOS[(new Date(a, m - 1, d).getDay() + 6) % 7][0]
}

interface Barra {
  etiqueta: string
  valor: number
  titulo: string
  resalta?: boolean
}

/** Barras verticales simples; `meta` dibuja una línea de referencia. */
function Barras({ datos, meta, alto = 150, descripcion }: { datos: Barra[]; meta?: number; alto?: number; descripcion: string }) {
  const max = Math.max(1, meta ?? 0, ...datos.map((d) => d.valor))
  const cada = datos.length > 16 ? 3 : datos.length > 10 ? 2 : 1
  return (
    <div role="img" aria-label={descripcion}>
      <div className="relative flex items-end gap-1.5" style={{ height: alto }}>
        {meta ? (
          <div className="absolute left-0 right-0 border-t border-dashed pointer-events-none" style={{ bottom: `${(meta / max) * 100}%`, borderColor: 'var(--neu-ink3)' }} title={`Meta: ${horasMin(meta)}`}>
            <span className="absolute right-0 -top-4 text-[10px]" style={{ color: 'var(--neu-ink3)' }}>meta</span>
          </div>
        ) : null}
        {datos.map((d, i) => (
          <div key={i} className="flex-1 h-full flex items-end" title={d.titulo}>
            <i
              className="block w-full rounded-t-lg"
              style={{ height: `${Math.max(d.valor > 0 ? 3 : 0, (d.valor / max) * 100)}%`, background: d.resalta ? 'var(--accent-base)' : 'color-mix(in srgb, var(--accent-base) 40%, transparent)' }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {datos.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px]" style={{ color: 'var(--neu-ink3)' }}>
            {i % cada === 0 || i === datos.length - 1 ? d.etiqueta : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function Cifra({ titulo, valor, detalle, children }: { titulo: string; valor?: string; detalle?: string; children?: React.ReactNode }) {
  return (
    <section className="neu-raised p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--neu-ink3)' }}>{titulo}</p>
      {valor && <p className="text-2xl font-extrabold mt-1" style={{ color: 'var(--neu-ink)' }}>{valor}</p>}
      {detalle && <p className="text-xs mt-0.5" style={{ color: 'var(--neu-ink2)' }}>{detalle}</p>}
      {children}
    </section>
  )
}

export function EnfoqueEstadisticas() {
  const sesiones = useEnfoque((s) => s.sesiones)
  const meta = Math.max(1, useEnfoque((s) => s.ajustes.metaDia))
  const ramos = useStore((s) => s.ramos)
  const [vista, setVista] = useState<'dias' | 'semanas'>('dias')
  const [rango, setRango] = useState<'7' | '30' | '0'>('30')
  const hoy = hoyISO()

  const r = useMemo(() => resumenFoco(sesiones, hoy), [sesiones, hoy])
  const racha = useMemo(() => rachaMeta(sesiones, meta, hoy), [sesiones, meta, hoy])
  const mejor = useMemo(() => mejorRacha(sesiones, meta), [sesiones, meta])
  const calidad = useMemo(() => calidadPromedio(sesiones), [sesiones])
  const hallazgos = useMemo(() => patrones(sesiones, hoy), [sesiones, hoy])
  const horas = useMemo(() => porHora(sesiones), [sesiones])
  const mapa = useMemo(() => mapaSemanaHora(sesiones), [sesiones])
  const dias = useMemo(() => minutosPorDia(sesiones, hoy, 14), [sesiones, hoy])
  const semanas = useMemo(() => serieSemanas(sesiones, hoy, 12), [sesiones, hoy])
  const filtradas = useMemo(() => (rango === '0' ? sesiones : sesiones.filter((s) => s.fecha >= sumarDiasISO(hoy, -(Number(rango) - 1)))), [sesiones, rango, hoy])
  const porRamo = useMemo(() => minutosPorRamo(filtradas, '0000-00-00'), [filtradas])
  const totalRango = totalMinutos(filtradas)

  if (sesiones.length === 0) {
    return (
      <section className="neu-raised p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>
          Aún no hay sesiones. Completa un enfoque o registra una sesión a mano y aquí verás tus números.
        </p>
      </section>
    )
  }

  const maxCelda = Math.max(1, ...mapa.flat())
  const nivel = (v: number) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / maxCelda) * 4)))
  const colorCelda = (n: number) => (n === 0 ? 'var(--neu-bg3)' : `color-mix(in srgb, var(--accent-base) ${[0, 22, 42, 65, 90][n]}%, var(--neu-bg3))`)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Cifra titulo="Hoy" valor={horasMin(r.hoy)} detalle={`de ${horasMin(meta)}`} />
        <Cifra
          titulo="Últimos 7 días"
          valor={horasMin(r.semana)}
          detalle={r.tendencia === null ? 'Sin semana anterior para comparar' : `${r.tendencia >= 0 ? '+' : '−'}${Math.round(Math.abs(r.tendencia) * 100)} % vs. la anterior`}
        />
        <Cifra titulo="Últimos 30 días" valor={horasMin(r.mes)} detalle={`${horasMin(Math.round(r.mes / 30))} por día`} />
        <Cifra titulo="Racha de metas" valor={`${racha} ${racha === 1 ? 'día' : 'días'}`} detalle={`Mejor: ${Math.max(mejor, racha)} · meta ${horasMin(meta)} al día`} />
        <Cifra titulo="Sesiones" valor={String(r.sesiones)} detalle={`Promedio ${Math.round(r.promedio)} min · más larga ${horasMin(r.masLarga)}`} />
        <Cifra titulo="Concentración">
          {calidad === null ? (
            <p className="text-xs mt-2" style={{ color: 'var(--neu-ink2)' }}>Califica tus sesiones para verla.</p>
          ) : (
            <>
              <p className="text-2xl font-extrabold mt-1" style={{ color: 'var(--neu-ink)' }}>{dec(calidad)}<small className="text-sm font-semibold"> / 5</small></p>
              <Estrellas valor={Math.round(calidad)} tamano={16} />
            </>
          )}
        </Cifra>
      </div>

      <section className="neu-raised p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--neu-ink)' }}>Tiempo enfocado</h2>
          <Segmentado<'dias' | 'semanas'> id="graf" etiqueta="Período del gráfico" valor={vista} onChange={setVista} opciones={[{ valor: 'dias', texto: '14 días' }, { valor: 'semanas', texto: '12 semanas' }]} />
        </div>
        {vista === 'dias' ? (
          <Barras
            meta={meta}
            descripcion={`Minutos enfocados por día en los últimos 14 días. Hoy: ${r.hoy} minutos.`}
            datos={dias.map((d) => ({ etiqueta: letraDia(d.fecha), valor: d.minutos, titulo: `${corto(d.fecha)}: ${horasMin(d.minutos)}`, resalta: d.fecha === hoy }))}
          />
        ) : (
          <Barras
            descripcion="Minutos enfocados por semana en las últimas 12 semanas"
            datos={semanas.map((s, i) => ({ etiqueta: corto(s.fecha), valor: s.minutos, titulo: `Semana del ${corto(s.fecha)}: ${horasMin(s.minutos)}`, resalta: i === semanas.length - 1 }))}
          />
        )}
      </section>

      <section className="neu-raised p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--neu-ink)' }}>Por asignatura</h2>
          <Segmentado<'7' | '30' | '0'> id="rango" etiqueta="Período" valor={rango} onChange={setRango} opciones={[{ valor: '7', texto: '7 días' }, { valor: '30', texto: '30 días' }, { valor: '0', texto: 'Todo' }]} />
        </div>
        {porRamo.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>Sin sesiones en este período.</p>
        ) : (
          <>
            <div className="flex h-3 rounded-full overflow-hidden" style={{ boxShadow: 'var(--neu-presionada-chica)' }} role="img" aria-label={`Reparto por asignatura: ${porRamo.map((m) => `${nombreRamo(m.ramoId, ramos) ?? 'Sin asignatura'} ${Math.round((m.minutos / totalRango) * 100)} %`).join(', ')}`}>
              {porRamo.map((m) => (
                <i key={m.ramoId ?? 'x'} style={{ width: `${(m.minutos / totalRango) * 100}%`, background: colorRamo(m.ramoId, ramos) }} title={`${nombreRamo(m.ramoId, ramos) ?? 'Sin asignatura'}: ${horasMin(m.minutos)}`} />
              ))}
            </div>
            <div className="mt-3">
              {porRamo.map((m) => (
                <div key={m.ramoId ?? 'x'} className="flex items-center gap-3 py-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colorRamo(m.ramoId, ramos) }} />
                  <span className="flex-1 min-w-0 truncate text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>{nombreRamo(m.ramoId, ramos) ?? 'Sin asignatura'}</span>
                  <span className="text-xs" style={{ color: 'var(--neu-ink2)' }}>{Math.round((m.minutos / totalRango) * 100)} %</span>
                  <span className="neu-chip px-3 py-1 text-xs font-bold tabular-nums min-w-[76px] text-center" style={{ color: 'var(--neu-ink)' }}>{horasMin(m.minutos)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="neu-raised p-5">
        <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--neu-ink)' }}>Cuándo enfocas</h2>
        <div role="img" aria-label="Mapa de calor: minutos enfocados por día de la semana y hora del día" className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="flex items-center gap-[3px] mb-1">
              <span className="w-9 flex-shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="flex-1 text-[9px] text-center" style={{ color: 'var(--neu-ink3)' }}>{h % 3 === 0 ? h : ''}</span>
              ))}
            </div>
            {mapa.map((fila, d) => (
              <div key={d} className="flex items-center gap-[3px] mb-[3px]">
                <span className="w-9 flex-shrink-0 text-[10px] font-semibold" style={{ color: 'var(--neu-ink2)' }}>{DIAS_CORTOS[d]}</span>
                {fila.map((v, h) => (
                  <i key={h} className="flex-1 h-5 rounded-[4px]" style={{ background: colorCelda(nivel(v)) }} title={`${DIAS_CORTOS[d]} ${String(h).padStart(2, '0')}:00 · ${horasMin(Math.round(v))}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wide mt-5 mb-2" style={{ color: 'var(--neu-ink3)' }}>Por hora del día</p>
        <Barras alto={100} descripcion="Minutos enfocados por hora del día" datos={horas.map((v, h) => ({ etiqueta: String(h), valor: v, titulo: `${String(h).padStart(2, '0')}:00 · ${horasMin(Math.round(v))}` }))} />
      </section>

      <AmbienteQueFunciona />

      <section className="neu-raised p-5">
        <h2 className="text-[15px] font-bold mb-3" style={{ color: 'var(--neu-ink)' }}>
          <i className="ti ti-bulb mr-2" style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
          Lo que descubrí
        </h2>
        {hallazgos.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>Necesito al menos 8 sesiones para encontrar patrones. Llevas {sesiones.length}.</p>
        ) : (
          hallazgos.map((h) => (
            <div key={h.titulo} className="py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--neu-ink3)' }}>{h.titulo}</p>
              <p className="text-sm" style={{ color: 'var(--neu-ink)' }}>{h.texto}</p>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

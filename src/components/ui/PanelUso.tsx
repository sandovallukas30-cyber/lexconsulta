import { useEffect, useMemo, useState } from 'react'
import { DISPOSITIVOS_USO, type DispositivoUso, type VistaUso } from '../../../api/_catalogoUso'
import { cargarFilasUso, rangoUltimosDias } from '../../services/panelUso'
import { formatoDuracion, resumirUso, type ResumenUso } from '../../services/resumenUso'
import { Segmentado } from './Segmentado'

const NOMBRE_VISTA: Record<VistaUso, string> = {
  hoy: 'Hoy',
  tareas: 'Tareas',
  enfoque: 'Enfoque',
  calendario: 'Calendario',
  modulos: 'Mis ramos',
  explorador: 'Explorador',
  colecciones: 'Colecciones',
  mapasmentales: 'Mapas mentales',
  practica: 'Práctica',
}
const NOMBRE_DISPOSITIVO: Record<DispositivoUso, string> = { movil: 'Celular', tablet: 'Tablet', escritorio: 'Computador' }

/** Resultado de una carga; `clave` dice a qué pedido (período + número de «Actualizar») corresponde. */
type Resultado = { clave: string; fase: 'error'; mensaje: string } | { clave: string; fase: 'listo'; resumen: ResumenUso }
type Estado = { fase: 'cargando' } | Omit<Extract<Resultado, { fase: 'error' }>, 'clave'> | Omit<Extract<Resultado, { fase: 'listo' }>, 'clave'>

/** Panel de estadísticas de uso (solo administradores): cuántos entran, dónde pasan el tiempo y qué funciones no se tocan. */
export default function PanelUso({ modoOscuro }: { modoOscuro: boolean }) {
  const [dias, setDias] = useState<'7' | '30' | '90'>('30')
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const clave = `${dias}:${version}`

  useEffect(() => {
    let vigente = true
    const { desde, hasta } = rangoUltimosDias(Number(dias))
    cargarFilasUso(desde, hasta)
      .then((filas) => vigente && setResultado({ clave, fase: 'listo', resumen: resumirUso(filas, desde, hasta) }))
      .catch((e) => vigente && setResultado({ clave, fase: 'error', mensaje: e instanceof Error ? e.message : 'No se pudieron leer las estadísticas.' }))
    return () => {
      vigente = false
    }
  }, [dias, clave])

  // «cargando» se deduce: todavía no llegó el resultado de ESTE pedido
  const estado: Estado = resultado && resultado.clave === clave ? resultado : { fase: 'cargando' }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmentado
          id="rango-uso"
          etiqueta="Período"
          opciones={[
            { valor: '7', texto: '7 días' },
            { valor: '30', texto: '30 días' },
            { valor: '90', texto: '90 días' },
          ]}
          valor={dias}
          onChange={setDias}
        />
        <button onClick={() => setVersion((v) => v + 1)} className="boton boton-suave boton-chico" disabled={estado.fase === 'cargando'}>
          <i className={`ti ti-refresh ${estado.fase === 'cargando' ? 'animate-spin' : ''}`} aria-hidden="true" /> Actualizar
        </button>
      </div>
      <p className="text-xs" style={{ color: 'var(--neu-ink3)' }}>
        Cada número es una <strong>visita</strong> (una apertura de la app) o una vez que se usó una función, no una persona: no hay identificadores. Los
        datos llegan cuando alguien cierra o cambia de pestaña, o cada 5 minutos.
      </p>

      {estado.fase === 'cargando' && <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>Cargando…</p>}
      {estado.fase === 'error' && (
        <div role="alert" className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--neu-danger)', color: 'var(--neu-ink)' }}>
          <p className="font-semibold mb-1">No se pudieron cargar las estadísticas</p>
          <p style={{ color: 'var(--neu-ink2)' }}>{estado.mensaje}</p>
          <p className="mt-2 text-xs" style={{ color: 'var(--neu-ink3)' }}>
            Revisa que hayas ejecutado <code>docs/supabase/uso.sql</code> en Supabase y que tu cuenta esté en la tabla <code>administradores</code>.
          </p>
        </div>
      )}
      {estado.fase === 'listo' && <Resumen resumen={estado.resumen} modoOscuro={modoOscuro} />}
    </div>
  )
}

function Resumen({ resumen: r, modoOscuro }: { resumen: ResumenUso; modoOscuro: boolean }) {
  const vacio = r.visitas.total === 0 && r.totalSegundos === 0 && r.funciones.every((f) => f.veces === 0)
  const maxDia = Math.max(1, ...r.porDia.map((d) => d.visitas))
  const maxFuncion = Math.max(1, ...r.funciones.map((f) => f.veces))
  const masUsadas = useMemo(() => r.funciones.filter((f) => f.veces > 0).slice(0, 12), [r])
  const totalDispositivos = DISPOSITIVOS_USO.reduce((a, d) => a + r.porDispositivo[d], 0)

  if (vacio) {
    return (
      <div className={`rounded-2xl border p-5 text-sm ${modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50/70 border-zinc-200'}`} style={{ color: 'var(--neu-ink2)' }}>
        <p className="font-semibold mb-1" style={{ color: 'var(--neu-ink)' }}>Todavía no hay datos en este período</p>
        <p>
          Si acabas de activar las estadísticas, aparecerán cuando alguien use la app. Si ya pasó un buen rato, revisa que el despliegue tenga{' '}
          <code>VITE_USO_ACTIVO=1</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code> (ver docs/ANALITICA_USO.md).
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tarjeta titulo="Visitas" valor={String(r.visitas.total)} detalle="aperturas de la app" modoOscuro={modoOscuro} />
        <Tarjeta
          titulo="Primera vez"
          valor={String(r.visitas.nuevas)}
          detalle={r.visitas.total > 0 ? `${Math.round((r.visitas.nuevas / r.visitas.total) * 100)} % de las visitas` : ''}
          modoOscuro={modoOscuro}
        />
        <Tarjeta titulo="Regresan" valor={String(r.visitas.regresos)} detalle="ya habían entrado antes" modoOscuro={modoOscuro} />
        <Tarjeta titulo="Tiempo por visita" valor={formatoDuracion(r.segundosPorVisita)} detalle="uso activo, en promedio" modoOscuro={modoOscuro} />
      </div>

      <Bloque titulo="Visitas por día" modoOscuro={modoOscuro}>
        <div className="flex items-end gap-[2px] h-28" role="img" aria-label="Gráfico de visitas por día">
          {r.porDia.map((d) => (
            <div
              key={d.dia}
              title={`${d.dia}: ${d.visitas} visita${d.visitas === 1 ? '' : 's'}`}
              className="flex-1 min-w-[2px] rounded-t"
              style={{ height: `${Math.max(d.visitas > 0 ? 6 : 2, (d.visitas / maxDia) * 100)}%`, background: d.visitas > 0 ? 'var(--accent-base)' : 'var(--neu-line)' }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[11px] mt-1" style={{ color: 'var(--neu-ink3)' }}>
          <span>{r.porDia[0]?.dia}</span>
          <span>máx. {maxDia} en un día</span>
          <span>{r.porDia[r.porDia.length - 1]?.dia}</span>
        </div>
      </Bloque>

      <div className="grid lg:grid-cols-2 gap-4">
        <Bloque titulo="Desde qué pantalla entran" modoOscuro={modoOscuro}>
          <ul className="space-y-2">
            {DISPOSITIVOS_USO.map((d) => (
              <Barra
                key={d}
                etiqueta={NOMBRE_DISPOSITIVO[d]}
                valor={r.porDispositivo[d]}
                max={Math.max(1, totalDispositivos)}
                texto={`${r.porDispositivo[d]}${totalDispositivos ? ` · ${Math.round((r.porDispositivo[d] / totalDispositivos) * 100)} %` : ''}`}
              />
            ))}
          </ul>
        </Bloque>

        <Bloque titulo="Dónde pasan el tiempo" modoOscuro={modoOscuro}>
          <ul className="space-y-2">
            {r.vistas.map((v) => (
              <Barra
                key={v.vista}
                etiqueta={NOMBRE_VISTA[v.vista]}
                valor={v.segundos}
                max={Math.max(1, r.vistas[0]?.segundos ?? 1)}
                texto={v.segundos > 0 ? `${formatoDuracion(v.segundos)} · ${Math.round(v.porcentaje)} %` : 'sin uso'}
              />
            ))}
          </ul>
        </Bloque>
      </div>

      <Bloque titulo="Funciones más usadas" modoOscuro={modoOscuro}>
        {masUsadas.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>Nadie usó ninguna función en este período.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {masUsadas.map((f) => (
              <Barra key={f.clave} etiqueta={f.etiqueta} valor={f.veces} max={maxFuncion} texto={`${f.veces} ${f.veces === 1 ? 'vez' : 'veces'}`} />
            ))}
          </ul>
        )}
      </Bloque>

      <Bloque titulo={`Funciones que nadie usó (${r.sinUso.length})`} modoOscuro={modoOscuro}>
        {r.sinUso.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>Todas las funciones se usaron al menos una vez.</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {r.sinUso.map((f) => (
                <li key={f.clave} className="text-xs rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--neu-line)', color: 'var(--neu-ink2)' }}>
                  {f.etiqueta}
                </li>
              ))}
            </ul>
            <p className="text-xs mt-3" style={{ color: 'var(--neu-ink3)' }}>
              Que no se usen no significa que sobren: puede que no se encuentren, o que aún no haya suficientes visitas. Pregúntales a quienes la usan antes de quitar algo.
            </p>
          </>
        )}
      </Bloque>
    </>
  )
}

function Tarjeta({ titulo, valor, detalle, modoOscuro }: { titulo: string; valor: string; detalle: string; modoOscuro: boolean }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50/70 border-zinc-200'}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--neu-ink3)' }}>{titulo}</p>
      <p className="text-2xl font-extrabold mt-0.5" style={{ color: 'var(--neu-ink)' }}>{valor}</p>
      {detalle && <p className="text-xs mt-0.5" style={{ color: 'var(--neu-ink2)' }}>{detalle}</p>}
    </div>
  )
}

function Bloque({ titulo, children, modoOscuro }: { titulo: string; children: React.ReactNode; modoOscuro: boolean }) {
  return (
    <section className={`rounded-2xl border p-4 ${modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50/70 border-zinc-200'}`}>
      <h4 className="text-[15px] font-bold mb-3" style={{ color: 'var(--neu-ink)' }}>{titulo}</h4>
      {children}
    </section>
  )
}

/** Una fila con su barra: nombre y cifra arriba, barra del ancho completo debajo (así se lee bien también en bloques angostos). */
function Barra({ etiqueta, valor, max, texto }: { etiqueta: string; valor: number; max: number; texto: string }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-sm min-w-0" style={{ color: 'var(--neu-ink)' }}>{etiqueta}</span>
        <span className="text-xs tabular-nums flex-shrink-0" style={{ color: 'var(--neu-ink2)' }}>{texto}</span>
      </div>
      <span className="h-2 rounded-full overflow-hidden block" style={{ background: 'var(--neu-line)' }} aria-hidden="true">
        <span className="block h-full rounded-full" style={{ width: `${valor > 0 ? Math.max(3, (valor / max) * 100) : 0}%`, background: 'var(--accent-base)' }} />
      </span>
    </li>
  )
}

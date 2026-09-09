import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { calcularPlazo, type TipoConteo, type UnidadPlazo } from '../../services/plazos'

const VERDE = 'var(--accent-base)'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatearFecha(f: Date): string {
  return `${DIAS_SEMANA[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`
}

/** Mayúscula solo en la primera letra (p.ej. para iniciar el titular del
 *  resultado) -- a diferencia de la clase Tailwind `capitalize`, que pone en
 *  mayúscula cada palabra, incluidas preposiciones como "de". */
function conMayusculaInicial(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** input[type=date] entrega "YYYY-MM-DD"; parsearlo con `new Date(string)`
 *  lo interpreta como UTC medianoche y puede correr un día en la fecha local
 *  según el huso horario. Se arma con el constructor (año, mes, día) local. */
function parsearFechaInput(valor: string): Date {
  const [anio, mes, dia] = valor.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

function fechaAInput(f: Date): string {
  const anio = f.getFullYear()
  const mes = String(f.getMonth() + 1).padStart(2, '0')
  const dia = String(f.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function PlazosView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [fechaInicioStr, setFechaInicioStr] = useState(() => fechaAInput(new Date()))
  const [cantidad, setCantidad] = useState(30)
  const [unidad, setUnidad] = useState<UnidadPlazo>('dias')
  const [tipo, setTipo] = useState<TipoConteo>('corridos')
  const [excluirSabados, setExcluirSabados] = useState(false)
  const [mostrarCitas, setMostrarCitas] = useState(false)

  const fechaInicio = useMemo(() => parsearFechaInput(fechaInicioStr), [fechaInicioStr])

  const resultado = useMemo(() => {
    if (!fechaInicioStr || !Number.isFinite(cantidad) || cantidad <= 0) return null
    return calcularPlazo({ fechaInicio, cantidad, unidad, tipo, excluirSabados })
  }, [fechaInicio, fechaInicioStr, cantidad, unidad, tipo, excluirSabados])

  const esDias = unidad === 'dias'

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: modoOscuro
                ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
                : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
            }}
          >
            <i className="ti ti-calendar-time text-xl" style={{ color: VERDE }} />
          </div>
          <div>
            <h1 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              Calculadora de plazos
            </h1>
            <p className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Reglas generales del Código Civil — Art. 48, 49 y 50
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div
          className={`mt-6 rounded-2xl border p-6 space-y-5 ${
            modoOscuro ? 'bg-zinc-800/60 border-zinc-700' : 'bg-white border-zinc-200 shadow-sm'
          }`}
        >
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Fecha de inicio
            </label>
            <input
              type="date"
              value={fechaInicioStr}
              onChange={(e) => setFechaInicioStr(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                modoOscuro ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
              }`}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Plazo de
              </label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value, 10))}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                  modoOscuro ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                }`}
              />
            </div>
            <div className="flex-1">
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Unidad
              </label>
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value as UnidadPlazo)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                  modoOscuro ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                }`}
              >
                <option value="dias">días</option>
                <option value="meses">meses</option>
                <option value="anios">años</option>
              </select>
            </div>
          </div>

          {esDias && (
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Cómo contar los días (Art. 50)
              </label>
              <div className="flex gap-2">
                <BotonTipo
                  activo={tipo === 'corridos'}
                  onClick={() => setTipo('corridos')}
                  modoOscuro={modoOscuro}
                  titulo="Corridos"
                  detalle="Incluye feriados — la regla por defecto"
                />
                <BotonTipo
                  activo={tipo === 'habiles'}
                  onClick={() => setTipo('habiles')}
                  modoOscuro={modoOscuro}
                  titulo="Hábiles (útiles)"
                  detalle="Sin domingos ni feriados"
                />
              </div>
              {tipo === 'habiles' && (
                <label className={`mt-3 flex items-center gap-2 text-sm ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  <input
                    type="checkbox"
                    checked={excluirSabados}
                    onChange={(e) => setExcluirSabados(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: VERDE }}
                  />
                  También excluir sábados (trámites judiciales, Art. 66 CPC tras Ley 20.886)
                </label>
              )}
            </div>
          )}
        </div>

        {/* Resultado */}
        {resultado && (
          <div
            className="mt-6 rounded-2xl border-2 p-6 text-center"
            style={{
              borderColor: VERDE,
              background: modoOscuro
                ? 'color-mix(in srgb, var(--accent-base) 12%, transparent)'
                : 'color-mix(in srgb, var(--accent-base) 5%, transparent)',
            }}
          >
            <p className={`text-xs uppercase tracking-wide font-semibold mb-1.5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
              El plazo vence el
            </p>
            <p className="font-serif text-2xl font-bold" style={{ color: VERDE }}>
              {conMayusculaInicial(formatearFecha(resultado.fechaFin))}
            </p>
            <p className={`text-xs mt-2 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {unidad === 'dias'
                ? `Corre hasta la medianoche de ese día (Art. 49) — no se cuenta ${formatearFecha(fechaInicio)}, el día de inicio.`
                : 'Mismo número de día en el mes de destino (Art. 48); si ese mes no llega a tenerlo, el último día de ese mes.'}
            </p>

            {resultado.diasSaltados.length > 0 && (
              <details className="mt-4 text-left">
                <summary className={`text-xs font-medium cursor-pointer ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {resultado.diasSaltados.length} día{resultado.diasSaltados.length === 1 ? '' : 's'} no hábil
                  {resultado.diasSaltados.length === 1 ? '' : 'es'} que no se contaron
                </summary>
                <ul className={`mt-2 space-y-1 text-xs ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {resultado.diasSaltados.map((d, i) => (
                    <li key={i}>
                      {formatearFecha(d.fecha)} —{' '}
                      {d.motivo === 'domingo' ? 'domingo' : d.motivo === 'sabado' ? 'sábado' : d.nombreFeriado}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Aviso + citas */}
        <div
          className={`mt-6 rounded-xl px-4 py-3 border text-xs leading-relaxed ${
            modoOscuro ? 'bg-amber-950/30 text-amber-300 border-amber-900/60' : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <i className="ti ti-alert-triangle text-sm mt-0.5 flex-shrink-0" />
            <p>
              Calculadora orientativa, no reemplaza asesoría legal profesional. Un trámite judicial concreto puede
              tener su propia regla de cómputo (ej. Art. 66 CPC). El listado de feriados no refleja traslados a
              lunes por ley (San Pedro y San Pablo, Encuentro de Dos Mundos) ni feriados puntuales decretados para
              un año específico — verifica siempre contra el feriado oficial vigente.
            </p>
          </div>
        </div>

        <button
          onClick={() => setMostrarCitas((v) => !v)}
          className={`mt-4 flex items-center gap-1.5 text-xs font-medium ${modoOscuro ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'}`}
        >
          <i className={`ti ti-chevron-right text-xs transition-transform ${mostrarCitas ? 'rotate-90' : ''}`} />
          Ver el texto de los artículos citados
        </button>

        {mostrarCitas && (
          <div
            className={`mt-2 rounded-xl border p-4 space-y-3 text-xs leading-relaxed font-serif ${
              modoOscuro ? 'bg-zinc-800/40 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
            }`}
          >
            <p>
              <strong style={{ color: VERDE }}>Art. 48. </strong>
              Todos los plazos de días, meses o años de que se haga mención en las leyes o en los decretos del
              Presidente de la República, de los tribunales o juzgados, se entenderá que han de ser completos; y
              correrán además hasta la medianoche del último día del plazo. El primero y último día de un plazo de
              meses o años deberán tener un mismo número en los respectivos meses.
            </p>
            <p>
              <strong style={{ color: VERDE }}>Art. 49. </strong>
              Cuando se dice que un acto debe ejecutarse en o dentro de cierto plazo, se entenderá que vale si se
              ejecuta antes de la medianoche en que termina el último día del plazo.
            </p>
            <p>
              <strong style={{ color: VERDE }}>Art. 50. </strong>
              En los plazos que se señalaren en las leyes... se comprenderán aun los días feriados; a menos que el
              plazo señalado sea de días útiles, expresándose así, pues en tal caso no se contarán los feriados.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function BotonTipo({
  activo,
  onClick,
  modoOscuro,
  titulo,
  detalle,
}: {
  activo: boolean
  onClick: () => void
  modoOscuro: boolean
  titulo: string
  detalle: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
        activo
          ? 'text-white'
          : modoOscuro
          ? 'border-zinc-700 text-zinc-300 hover:border-zinc-600'
          : 'border-zinc-300 text-zinc-700 hover:border-zinc-400'
      }`}
      style={activo ? { background: VERDE, borderColor: VERDE } : undefined}
    >
      <p className="text-sm font-semibold">{titulo}</p>
      <p className={`text-[11px] ${activo ? 'opacity-90' : 'opacity-70'}`}>{detalle}</p>
    </button>
  )
}

import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useSituacion } from '../../hooks/useSituacion'
import { areasPorCodigo } from '../../data/situaciones'
import { CitaBlock } from '../ui/CitaBlock'
import { SelectorCodigo } from '../ui/SelectorCodigo'
import type { AreaSituacion, PreguntaSituacion, ResultadoSituacion } from '../../types'

const VERDE = '#0F6E56'

export function SituacionView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const perfil = useStore((s) => s.perfil)
  const flujo = useSituacion()

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <AnimatePresence mode="wait">
        {flujo.estado === 'codigo' && (
          <motion.div key="codigo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SelectorCodigo
              titulo="Situación concreta"
              descripcion="Elige el código sobre el cual quieres orientación"
              icono="ti-list-numbers"
              onElegir={(tipo) => flujo.elegirCodigo(tipo)}
            />
          </motion.div>
        )}

        {flujo.estado === 'eleccion' && flujo.codigoElegido && (
          <motion.div key="eleccion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PantallaEleccion
              codigoElegido={flujo.codigoElegido}
              onElegir={flujo.elegirArea}
              onCambiarCodigo={flujo.volverACodigo}
              modoOscuro={modoOscuro}
            />
          </motion.div>
        )}

        {flujo.estado === 'cuestionario' && flujo.area && flujo.preguntaActual && (
          <motion.div key="cuestionario" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PantallaCuestionario
              area={flujo.area}
              pregunta={flujo.preguntaActual}
              paso={flujo.paso}
              total={flujo.totalPasos}
              respuesta={flujo.respuestaActual}
              perfil={perfil}
              modoOscuro={modoOscuro}
              onResponder={flujo.responder}
              onSiguiente={flujo.paso < flujo.totalPasos - 1 ? flujo.siguiente : flujo.enviar}
              onAnterior={flujo.paso > 0 ? flujo.anterior : flujo.reset}
              esUltima={flujo.paso === flujo.totalPasos - 1}
              puedeAvanzar={flujo.puedeAvanzar()}
            />
          </motion.div>
        )}

        {flujo.estado === 'analizando' && (
          <motion.div key="analizando" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PantallaAnalizando modoOscuro={modoOscuro} />
          </motion.div>
        )}

        {flujo.estado === 'resultado' && flujo.resultado && flujo.area && (
          <motion.div key="resultado" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PantallaResultado
              resultado={flujo.resultado}
              area={flujo.area}
              modoOscuro={modoOscuro}
              onNueva={flujo.reset}
              onRefinar={flujo.volverACuestionario}
            />
          </motion.div>
        )}

        {flujo.estado === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PantallaError mensaje={flujo.error ?? ''} onReintentar={flujo.enviar} onCancelar={flujo.reset} modoOscuro={modoOscuro} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============= ELECCIÓN =============

function PantallaEleccion({
  codigoElegido,
  onElegir,
  onCambiarCodigo,
  modoOscuro,
}: {
  codigoElegido: string
  onElegir: (id: string) => void
  onCambiarCodigo: () => void
  modoOscuro: boolean
}) {
  const codigos = useStore((s) => s.codigos)
  const codigoMeta = codigos.find((c) => c.tipo === codigoElegido)
  const areas = areasPorCodigo(codigoElegido)

  if (areas.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-16 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: modoOscuro ? '#0F6E5625' : '#0F6E5610' }}
        >
          <i className="ti ti-clock-bolt text-3xl" style={{ color: VERDE }} />
        </div>
        <h1 className={`text-2xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          {codigoMeta?.nombre}: próximamente
        </h1>
        <p className={`text-sm mb-6 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Las situaciones guiadas para este código aún no están disponibles. Por ahora puedes usar el módulo{' '}
          <strong>Consultar</strong> para preguntas libres sobre este código.
        </p>
        <button
          onClick={onCambiarCodigo}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: VERDE }}
        >
          Elegir otro código
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="text-center mb-8">
        <button
          onClick={onCambiarCodigo}
          className={`inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition-colors ${
            modoOscuro ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <i className="ti ti-arrow-left text-sm" />
          {codigoMeta?.nombre ?? 'Código'} · cambiar
        </button>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: modoOscuro ? '#0F6E5625' : '#0F6E5610' }}
        >
          <i className="ti ti-list-numbers text-3xl" style={{ color: VERDE }} />
        </div>
        <h1 className={`text-3xl font-serif font-bold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          ¿Qué situación estás viviendo?
        </h1>
        <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Te haremos unas preguntas y te daremos un plan de acción concreto basado en la ley
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {areas.map((area, i) => (
          <motion.button
            key={area.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            onClick={() => onElegir(area.id)}
            className={`group text-left rounded-xl border-2 p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 ${
              modoOscuro
                ? 'bg-zinc-800/40 border-zinc-800 hover:border-emerald-700'
                : 'bg-white border-zinc-200 hover:border-emerald-500'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: modoOscuro ? '#0F6E5630' : '#0F6E5615' }}
              >
                <i className={`ti ${area.icono} text-xl`} style={{ color: VERDE }} />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-serif font-semibold leading-tight ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                  {area.titulo}
                </h3>
                <p className={`text-xs leading-relaxed mt-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {area.descripcion}
                </p>
                <p className={`text-[11px] mt-2 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {area.preguntas.length} pregunta{area.preguntas.length !== 1 ? 's' : ''}
                </p>
              </div>
              <i
                className={`ti ti-arrow-right text-base mt-1 transition-transform group-hover:translate-x-1 ${
                  modoOscuro ? 'text-zinc-500' : 'text-zinc-400'
                }`}
                style={{ color: VERDE }}
              />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ============= CUESTIONARIO =============

function PantallaCuestionario({
  area,
  pregunta,
  paso,
  total,
  respuesta,
  perfil,
  modoOscuro,
  onResponder,
  onSiguiente,
  onAnterior,
  esUltima,
  puedeAvanzar,
}: {
  area: AreaSituacion
  pregunta: PreguntaSituacion
  paso: number
  total: number
  respuesta: string
  perfil: string | null
  modoOscuro: boolean
  onResponder: (v: string) => void
  onSiguiente: () => void
  onAnterior: () => void
  esUltima: boolean
  puedeAvanzar: boolean
}) {
  const textoPregunta = perfil === 'profesional' ? pregunta.pregunta : pregunta.preguntaSimple
  const progreso = ((paso + 1) / total) * 100

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onAnterior}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              modoOscuro ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <i className="ti ti-arrow-left text-sm" />
            {paso === 0 ? 'Cambiar área' : 'Anterior'}
          </button>
          <span className={`text-xs font-mono ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {paso + 1} / {total}
          </span>
        </div>
        <div className={`h-1 rounded-full overflow-hidden ${modoOscuro ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progreso}%` }}
            transition={{ duration: 0.3 }}
            className="h-full rounded-full"
            style={{ background: VERDE }}
          />
        </div>
        <p className={`text-[11px] uppercase tracking-wider font-semibold mt-2 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
          {area.titulo}
        </p>
      </div>

      <motion.div key={pregunta.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        <h2 className={`text-2xl font-serif font-semibold mb-5 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          {textoPregunta}
          {!pregunta.obligatoria && (
            <span className={`block text-xs font-normal mt-1 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Opcional — puedes dejarla en blanco
            </span>
          )}
        </h2>

        <InputPregunta pregunta={pregunta} valor={respuesta} onCambio={onResponder} modoOscuro={modoOscuro} />
      </motion.div>

      <div className="flex justify-end mt-6">
        <button
          onClick={onSiguiente}
          disabled={!puedeAvanzar}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: VERDE }}
        >
          {esUltima ? (
            <>
              <i className="ti ti-sparkles text-base" />
              Analizar mi situación
            </>
          ) : (
            <>
              Siguiente
              <i className="ti ti-arrow-right text-base" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function InputPregunta({
  pregunta,
  valor,
  onCambio,
  modoOscuro,
}: {
  pregunta: PreguntaSituacion
  valor: string
  onCambio: (v: string) => void
  modoOscuro: boolean
}) {
  if (pregunta.tipo === 'opciones' && pregunta.opciones) {
    return (
      <div className="space-y-2">
        {pregunta.opciones.map((op) => {
          const seleccionado = valor === op
          return (
            <button
              key={op}
              onClick={() => onCambio(op)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                seleccionado
                  ? modoOscuro
                    ? 'bg-emerald-950/40 border-emerald-700'
                    : 'bg-emerald-50/80 border-emerald-500'
                  : modoOscuro
                  ? 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    seleccionado ? '' : modoOscuro ? 'border-zinc-600' : 'border-zinc-300'
                  }`}
                  style={seleccionado ? { borderColor: VERDE, background: VERDE } : undefined}
                >
                  {seleccionado && <i className="ti ti-check text-white text-xs font-bold" />}
                </span>
                <span className={`text-sm ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{op}</span>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  if (pregunta.tipo === 'numero') {
    return (
      <input
        type="number"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={pregunta.placeholder ?? '0'}
        min={0}
        className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-lg transition-colors ${
          modoOscuro
            ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-600 text-white placeholder:text-zinc-500'
            : 'bg-white border-zinc-200 focus:border-emerald-500 text-zinc-900 placeholder:text-zinc-400'
        }`}
      />
    )
  }

  if (pregunta.tipo === 'fecha') {
    return (
      <input
        type="date"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-base transition-colors ${
          modoOscuro
            ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-600 text-white'
            : 'bg-white border-zinc-200 focus:border-emerald-500 text-zinc-900'
        }`}
      />
    )
  }

  return (
    <textarea
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      placeholder={pregunta.placeholder ?? 'Escribe tu respuesta...'}
      rows={4}
      className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-base leading-relaxed resize-none transition-colors ${
        modoOscuro
          ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-600 text-white placeholder:text-zinc-500'
          : 'bg-white border-zinc-200 focus:border-emerald-500 text-zinc-900 placeholder:text-zinc-400'
      }`}
    />
  )
}

// ============= ANALIZANDO =============

function PantallaAnalizando({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: modoOscuro ? '#0F6E5625' : '#0F6E5610' }}
        >
          <i className="ti ti-sparkles text-3xl" style={{ color: VERDE }} />
        </motion.div>
        <h2 className={`text-xl font-serif font-semibold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          Analizando tu situación
        </h2>
        <p className={`text-sm ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Buscando los artículos aplicables y armando tu plan de acción...
        </p>
      </div>
    </div>
  )
}

// ============= RESULTADO =============

function PantallaResultado({
  resultado,
  area,
  modoOscuro,
  onNueva,
  onRefinar,
}: {
  resultado: ResultadoSituacion
  area: AreaSituacion
  modoOscuro: boolean
  onNueva: () => void
  onRefinar: () => void
}) {
  const exportar = () => {
    const texto = construirTextoExportable(resultado, area)
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prima-lex-${area.id}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span
            className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: modoOscuro ? '#0F6E5630' : '#0F6E5615' }}
          >
            <i className={`ti ${area.icono} text-xl`} style={{ color: VERDE }} />
          </span>
          <div>
            <p className={`text-[10px] uppercase tracking-wider font-semibold ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Análisis de situación
            </p>
            <h1 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{area.titulo}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportar}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              modoOscuro ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <i className="ti ti-download text-sm" />
            Exportar
          </button>
          <button
            onClick={onRefinar}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              modoOscuro ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <i className="ti ti-pencil text-sm" />
            Refinar
          </button>
          <button
            onClick={onNueva}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: VERDE }}
          >
            <i className="ti ti-plus text-sm" />
            Nueva consulta
          </button>
        </div>
      </div>

      {/* Diagnóstico */}
      <Section titulo="Diagnóstico" icono="ti-stethoscope" modoOscuro={modoOscuro}>
        <p className={`text-[15px] leading-relaxed ${modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>
          {resultado.diagnostico}
        </p>
      </Section>

      {/* Plazos críticos */}
      {resultado.plazosCriticos.length > 0 && (
        <Section titulo="Plazos críticos" icono="ti-clock-exclamation" modoOscuro={modoOscuro} urgente>
          <ul className="space-y-2">
            {resultado.plazosCriticos.map((p, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 text-sm ${
                  modoOscuro ? 'text-amber-200' : 'text-amber-900'
                }`}
              >
                <i className="ti ti-alert-triangle text-base mt-0.5 flex-shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Pasos de acción */}
      {resultado.pasos.length > 0 && (
        <Section titulo="Qué puedes hacer" icono="ti-list-check" modoOscuro={modoOscuro}>
          <ol className="space-y-3">
            {resultado.pasos.map((paso, i) => (
              <li
                key={i}
                className={`flex gap-3 p-3 rounded-lg ${
                  modoOscuro ? 'bg-zinc-800/40' : 'bg-zinc-50'
                }`}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: VERDE }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                    {paso.titulo}
                  </p>
                  <p className={`text-[13px] leading-relaxed mt-0.5 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {paso.detalle}
                  </p>
                  {paso.plazo && (
                    <span
                      className={`inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded ${
                        paso.urgente
                          ? modoOscuro
                            ? 'bg-amber-900/40 text-amber-300'
                            : 'bg-amber-100 text-amber-800'
                          : modoOscuro
                          ? 'bg-zinc-700 text-zinc-300'
                          : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      <i className="ti ti-clock text-[11px] mr-1" />
                      {paso.plazo}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Marco legal */}
      {resultado.marcoLegal.length > 0 && (
        <Section titulo="Marco legal aplicable" icono="ti-scale" modoOscuro={modoOscuro}>
          <div className="space-y-2">
            {resultado.marcoLegal.map((c, i) => (
              <CitaBlock key={i} cita={c} />
            ))}
          </div>
        </Section>
      )}

      {/* Dónde acudir */}
      {resultado.dondeAcudir.length > 0 && (
        <Section titulo="Dónde acudir" icono="ti-building" modoOscuro={modoOscuro}>
          <ul className="space-y-1.5">
            {resultado.dondeAcudir.map((d, i) => (
              <li key={i} className={`flex items-start gap-2 text-sm ${modoOscuro ? 'text-zinc-200' : 'text-zinc-800'}`}>
                <i className="ti ti-map-pin text-sm mt-1" style={{ color: VERDE }} />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className={`text-[11px] text-center pt-4 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
        Este análisis es orientativo. Para decisiones importantes, consulta con un profesional del derecho.
      </p>
    </div>
  )
}

function Section({
  titulo,
  icono,
  modoOscuro,
  urgente,
  children,
}: {
  titulo: string
  icono: string
  modoOscuro: boolean
  urgente?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={`rounded-2xl p-5 border ${
        urgente
          ? modoOscuro
            ? 'bg-amber-950/20 border-amber-900/50'
            : 'bg-amber-50/60 border-amber-200'
          : modoOscuro
          ? 'bg-zinc-900 border-zinc-800'
          : 'bg-white border-zinc-200'
      }`}
    >
      <h3 className={`flex items-center gap-2 text-sm font-semibold mb-3 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
        <i
          className={`ti ${icono} text-base`}
          style={{ color: urgente ? (modoOscuro ? '#fcd34d' : '#92400e') : VERDE }}
        />
        {titulo}
      </h3>
      {children}
    </section>
  )
}

// ============= ERROR =============

function PantallaError({
  mensaje,
  onReintentar,
  onCancelar,
  modoOscuro,
}: {
  mensaje: string
  onReintentar: () => void
  onCancelar: () => void
  modoOscuro: boolean
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-8">
      <div className="max-w-md text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: modoOscuro ? '#7f1d1d40' : '#fee2e2' }}
        >
          <i className="ti ti-alert-circle text-3xl" style={{ color: modoOscuro ? '#fca5a5' : '#dc2626' }} />
        </div>
        <h2 className={`text-xl font-serif font-semibold mb-2 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
          Algo salió mal
        </h2>
        <p className={`text-sm mb-5 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>{mensaje}</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={onCancelar}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              modoOscuro ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={onReintentar}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: VERDE }}
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}

// ============= EXPORT =============

function construirTextoExportable(r: ResultadoSituacion, area: AreaSituacion): string {
  const lines: string[] = []
  lines.push(`PRIMA LEX — Análisis de situación`)
  lines.push(`Área: ${area.titulo}`)
  lines.push(`Generado: ${new Date().toLocaleString('es-CL')}`)
  lines.push('')
  lines.push('═══════════════════════════════════════')
  lines.push('DIAGNÓSTICO')
  lines.push('═══════════════════════════════════════')
  lines.push(r.diagnostico)
  if (r.plazosCriticos.length > 0) {
    lines.push('')
    lines.push('═══════════════════════════════════════')
    lines.push('PLAZOS CRÍTICOS')
    lines.push('═══════════════════════════════════════')
    for (const p of r.plazosCriticos) lines.push('⚠ ' + p)
  }
  if (r.pasos.length > 0) {
    lines.push('')
    lines.push('═══════════════════════════════════════')
    lines.push('QUÉ PUEDES HACER')
    lines.push('═══════════════════════════════════════')
    r.pasos.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.titulo}`)
      lines.push(`   ${p.detalle}`)
      if (p.plazo) lines.push(`   Plazo: ${p.plazo}`)
      lines.push('')
    })
  }
  if (r.marcoLegal.length > 0) {
    lines.push('═══════════════════════════════════════')
    lines.push('MARCO LEGAL')
    lines.push('═══════════════════════════════════════')
    for (const c of r.marcoLegal) {
      lines.push(`${c.articulo}: ${c.relevancia}`)
    }
  }
  if (r.dondeAcudir.length > 0) {
    lines.push('')
    lines.push('═══════════════════════════════════════')
    lines.push('DÓNDE ACUDIR')
    lines.push('═══════════════════════════════════════')
    for (const d of r.dondeAcudir) lines.push('• ' + d)
  }
  lines.push('')
  lines.push('───')
  lines.push('Este análisis es orientativo. Para decisiones importantes, consulta con un profesional del derecho.')
  return lines.join('\n')
}

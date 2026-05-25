import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore } from '../../store/useStore'
import { useChat } from '../../hooks/useChat'
import { CitaBlock } from '../ui/CitaBlock'
import type { Mensaje } from '../../types'

const VERDE = '#0F6E56'

const sugerenciasCiudadano = [
  '¿Cuántos días de vacaciones me corresponden?',
  '¿Cuál es la jornada máxima de trabajo?',
  '¿Cómo se calcula el finiquito?',
  '¿Qué derechos tengo durante el post-natal?',
]

const sugerenciasProfesional = [
  'Causales del artículo 161 y procedimiento',
  'Fuero maternal: extensión y excepciones',
  'Contrato a plazo fijo vs. por obra o faena',
  'Indemnización por años de servicio: tope y cálculo',
]

export function ConsultarView() {
  const perfil = useStore((s) => s.perfil)
  const codigos = useStore((s) => s.codigos)
  const modoOscuro = useStore((s) => s.modoOscuro)
  const { mensajes, cargando, enviar, limpiar } = useChat()
  const [pregunta, setPregunta] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const sugerencias = perfil === 'profesional' ? sugerenciasProfesional : sugerenciasCiudadano
  const codigosActivos = codigos.filter((c) => c.activo && c.cargado).length

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [mensajes, cargando])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = pregunta.trim()
    if (!q || cargando) return
    setPregunta('')
    await enviar(q)
  }

  const enviarSugerencia = (s: string) => {
    setPregunta(s)
    if (!cargando) enviar(s)
  }

  const vacio = mensajes.length === 0

  return (
    <div className={`h-full flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      {!vacio && (
        <div
          className={`flex items-center justify-between px-6 py-3 border-b ${
            modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          <div className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {mensajes.filter((m) => m.rol === 'user').length} consulta
            {mensajes.filter((m) => m.rol === 'user').length !== 1 ? 's' : ''} ·{' '}
            {codigosActivos} norma{codigosActivos !== 1 ? 's' : ''} activa
            {codigosActivos !== 1 ? 's' : ''}
          </div>
          <button
            onClick={limpiar}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              modoOscuro
                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <i className="ti ti-refresh text-sm" />
            Nueva conversación
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {vacio ? (
          <Bienvenida
            sugerencias={sugerencias}
            onSugerencia={enviarSugerencia}
            perfil={perfil}
            codigosActivos={codigosActivos}
            modoOscuro={modoOscuro}
          />
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {mensajes.map((m) => (
              <MensajeBubble key={m.id} mensaje={m} modoOscuro={modoOscuro} />
            ))}
            {cargando && <PensandoBubble modoOscuro={modoOscuro} />}
          </div>
        )}
      </div>

      <div
        className={`px-6 py-4 border-t ${
          modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <ToggleModo modoOscuro={modoOscuro} />
            <span className={`text-[10px] ${modoOscuro ? 'text-zinc-600' : 'text-zinc-400'}`}>
              {codigosActivos} norma{codigosActivos !== 1 ? 's' : ''} activa{codigosActivos !== 1 ? 's' : ''}
            </span>
          </div>
          <div
            className={`flex items-end gap-2 p-2 rounded-2xl border-2 transition-colors ${
              modoOscuro
                ? 'bg-zinc-900 border-zinc-800 focus-within:border-zinc-700'
                : 'bg-white border-zinc-200 focus-within:border-emerald-600'
            }`}
          >
            <textarea
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder={cargando ? 'Pensando…' : 'Escribe tu consulta...'}
              rows={1}
              disabled={cargando}
              className={`flex-1 bg-transparent resize-none outline-none px-3 py-2.5 text-base ${
                modoOscuro
                  ? 'text-white placeholder:text-zinc-600'
                  : 'text-zinc-900 placeholder:text-zinc-400'
              } disabled:opacity-50`}
              style={{ minHeight: '44px', maxHeight: '180px' }}
            />
            <button
              type="submit"
              disabled={!pregunta.trim() || cargando}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: VERDE }}
            >
              {cargando ? (
                <i className="ti ti-loader-2 text-xl animate-spin" />
              ) : (
                <i className="ti ti-arrow-up text-xl" />
              )}
            </button>
          </div>
          {!cargando && (
            <div
              className={`text-[10px] mt-2 text-center space-x-2 ${
                modoOscuro ? 'text-zinc-600' : 'text-zinc-400'
              }`}
            >
              <span>Prima Lex es orientación jurídica, no reemplaza el asesoramiento profesional ·</span>
              <EnlaceLegal pestana="privacidad" modoOscuro={modoOscuro}>Privacidad</EnlaceLegal>
              <span>·</span>
              <EnlaceLegal pestana="terminos" modoOscuro={modoOscuro}>Términos</EnlaceLegal>
              <span>·</span>
              <EnlaceLegal pestana="disclaimer" modoOscuro={modoOscuro}>Aviso legal</EnlaceLegal>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

function Bienvenida({
  sugerencias,
  onSugerencia,
  perfil,
  codigosActivos,
  modoOscuro,
}: {
  sugerencias: string[]
  onSugerencia: (s: string) => void
  perfil: string | null
  codigosActivos: number
  modoOscuro: boolean
}) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl text-center"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: modoOscuro ? '#0F6E5625' : '#0F6E5610' }}
        >
          <i className="ti ti-scale text-2xl" style={{ color: VERDE }} />
        </div>
        <h1
          className={`text-3xl font-serif font-bold mb-2 ${
            modoOscuro ? 'text-white' : 'text-zinc-900'
          }`}
        >
          ¿En qué puedo ayudarte?
        </h1>
        <p className={`text-sm mb-8 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Pregunta en lenguaje natural sobre cualquier código legal indexado
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {sugerencias.map((s, i) => (
            <button
              key={i}
              onClick={() => onSugerencia(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-all border ${
                modoOscuro
                  ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                  : 'bg-white border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-zinc-600'
              }`}
            >
              <i className="ti ti-sparkles text-[11px] mr-1.5 opacity-60" />
              {s}
            </button>
          ))}
        </div>

        <div
          className={`flex items-center justify-center gap-6 pt-6 border-t text-xs ${
            modoOscuro ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-500'
          }`}
        >
          <span>
            <span className="font-semibold" style={{ color: VERDE }}>
              {codigosActivos}
            </span>{' '}
            norma{codigosActivos !== 1 ? 's' : ''} activa{codigosActivos !== 1 ? 's' : ''}
          </span>
          <span>·</span>
          <span>
            Perfil:{' '}
            <span className={`font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {perfil === 'profesional' ? 'Profesional' : 'Ciudadano'}
            </span>
          </span>
        </div>
      </motion.div>
    </div>
  )
}

function EnlaceLegal({
  pestana,
  modoOscuro,
  children,
}: {
  pestana: 'acerca' | 'disclaimer' | 'privacidad' | 'terminos'
  modoOscuro: boolean
  children: React.ReactNode
}) {
  const abrirAcerca = useStore((s) => s.abrirAcerca)
  return (
    <button
      type="button"
      onClick={() => abrirAcerca(pestana)}
      className={`underline-offset-2 hover:underline ${
        modoOscuro ? 'hover:text-zinc-300' : 'hover:text-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}

function ToggleModo({ modoOscuro }: { modoOscuro: boolean }) {
  const perfil = useStore((s) => s.perfil)
  const setPerfil = useStore((s) => s.setPerfil)
  const opciones: Array<{ valor: 'ciudadano' | 'profesional'; icono: string; label: string; tip: string }> = [
    {
      valor: 'ciudadano',
      icono: 'ti-user',
      label: 'Ciudadano',
      tip: 'Lenguaje simple, con ejemplos y sin tecnicismos',
    },
    {
      valor: 'profesional',
      icono: 'ti-briefcase',
      label: 'Profesional',
      tip: 'Terminología técnica, citas de incisos, sin glosar conceptos',
    },
  ]
  return (
    <div
      className={`inline-flex items-center rounded-full p-0.5 border ${
        modoOscuro ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
      }`}
    >
      {opciones.map((o) => {
        const activo = perfil === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => setPerfil(o.valor)}
            title={o.tip}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              activo
                ? 'text-white shadow-sm'
                : modoOscuro
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            style={activo ? { background: VERDE } : undefined}
          >
            <i className={`ti ${o.icono} text-xs`} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function MensajeBubble({ mensaje, modoOscuro }: { mensaje: Mensaje; modoOscuro: boolean }) {
  if (mensaje.rol === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div
          className="max-w-[80%] px-5 py-3 rounded-3xl rounded-tr-lg text-white text-[15px] leading-relaxed shadow-sm"
          style={{ background: VERDE }}
        >
          {mensaje.contenido}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: VERDE }}
        >
          <i className="ti ti-scale text-base text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <RespuestaIA
            texto={mensaje.contenido}
            modoOscuro={modoOscuro}
            noVerificadas={mensaje.citasNoVerificadas ?? []}
          />
        </div>
      </div>
      {mensaje.citas && mensaje.citas.length > 0 && (
        <div className="ml-11 space-y-2">
          <div className="flex items-center gap-2 mt-1 mb-1">
            <div className="h-px flex-1" style={{ background: modoOscuro ? '#27272a' : '#e4e4e7' }} />
            <div className="flex items-center gap-1.5">
              <i className="ti ti-book-2 text-xs" style={{ color: VERDE }} />
              <span
                className={`text-xs font-semibold ${
                  modoOscuro ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                {mensaje.citas.length} artículo{mensaje.citas.length !== 1 ? 's' : ''} citado{mensaje.citas.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="h-px flex-1" style={{ background: modoOscuro ? '#27272a' : '#e4e4e7' }} />
          </div>
          {mensaje.citas.map((c, i) => (
            <CitaBlock key={i} cita={c} />
          ))}
        </div>
      )}
      {!mensaje.contenido.startsWith('⚠️') && (
        <div className="ml-11">
          <Feedback mensaje={mensaje} modoOscuro={modoOscuro} />
        </div>
      )}
    </motion.div>
  )
}

function Feedback({ mensaje, modoOscuro }: { mensaje: Mensaje; modoOscuro: boolean }) {
  const consultaActivaId = useStore((s) => s.consultaActivaId)
  const valorar = useStore((s) => s.valorarMensaje)
  const [escribiendo, setEscribiendo] = useState(false)
  const [comentario, setComentario] = useState(mensaje.comentarioValoracion ?? '')

  if (!consultaActivaId) return null

  const valoracion = mensaje.valoracion
  const claseBtn = (activo: boolean, color: 'verde' | 'rojo') => {
    if (activo) {
      return color === 'verde'
        ? modoOscuro
          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
        : modoOscuro
        ? 'bg-rose-950/60 text-rose-300 border-rose-700'
        : 'bg-rose-50 text-rose-800 border-rose-300'
    }
    return modoOscuro
      ? 'text-zinc-500 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
      : 'text-zinc-500 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-700'
  }

  function manejarUtil() {
    if (valoracion === 'util') {
      valorar(consultaActivaId!, mensaje.id, null)
    } else {
      valorar(consultaActivaId!, mensaje.id, 'util')
      setEscribiendo(false)
    }
  }

  function manejarNoUtil() {
    if (valoracion === 'no_util') {
      valorar(consultaActivaId!, mensaje.id, null)
      setEscribiendo(false)
    } else {
      valorar(consultaActivaId!, mensaje.id, 'no_util')
      setEscribiendo(true)
    }
  }

  function guardarComentario() {
    valorar(consultaActivaId!, mensaje.id, 'no_util', comentario.trim() || undefined)
    setEscribiendo(false)
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className={`text-[11px] ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>
          ¿Te fue útil esta respuesta?
        </span>
        <button
          onClick={manejarUtil}
          title="Sí, me fue útil"
          className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${claseBtn(valoracion === 'util', 'verde')}`}
        >
          <i className="ti ti-thumb-up text-sm" />
        </button>
        <button
          onClick={manejarNoUtil}
          title="No, fue mejorable"
          className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${claseBtn(valoracion === 'no_util', 'rojo')}`}
        >
          <i className="ti ti-thumb-down text-sm" />
        </button>
        {valoracion === 'no_util' && !escribiendo && (
          <button
            onClick={() => setEscribiendo(true)}
            className={`text-[11px] underline ${modoOscuro ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            {mensaje.comentarioValoracion ? 'Editar comentario' : 'Agregar comentario'}
          </button>
        )}
      </div>

      {escribiendo && valoracion === 'no_util' && (
        <div className="space-y-2">
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="¿Qué faltó, qué estuvo incorrecto o qué se podría mejorar? (opcional)"
            rows={2}
            className={`w-full text-sm rounded-md px-3 py-2 border outline-none resize-none ${
              modoOscuro
                ? 'bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500'
                : 'bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-500'
            }`}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={guardarComentario}
              className="text-xs font-medium px-3 py-1.5 rounded-md text-white"
              style={{ background: VERDE }}
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setEscribiendo(false)
                setComentario(mensaje.comentarioValoracion ?? '')
              }}
              className={`text-xs px-3 py-1.5 rounded-md ${
                modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {valoracion === 'no_util' && !escribiendo && mensaje.comentarioValoracion && (
        <p
          className={`text-xs italic px-3 py-1.5 rounded-md ${
            modoOscuro ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'bg-zinc-50 text-zinc-600 border border-zinc-200'
          }`}
        >
          “{mensaje.comentarioValoracion}”
        </p>
      )}
    </div>
  )
}

const RE_ART_INLINE = /(Art\.?\s*\d+(?:\s*-?\s*[A-ZÑ]{1,2})?(?:\s+(?:bis|ter|qu[áa]ter|quinquies)){0,2})/gi

function normalizarArt(s: string): string {
  return s.replace(/^Art\.?\s*/i, 'Art. ').replace(/\s+/g, ' ').trim()
}

function resaltarArts(
  texto: string,
  modoOscuro: boolean,
  noVerificadas: Set<string>
): React.ReactNode[] {
  const parts = texto.split(RE_ART_INLINE)
  return parts.map((p, i) => {
    if (!/^Art\.?\s*\d/i.test(p)) return <span key={i}>{p}</span>
    const noVerif = noVerificadas.has(normalizarArt(p))
    if (noVerif) {
      return (
        <span
          key={i}
          title="Cita no verificada: este artículo no fue parte del contexto proporcionado a la IA. Verifícalo manualmente."
          className={`font-semibold rounded px-1 inline-flex items-center gap-0.5 ${
            modoOscuro
              ? 'bg-amber-950/60 text-amber-300 ring-1 ring-amber-700/60'
              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-300'
          }`}
        >
          {p}
          <i className="ti ti-alert-triangle text-[11px]" />
        </span>
      )
    }
    return (
      <span
        key={i}
        className={`font-semibold rounded px-1 ${
          modoOscuro ? 'bg-emerald-950/60 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
        }`}
      >
        {p}
      </span>
    )
  })
}

function RespuestaIA({
  texto,
  modoOscuro,
  noVerificadas,
}: {
  texto: string
  modoOscuro: boolean
  noVerificadas: string[]
}) {
  const setNoVerif = React.useMemo(() => new Set(noVerificadas.map(normalizarArt)), [noVerificadas])
  return (
    <div
      className={`text-[15px] leading-relaxed prima-markdown ${
        modoOscuro ? 'text-zinc-200' : 'text-zinc-800'
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{procesarHijos(children, modoOscuro, setNoVerif)}</p>,
          strong: ({ children }) => (
            <strong className={modoOscuro ? 'text-white font-semibold' : 'text-zinc-900 font-semibold'}>
              {children}
            </strong>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2.5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2.5 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{procesarHijos(children, modoOscuro, setNoVerif)}</li>,
          h1: ({ children }) => <h3 className={`text-base font-semibold mt-3 mb-1.5 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{children}</h3>,
          h2: ({ children }) => <h3 className={`text-base font-semibold mt-3 mb-1.5 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{children}</h3>,
          h3: ({ children }) => <h3 className={`text-sm font-semibold mt-3 mb-1.5 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>{children}</h3>,
          hr: () => null,
          code: ({ children }) => (
            <code className={`px-1 py-0.5 rounded text-[13px] font-mono ${modoOscuro ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'}`}>
              {children}
            </code>
          ),
        }}
      >
        {texto}
      </ReactMarkdown>
      {noVerificadas.length > 0 && (
        <div
          className={`mt-3 flex items-start gap-2 text-xs rounded-md px-3 py-2 ${
            modoOscuro
              ? 'bg-amber-950/40 text-amber-300 border border-amber-900/60'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <i className="ti ti-alert-triangle text-sm mt-0.5 flex-shrink-0" />
          <span>
            La respuesta menciona {noVerificadas.length === 1 ? 'un artículo' : `${noVerificadas.length} artículos`} que no
            forma{noVerificadas.length === 1 ? '' : 'n'} parte del contexto entregado a la IA
            ({noVerificadas.join(', ')}). Verifica manualmente en el Explorador antes de usar esa información.
          </span>
        </div>
      )}
    </div>
  )
}

function procesarHijos(
  children: React.ReactNode,
  modoOscuro: boolean,
  noVerificadas: Set<string>
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') return resaltarArts(child, modoOscuro, noVerificadas)
    return child
  })
}

function PensandoBubble({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-start gap-3"
      >
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: VERDE }}
        >
          <i className="ti ti-scale text-base text-white" />
        </div>
        <div className="flex items-center gap-1.5 pt-2">
          <Dot delay={0} modoOscuro={modoOscuro} />
          <Dot delay={0.15} modoOscuro={modoOscuro} />
          <Dot delay={0.3} modoOscuro={modoOscuro} />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function Dot({ delay, modoOscuro }: { delay: number; modoOscuro: boolean }) {
  return (
    <motion.span
      className={`w-1.5 h-1.5 rounded-full ${modoOscuro ? 'bg-zinc-500' : 'bg-zinc-400'}`}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, delay }}
    />
  )
}

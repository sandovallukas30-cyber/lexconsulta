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
            {codigosActivos} código{codigosActivos !== 1 ? 's' : ''} activo
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
            <p
              className={`text-[10px] mt-2 text-center ${
                modoOscuro ? 'text-zinc-600' : 'text-zinc-400'
              }`}
            >
              Prima Lex es orientación jurídica, no reemplaza el asesoramiento profesional
            </p>
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
            código{codigosActivos !== 1 ? 's' : ''} activo{codigosActivos !== 1 ? 's' : ''}
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
          <RespuestaIA texto={mensaje.contenido} modoOscuro={modoOscuro} />
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
    </motion.div>
  )
}

const RE_ART_INLINE = /(Art\.?\s*\d+(?:\s*-?\s*[A-ZÑ]{1,2})?(?:\s+(?:bis|ter|qu[áa]ter|quinquies)){0,2})/gi

function resaltarArts(texto: string, modoOscuro: boolean): React.ReactNode[] {
  const parts = texto.split(RE_ART_INLINE)
  return parts.map((p, i) =>
    /^Art\.?\s*\d/i.test(p) ? (
      <span
        key={i}
        className={`font-semibold rounded px-1 ${
          modoOscuro ? 'bg-emerald-950/60 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
        }`}
      >
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}

function RespuestaIA({ texto, modoOscuro }: { texto: string; modoOscuro: boolean }) {
  return (
    <div
      className={`text-[15px] leading-relaxed prima-markdown ${
        modoOscuro ? 'text-zinc-200' : 'text-zinc-800'
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{procesarHijos(children, modoOscuro)}</p>,
          strong: ({ children }) => (
            <strong className={modoOscuro ? 'text-white font-semibold' : 'text-zinc-900 font-semibold'}>
              {children}
            </strong>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2.5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2.5 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{procesarHijos(children, modoOscuro)}</li>,
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
    </div>
  )
}

function procesarHijos(children: React.ReactNode, modoOscuro: boolean): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') return resaltarArts(child, modoOscuro)
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

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'

const VERDE = '#0F6E56'

type Pestana = 'acerca' | 'disclaimer' | 'privacidad' | 'terminos'

interface Props {
  abierto: boolean
  onCerrar: () => void
}

export function ModalAcercaDe({ abierto, onCerrar }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [pestana, setPestana] = useState<Pestana>('acerca')

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={onCerrar}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`max-w-2xl w-full max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
              modoOscuro ? 'bg-zinc-900' : 'bg-white'
            }`}
          >
            <div
              className={`px-6 py-4 border-b flex items-center justify-between ${
                modoOscuro ? 'border-zinc-800' : 'border-zinc-200'
              }`}
            >
              <h2 className={`text-xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                Prima<span style={{ color: VERDE }}> Lex</span>
              </h2>
              <button
                onClick={onCerrar}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className={`flex items-center gap-1 px-4 border-b ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <Tab id="acerca" actual={pestana} onClick={setPestana} modoOscuro={modoOscuro}>
                Acerca de
              </Tab>
              <Tab id="disclaimer" actual={pestana} onClick={setPestana} modoOscuro={modoOscuro}>
                Aviso legal
              </Tab>
              <Tab id="privacidad" actual={pestana} onClick={setPestana} modoOscuro={modoOscuro}>
                Privacidad
              </Tab>
              <Tab id="terminos" actual={pestana} onClick={setPestana} modoOscuro={modoOscuro}>
                Términos
              </Tab>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {pestana === 'acerca' && <Acerca modoOscuro={modoOscuro} />}
              {pestana === 'disclaimer' && <Disclaimer modoOscuro={modoOscuro} />}
              {pestana === 'privacidad' && <Privacidad modoOscuro={modoOscuro} />}
              {pestana === 'terminos' && <Terminos modoOscuro={modoOscuro} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Tab({
  id,
  actual,
  onClick,
  children,
  modoOscuro,
}: {
  id: Pestana
  actual: Pestana
  onClick: (p: Pestana) => void
  children: React.ReactNode
  modoOscuro: boolean
}) {
  const activo = id === actual
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
        activo
          ? modoOscuro
            ? 'text-white'
            : 'text-zinc-900'
          : modoOscuro
          ? 'text-zinc-500 hover:text-zinc-300 border-transparent'
          : 'text-zinc-500 hover:text-zinc-900 border-transparent'
      }`}
      style={activo ? { borderColor: VERDE } : undefined}
    >
      {children}
    </button>
  )
}

function H({ children, modoOscuro }: { children: React.ReactNode; modoOscuro: boolean }) {
  return (
    <h3 className={`text-base font-semibold mt-5 mb-2 first:mt-0 ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
      {children}
    </h3>
  )
}

function P({ children, modoOscuro }: { children: React.ReactNode; modoOscuro: boolean }) {
  return (
    <p className={`text-sm leading-relaxed mb-3 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>{children}</p>
  )
}

function Acerca({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <div>
      <H modoOscuro={modoOscuro}>Objetivo</H>
      <P modoOscuro={modoOscuro}>
        Acercar el derecho chileno a estudiantes, profesionales y ciudadanos mediante una plataforma que combina los
        textos legales oficiales con un asistente de inteligencia artificial que explica, conecta y aplica las normas
        en lenguaje claro.
      </P>

      <H modoOscuro={modoOscuro}>Funciones disponibles</H>
      <ul className={`text-sm space-y-2 mb-4 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
        <Feat icono="ti-messages" titulo="Consultar">
          Chat con IA sobre cualquier tema legal. Respuestas con citas exactas de artículos expandibles.
        </Feat>
        <Feat icono="ti-list-numbers" titulo="Situación concreta">
          Cuestionario guiado por área (despido, acoso, vacaciones, etc.) que entrega diagnóstico, plazos críticos,
          pasos de acción y marco legal aplicable.
        </Feat>
        <Feat icono="ti-affiliate" titulo="Canvas jurídico">
          Genera automáticamente un mapa conceptual sobre un tema: definición, artículos relevantes y caso didáctico.
          Editable y conectable.
        </Feat>
        <Feat icono="ti-book-2" titulo="Explorador">
          Navega los códigos artículo por artículo con búsqueda rápida (Ctrl+K), índice jerárquico y modernización
          opcional del lenguaje antiguo.
        </Feat>
        <Feat icono="ti-network" titulo="Mapa de relaciones">
          Visualiza cómo los artículos se conectan: qué artículo menciona a cuál y de qué sección forma parte.
        </Feat>
        <Feat icono="ti-history" titulo="Historial">
          Todas tus consultas quedan guardadas localmente y son retomables.
        </Feat>
      </ul>

      <H modoOscuro={modoOscuro}>Normas indexadas (14)</H>
      <P modoOscuro={modoOscuro}>
        <strong>Códigos:</strong> Constitución · Civil · Penal · Trabajo · Tributario · Comercio · Procedimiento Civil ·
        Procesal Penal · Orgánico de Tribunales · Minería · Aguas.
        <br />
        <strong>Leyes especiales:</strong> Ley 19.880 (Procedimiento Administrativo) · Ley 16.744 (Accidentes del Trabajo) ·
        Ley 20.000 (Drogas).
        <br />
        <strong>+9.000 artículos</strong> oficiales de la Biblioteca del Congreso Nacional de Chile (leychile.cl).
      </P>

      <H modoOscuro={modoOscuro}>Próximamente</H>
      <P modoOscuro={modoOscuro}>
        Módulo de Comparación de normas · Panel de administración de jurisprudencia · Tratados internacionales ·
        Código Sanitario y de Justicia Militar · Otras leyes especiales prioritarias.
      </P>

      <H modoOscuro={modoOscuro}>Versión</H>
      <P modoOscuro={modoOscuro}>0.1.0 — Prototipo público</P>
    </div>
  )
}

function Feat({ icono, titulo, children }: { icono: string; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <i className={`ti ${icono} text-base mt-0.5 flex-shrink-0`} style={{ color: VERDE }} />
      <span>
        <strong>{titulo}:</strong> {children}
      </span>
    </li>
  )
}

function Disclaimer({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <div>
      <div
        className={`p-4 rounded-lg mb-5 border ${
          modoOscuro ? 'bg-amber-950/30 border-amber-900/60 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <p className="text-sm font-semibold flex items-start gap-2">
          <i className="ti ti-alert-triangle text-base mt-0.5" />
          <span>
            Prima Lex es una herramienta de orientación educativa, <strong>no constituye asesoría legal</strong> y no
            reemplaza la consulta con un profesional del derecho.
          </span>
        </p>
      </div>

      <H modoOscuro={modoOscuro}>Limitaciones</H>
      <P modoOscuro={modoOscuro}>
        Las respuestas generadas por inteligencia artificial pueden contener errores, omisiones o interpretaciones
        imprecisas. La IA es un asistente didáctico, no un abogado.
      </P>

      <H modoOscuro={modoOscuro}>Decisiones jurídicas</H>
      <P modoOscuro={modoOscuro}>
        Para decisiones jurídicas vinculantes —demandas, contratos, denuncias, defensas— <strong>siempre debes
        consultar con un abogado titulado</strong>. Esta plataforma no establece relación abogado–cliente con sus
        usuarios.
      </P>

      <H modoOscuro={modoOscuro}>Vigencia normativa</H>
      <P modoOscuro={modoOscuro}>
        Los códigos indexados corresponden a versiones publicadas por la BCN, pero las normas chilenas se modifican
        constantemente. Antes de basar una acción en un artículo, verifica que esté vigente consultando
        <a
          href="https://www.bcn.cl/leychile"
          target="_blank"
          rel="noopener noreferrer"
          className="underline ml-1"
          style={{ color: VERDE }}
        >
          leychile.cl
        </a>
        .
      </P>

      <H modoOscuro={modoOscuro}>Sin responsabilidad</H>
      <P modoOscuro={modoOscuro}>
        Los autores de Prima Lex no se hacen responsables por decisiones tomadas en base a la información generada por
        la plataforma. El uso es bajo tu propia responsabilidad.
      </P>
    </div>
  )
}

function Privacidad({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <div>
      <H modoOscuro={modoOscuro}>Qué datos guardamos</H>
      <P modoOscuro={modoOscuro}>
        <strong>Nada en nuestros servidores.</strong> Prima Lex no tiene base de datos propia. Tu perfil
        (Ciudadano/Profesional), historial de consultas, canvas guardados y preferencias se almacenan
        <strong> exclusivamente en el navegador</strong> de tu dispositivo (localStorage).
      </P>

      <H modoOscuro={modoOscuro}>Procesamiento por IA</H>
      <P modoOscuro={modoOscuro}>
        Cuando haces una consulta, tu pregunta se envía a la API de Anthropic (proveedor del modelo de IA) a través de
        nuestro servidor proxy. Anthropic procesa la consulta y devuelve una respuesta. Según la política de Anthropic,
        las consultas API <strong>no se usan para entrenar modelos</strong>.
      </P>

      <H modoOscuro={modoOscuro}>Sin tracking ni cookies</H>
      <P modoOscuro={modoOscuro}>
        No usamos cookies de seguimiento, no compartimos datos con terceros, no hacemos perfilado de usuarios.
      </P>

      <H modoOscuro={modoOscuro}>Borrar tus datos</H>
      <P modoOscuro={modoOscuro}>
        Puedes borrar todo lo que Prima Lex guarda en tu navegador limpiando los datos del sitio desde la configuración
        de tu navegador (suele estar en "Borrar datos de navegación → Datos de sitio").
      </P>

      <H modoOscuro={modoOscuro}>Contacto</H>
      <P modoOscuro={modoOscuro}>
        Si tienes preguntas sobre privacidad, escribe al equipo del proyecto a través de los canales oficiales que
        figuran en la institución que aloja Prima Lex.
      </P>
    </div>
  )
}

function Terminos({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <div>
      <H modoOscuro={modoOscuro}>Uso aceptado</H>
      <P modoOscuro={modoOscuro}>
        Prima Lex se ofrece como herramienta educativa de uso libre. Está permitido el uso para fines de estudio,
        investigación, orientación personal y educación jurídica.
      </P>

      <H modoOscuro={modoOscuro}>Uso prohibido</H>
      <P modoOscuro={modoOscuro}>
        Queda prohibido: usar la plataforma para generar volúmenes masivos de consultas (scraping, abuso de la API),
        intentar extraer credenciales o vulnerar la infraestructura, o presentar los resultados de la IA como dictamen
        legal oficial ante autoridades o terceros.
      </P>

      <H modoOscuro={modoOscuro}>Disponibilidad</H>
      <P modoOscuro={modoOscuro}>
        La plataforma se ofrece "tal cual" (as-is), sin garantía de disponibilidad continua. Puede haber interrupciones
        por mantenimiento, actualizaciones o límites del proveedor de IA.
      </P>

      <H modoOscuro={modoOscuro}>Propiedad intelectual</H>
      <P modoOscuro={modoOscuro}>
        El texto de los códigos legales es de dominio público (Ley de la República). La interfaz, el código fuente y las
        funcionalidades de Prima Lex pertenecen a sus autores y se distribuyen bajo los términos de la institución
        responsable.
      </P>

      <H modoOscuro={modoOscuro}>Modificaciones</H>
      <P modoOscuro={modoOscuro}>
        Estos términos pueden actualizarse. El uso continuado de la plataforma implica aceptación de la versión vigente.
      </P>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { TEMAS, type TemaColorId } from '../../theme'

const VERDE = 'var(--accent-base)'

export type PestanaAcerca = 'acerca' | 'apariencia' | 'disclaimer' | 'privacidad' | 'terminos'
type Pestana = PestanaAcerca

interface Props {
  abierto: boolean
  onCerrar: () => void
  /** Pestaña en la que abrir el modal (por defecto 'acerca'). Se respeta cada vez que se abre. */
  pestanaInicial?: PestanaAcerca
}

export function ModalAcercaDe({ abierto, onCerrar, pestanaInicial = 'acerca' }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [pestana, setPestana] = useState<Pestana>(pestanaInicial)

  // Cada vez que el modal se abre, mover a la pestaña solicitada.
  useEffect(() => {
    if (abierto) setPestana(pestanaInicial)
  }, [abierto, pestanaInicial])

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
                aria-label="Cerrar"
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
              <Tab id="apariencia" actual={pestana} onClick={setPestana} modoOscuro={modoOscuro}>
                Apariencia
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
              {pestana === 'apariencia' && <Apariencia modoOscuro={modoOscuro} />}
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

      <H modoOscuro={modoOscuro}>Normas indexadas (23)</H>
      <P modoOscuro={modoOscuro}>
        <strong>Fundamentales y tratados:</strong> Constitución · Pacto Internacional DCP · Pacto Internacional DESC.
        <br />
        <strong>Códigos:</strong> Civil · Penal · Trabajo · Tributario · Comercio · Procedimiento Civil ·
        Procesal Penal · Orgánico de Tribunales · Minería · Aguas · Sanitario · Justicia Militar.
        <br />
        <strong>Leyes especiales:</strong> Ley 19.880 (Proc. Administrativo) · Ley 16.744 (Accidentes del Trabajo) ·
        Ley 20.000 (Drogas) · Ley 21.643 (Karin) · Ley 20.720 (Insolvencia) · Ley 19.968 (Tribunales de Familia) ·
        Ley 20.285 (Transparencia) · Ley 20.084 (Resp. Penal Adolescente).
        <br />
        <strong>+10.500 artículos</strong> oficiales de la Biblioteca del Congreso Nacional de Chile (leychile.cl).
      </P>

      <H modoOscuro={modoOscuro}>Próximamente</H>
      <P modoOscuro={modoOscuro}>
        Módulo de Comparación de normas · Panel de administración de jurisprudencia · Tratados internacionales ·
        Otras leyes especiales prioritarias.
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

function Apariencia({ modoOscuro }: { modoOscuro: boolean }) {
  const temaActual = useStore((s) => s.temaColor)
  const setTema = useStore((s) => s.setTemaColor)
  return (
    <div>
      <H modoOscuro={modoOscuro}>Color de acento</H>
      <P modoOscuro={modoOscuro}>
        Elige el color que la app usa para los detalles: botones, citas resaltadas, íconos del sidebar y bordes
        activos. El fondo (blanco o negro según tu modo) se mantiene igual.
      </P>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
        {TEMAS.map((t) => {
          const activo = t.id === temaActual
          return (
            <button
              key={t.id}
              onClick={() => setTema(t.id as TemaColorId)}
              className={`group text-left rounded-xl border-2 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                activo
                  ? modoOscuro
                    ? 'bg-zinc-800 border-zinc-600'
                    : 'bg-zinc-50 border-zinc-400'
                  : modoOscuro
                  ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
              }`}
              style={activo ? { borderColor: t.paleta.base } : undefined}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex -space-x-1.5">
                  {[t.paleta[300], t.paleta[500], t.paleta.base].map((c, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 rounded-full border-2"
                      style={{
                        background: c,
                        borderColor: modoOscuro ? '#18181b' : '#ffffff',
                      }}
                    />
                  ))}
                </div>
                <span className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                  {t.nombre}
                </span>
                {activo && (
                  <i
                    className="ti ti-check text-sm ml-auto"
                    style={{ color: t.paleta.base }}
                  />
                )}
              </div>
              <p className={`text-[11px] leading-snug ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {t.descripcion}
              </p>
            </button>
          )
        })}
      </div>

      <P modoOscuro={modoOscuro}>
        <em className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
          Tu elección se guarda en este navegador y se aplica cada vez que vuelvas.
        </em>
      </P>
    </div>
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
      <P modoOscuro={modoOscuro}>
        <em>Última actualización: 25 de mayo de 2026.</em>
      </P>

      <H modoOscuro={modoOscuro}>1. Marco normativo</H>
      <P modoOscuro={modoOscuro}>
        Esta política se rige por la <strong>Ley 19.628 sobre protección de la vida privada</strong> y su
        modificación por la Ley 21.719 (2024). Cualquier dato personal que entregues queda sujeto a los
        derechos ARCO (acceso, rectificación, cancelación y oposición) reconocidos en dicha normativa.
      </P>

      <H modoOscuro={modoOscuro}>2. Qué datos NO recopilamos</H>
      <P modoOscuro={modoOscuro}>
        Prima Lex no requiere registro ni cuenta de usuario. No solicitamos nombre, RUT, correo, teléfono,
        ubicación ni ningún dato identificatorio. <strong>No tenemos base de datos de usuarios.</strong>
      </P>

      <H modoOscuro={modoOscuro}>3. Qué se guarda en TU navegador</H>
      <P modoOscuro={modoOscuro}>
        Estos datos viven únicamente en el almacenamiento local de tu dispositivo (localStorage). Nunca
        se transmiten a un servidor propio:
      </P>
      <ul className={`text-sm space-y-1 mb-3 ml-4 list-disc ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
        <li>Perfil elegido (Ciudadano / Profesional).</li>
        <li>Historial de consultas y respuestas (texto de pregunta + respuesta de la IA + citas).</li>
        <li>Valoraciones 👍/👎 y comentarios de feedback sobre las respuestas.</li>
        <li>Canvas conceptuales que crees.</li>
        <li>Preferencias visuales (modo oscuro, sidebar colapsado, códigos activos).</li>
      </ul>

      <H modoOscuro={modoOscuro}>4. Procesamiento por IA (Anthropic)</H>
      <P modoOscuro={modoOscuro}>
        Cada consulta se envía a la <strong>API de Anthropic</strong> (proveedor del modelo Claude) a través
        de un proxy en nuestro servidor que oculta la credencial. La pregunta y los fragmentos de código que
        Prima Lex selecciona como contexto se transmiten cifrados (HTTPS). Según la política comercial de
        Anthropic, las consultas vía API <strong>no se utilizan para entrenar modelos</strong> y se eliminan
        de sus sistemas tras 30 días, salvo obligación legal.
      </P>

      <H modoOscuro={modoOscuro}>5. Datos transitorios del servidor</H>
      <P modoOscuro={modoOscuro}>
        Para proteger la plataforma contra abuso, nuestro proxy mantiene en memoria un contador temporal
        de consultas por dirección IP durante <strong>1 hora</strong>. Esta información se descarta
        automáticamente y no se persiste en disco, no se cruza con otros datos y no permite identificar
        personas.
      </P>

      <H modoOscuro={modoOscuro}>6. Sin tracking, cookies ni compartición</H>
      <P modoOscuro={modoOscuro}>
        No usamos Google Analytics ni servicios equivalentes. No instalamos cookies de seguimiento. No
        vendemos ni cedemos datos a terceros con fines comerciales o publicitarios.
      </P>

      <H modoOscuro={modoOscuro}>7. Borrar tus datos</H>
      <P modoOscuro={modoOscuro}>
        Puedes eliminar en cualquier momento todo lo que Prima Lex guarda localmente desde
        <em> Configuración del navegador → Privacidad → Borrar datos del sitio</em>, o desde la consola del
        navegador con <code>localStorage.clear()</code>. La eliminación es inmediata e irreversible.
      </P>

      <H modoOscuro={modoOscuro}>8. Menores de edad</H>
      <P modoOscuro={modoOscuro}>
        Prima Lex puede ser utilizada por menores de edad con fines educativos. No recopilamos ningún dato
        personal de menores y no realizamos perfilado.
      </P>

      <H modoOscuro={modoOscuro}>9. Contacto y consultas</H>
      <P modoOscuro={modoOscuro}>
        Para ejercer derechos ARCO o realizar preguntas sobre esta política, contacta al equipo
        responsable a través de los canales oficiales de la institución que aloja Prima Lex.
      </P>
    </div>
  )
}

function Terminos({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <div>
      <P modoOscuro={modoOscuro}>
        <em>Última actualización: 25 de mayo de 2026.</em>
      </P>

      <H modoOscuro={modoOscuro}>1. Aceptación</H>
      <P modoOscuro={modoOscuro}>
        El uso de Prima Lex implica la aceptación íntegra y sin reservas de estos Términos, del Aviso legal
        y de la Política de privacidad. Si no estás de acuerdo con alguno de ellos, abstente de usar la plataforma.
      </P>

      <H modoOscuro={modoOscuro}>2. Naturaleza del servicio</H>
      <P modoOscuro={modoOscuro}>
        Prima Lex es una <strong>herramienta educativa y de orientación</strong> que combina textos legales
        oficiales chilenos con un asistente de inteligencia artificial. <strong>No constituye asesoría legal</strong>,
        no genera relación abogado-cliente y no sustituye la consulta con un profesional del derecho titulado.
      </P>

      <H modoOscuro={modoOscuro}>3. Uso permitido</H>
      <P modoOscuro={modoOscuro}>
        Se permite el uso personal, educativo, académico, de investigación y de orientación general. Los
        usuarios pueden compartir el enlace de la plataforma libremente y citarla académicamente indicando
        autor, nombre del proyecto y fecha de consulta.
      </P>

      <H modoOscuro={modoOscuro}>4. Uso prohibido</H>
      <P modoOscuro={modoOscuro}>Queda expresamente prohibido:</P>
      <ul className={`text-sm space-y-1 mb-3 ml-4 list-disc ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
        <li>Generar volúmenes masivos de consultas (scraping, bots, automatización) que excedan el uso humano razonable.</li>
        <li>Eludir o atacar las medidas técnicas de protección (rate limiting, validación, autenticación de origen).</li>
        <li>Intentar acceder, modificar o extraer credenciales, código del servidor o datos de otros usuarios.</li>
        <li>Presentar las respuestas de la IA como dictamen oficial, peritaje, certificación o documento vinculante ante tribunales, organismos públicos o terceros.</li>
        <li>Utilizar la plataforma para incitar a la comisión de delitos o vulnerar derechos fundamentales de terceros.</li>
      </ul>

      <H modoOscuro={modoOscuro}>5. Limitación de responsabilidad</H>
      <P modoOscuro={modoOscuro}>
        Los autores de Prima Lex y la institución que la aloja <strong>no responden por daños directos o
        indirectos</strong> derivados de decisiones tomadas en base a las respuestas de la IA, errores u
        omisiones en los textos legales indexados, indisponibilidad temporal del servicio, ni por acciones
        de terceros (incluida la API del proveedor de IA). El usuario asume toda responsabilidad por el uso
        que haga de la información obtenida.
      </P>

      <H modoOscuro={modoOscuro}>6. Disponibilidad y "tal cual"</H>
      <P modoOscuro={modoOscuro}>
        El servicio se ofrece <em>as-is</em>, sin garantía de disponibilidad continua, exactitud, completitud
        ni adecuación a un fin particular. Puede haber interrupciones por mantenimiento, actualizaciones,
        falla de proveedores o agotamiento de cuota del modelo de IA.
      </P>

      <H modoOscuro={modoOscuro}>7. Propiedad intelectual</H>
      <P modoOscuro={modoOscuro}>
        Los textos de los códigos y leyes son de <strong>dominio público</strong> conforme a la legislación
        chilena. La interfaz, el código fuente, los datos procesados (JSON estructurados), las funcionalidades
        y los textos descriptivos pertenecen a los autores de Prima Lex y se publican bajo los términos que
        acuerde la institución responsable. Las marcas mencionadas (Anthropic, Claude, BCN) pertenecen a sus
        respectivos titulares.
      </P>

      <H modoOscuro={modoOscuro}>8. Legislación aplicable y jurisdicción</H>
      <P modoOscuro={modoOscuro}>
        Estos Términos se rigen por las <strong>leyes de la República de Chile</strong>. Cualquier
        controversia será sometida a los tribunales ordinarios de justicia con competencia en la ciudad de
        Santiago.
      </P>

      <H modoOscuro={modoOscuro}>9. Modificaciones</H>
      <P modoOscuro={modoOscuro}>
        Estos Términos pueden actualizarse cuando sea necesario. La versión vigente es siempre la publicada
        en esta sección con su fecha. El uso continuado de la plataforma tras una modificación implica su
        aceptación.
      </P>
    </div>
  )
}

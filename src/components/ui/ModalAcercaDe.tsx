import { AjustesInterfaz } from './AjustesInterfaz'
import { useDialogo } from '../../hooks/useDialogo'
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
  const dialogoRef = useDialogo<HTMLDivElement>(abierto, onCerrar)

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
            ref={dialogoRef}
            role="dialog"
            aria-modal="true"
            aria-label="Acerca de Prima Lex"
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
                Prima<span style={{ color: 'var(--accent-texto)' }}> Lex</span>
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

            <div className={`flex items-center gap-1 px-4 border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
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
      className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap flex-shrink-0 ${
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
      {/* los datos técnicos quedan a un clic: sirven para reportar fallos, pero no son para todos */}
      <details className={`text-xs mb-3 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
        <summary className="cursor-pointer select-none">Datos técnicos</summary>
        <p className="mt-1">
          Versión {typeof __VERSION_APP__ === 'string' ? __VERSION_APP__ : 'local'} · pantalla {window.innerWidth}×{window.innerHeight}
        </p>
      </details>
      <H modoOscuro={modoOscuro}>Objetivo</H>
      <P modoOscuro={modoOscuro}>
        Una plataforma de estudio para estudiantes de Derecho en Chile: los textos legales oficiales, tus apuntes
        y tus ramos, y herramientas para repasar, todo en un mismo lugar.
      </P>

      <H modoOscuro={modoOscuro}>Funciones disponibles</H>
      <ul className={`text-sm space-y-2 mb-4 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
        <Feat icono="ti-layout-grid" titulo="Módulos y ramos">
          Organiza tus ramos con clases, evaluaciones y calculadora de notas, textos, apuntes y casos.
        </Feat>
        <Feat icono="ti-book-2" titulo="Explorador">
          Navega los códigos artículo por artículo con búsqueda rápida (Ctrl+K), índice jerárquico y modernización
          opcional del lenguaje antiguo.
        </Feat>
        <Feat icono="ti-stack-2" titulo="Colecciones">
          Agrupa artículos, escribe notas y repásalos con tarjetas de repetición espaciada.
        </Feat>
        <Feat icono="ti-puzzle" titulo="Práctica">
          Pasapalabra jurídico por área para memorizar conceptos y términos.
        </Feat>
        <Feat icono="ti-hierarchy-2" titulo="Mapas mentales">
          Esquemas de los temas que estás estudiando, editables y conectables.
        </Feat>
      </ul>

      <H modoOscuro={modoOscuro}>Normas indexadas</H>
      <P modoOscuro={modoOscuro}>
        Constitución, tratados internacionales, los principales códigos y decenas de leyes especiales, con
        los textos oficiales de la Biblioteca del Congreso Nacional de Chile (leychile.cl). Puedes activar o
        desactivar las normas desde el botón Códigos del menú.
      </P>

      <H modoOscuro={modoOscuro}>Versión</H>
      <P modoOscuro={modoOscuro}>0.1.0 — Prototipo público</P>
    </div>
  )
}

function Feat({ icono, titulo, children }: { icono: string; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <i className={`ti ${icono} text-base mt-0.5 flex-shrink-0`} style={{ color: 'var(--accent-texto)' }} />
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
      <AjustesInterfaz />
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

export function Disclaimer({ modoOscuro }: { modoOscuro: boolean }) {
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
            Prima Lex es una herramienta de estudio, <strong>no constituye asesoría legal</strong> y no reemplaza la
            consulta con un profesional del derecho.
          </span>
        </p>
      </div>

      <H modoOscuro={modoOscuro}>Naturaleza del contenido</H>
      <P modoOscuro={modoOscuro}>
        Los textos legales provienen de la Biblioteca del Congreso Nacional, pero este sitio no es una fuente oficial.
        Los apuntes, resúmenes, tarjetas y demás material los escribes tú o los incluye la plataforma con fines
        didácticos, y pueden contener errores u omisiones. Los juegos de práctica generan palabras y definiciones con
        inteligencia artificial, que puede equivocarse: contrasta siempre con el texto de la norma.
      </P>

      <H modoOscuro={modoOscuro}>Decisiones jurídicas</H>
      <P modoOscuro={modoOscuro}>
        Para decisiones jurídicas vinculantes —demandas, contratos, denuncias, defensas— <strong>siempre debes
        consultar con un abogado titulado</strong>. Esta plataforma no establece relación abogado–cliente con sus
        usuarios.
      </P>

      <H modoOscuro={modoOscuro}>Vigencia normativa</H>
      <P modoOscuro={modoOscuro}>
        Las normas chilenas se modifican constantemente. Antes de basar una acción en un artículo, verifica que esté
        vigente consultando{' '}
        <a
          href="https://www.bcn.cl/leychile"
          target="_blank"
          rel="noopener noreferrer"
          className="underline ml-1"
          style={{ color: 'var(--accent-texto)' }}
        >
          leychile.cl
        </a>
        .
      </P>

      <H modoOscuro={modoOscuro}>Sin responsabilidad</H>
      <P modoOscuro={modoOscuro}>
        Los autores de Prima Lex no se hacen responsables por decisiones tomadas en base a la información de la
        plataforma. El uso es bajo tu propia responsabilidad.
      </P>
    </div>
  )
}

export function Privacidad({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <div>
      <P modoOscuro={modoOscuro}>
        <em>Última actualización: 19 de octubre de 2026.</em>
      </P>

      <H modoOscuro={modoOscuro}>1. Quién es responsable</H>
      <P modoOscuro={modoOscuro}>
        Prima Lex es un proyecto independiente creado por un estudiante de Derecho. Esta política se rige por la Ley
        19.628 y por la Ley 21.719, que la reemplaza a partir del 1 de diciembre de 2026, y se actualizará cuando cambie
        lo que recopilamos. Para ejercer tus derechos puedes hacerlo directamente desde la aplicación (ver sección 8).
      </P>

      <H modoOscuro={modoOscuro}>2. Sin cuenta: todo queda en tu dispositivo</H>
      <P modoOscuro={modoOscuro}>
        No necesitas cuenta para usar Prima Lex. Lo que creas (ramos, evaluaciones, tareas, apuntes, colecciones, mapas
        mentales, sesiones de enfoque, progreso de estudio y preferencias) se guarda en el almacenamiento local de tu
        navegador y no se envía a nuestros servidores. Si borras los datos del sitio, se pierden: usa la opción de
        respaldo para guardar una copia.
      </P>

      <H modoOscuro={modoOscuro}>3. Con cuenta: qué recibimos y para qué</H>
      <P modoOscuro={modoOscuro}>
        Puedes crear una cuenta con Google, con Microsoft o con un enlace enviado a tu correo. Según el método,
        recibimos de ese proveedor tu <strong>correo electrónico</strong>, tu <strong>nombre</strong> y tu{' '}
        <strong>foto de perfil</strong> (si la tienes) y un identificador interno. No recibimos tu contraseña ni acceso
        a tu correo, tus archivos o tus contactos: solo pedimos los permisos básicos de identidad (openid, email y
        profile). Usamos estos datos únicamente para identificarte, mostrar tu perfil y sincronizar tus datos entre
        tus dispositivos.
      </P>

      <H modoOscuro={modoOscuro}>4. Copia de tus datos en la nube</H>
      <P modoOscuro={modoOscuro}>
        Al iniciar sesión, una copia de lo que creas en Prima Lex (la misma que incluye el respaldo) se guarda en
        la base de datos de nuestro proveedor de infraestructura, Supabase, y se actualiza cuando cambias algo. Cada
        persona solo puede leer y modificar su propia copia mediante reglas de acceso por usuario. La copia{' '}
        <strong>no está cifrada de extremo a extremo</strong>: el proveedor la almacena protegida en tránsito y en
        reposo, pero no es ilegible para quien administra el servicio. No la usamos para otros fines, no la vendemos y
        no la compartimos con terceros con fines comerciales o publicitarios.
      </P>

      <H modoOscuro={modoOscuro}>5. Límite diario de los juegos de práctica</H>
      <P modoOscuro={modoOscuro}>
        Los juegos tienen un límite diario de partidas. Si tienes sesión iniciada, la app envía al servidor el
        token de tu sesión para que Supabase confirme tu correo y se te dé un límite mayor; el servidor no guarda ese
        correo. Sin sesión, el límite se cuenta por dirección IP.
      </P>

      <H modoOscuro={modoOscuro}>6. Inteligencia artificial</H>
      <P modoOscuro={modoOscuro}>
        Los juegos Pasapalabra y Ahorcado piden palabras y definiciones al modelo de Anthropic a través de un servidor
        intermediario que protege la credencial. Esa solicitud indica el área del derecho y el formato del juego; no
        incluye tus apuntes ni datos personales.
      </P>

      <H modoOscuro={modoOscuro}>7. Datos técnicos y terceros que intervienen</H>
      <P modoOscuro={modoOscuro}>
        Para evitar abusos, el servidor mantiene en memoria un contador temporal de usos por dirección IP, que se
        descarta automáticamente. Intervienen como proveedores: Vercel (alojamiento; puede registrar datos técnicos de
        conexión como la IP), Supabase (cuentas, base de datos y envío del enlace de ingreso por correo), Google y Microsoft (solo si eliges
        entrar con tu cuenta de alguno de ellos) y Anthropic (juegos). Cada uno trata los datos según sus propias políticas. No usamos cookies de
        seguimiento ni analítica de terceros, y no vendemos datos. Para detectar fallos, la aplicación envía a nuestro
        propio servidor avisos técnicos <strong>anónimos</strong>: el tipo de error, la sección abierta, la versión de la
        aplicación, el tipo de pantalla y la velocidad de carga. No incluyen tu nombre, tu correo ni tus apuntes, no
        se asocian a tu cuenta y no se usan para identificarte.
      </P>

      <H modoOscuro={modoOscuro}>8. Tus derechos y cómo ejercerlos</H>
      <P modoOscuro={modoOscuro}>
        Tienes derecho a acceder a tus datos, rectificarlos, suprimirlos, oponerte a su tratamiento y llevártelos.
        En la práctica: lo que ves en la aplicación es lo que guardamos de ti; puedes descargarlo con la opción de
        respaldo; y puedes <strong>eliminar tu cuenta y la copia en la nube</strong> en cualquier momento desde tu
        perfil (botón «Eliminar mi cuenta»). La eliminación es inmediata e irreversible y no toca lo que tienes en tu
        dispositivo. Cerrar sesión solo deja de sincronizar.
      </P>

      <H modoOscuro={modoOscuro}>9. Menores de edad</H>
      <P modoOscuro={modoOscuro}>
        Prima Lex está pensada para personas mayores de 18 años, estudiantes de educación superior. No solicitamos
        datos personales de menores ni realizamos perfilado.
      </P>
    </div>
  )
}

export function Terminos({ modoOscuro }: { modoOscuro: boolean }) {
  return (
    <div>
      <P modoOscuro={modoOscuro}>
        <em>Última actualización: 16 de octubre de 2026.</em>
      </P>

      <H modoOscuro={modoOscuro}>1. Aceptación</H>
      <P modoOscuro={modoOscuro}>
        El uso de Prima Lex implica la aceptación de estos Términos, del Aviso legal y de la Política de privacidad. Si
        no estás de acuerdo con alguno de ellos, abstente de usar la plataforma.
      </P>

      <H modoOscuro={modoOscuro}>2. Naturaleza del servicio</H>
      <P modoOscuro={modoOscuro}>
        Prima Lex es una <strong>herramienta de estudio</strong> que reúne textos legales oficiales chilenos con
        funciones para organizar ramos, tomar apuntes y repasar. <strong>No constituye asesoría legal</strong>, no
        genera relación abogado-cliente y no sustituye la consulta con un profesional titulado.
      </P>

      <H modoOscuro={modoOscuro}>3. Uso permitido</H>
      <P modoOscuro={modoOscuro}>
        Se permite el uso personal, educativo y académico. Puedes compartir el enlace de la plataforma y citarla
        indicando el nombre del proyecto y la fecha de consulta.
      </P>

      <H modoOscuro={modoOscuro}>4. Uso prohibido</H>
      <P modoOscuro={modoOscuro}>Queda prohibido:</P>
      <ul className={`text-sm space-y-1 mb-3 ml-4 list-disc ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
        <li>Generar volúmenes masivos de solicitudes (scraping, bots, automatización) que excedan el uso humano razonable.</li>
        <li>Eludir o atacar las medidas técnicas de protección (límites de uso, validación).</li>
        <li>Intentar acceder, modificar o extraer credenciales, código del servidor o datos de otros usuarios.</li>
        <li>Presentar contenido de la plataforma como dictamen oficial, peritaje o documento vinculante ante tribunales, organismos públicos o terceros.</li>
        <li>Usar la plataforma para incitar a la comisión de delitos o vulnerar derechos de terceros.</li>
      </ul>

      <H modoOscuro={modoOscuro}>5. Limitación de responsabilidad</H>
      <P modoOscuro={modoOscuro}>
        Los autores de Prima Lex <strong>no responden por daños directos o indirectos</strong> derivados de decisiones
        tomadas en base al contenido de la plataforma, de errores u omisiones en los textos, de la pérdida de datos
        guardados en tu dispositivo, de la indisponibilidad temporal del servicio ni de acciones de terceros (incluidos
        los proveedores de alojamiento e inteligencia artificial). El usuario asume la responsabilidad por el uso que
        haga de la información. Esta cláusula no limita los derechos que la ley chilena reconoce a los consumidores.
      </P>

      <H modoOscuro={modoOscuro}>6. Disponibilidad</H>
      <P modoOscuro={modoOscuro}>
        El servicio se ofrece tal como está, sin garantía de disponibilidad continua, exactitud ni adecuación a un fin
        particular. Puede haber interrupciones por mantenimiento, actualizaciones o falla de proveedores.
      </P>

      <H modoOscuro={modoOscuro}>7. Propiedad intelectual</H>
      <P modoOscuro={modoOscuro}>
        Los textos de las leyes provienen de la Biblioteca del Congreso Nacional. La interfaz, el código, los datos
        estructurados, las funciones y los textos descriptivos pertenecen a los autores de Prima Lex. Los apuntes y
        contenidos que crees siguen siendo tuyos. Las marcas mencionadas (Anthropic, Claude, BCN) pertenecen a sus
        titulares.
      </P>

      <H modoOscuro={modoOscuro}>8. Legislación aplicable</H>
      <P modoOscuro={modoOscuro}>
        Estos Términos se rigen por las leyes de la República de Chile. Las controversias se someterán a los tribunales
        ordinarios con competencia en Santiago, sin perjuicio de los derechos del consumidor.
      </P>

      <H modoOscuro={modoOscuro}>9. Modificaciones</H>
      <P modoOscuro={modoOscuro}>
        Estos Términos pueden actualizarse. La versión vigente es siempre la publicada en esta sección, con su fecha.
        Antes de ofrecer planes de pago se publicarán condiciones específicas.
      </P>

      <H modoOscuro={modoOscuro}>10. Cuentas</H>
      <P modoOscuro={modoOscuro}>
        Crear una cuenta es opcional. Eres responsable de la seguridad de tu acceso (tu cuenta de Google o
        Microsoft, o tu correo). Podemos suspender cuentas que incumplan estos Términos. Puedes eliminar tu cuenta cuando
        quieras desde tu perfil; el tratamiento de tus datos se describe en la Política de privacidad.
      </P>
    </div>
  )
}

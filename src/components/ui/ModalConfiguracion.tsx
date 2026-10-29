import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useAjustes } from '../../store/useAjustes'
import { useCuenta } from '../../store/useCuenta'
import { useDialogo } from '../../hooks/useDialogo'
import { cuentasDisponibles } from '../../services/supabase'
import { fechaUltimoRespaldo } from '../../services/respaldo'
import { usoDisponible } from '../../services/uso'
import { esAdministrador } from '../../services/panelUso'
import { TEMAS, type TemaColorId } from '../../theme'
import { AVATARES_ANIMALES } from '../../data/avataresAnimales'
import { BARRA_INFERIOR_DEFECTO, BARRA_INFERIOR_MAX, DESTINOS_NAVEGACION, barraInferiorValida } from '../../data/destinosNavegacion'
import { cargarFuenteLectura, esFuenteLectura, FUENTES_LECTURA, FUENTE_LECTURA_DEFECTO } from '../../services/fuentesLectura'
import type { PestanaConfig, VistaId } from '../../types'
import { AvatarAnimal } from './AvatarAnimal'
import { AvatarUsuario } from './AvatarUsuario'
import { Segmentado } from './Segmentado'
import { ModalCodigos } from './ModalCodigos'
import { ModalRespaldo } from './ModalRespaldo'
import {
  AjusteAnimaciones,
  AjusteAvisos,
  AjusteContraste,
  AjusteTamanoInterfaz,
  AjusteTextoCodigos,
  Interruptor,
} from './AjustesInterfaz'
import { Acerca, Disclaimer, Privacidad, Terminos } from './ModalAcercaDe'

interface Props {
  abierto: boolean
  onCerrar: () => void
  /** Sección en la que abrir (por defecto «perfil»). Se respeta cada vez que se abre. */
  pestanaInicial?: PestanaConfig
}

interface Seccion {
  id: PestanaConfig
  etiqueta: string
  icono: string
  titulo: string
  descripcion?: string
}

/** Las secciones se agrupan por lo que el usuario viene a hacer, no por cómo está programado. */
const GRUPOS: { nombre: string; secciones: Seccion[] }[] = [
  {
    nombre: 'Tú',
    secciones: [
      { id: 'perfil', etiqueta: 'Perfil', icono: 'ti-user-circle', titulo: 'Tu perfil', descripcion: 'Quién eres en Prima Lex y cómo te ves.' },
    ],
  },
  {
    nombre: 'Personalizar',
    secciones: [
      { id: 'apariencia', etiqueta: 'Apariencia', icono: 'ti-palette', titulo: 'Apariencia', descripcion: 'Tema, color y efectos de la interfaz.' },
      { id: 'lectura', etiqueta: 'Pantalla y lectura', icono: 'ti-text-size', titulo: 'Pantalla y lectura', descripcion: 'Tamaños de texto y cómo se leen los códigos.' },
      { id: 'avisos', etiqueta: 'Avisos', icono: 'ti-bell', titulo: 'Avisos', descripcion: 'Recordatorios de tus clases, tareas y evaluaciones.' },
    ],
  },
  {
    nombre: 'Tus datos',
    secciones: [
      { id: 'datos', etiqueta: 'Datos y contenido', icono: 'ti-database', titulo: 'Datos y contenido', descripcion: 'Respaldo de lo que creas y normas disponibles.' },
    ],
  },
  {
    nombre: 'Información',
    secciones: [
      { id: 'guia', etiqueta: 'Guía rápida', icono: 'ti-help', titulo: 'Guía rápida', descripcion: 'Gestos y atajos que no se ven a simple vista.' },
      { id: 'acerca', etiqueta: 'Acerca de', icono: 'ti-info-circle', titulo: 'Acerca de Prima Lex' },
      { id: 'disclaimer', etiqueta: 'Aviso legal', icono: 'ti-alert-triangle', titulo: 'Aviso legal' },
      { id: 'privacidad', etiqueta: 'Privacidad', icono: 'ti-lock', titulo: 'Política de privacidad' },
      { id: 'terminos', etiqueta: 'Términos', icono: 'ti-file-text', titulo: 'Términos de uso' },
    ],
  },
]
/** Solo la ven las cuentas de la tabla `administradores` (ver docs/ANALITICA_USO.md). La base vuelve a comprobarlo al leer los datos. */
const GRUPO_ADMIN: { nombre: string; secciones: Seccion[] } = {
  nombre: 'Administración',
  secciones: [
    { id: 'uso', etiqueta: 'Estadísticas de uso', icono: 'ti-chart-line', titulo: 'Estadísticas de uso', descripcion: 'Cuántos entran, dónde pasan el tiempo y qué funciones se usan. Solo lo ves tú.' },
  ],
}
const PanelUso = lazy(() => import('./PanelUso'))

export function ModalConfiguracion({ abierto, onCerrar, pestanaInicial = 'perfil' }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [pestana, setPestana] = useState<PestanaConfig>(pestanaInicial)
  const dialogoRef = useDialogo<HTMLDivElement>(abierto, onCerrar)
  const perfil = useCuenta((s) => s.perfil)
  const [esAdmin, setEsAdmin] = useState(false)

  // Cada vez que se abre, ir a la sección pedida.
  useEffect(() => {
    if (abierto) setPestana(pestanaInicial)
  }, [abierto, pestanaInicial])

  // ¿Es administradora esta cuenta? (la sección de estadísticas solo se ofrece entonces)
  useEffect(() => {
    if (!abierto || !perfil) return
    let vigente = true
    void esAdministrador().then((v) => {
      if (vigente) setEsAdmin(v)
    })
    return () => {
      vigente = false
    }
  }, [abierto, perfil])
  // sin sesión (o con la ventana cerrada) no se ofrece nada, aunque antes se haya comprobado
  const veAdmin = esAdmin && abierto && !!perfil

  const grupos = useMemo(() => (veAdmin ? [...GRUPOS, GRUPO_ADMIN] : GRUPOS), [veAdmin])
  const todas = useMemo(() => grupos.flatMap((g) => g.secciones), [grupos])
  const seccion = todas.find((s) => s.id === pestana) ?? todas[0]
  const linea = modoOscuro ? 'border-zinc-800' : 'border-zinc-200'

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={onCerrar}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            ref={dialogoRef}
            role="dialog"
            aria-modal="true"
            aria-label="Configuración"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl h-[min(720px,90vh)] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-white'}`}
          >
            <div className={`px-5 py-3.5 border-b flex items-center justify-between flex-shrink-0 ${linea}`}>
              <h2 className="text-lg font-extrabold" style={{ color: 'var(--neu-ink)' }}>Configuración</h2>
              <button onClick={onCerrar} aria-label="Cerrar" className="boton boton-fantasma boton-chico boton-icono">
                <i className="ti ti-x text-lg" aria-hidden="true" />
              </button>
            </div>

            {/* celular: las secciones van en una fila que se desliza */}
            <nav aria-label="Secciones de la configuración" className={`md:hidden flex gap-1 px-3 py-2 border-b overflow-x-auto flex-shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${linea}`}>
              {todas.map((s) => (
                <BotonSeccion key={s.id} s={s} activa={s.id === pestana} onClick={() => setPestana(s.id)} horizontal />
              ))}
            </nav>

            <div className="flex-1 min-h-0 flex">
              {/* escritorio y tableta: menú lateral con las secciones agrupadas */}
              <nav aria-label="Secciones de la configuración" className={`hidden md:block w-56 flex-shrink-0 overflow-y-auto border-r p-3 ${linea}`}>
                {grupos.map((g) => (
                  <div key={g.nombre} className="mb-3">
                    <p className="px-3 pt-1 pb-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--neu-ink3)' }}>
                      {g.nombre}
                    </p>
                    {g.secciones.map((s) => (
                      <BotonSeccion key={s.id} s={s} activa={s.id === pestana} onClick={() => setPestana(s.id)} />
                    ))}
                  </div>
                ))}
              </nav>

              <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
                <h3 className="text-xl font-extrabold" style={{ color: 'var(--neu-ink)' }}>{seccion.titulo}</h3>
                {seccion.descripcion && <p className="text-sm mt-0.5 mb-5" style={{ color: 'var(--neu-ink2)' }}>{seccion.descripcion}</p>}
                {!seccion.descripcion && <div className="mb-4" />}
                {pestana === 'perfil' && <SeccionPerfil modoOscuro={modoOscuro} />}
                {pestana === 'apariencia' && <SeccionApariencia modoOscuro={modoOscuro} />}
                {pestana === 'lectura' && <SeccionLectura />}
                {pestana === 'avisos' && <Grupo modoOscuro={modoOscuro}><AjusteAvisos /></Grupo>}
                {pestana === 'datos' && <SeccionDatos modoOscuro={modoOscuro} />}
                {pestana === 'guia' && <SeccionGuia />}
                {pestana === 'acerca' && <Acerca modoOscuro={modoOscuro} />}
                {pestana === 'disclaimer' && <Disclaimer modoOscuro={modoOscuro} />}
                {pestana === 'privacidad' && <Privacidad modoOscuro={modoOscuro} />}
                {pestana === 'terminos' && <Terminos modoOscuro={modoOscuro} />}
                {pestana === 'uso' && veAdmin && (
                  <Suspense fallback={<p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>Cargando…</p>}>
                    <PanelUso modoOscuro={modoOscuro} />
                  </Suspense>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function BotonSeccion({ s, activa, onClick, horizontal }: { s: Seccion; activa: boolean; onClick: () => void; horizontal?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-current={activa ? 'page' : undefined}
      className={`sin-tactil flex items-center gap-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0 ${
        horizontal ? 'px-3 h-10 whitespace-nowrap' : 'w-full px-3 h-10 text-left'
      } ${activa ? '' : 'hover:bg-[var(--neu-bg3)]'}`}
      style={
        activa
          ? { background: 'color-mix(in srgb, var(--accent-base) 12%, transparent)', color: 'var(--accent-texto)' }
          : { color: 'var(--neu-ink2)' }
      }
    >
      <i className={`ti ${s.icono} text-base`} aria-hidden="true" />
      {s.etiqueta}
    </button>
  )
}

/** Tarjeta que agrupa ajustes relacionados. */
function Grupo({ titulo, descripcion, children, modoOscuro }: { titulo?: string; descripcion?: string; children: React.ReactNode; modoOscuro: boolean }) {
  return (
    <section className={`rounded-2xl border p-4 mb-4 space-y-4 ${modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50/70 border-zinc-200'}`}>
      {titulo && (
        <div>
          <h4 className="text-[15px] font-bold" style={{ color: 'var(--neu-ink)' }}>{titulo}</h4>
          {descripcion && <p className="text-xs mt-0.5" style={{ color: 'var(--neu-ink2)' }}>{descripcion}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

function SeccionPerfil({ modoOscuro }: { modoOscuro: boolean }) {
  const perfil = useCuenta((s) => s.perfil)
  const plan = useCuenta((s) => s.plan)
  const abrirCuenta = useCuenta((s) => s.abrirModal)
  const animal = useAjustes((s) => s.avatarAnimal)
  const poner = useAjustes((s) => s.set)
  const nombre = perfil?.nombre ?? 'Sin cuenta'
  return (
    <>
      <Grupo modoOscuro={modoOscuro}>
        <div className="flex items-center gap-3.5">
          <AvatarUsuario nombre={perfil?.nombre ?? 'Prima Lex'} url={perfil?.avatar ?? null} grande />
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate" style={{ color: 'var(--neu-ink)' }}>{nombre}</p>
            <p className="text-sm truncate" style={{ color: 'var(--neu-ink2)' }}>
              {perfil ? perfil.email : 'Tus datos se guardan solo en este dispositivo.'}
            </p>
          </div>
          {perfil && (
            <span className="neu-chip px-3 py-1 text-xs font-bold uppercase flex-shrink-0" style={{ color: plan === 'pro' ? 'var(--accent-texto)' : 'var(--neu-ink2)' }}>
              {plan === 'pro' ? 'Pro' : 'Gratis'}
            </span>
          )}
        </div>
        {cuentasDisponibles && (
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={abrirCuenta} className="boton boton-suave">
              <i className={`ti ${perfil ? 'ti-settings-2' : 'ti-login'}`} aria-hidden="true" />
              {perfil ? 'Gestionar mi cuenta' : 'Entrar o crear una cuenta'}
            </button>
            <p className="text-xs flex-1 min-w-[200px]" style={{ color: 'var(--neu-ink3)' }}>
              {perfil ? 'Sincronización, cerrar sesión y eliminar la cuenta.' : 'Con una cuenta, tus apuntes y tareas se respaldan y se ven en todos tus dispositivos.'}
            </p>
          </div>
        )}
      </Grupo>

      <Grupo titulo="Foto de perfil" descripcion="Elige un animal. Se guarda en este dispositivo." modoOscuro={modoOscuro}>
        <div role="radiogroup" aria-label="Foto de perfil" className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
          <OpcionAvatar activa={animal === null} etiqueta={perfil?.avatar ? 'Mi foto' : 'Inicial'} onClick={() => poner({ avatarAnimal: null })}>
            {perfil?.avatar ? (
              <img src={perfil.avatar} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <span className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold text-white" style={{ background: 'var(--accent-base)' }} aria-hidden="true">
                {(perfil?.nombre ?? 'Prima Lex').trim().charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </OpcionAvatar>
          {AVATARES_ANIMALES.map((a) => (
            <OpcionAvatar key={a.id} activa={animal === a.id} etiqueta={a.nombre} onClick={() => poner({ avatarAnimal: a.id })}>
              <AvatarAnimal id={a.id} className="w-16 h-16" />
            </OpcionAvatar>
          ))}
        </div>
      </Grupo>
    </>
  )
}

function OpcionAvatar({ activa, etiqueta, onClick, children }: { activa: boolean; etiqueta: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      className="sin-tactil flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-all hover:-translate-y-0.5"
      style={activa ? { background: 'color-mix(in srgb, var(--accent-base) 12%, transparent)', boxShadow: '0 0 0 2px var(--accent-base)' } : undefined}
    >
      {children}
      <span className="text-xs font-semibold" style={{ color: activa ? 'var(--accent-texto)' : 'var(--neu-ink2)' }}>{etiqueta}</span>
    </button>
  )
}

function SeccionApariencia({ modoOscuro }: { modoOscuro: boolean }) {
  const toggleModoOscuro = useStore((s) => s.toggleModoOscuro)
  const temaActual = useStore((s) => s.temaColor)
  const setTema = useStore((s) => s.setTemaColor)
  return (
    <>
      <Grupo titulo="Tema" modoOscuro={modoOscuro}>
        <Segmentado<'claro' | 'oscuro'>
          id="tema-claro-oscuro"
          etiqueta="Tema de la interfaz"
          valor={modoOscuro ? 'oscuro' : 'claro'}
          onChange={(v) => {
            if ((v === 'oscuro') !== modoOscuro) toggleModoOscuro()
          }}
          opciones={[
            { valor: 'claro', texto: 'Claro' },
            { valor: 'oscuro', texto: 'Oscuro' },
          ]}
        />
      </Grupo>

      <Grupo titulo="Color de acento" descripcion="El color de los botones, los íconos activos y los detalles. El fondo no cambia." modoOscuro={modoOscuro}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {TEMAS.map((t) => {
            const activo = t.id === temaActual
            return (
              <button
                key={t.id}
                onClick={() => setTema(t.id as TemaColorId)}
                aria-pressed={activo}
                className={`sin-tactil text-left rounded-xl border-2 p-3 transition-all hover:-translate-y-0.5 ${
                  modoOscuro ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
                style={activo ? { borderColor: t.paleta.base } : undefined}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex -space-x-1.5">
                    {[t.paleta[300], t.paleta[500], t.paleta.base].map((c, i) => (
                      <span key={i} className="w-5 h-5 rounded-full border-2" style={{ background: c, borderColor: modoOscuro ? '#18181b' : '#ffffff' }} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>{t.nombre}</span>
                  {activo && <i className="ti ti-check text-sm ml-auto" style={{ color: t.paleta.base }} aria-hidden="true" />}
                </div>
                <p className="text-[11px] leading-snug" style={{ color: 'var(--neu-ink2)' }}>{t.descripcion}</p>
              </button>
            )
          })}
        </div>
      </Grupo>

      <Grupo titulo="Movimiento y accesibilidad" modoOscuro={modoOscuro}>
        <AjusteAnimaciones />
        <AjusteContraste />
      </Grupo>
    </>
  )
}

const GUIA: { titulo: string; icono: string; items: { que: string; como: string }[] }[] = [
  {
    titulo: 'Moverte por la app',
    icono: 'ti-menu-2',
    items: [
      { que: 'Menú completo', como: 'En celular y tablet vertical, toca «Más» en la barra de abajo. En computador, el menú está a la izquierda y se pliega con Ctrl+B.' },
      { que: 'Tu barra de abajo', como: 'Elige qué 4 pantallas van en la barra en Pantalla y lectura → Navegación.' },
      { que: 'Buscar cualquier cosa', como: 'Ctrl+K (⌘K en Mac) abre el buscador de funciones y artículos.' },
    ],
  },
  {
    titulo: 'Leer códigos y leyes',
    icono: 'ti-book-2',
    items: [
      { que: 'Pasar de artículo', como: 'Botones Anterior y Siguiente, o desliza el artículo hacia los lados en celular y tablet.' },
      { que: 'Resaltar o citar una frase', como: 'Selecciona el texto y usa los botones Resaltar o Citar. En celular van en una barra fija abajo. Citar copia la frase con su cita, por ejemplo (art. 1445 inc. 2° CC).' },
      { que: 'Seleccionar sin que se mueva', como: 'Mantén el dedo quieto un instante antes de arrastrar: el artículo no se desliza mientras seleccionas.' },
      { que: 'Cambiar la letra', como: 'Pantalla y lectura → Letra para leer. También puedes mostrar el número de cada inciso.' },
    ],
  },
  {
    titulo: 'Tareas y repaso',
    icono: 'ti-checkbox',
    items: [
      { que: 'Completar o posponer una tarea', como: 'En celular, desliza la fila a la derecha para completarla o a la izquierda para pasarla a mañana.' },
      { que: 'Repasar tarjetas', como: 'Toca la tarjeta para voltearla y luego desliza: izquierda «Otra vez», derecha «Bien», arriba «Fácil».' },
    ],
  },
  {
    titulo: 'Apuntes',
    icono: 'ti-file-text',
    items: [
      { que: 'Dar formato rápido', como: 'Escribe «/» al comienzo de una línea y elige: título, lista, recuadro, tabla…' },
      { que: 'Pasarlos a otra persona con su formato', como: 'Botón de compartir del apunte: PDF, copiar con formato, página web o Word.' },
    ],
  },
]

/** Los gestos y atajos que no se ven a simple vista, juntos en un solo lugar. */
function SeccionGuia() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  return (
    <>
      {GUIA.map((g) => (
        <Grupo key={g.titulo} titulo={g.titulo} modoOscuro={modoOscuro}>
          <dl className="grid gap-3">
            {g.items.map((i) => (
              <div key={i.que} className="flex gap-3">
                <i className={`ti ${g.icono} text-lg mt-0.5 flex-shrink-0`} style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>{i.que}</dt>
                  <dd className="text-xs mt-0.5" style={{ color: 'var(--neu-ink2)' }}>{i.como}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Grupo>
      ))}
    </>
  )
}

/** Letra con que se leen los artículos y los apuntes, con una muestra de cada una. */
function AjusteFuenteLectura() {
  const actual = useAjustes((s) => (esFuenteLectura(s.fuenteLectura) ? s.fuenteLectura : FUENTE_LECTURA_DEFECTO))
  const poner = useAjustes((s) => s.set)
  // las muestras se ven en su propia letra: se descargan al abrir esta sección (pesan poco y quedan en el dispositivo)
  useEffect(() => {
    FUENTES_LECTURA.forEach((f) => void cargarFuenteLectura(f.id))
  }, [])
  return (
    <div>
      <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--neu-ink)' }}>Letra para leer</h3>
      <p className="text-xs mb-3" style={{ color: 'var(--neu-ink2)' }}>
        Cambia la letra de los artículos (Explorador y Colecciones) y de tus apuntes. El resto de la app no cambia.
      </p>
      <div className="grid gap-2" role="radiogroup" aria-label="Letra para leer">
        {FUENTES_LECTURA.map((f) => {
          const activa = f.id === actual
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => poner({ fuenteLectura: f.id })}
              className="sin-neu sin-tactil w-full text-left rounded-xl border px-3.5 py-3 min-h-[44px]"
              style={{ borderColor: activa ? 'var(--accent-base)' : 'var(--neu-line)', background: activa ? 'var(--neu-bg3)' : 'transparent' }}
            >
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: activa ? 'var(--accent-texto)' : 'var(--neu-ink)' }}>
                {f.nombre}
                {activa && <i className="ti ti-check text-base ml-auto" aria-hidden="true" />}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--neu-ink2)' }}>{f.descripcion}</span>
              <span className="block mt-2 text-[17px] leading-snug" style={{ color: 'var(--neu-ink)', fontFamily: f.familia }}>
                Las personas nacen libres e iguales en dignidad y derechos.
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Elegir qué pantallas van en la barra inferior del celular (hasta 4). El orden es el de elección. */
function AjusteBarraInferior() {
  const elegidos = barraInferiorValida(useAjustes((s) => s.barraInferior))
  const poner = useAjustes((s) => s.set)
  const alternar = (id: VistaId) => {
    if (elegidos.includes(id)) {
      if (elegidos.length > 1) poner({ barraInferior: elegidos.filter((e) => e !== id) })
    } else if (elegidos.length < BARRA_INFERIOR_MAX) poner({ barraInferior: [...elegidos, id] })
  }
  const llena = elegidos.length >= BARRA_INFERIOR_MAX
  return (
    <div>
      <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--neu-ink)' }}>Barra inferior del celular</h3>
      <p className="text-xs mb-3" style={{ color: 'var(--neu-ink2)' }}>
        Elige hasta {BARRA_INFERIOR_MAX} pantallas para tenerlas siempre a un toque. Las demás siguen en «Más». Aparecen en el orden en que las eliges.
      </p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Pantallas de la barra inferior">
        {DESTINOS_NAVEGACION.map((d) => {
          const activo = elegidos.includes(d.id)
          const bloqueado = !activo && llena
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={activo}
              disabled={bloqueado}
              onClick={() => alternar(d.id)}
              className="sin-neu sin-tactil flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold min-h-[44px] disabled:opacity-40"
              style={{
                borderColor: activo ? 'var(--accent-base)' : 'var(--neu-line)',
                background: activo ? 'var(--accent-suave, var(--neu-bg3))' : 'transparent',
                color: activo ? 'var(--accent-texto)' : 'var(--neu-ink)',
              }}
            >
              <i className={`ti ${d.icono} text-lg flex-shrink-0`} aria-hidden="true" />
              <span className="min-w-0 truncate">{d.largo}</span>
              {activo && <span className="ml-auto text-xs tabular-nums" aria-label={`posición ${elegidos.indexOf(d.id) + 1}`}>{elegidos.indexOf(d.id) + 1}</span>}
            </button>
          )
        })}
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--neu-ink2)' }}>
        {llena ? 'Ya tienes 4: quita una para elegir otra.' : `Te quedan ${BARRA_INFERIOR_MAX - elegidos.length} por elegir.`}
      </p>
      <button
        onClick={() => poner({ barraInferior: BARRA_INFERIOR_DEFECTO })}
        disabled={elegidos.join() === BARRA_INFERIOR_DEFECTO.join()}
        className="boton boton-fantasma boton-chico mt-2"
      >
        Restablecer
      </button>
    </div>
  )
}

function SeccionLectura() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const modernizar = useStore((s) => s.modernizarLenguaje)
  const toggleModernizar = useStore((s) => s.toggleModernizar)
  const numerarIncisos = useAjustes((s) => s.numerarIncisos)
  const poner = useAjustes((s) => s.set)
  return (
    <>
      <Grupo titulo="Interfaz" modoOscuro={modoOscuro}>
        <AjusteTamanoInterfaz />
      </Grupo>
      <Grupo titulo="Navegación" modoOscuro={modoOscuro}>
        <AjusteBarraInferior />
      </Grupo>
      <Grupo titulo="Códigos y leyes" modoOscuro={modoOscuro}>
        <AjusteFuenteLectura />
        <AjusteTextoCodigos />
        <Interruptor
          activo={numerarIncisos}
          onChange={(v) => poner({ numerarIncisos: v })}
          etiqueta="Mostrar el número de cada inciso"
          descripcion="Un número pequeño y tenue al margen de cada inciso (1, 2, 3…) para ubicarte en los artículos largos. Cuenta los párrafos del texto: los ítems de una lista (1º., a)) no cuentan, y en los artículos con numerales que traen incisos propios (como el 19 de la Constitución) la cuenta se reinicia en cada número. Es una ayuda para ubicarte: para citar, contrasta con el texto vigente en leychile.cl."
        />
        <Interruptor
          activo={modernizar}
          onChange={() => toggleModernizar()}
          etiqueta="Modernizar el lenguaje antiguo"
          descripcion="En los códigos más antiguos (Procedimiento Civil, Penal y Comercio), muestra las palabras en desuso con su equivalente actual. Solo cambia lo que ves: el texto oficial no se modifica."
        />
      </Grupo>
    </>
  )
}

function SeccionDatos({ modoOscuro }: { modoOscuro: boolean }) {
  const codigos = useStore((s) => s.codigos)
  const compartirUso = useAjustes((s) => s.compartirUso)
  const setAjustes = useAjustes((s) => s.set)
  const [respaldoAbierto, setRespaldoAbierto] = useState(false)
  const [codigosAbierto, setCodigosAbierto] = useState(false)
  const ultimo = fechaUltimoRespaldo()
  const activos = codigos.filter((c) => c.activo).length
  return (
    <>
      <Grupo
        titulo="Respaldo"
        descripcion="Todo lo que creas (asignaturas, apuntes, tareas, colecciones…) vive en este navegador. Guarda una copia por si cambias de equipo o borras los datos del sitio."
        modoOscuro={modoOscuro}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setRespaldoAbierto(true)} className="boton boton-suave">
            <i className="ti ti-database-export" aria-hidden="true" /> Respaldar o restaurar
          </button>
          <span className="text-xs" style={{ color: 'var(--neu-ink3)' }}>
            {ultimo ? `Último respaldo: ${new Date(ultimo).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Aún no has hecho un respaldo.'}
          </span>
        </div>
      </Grupo>
      <Grupo titulo="Normas disponibles" descripcion="Elige qué códigos y leyes aparecen en el Explorador y en las búsquedas." modoOscuro={modoOscuro}>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setCodigosAbierto(true)} className="boton boton-suave">
            <i className="ti ti-books" aria-hidden="true" /> Elegir normas
          </button>
          <span className="text-xs" style={{ color: 'var(--neu-ink3)' }}>{activos} de {codigos.length} activas</span>
        </div>
      </Grupo>
      {usoDisponible() && (
        <Grupo
          titulo="Estadísticas de uso"
          descripcion="Ayudan a saber qué partes de Prima Lex sirven y cuáles no. Son solo contadores anónimos."
          modoOscuro={modoOscuro}
        >
          <Interruptor
            activo={compartirUso}
            onChange={(v) => setAjustes({ compartirUso: v })}
            etiqueta="Compartir estadísticas de uso anónimas"
            descripcion="Se cuentan las veces que se usa cada función y los segundos de uso por sección, junto con el tipo de pantalla. Nunca se envía lo que escribes (apuntes, títulos, búsquedas), tu nombre ni tu correo, y no se asocian a tu cuenta ni a tu dispositivo. También respetamos la señal «No rastrear» del navegador."
          />
        </Grupo>
      )}
      <AnimatePresence>{respaldoAbierto && <ModalRespaldo onCerrar={() => setRespaldoAbierto(false)} />}</AnimatePresence>
      <ModalCodigos abierto={codigosAbierto} onCerrar={() => setCodigosAbierto(false)} />
    </>
  )
}

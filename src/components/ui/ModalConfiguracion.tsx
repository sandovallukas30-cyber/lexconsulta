import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useAjustes } from '../../store/useAjustes'
import { useCuenta } from '../../store/useCuenta'
import { useDialogo } from '../../hooks/useDialogo'
import { cuentasDisponibles } from '../../services/supabase'
import { fechaUltimoRespaldo } from '../../services/respaldo'
import { TEMAS, type TemaColorId } from '../../theme'
import { AVATARES_ANIMALES } from '../../data/avataresAnimales'
import type { PestanaConfig } from '../../types'
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
      { id: 'acerca', etiqueta: 'Acerca de', icono: 'ti-info-circle', titulo: 'Acerca de Prima Lex' },
      { id: 'disclaimer', etiqueta: 'Aviso legal', icono: 'ti-alert-triangle', titulo: 'Aviso legal' },
      { id: 'privacidad', etiqueta: 'Privacidad', icono: 'ti-lock', titulo: 'Política de privacidad' },
      { id: 'terminos', etiqueta: 'Términos', icono: 'ti-file-text', titulo: 'Términos de uso' },
    ],
  },
]
const TODAS = GRUPOS.flatMap((g) => g.secciones)

export function ModalConfiguracion({ abierto, onCerrar, pestanaInicial = 'perfil' }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const [pestana, setPestana] = useState<PestanaConfig>(pestanaInicial)
  const dialogoRef = useDialogo<HTMLDivElement>(abierto, onCerrar)

  // Cada vez que se abre, ir a la sección pedida.
  useEffect(() => {
    if (abierto) setPestana(pestanaInicial)
  }, [abierto, pestanaInicial])

  const seccion = TODAS.find((s) => s.id === pestana) ?? TODAS[0]
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
              {TODAS.map((s) => (
                <BotonSeccion key={s.id} s={s} activa={s.id === pestana} onClick={() => setPestana(s.id)} horizontal />
              ))}
            </nav>

            <div className="flex-1 min-h-0 flex">
              {/* escritorio y tableta: menú lateral con las secciones agrupadas */}
              <nav aria-label="Secciones de la configuración" className={`hidden md:block w-56 flex-shrink-0 overflow-y-auto border-r p-3 ${linea}`}>
                {GRUPOS.map((g) => (
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
                {pestana === 'acerca' && <Acerca modoOscuro={modoOscuro} />}
                {pestana === 'disclaimer' && <Disclaimer modoOscuro={modoOscuro} />}
                {pestana === 'privacidad' && <Privacidad modoOscuro={modoOscuro} />}
                {pestana === 'terminos' && <Terminos modoOscuro={modoOscuro} />}
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

function SeccionLectura() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const modernizar = useStore((s) => s.modernizarLenguaje)
  const toggleModernizar = useStore((s) => s.toggleModernizar)
  const numerarIncisos = useAjustes((s) => s.numerarIncisos)
  const deslizarArticulos = useAjustes((s) => s.deslizarArticulos)
  const poner = useAjustes((s) => s.set)
  return (
    <>
      <Grupo titulo="Interfaz" modoOscuro={modoOscuro}>
        <AjusteTamanoInterfaz />
      </Grupo>
      <Grupo titulo="Códigos y leyes" modoOscuro={modoOscuro}>
        <AjusteTextoCodigos />
        <Interruptor
          activo={deslizarArticulos}
          onChange={(v) => poner({ deslizarArticulos: v })}
          etiqueta="Deslizar para cambiar de artículo"
          descripcion="En celular y tablet, arrastrar el dedo hacia los lados pasa al artículo anterior o siguiente. Viene apagado para que no se mueva el artículo al seleccionar texto; los botones Anterior y Siguiente funcionan siempre."
        />
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
  const [respaldoAbierto, setRespaldoAbierto] = useState(false)
  const [codigosAbierto, setCodigosAbierto] = useState(false)
  const ultimo = fechaUltimoRespaldo()
  const activos = codigos.filter((c) => c.activo).length
  return (
    <>
      <Grupo
        titulo="Respaldo"
        descripcion="Todo lo que creas (ramos, apuntes, tareas, colecciones…) vive en este navegador. Guarda una copia por si cambias de equipo o borras los datos del sitio."
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
      <AnimatePresence>{respaldoAbierto && <ModalRespaldo onCerrar={() => setRespaldoAbierto(false)} />}</AnimatePresence>
      <ModalCodigos abierto={codigosAbierto} onCerrar={() => setCodigosAbierto(false)} />
    </>
  )
}

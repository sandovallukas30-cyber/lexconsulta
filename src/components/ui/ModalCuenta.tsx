import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fondoModal, panelModal } from './animacionModal'
import { useCuenta, type ProveedorCuenta } from '../../store/useCuenta'
import { useDialogo } from '../../hooks/useDialogo'

const haceCuanto = (ms: number | null): string => {
  if (!ms) return 'aún no'
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 60) return 'hace un momento'
  if (s < 3600) return `hace ${Math.round(s / 60)} min`
  if (s < 86_400) return `hace ${Math.round(s / 3600)} h`
  return `hace ${Math.round(s / 86_400)} d`
}

const PROVEEDORES: { id: ProveedorCuenta; nombre: string; icono: string }[] = [
  { id: 'google', nombre: 'Continuar con Google', icono: 'ti-brand-google' },
  { id: 'azure', nombre: 'Continuar con Microsoft', icono: 'ti-brand-windows' },
]

const NOMBRE_PROVEEDOR: Record<string, string> = { google: 'Google', azure: 'Microsoft', email: 'enlace por correo' }

function Avatar({ nombre, url, grande }: { nombre: string; url: string | null; grande?: boolean }) {
  const [falla, setFalla] = useState(false)
  const tam = grande ? 'w-14 h-14 text-xl' : 'w-9 h-9 text-sm'
  if (url && !falla) {
    return <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFalla(true)} className={`${tam} rounded-full object-cover`} />
  }
  return (
    <span className={`${tam} rounded-full flex items-center justify-center font-extrabold text-white`} style={{ background: 'var(--accent-base)' }} aria-hidden="true">
      {nombre.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

/** Botón de la cuenta (al pie del menú lateral): «Entrar» o la foto de la cuenta. `compacto` = solo ícono. */
export function BotonCuenta({ compacto = false }: { compacto?: boolean }) {
  const perfil = useCuenta((s) => s.perfil)
  const listo = useCuenta((s) => s.listo)
  const abrir = useCuenta((s) => s.abrirModal)
  if (!listo) return null
  return perfil ? (
    <button onClick={abrir} aria-label={`Tu cuenta: ${perfil.nombre}`} title={perfil.nombre} className="sin-neu sin-tactil rounded-full p-0.5" style={{ boxShadow: 'var(--neu-chica)' }}>
      <Avatar nombre={perfil.nombre} url={perfil.avatar} />
    </button>
  ) : (
    <button onClick={abrir} aria-label="Entrar a tu cuenta" title="Entrar a tu cuenta" className={`boton boton-suave ${compacto ? 'boton-icono' : 'boton-chico'}`}>
      <i className="ti ti-user-circle" aria-hidden="true" />
      {!compacto && ' Entrar'}
    </button>
  )
}

/** La salida se anima porque el contenido se desmonta dentro de AnimatePresence. */
export function ModalCuenta() {
  const abierto = useCuenta((s) => s.modalAbierto)
  return <AnimatePresence>{abierto && <ContenidoModalCuenta key="cuenta" />}</AnimatePresence>
}

function ContenidoModalCuenta() {
  const cerrar = useCuenta((s) => s.cerrarModal)
  const ref = useDialogo<HTMLDivElement>(true, cerrar)
  const c = useCuenta()
  const [correo, setCorreo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)


  const entrar = async (p: ProveedorCuenta) => {
    setError(null)
    setOcupado(true)
    const e = await c.iniciarSesion(p)
    // si todo sale bien el navegador se va a Google/Microsoft y no vuelve aquí
    if (e) {
      setError(e)
      setOcupado(false)
    }
  }
  const enviarEnlace = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    setOcupado(true)
    const e = await c.enlaceCorreo(correo)
    setOcupado(false)
    if (e) setError(e)
    else setEnviado(true)
  }
  const borrar = async () => {
    setOcupado(true)
    const e = await c.eliminarCuenta()
    setOcupado(false)
    if (e) setError(e)
    else {
      setConfirmarBorrado(false)
      cerrar()
    }
  }

  return (
    <motion.div {...fondoModal} className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={cerrar}>
      <motion.div
        {...panelModal}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={c.perfil ? 'Tu cuenta' : 'Entrar a Prima Lex'}
        onClick={(e) => e.stopPropagation()}
        className="max-w-md w-full max-h-[88vh] overflow-y-auto rounded-2xl shadow-2xl p-6"
        style={{ background: 'var(--neu-card)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-lg font-extrabold" style={{ color: 'var(--neu-ink)' }}>{c.perfil ? 'Tu cuenta' : 'Entra a Prima Lex'}</h2>
          <button onClick={cerrar} aria-label="Cerrar" className="boton boton-fantasma boton-chico boton-icono">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {c.perfil ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar nombre={c.perfil.nombre} url={c.perfil.avatar} grande />
              <div className="min-w-0">
                <p className="font-bold truncate" style={{ color: 'var(--neu-ink)' }}>{c.perfil.nombre}</p>
                <p className="text-sm truncate" style={{ color: 'var(--neu-ink2)' }}>{c.perfil.email}</p>
                <p className="text-xs" style={{ color: 'var(--neu-ink3)' }}>Entraste con {NOMBRE_PROVEEDOR[c.perfil.proveedor] ?? c.perfil.proveedor}</p>
              </div>
              <span className="ml-auto neu-chip px-3 py-1 text-xs font-bold uppercase" style={{ color: c.plan === 'pro' ? 'var(--accent-texto)' : 'var(--neu-ink2)' }}>
                {c.plan === 'pro' ? 'Pro' : 'Gratis'}
              </span>
            </div>

            {c.conflictoDispositivo && (
              <div className="neu-flat p-4 space-y-3" role="alert">
                <p className="text-sm font-bold" style={{ color: 'var(--neu-ink)' }}>
                  <i className="ti ti-alert-triangle mr-2" style={{ color: 'var(--neu-danger)' }} aria-hidden="true" />
                  Este dispositivo tiene datos de otra cuenta
                </p>
                <p className="text-xs" style={{ color: 'var(--neu-ink2)' }}>
                  Si es un computador compartido, lo que hay aquí no debería pasar a tu cuenta. Elige qué hacer; no se sincroniza nada hasta que lo hagas.
                </p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => void c.resolverConflicto('empezar')} className="boton boton-primario">
                    Empezar con lo de mi cuenta
                  </button>
                  <p className="text-xs" style={{ color: 'var(--neu-ink3)' }}>Borra los datos de este dispositivo y baja los de tu cuenta.</p>
                  <button onClick={() => void c.resolverConflicto('unir')} className="boton boton-suave">
                    Unir con lo que hay aquí
                  </button>
                  <p className="text-xs" style={{ color: 'var(--neu-ink3)' }}>Los datos de este dispositivo pasan a tu cuenta. Úsalo solo si son tuyos.</p>
                </div>
              </div>
            )}

            <div className="neu-pressed p-4 space-y-2" aria-live="polite">
              <p className="text-sm font-bold" style={{ color: 'var(--neu-ink)' }}>
                <i className={`ti ${c.sync === 'error' ? 'ti-cloud-off' : c.sync === 'sincronizando' ? 'ti-cloud-upload' : 'ti-cloud-check'} mr-2`} style={{ color: c.sync === 'error' ? 'var(--neu-danger)' : 'var(--accent-texto)' }} aria-hidden="true" />
                {c.sync === 'sincronizando' ? 'Sincronizando…' : c.sync === 'error' ? 'No se pudo sincronizar' : 'Tus datos están respaldados en la nube'}
              </p>
              <p className="text-xs" style={{ color: 'var(--neu-ink2)' }}>
                {c.sync === 'error' ? c.errorSync : `Última sincronización: ${haceCuanto(c.ultimaSync)}. Se actualiza sola cuando cambias algo y al volver a la pestaña.`}
              </p>
              <button onClick={() => void c.sincronizarAhora()} disabled={c.sync === 'sincronizando'} className="boton boton-suave boton-chico">
                <i className="ti ti-refresh" aria-hidden="true" /> Sincronizar ahora
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--neu-ink2)' }}>
              Al cerrar sesión, tus datos siguen en este dispositivo; solo se deja de sincronizar. Si es un equipo compartido, usa «Cerrar sesión y borrar de este equipo». Si borras una tarea o un apunte en un dispositivo y otro todavía lo tiene, puede volver a aparecer.
            </p>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => void c.cerrarSesion().then(cerrar)} className="boton boton-suave">
                <i className="ti ti-logout" aria-hidden="true" /> Cerrar sesión
              </button>
              <button onClick={() => void c.cerrarSesion(true).then(cerrar)} className="boton boton-fantasma">
                Cerrar sesión y borrar de este equipo
              </button>
              {!confirmarBorrado ? (
                <button onClick={() => setConfirmarBorrado(true)} className="boton boton-fantasma" style={{ color: 'var(--neu-danger)' }}>
                  Eliminar mi cuenta
                </button>
              ) : (
                <div className="w-full neu-flat p-3 space-y-2" role="alert">
                  <p className="text-sm" style={{ color: 'var(--neu-ink)' }}>
                    Se borran tu cuenta y la copia de tus datos en la nube. Lo que tienes en este dispositivo no se toca. No se puede deshacer.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => void borrar()} disabled={ocupado} className="boton boton-primario" style={{ background: 'var(--neu-danger)' }}>Sí, eliminar</button>
                    <button onClick={() => setConfirmarBorrado(false)} className="boton boton-suave">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>
              Con una cuenta tus apuntes, tareas y sesiones se respaldan y se ven en todos tus dispositivos. Sin cuenta, Prima Lex sigue funcionando como siempre, guardando todo en este navegador.
            </p>
            <div className="space-y-2">
              {PROVEEDORES.map((p) => (
                <button key={p.id} onClick={() => void entrar(p.id)} disabled={ocupado} className="boton boton-suave w-full justify-start px-4 h-12">
                  <i className={`ti ${p.icono} text-lg`} aria-hidden="true" /> {p.nombre}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--neu-ink3)' }} aria-hidden="true">
              <span className="flex-1 h-px" style={{ background: 'var(--neu-line)' }} /> o con tu correo <span className="flex-1 h-px" style={{ background: 'var(--neu-line)' }} />
            </div>
            {enviado ? (
              <div className="neu-pressed p-4 text-sm" role="status" style={{ color: 'var(--neu-ink)' }}>
                <p className="font-bold mb-1"><i className="ti ti-mail-check mr-2" aria-hidden="true" />Revisa tu correo</p>
                Te enviamos un enlace a <b>{correo.trim()}</b>. Ábrelo en este mismo navegador para entrar. Si no llega, mira en spam.
              </div>
            ) : (
              <form onSubmit={enviarEnlace} className="space-y-2">
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tucorreo@universidad.cl"
                  aria-label="Tu correo"
                  autoComplete="email"
                  className="w-full h-control px-3 text-sm"
                />
                <button type="submit" disabled={ocupado || !correo.trim()} className="boton boton-primario w-full">
                  Enviarme un enlace para entrar
                </button>
                <p className="text-xs" style={{ color: 'var(--neu-ink3)' }}>Sin contraseña: te mandamos un enlace que sirve una sola vez.</p>
              </form>
            )}
            <p className="text-xs" style={{ color: 'var(--neu-ink3)' }}>
              Al entrar aceptas los{' '}
              <a href="/terminos" target="_blank" rel="noopener noreferrer" className="underline">Términos</a>
              {' '}y la{' '}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">Política de privacidad</a>
              . Prima Lex es gratis por ahora; si algún día cobra, lo avisaremos antes.
            </p>
          </div>
        )}
        {error && <p role="alert" className="text-sm mt-3" style={{ color: 'var(--neu-danger)' }}>{error}</p>}
      </motion.div>
    </motion.div>
  )
}

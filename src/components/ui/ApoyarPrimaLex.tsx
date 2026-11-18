import { DONACION_URL } from '../../config'

/** Invitación a donar. No aparece si no hay enlace configurado (VITE_DONACION_URL). */
export function ApoyarPrimaLex({ compacto = false }: { compacto?: boolean }) {
  if (!DONACION_URL) return null
  if (compacto) {
    return (
      <a href={DONACION_URL} target="_blank" rel="noopener noreferrer" className="underline">
        Apoyar
      </a>
    )
  }
  return (
    <div className="space-y-2">
      <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>
        Prima Lex es gratis y la hacemos entre estudiantes. Si te sirve y puedes, una donación ayuda a mantenerla funcionando (alojamiento, base de datos y servicios). Es voluntaria y no desbloquea nada: todos usan lo mismo.
      </p>
      <a href={DONACION_URL} target="_blank" rel="noopener noreferrer" className="boton boton-suave inline-flex">
        <i className="ti ti-heart" aria-hidden="true" /> Apoyar Prima Lex
      </a>
    </div>
  )
}

import { useEffect } from 'react'

/** Página para una dirección que no existe (la web sirve la misma aplicación en cualquier ruta). */
export function PaginaNoEncontrada() {
  useEffect(() => {
    const antes = document.title
    document.title = 'Página no encontrada · Prima Lex'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => {
      document.title = antes
      meta.remove()
    }
  }, [])

  return (
    <main className="min-h-full flex items-center justify-center px-6 py-16" style={{ background: 'var(--neu-bg)', color: 'var(--neu-ink)' }}>
      <div className="max-w-md text-center">
        <p className="text-sm font-bold mb-2" style={{ color: 'var(--accent-texto)' }}>Error 404</p>
        <h1 className="text-2xl font-bold mb-3">No encontramos esta página</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--neu-ink2)' }}>
          La dirección no existe o cambió de lugar. Tus apuntes y tareas siguen guardados en este dispositivo.
        </p>
        <a href="/" className="boton boton-primario">Ir al inicio</a>
      </div>
    </main>
  )
}

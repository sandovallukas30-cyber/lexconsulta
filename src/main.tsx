import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans'
// íconos Tabler recortados a los que usa la app (24 KB en vez de 495): scripts/subset_iconos.mjs
import './assets/iconos/tabler-subset.css'
import './index.css'
import './base.css'
import './enfoque.css'
import { Raiz } from './Raiz.tsx'
import { LimiteError } from './components/ui/LimiteError'
// historial de "Volver" y scroll por vista (se engancha al store)
import './services/navegacion'
import { useStore } from './store/useStore'
import { iniciarReporteTecnico } from './services/reporteTecnico'
import { useEnfoque } from './store/useEnfoque'
import { useCuenta } from './store/useCuenta'

// Solo en desarrollo: acceso al store desde la consola / pruebas automatizadas.
if (import.meta.env.DEV) {
  const w = window as unknown as { __store: typeof useStore; __enfoque: typeof useEnfoque }
  w.__store = useStore
  w.__enfoque = useEnfoque
  ;(w as unknown as { __cuenta: typeof useCuenta }).__cuenta = useCuenta
}

// Tras un despliegue nuevo, una pantalla que se carga con retraso puede pedir un
// archivo que ya no existe: se limpia el caché de la app y se recarga una vez.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  try {
    const marca = Number(sessionStorage.getItem('prima-lex-recarga') ?? 0)
    if (Date.now() - marca < 30_000) return
    sessionStorage.setItem('prima-lex-recarga', String(Date.now()))
  } catch {
    /* sin sessionStorage: se recarga igual una vez por evento */
  }
  const recargar = () => window.location.reload()
  if ('caches' in window) {
    void caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith('prima-lex-')).map((k) => caches.delete(k))))
      .finally(recargar)
  } else recargar()
})

// Service worker: la app abre sin conexión. Solo en producción (en desarrollo
// el caché estorbaría al recargar con cambios).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // sin service worker la app funciona igual, solo que no abre sin conexión
    })
  })
}

// avisos técnicos anónimos (errores y velocidad); solo en producción
iniciarReporteTecnico(() => useStore.getState().vistaActiva)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Último recurso: si algo falla fuera de una vista (p. ej. un archivo base que no cargó tras un despliegue), en vez de pantalla en blanco sale «Recargar». */}
    <LimiteError modoOscuro={window.matchMedia('(prefers-color-scheme: dark)').matches}>
      <Raiz />
    </LimiteError>
  </StrictMode>,
)

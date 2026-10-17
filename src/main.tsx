import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/sora'
// íconos Tabler servidos por la propia app (antes venían de un CDN con @latest)
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './index.css'
import './neumorfismo.css'
import './enfoque.css'
import { Raiz } from './Raiz.tsx'
// historial de "Volver" y scroll por vista (se engancha al store)
import './services/navegacion'
import { useStore } from './store/useStore'
import { useEnfoque } from './store/useEnfoque'
import { useCuenta } from './store/useCuenta'

// Solo en desarrollo: acceso al store desde la consola / pruebas automatizadas.
if (import.meta.env.DEV) {
  const w = window as unknown as { __store: typeof useStore; __enfoque: typeof useEnfoque }
  w.__store = useStore
  w.__enfoque = useEnfoque
  ;(w as unknown as { __cuenta: typeof useCuenta }).__cuenta = useCuenta
}

// Service worker: la app abre sin conexión. Solo en producción (en desarrollo
// el caché estorbaría al recargar con cambios).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // sin service worker la app funciona igual, solo que no abre sin conexión
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Raiz />
  </StrictMode>,
)

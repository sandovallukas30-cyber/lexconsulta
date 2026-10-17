import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/sora'
// íconos Tabler servidos por la propia app (antes venían de un CDN con @latest)
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './index.css'
import './neumorfismo.css'
import App from './App.tsx'
// historial de "Volver" y scroll por vista (se engancha al store)
import './services/navegacion'
import { VerificarView } from './components/views/VerificarView.tsx'
import { useStore } from './store/useStore'
import { useEnfoque } from './store/useEnfoque'

// Solo en desarrollo: acceso al store desde la consola / pruebas automatizadas.
if (import.meta.env.DEV) {
  const w = window as unknown as { __store: typeof useStore; __enfoque: typeof useEnfoque }
  w.__store = useStore
  w.__enfoque = useEnfoque
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

// Detectar si estamos en la página de verificación
const esVerificacion = window.location.pathname.startsWith('/verify')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Duración por defecto de toda animación sin transición propia: 200 ms
        (token --dur-media de index.css; el rango de la app es 150-250 ms). */}
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}>
      {esVerificacion ? <VerificarView /> : <App />}
    </MotionConfig>
  </StrictMode>,
)

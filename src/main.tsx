import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import '@fontsource-variable/figtree'
import './index.css'
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

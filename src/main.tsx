import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.tsx'
// historial de "Volver" y scroll por vista (se engancha al store)
import './services/navegacion'
import { VerificarView } from './components/views/VerificarView.tsx'
import { useStore } from './store/useStore'

// Solo en desarrollo: acceso al store desde la consola / pruebas automatizadas.
if (import.meta.env.DEV) (window as unknown as { __store: typeof useStore }).__store = useStore

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

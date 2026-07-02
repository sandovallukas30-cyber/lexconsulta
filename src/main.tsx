import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.tsx'
import { VerificarView } from './components/views/VerificarView.tsx'

// Detectar si estamos en la página de verificación
const esVerificacion = window.location.pathname.startsWith('/verify')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      {esVerificacion ? <VerificarView /> : <App />}
    </MotionConfig>
  </StrictMode>,
)

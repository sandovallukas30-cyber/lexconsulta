import { MotionConfig } from 'framer-motion'
import App from './App.tsx'
import { useAjustes } from './store/useAjustes'
import { PaginaLegal } from './components/views/PaginaLegal.tsx'
import { documentoLegalDe } from './services/rutasLegales'
import { rutaConocida } from './services/rutas'
import { PaginaNoEncontrada } from './components/views/PaginaNoEncontrada.tsx'

const documentoLegal = documentoLegalDe(window.location.pathname)
const noExiste = !documentoLegal && !rutaConocida(window.location.pathname)

/** Raíz de la app: movimiento de Framer según los ajustes y la vista que corresponde. */
export function Raiz() {
  const animaciones = useAjustes((s) => s.animaciones)
  return (
    // Duración por defecto de toda animación sin transición propia: 200 ms
    // (token --dur-media de index.css; el rango de la app es 150-250 ms).
    <MotionConfig reducedMotion={animaciones ? 'user' : 'always'} transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}>
      {documentoLegal ? <PaginaLegal documento={documentoLegal} /> : noExiste ? <PaginaNoEncontrada /> : <App />}
    </MotionConfig>
  )
}

import { motion } from 'framer-motion'

// En pantallas táctiles (celulares y tablets modestos) la animación de acomodo mide el DOM en cada cambio y puede
// entrecortarse: ahí solo se anima la entrada y la salida de cada fila, no el desplazamiento de las demás.
const TACTIL = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** Elemento de una lista que aparece y desaparece con suavidad (alto + opacidad) y deja que los demás
 *  se acomoden. Va dentro de un <AnimatePresence initial={false}>: el primer dibujado no anima.
 *  `acomodar={false}` para columnas CSS, donde la animación de layout se descontrola.
 *  El recorte (overflow) solo está activo mientras se anima, para no cortar sombras ni anillos de foco. */
export function ItemLista({ as = 'li', children, className, acomodar = true }: { as?: 'li' | 'div'; children: React.ReactNode; className?: string; acomodar?: boolean }) {
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      layout={acomodar && !TACTIL ? 'position' : false}
      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
      animate={{ opacity: 1, height: 'auto', overflow: 'visible', transition: { duration: 0.2, ease: [0.2, 0, 0, 1], overflow: { delay: 0.2, duration: 0 } } }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden', transition: { duration: 0.16, ease: [0.2, 0, 0, 1] } }}
      className={className}
    >
      {children}
    </Tag>
  )
}

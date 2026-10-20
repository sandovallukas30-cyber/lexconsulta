import { motion } from 'framer-motion'

/** Elemento de una lista que aparece y desaparece con suavidad (alto + opacidad) y deja que los demás
 *  se acomoden. Va dentro de un <AnimatePresence initial={false}>: el primer dibujado no anima.
 *  El recorte (overflow) solo está activo mientras se anima, para no cortar sombras ni anillos de foco. */
export function ItemLista({ as = 'li', children, className }: { as?: 'li' | 'div'; children: React.ReactNode; className?: string }) {
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      layout="position"
      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
      animate={{ opacity: 1, height: 'auto', overflow: 'visible', transition: { duration: 0.2, ease: [0.2, 0, 0, 1], overflow: { delay: 0.2, duration: 0 } } }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden', transition: { duration: 0.16, ease: [0.2, 0, 0, 1] } }}
      className={className}
    >
      {children}
    </Tag>
  )
}

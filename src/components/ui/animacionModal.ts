/** Entrada y salida comunes de los modales. Se esparcen sobre `motion.div` y requieren un
 *  <AnimatePresence> en quien monta el modal (sin él la salida no se ve). */
export const fondoModal = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
}
export const panelModal = {
  initial: { opacity: 0, y: 10, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.985 },
  transition: { duration: 0.2, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
}

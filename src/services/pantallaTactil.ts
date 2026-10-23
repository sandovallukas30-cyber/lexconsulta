/** ¿El dispositivo se maneja con el dedo (celular o tablet)? Con mouse no existen los gestos de deslizar. */
export const esPantallaTactil = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

/** Interruptores del producto: lo que se muestra o no, sin tocar el resto del código. */

/** Pasapalabra y Ahorcado usan IA (cuesta dinero por partida). Apagados desde 2026-11-17 (Prima Lex es gratis).
 *  Para volver a encenderlos: poner `true` aquí Y definir JUEGOS_IA_ACTIVOS=1 en las variables de Vercel
 *  (el servidor rechaza las llamadas si esa variable no está). */
export const JUEGOS_IA_ACTIVOS = false

/** Enlace de donación (Mercado Pago, Flow, Cafecito, etc.). Se define en Vercel como VITE_DONACION_URL.
 *  Sin valor, no se muestra ningún botón ni texto de donación. Solo se acepta https. */
const crudo = (import.meta.env.VITE_DONACION_URL as string | undefined)?.trim() ?? ''
export const DONACION_URL: string | null = /^https:\/\/[^\s]+$/i.test(crudo) ? crudo : null

/** Correo público de contacto: aparece en la política de privacidad y en los términos. */
export const CORREO_CONTACTO = 'primalex.contacto@gmail.com'

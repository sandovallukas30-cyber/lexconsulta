/**
 * Recordar «dónde iba» al pasar de leer un apunte a editarlo (y al volver).
 *
 * El lector y el editor son dos pantallas distintas con alturas distintas, así
 * que no sirve copiar el scroll en píxeles. Se guarda el TEXTO del primer
 * bloque visible (más la fracción recorrida, de respaldo) y en la otra pantalla
 * se busca ese mismo bloque y se lo deja arriba.
 */
export interface AnclaScroll {
  texto: string
  ratio: number
}

const BLOQUES = 'h1,h2,h3,h4,p,li,td,th,blockquote'
const LARGO_CLAVE = 40

const normalizar = (t: string | null) => (t ?? '').replace(/\s+/g, ' ').trim()

/** Bloques «hoja»: los que no contienen a otros (un li con p adentro cuenta como p). */
function hojas(raiz: HTMLElement): HTMLElement[] {
  return Array.from(raiz.querySelectorAll<HTMLElement>(BLOQUES)).filter((el) => !el.querySelector(BLOQUES))
}

export function leerAncla(cont: HTMLElement | null, raiz: HTMLElement | null): AnclaScroll | null {
  if (!cont || !raiz) return null
  const max = cont.scrollHeight - cont.clientHeight
  const ratio = max > 0 ? cont.scrollTop / max : 0
  const arriba = cont.getBoundingClientRect().top
  let texto = ''
  for (const el of hojas(raiz)) {
    if (el.getBoundingClientRect().bottom <= arriba + 8) continue
    const t = normalizar(el.textContent)
    if (t.length >= 6) {
      texto = t.slice(0, LARGO_CLAVE)
      break
    }
  }
  return { texto, ratio }
}

/** Deja el bloque del ancla arriba del contenedor. Devuelve ese bloque (o null si usó la fracción). */
export function irAAncla(cont: HTMLElement | null, raiz: HTMLElement | null, ancla: AnclaScroll | null): HTMLElement | null {
  if (!cont || !raiz || !ancla) return null
  const base = cont.getBoundingClientRect().top
  const topDe = (el: HTMLElement) => el.getBoundingClientRect().top - base + cont.scrollTop
  let destino: HTMLElement | null = null
  if (ancla.texto) {
    const total = Math.max(1, cont.scrollHeight)
    let mejor = Infinity
    for (const el of hojas(raiz)) {
      if (!normalizar(el.textContent).startsWith(ancla.texto)) continue
      // si el texto se repite, vale el que esté más cerca de la fracción recorrida
      const dist = Math.abs(topDe(el) / total - ancla.ratio)
      if (dist < mejor) {
        mejor = dist
        destino = el
      }
    }
  }
  if (destino) {
    cont.scrollTop = Math.max(0, topDe(destino) - 8)
    return destino
  }
  cont.scrollTop = ancla.ratio * Math.max(0, cont.scrollHeight - cont.clientHeight)
  return null
}

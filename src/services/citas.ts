import { abreviaturaCita, obtenerMetadata } from '../data/codigosMetadata'
import type { Articulo, CodigoTipo } from '../types'
import type { UbicacionCita } from './incisos'

/** "Art. 1545 CC", "Art. 3 transitorio Ley 19.496" (C7). El id del JSON ya
 *  trae "Art."; los numerales del auto acordado ("N° 3") se dejan tal cual. */
export function citaArticulo(tipo: CodigoTipo, idArticulo: string): string {
  return `${idArticulo.trim()} ${abreviaturaCita(tipo)}`
}

/** Cita corta como se escribe en un trabajo chileno: «art. 1445 inc. 2° CC», «art. 19 N° 3 inc. 6° CPR»,
 *  «art. 65 inc. 4° N° 6 CPR», «art. 23 Ley 19.620». Minúscula (va entre paréntesis en el texto corrido), con las
 *  abreviaturas de códigos de uso frecuente (CC, CCom, CPR…). Orden: artículo → inciso → número → letra; cuando el número
 *  trae incisos propios (art. 19) el número va primero y el inciso se cuenta dentro de él. */
export function citaPrecisa(tipo: CodigoTipo, idArticulo: string, u?: UbicacionCita | null): string {
  const art = idArticulo.trim().replace(/^Art(?:[íi]culo)?\.?\s*/i, '')
  const partes = [`art. ${art}`]
  const inc = u?.inciso ? `inc. ${u.inciso}°` : null
  const num = u?.numero ? `N° ${u.numero}` : null
  if (u?.propio) partes.push(...[num, inc].filter((x): x is string => !!x))
  else partes.push(...[inc, num].filter((x): x is string => !!x))
  if (u?.letra) partes.push(`letra ${u.letra})`)
  partes.push(abreviaturaCita(tipo))
  return partes.join(' ')
}

/** Cita de una selección que abarca varios párrafos: si son incisos seguidos del mismo nivel, «art. 1445 incs. 2° a 4° CC»;
 *  si no, se cita desde el primero hasta el último («art. 19 N° 3 incs. 1° a 3° CPR» o, en otros casos, el primero y el último). */
export function citaDeVarios(tipo: CodigoTipo, idArticulo: string, ubicaciones: (UbicacionCita | null)[]): string {
  const u = ubicaciones.filter((x): x is UbicacionCita => !!x)
  if (u.length === 0) return citaPrecisa(tipo, idArticulo)
  const primero = u[0]
  const ultimo = u[u.length - 1]
  const mismaBase = u.every((x) => x.numero === primero.numero && x.letra === null && x.propio === primero.propio)
  if (mismaBase && primero.letra === null) {
    const art = idArticulo.trim().replace(/^Art(?:[íi]culo)?\.?\s*/i, '')
    // el primer párrafo de un número va sin inciso («N° 3»): equivale al inciso 1.°
    const desde = primero.inciso ?? (primero.numero ? 1 : null)
    const hasta = ultimo.inciso ?? (ultimo.numero ? 1 : null)
    if (desde !== null && hasta !== null && hasta > desde) {
      const num = primero.numero ? `N° ${primero.numero} ` : ''
      return `art. ${art} ${num}incs. ${desde}° a ${hasta}° ${abreviaturaCita(tipo)}`
    }
  }
  const a = citaPrecisa(tipo, idArticulo, primero)
  const b = citaPrecisa(tipo, idArticulo, ultimo)
  return a === b ? a : `${a} a ${b.replace(/^art\. \S+ /, '')}`
}

/** Lo que queda en el portapapeles al copiar una frase seleccionada: «frase» (art. 1445 inc. 2° CC). */
export function frasesConCita(tipo: CodigoTipo, idArticulo: string, frase: string, u?: UbicacionCita | null): string {
  return `«${frase.trim().replace(/\s+/g, ' ')}» (${citaPrecisa(tipo, idArticulo, u)})`
}

/** Texto que queda en el portapapeles con "Copiar con cita": la cita, el
 *  texto OFICIAL (sin modernizar) y la fuente, para pegarlo en un escrito o
 *  un apunte sin perder de dónde salió. */
export function textoConCita(tipo: CodigoTipo, articulo: Articulo): string {
  const meta = obtenerMetadata(tipo)
  const fuente = meta ? `Fuente: ${meta.nombreOficial} — ${meta.norma}. ${meta.fuenteUrl}` : ''
  return [citaArticulo(tipo, articulo.a), articulo.t.trim(), fuente].filter(Boolean).join('\n\n')
}

export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    // sin permiso o contexto no seguro: el método antiguo
    const area = document.createElement('textarea')
    area.value = texto
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

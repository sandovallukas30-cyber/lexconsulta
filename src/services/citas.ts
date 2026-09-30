import { abreviaturaCita, obtenerMetadata } from '../data/codigosMetadata'
import type { Articulo, CodigoTipo } from '../types'

/** "Art. 1545 CC", "Art. 3 transitorio Ley 19.496" (C7). El id del JSON ya
 *  trae "Art."; los numerales del auto acordado ("N° 3") se dejan tal cual. */
export function citaArticulo(tipo: CodigoTipo, idArticulo: string): string {
  return `${idArticulo.trim()} ${abreviaturaCita(tipo)}`
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

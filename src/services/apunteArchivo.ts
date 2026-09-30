import type { ApunteModulo } from '../types'
import { normalizarTexto, quitarMarcas, separarTitulo } from './apunteFormato'

/** Exportar un apunte a .md con la MISMA sintaxis que acepta "Importar", de
 *  modo que exportar → importar deje título y contenido idénticos (B4).
 *
 *  Formato:  "# <título>\n\n<contenido>\n"
 *
 *  Dos detalles para que el viaje de ida y vuelta sea exacto:
 *  - El importador limpia las marcas del título ("# **Clase 3**" → "Clase
 *    3"). Si el título tiene caracteres que se leerían como marca, se
 *    escriben como entidad numérica (`&#42;`), que el importador decodifica.
 *  - El importador normaliza saltos de línea, espacios duros y sangrías, y
 *    recorta el final: se exporta ya normalizado. Un apunte guardado desde la
 *    app ya está en esa forma, así que no cambia; uno pegado con "\r\n" o
 *    espacios duros queda normalizado (se ve igual). */

const CARACTERES_MARCA = /[*_=+~^,{}|&]/g

function tituloSeguro(titulo: string): string {
  const limpio = titulo.replace(/\s+/g, ' ').trim()
  if (quitarMarcas(limpio) === limpio && !limpio.includes('&#')) return limpio
  return limpio.replace(CARACTERES_MARCA, (c) => `&#${c.codePointAt(0)};`)
}

export function contenidoNormalizado(contenido: string): string {
  return normalizarTexto(contenido).replace(/^\n+/, '').trimEnd()
}

export function apunteAMarkdown(apunte: Pick<ApunteModulo, 'titulo' | 'contenido'>): string {
  const cuerpo = contenidoNormalizado(apunte.contenido)
  return `# ${tituloSeguro(apunte.titulo) || 'Apunte'}\n\n${cuerpo}\n`
}

/** Lo que haría "Importar" con este texto (mismo algoritmo que TabApuntes). */
export function markdownAApunte(texto: string, nombreArchivo = 'Apunte importado'): { titulo: string; contenido: string } {
  const { titulo, cuerpo } = separarTitulo(texto.replace(/^\uFEFF/, ''))
  return {
    titulo: (titulo ?? nombreArchivo.replace(/\.[^.]+$/, '')).trim() || 'Apunte importado',
    contenido: cuerpo.trimEnd(),
  }
}

export function nombreArchivoApunte(titulo: string): string {
  return `${titulo.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'apunte'}.md`
}

export function descargarApunteMd(apunte: Pick<ApunteModulo, 'titulo' | 'contenido'>) {
  const blob = new Blob([apunteAMarkdown(apunte)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivoApunte(apunte.titulo)
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

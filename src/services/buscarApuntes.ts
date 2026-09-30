import type { DatosAcademicosModulo, Ramo } from '../types'
import { MODULOS } from '../data/modulos'
import { textoPlanoDe } from './apunteFormato'

/** Búsqueda de texto completo en los apuntes de TODOS los módulos y ramos
 *  (B2). Sin índice persistente: los apuntes de un estudiante son a lo más
 *  unos cientos de KB, recorrerlos en cada tecla toma pocos ms. Ignora
 *  mayúsculas y tildes ("prescripcion" encuentra "Prescripción"). */

export interface FragmentoCoincidencia {
  antes: string
  coincidencia: string
  despues: string
}

export interface ResultadoApunte {
  moduloId: string
  apunteId: string
  titulo: string
  /** "Derecho Civil I · Cuaderno 1" -- dónde vive el apunte. */
  ubicacion: string
  fragmento: FragmentoCoincidencia | null
  enTitulo: boolean
  puntaje: number
}

/** Texto normalizado + mapa de cada posición normalizada a su posición en
 *  el original, para poder recortar el fragmento del texto REAL (con sus
 *  tildes y mayúsculas) a partir de una coincidencia en el normalizado. */
export function normalizarConMapa(texto: string): { norm: string; mapa: number[] } {
  let norm = ''
  const mapa: number[] = []
  for (let i = 0; i < texto.length; i++) {
    const n = texto[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    for (let k = 0; k < n.length; k++) {
      norm += n[k]
      mapa.push(i)
    }
  }
  return { norm, mapa }
}

export function normalizarConsulta(q: string): string[] {
  return q
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 0)
}

const CONTEXTO = 60

export function fragmentoEn(texto: string, palabras: string[]): { fragmento: FragmentoCoincidencia; ocurrencias: number } | null {
  const { norm, mapa } = normalizarConMapa(texto)
  let ocurrencias = 0
  let primera = -1
  let largoPrimera = 0
  for (const p of palabras) {
    let desde = 0
    let hallada = false
    for (;;) {
      const i = norm.indexOf(p, desde)
      if (i < 0) break
      hallada = true
      ocurrencias++
      if (primera < 0 || (p === palabras[0] && i < primera)) {
        primera = i
        largoPrimera = p.length
      }
      desde = i + p.length
    }
    if (!hallada) return null
  }
  if (primera < 0) return null
  // Si la consulta completa aparece como frase ("idea clave 37"), el
  // fragmento se centra ahí y no en la primera aparición de su primera palabra.
  const frase = palabras.join(' ')
  const iFrase = palabras.length > 1 ? norm.indexOf(frase) : -1
  if (iFrase >= 0) {
    primera = iFrase
    largoPrimera = frase.length
  }
  const ini = mapa[primera]
  const fin = mapa[primera + largoPrimera - 1] + 1
  const desdeCtx = Math.max(0, ini - CONTEXTO)
  const hastaCtx = Math.min(texto.length, fin + CONTEXTO)
  const limpiar = (s: string) => s.replace(/\s+/g, ' ')
  return {
    ocurrencias,
    fragmento: {
      antes: (desdeCtx > 0 ? '…' : '') + limpiar(texto.slice(desdeCtx, ini)).trimStart(),
      coincidencia: texto.slice(ini, fin),
      despues: limpiar(texto.slice(fin, hastaCtx)).trimEnd() + (hastaCtx < texto.length ? '…' : ''),
    },
  }
}

function nombreModulo(moduloId: string, ramos: Ramo[]): string {
  return MODULOS.find((m) => m.id === moduloId)?.nombre ?? ramos.find((r) => r.id === moduloId)?.nombre ?? 'Módulo'
}

export function buscarEnApuntes(
  academicoModulos: Record<string, DatosAcademicosModulo>,
  ramos: Ramo[],
  consulta: string,
  limite = 8
): ResultadoApunte[] {
  const palabras = normalizarConsulta(consulta)
  if (palabras.length === 0 || palabras.join('').length < 2) return []
  const resultados: ResultadoApunte[] = []
  for (const [moduloId, datos] of Object.entries(academicoModulos)) {
    // un id de Ramo eliminado (datos huérfanos de antes de la limpieza) no
    // tiene a dónde navegar: se omite
    if (!MODULOS.some((m) => m.id === moduloId) && !ramos.some((r) => r.id === moduloId)) continue
    for (const a of datos.apuntes) {
      const tituloNorm = normalizarConMapa(a.titulo).norm
      const enTitulo = palabras.every((p) => tituloNorm.includes(p))
      const enCuerpo = fragmentoEn(textoPlanoDe(a.contenido), palabras)
      if (!enTitulo && !enCuerpo) continue
      const cuaderno = a.cuadernoId ? datos.cuadernos?.find((c) => c.id === a.cuadernoId)?.nombre : undefined
      resultados.push({
        moduloId,
        apunteId: a.id,
        titulo: a.titulo,
        ubicacion: [nombreModulo(moduloId, ramos), cuaderno].filter(Boolean).join(' · '),
        fragmento: enCuerpo?.fragmento ?? null,
        enTitulo,
        puntaje: (enTitulo ? 10 : 0) + Math.min(10, enCuerpo?.ocurrencias ?? 0) + a.fechaModificacion / 1e15,
      })
    }
  }
  return resultados.sort((x, y) => y.puntaje - x.puntaje).slice(0, limite)
}

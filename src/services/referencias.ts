// Detecta referencias a otros artículos DENTRO del texto oficial de un
// artículo ("conforme al artículo 1698", "los artículos 44 y 1547", "el
// artículo anterior", "según el artículo 391 del Código Penal") y las
// convierte en datos navegables (código + número) para poder renderizarlas
// como enlaces clicables.
//
// Puramente sintáctico (regex sobre patrones de cita legal chilena), sin IA:
// no interpreta el CONTENIDO de la referencia, solo reconoce su forma. Por
// diseño puede tener falsos negativos (una redacción poco común que no
// matchea ningún patrón) pero evita falsos positivos costosos — más vale no
// detectar una referencia rara que crear un enlace a un artículo equivocado.
// La verificación de que el artículo referido REALMENTE EXISTE en los datos
// cargados es responsabilidad de quien renderiza (ver TextoResaltable.tsx),
// no de este archivo: acá solo se reconoce el patrón de texto.

import type { CodigoTipo } from '../types'
import { obtenerCodigo } from './codigos'

export interface ReferenciaArticulo {
  codigo: CodigoTipo
  articulo: string // formato "Art. N" o "Art. N bis", igual que Articulo.a
}

export interface CoincidenciaReferencia {
  inicio: number
  fin: number
  referencia: ReferenciaArticulo
}

/** Nombres tal como aparecen en redacción legal corrida, de más específico a
 * menos específico (ej. "Código Procesal Penal" antes que "Código Penal": si
 * se revisara en el orden contrario, "Código Procesal Penal" matchearía
 * primero como "Código Penal" por contener esa subcadena). Cubre los códigos
 * con nombre "Código de/del X"; las leyes especiales (Ley Karin, Ley de
 * Drogas, etc.) casi nunca se citan como "artículo N de la Ley tal" dentro
 * de OTRO cuerpo legal en la práctica chilena, así que quedan fuera por
 * ahora — no vale la pena el riesgo de falsos positivos por tan poco caso de
 * uso real. */
const NOMBRES_CODIGO: { patron: RegExp; tipo: CodigoTipo }[] = [
  { patron: /c[oó]digo procesal penal/i, tipo: 'ppe' },
  { patron: /c[oó]digo de procedimiento penal/i, tipo: 'ppe' },
  { patron: /c[oó]digo de procedimiento civil/i, tipo: 'pci' },
  { patron: /c[oó]digo org[aá]nico de tribunales/i, tipo: 'cot' },
  { patron: /c[oó]digo de justicia militar/i, tipo: 'mil' },
  { patron: /c[oó]digo civil/i, tipo: 'civ' },
  { patron: /c[oó]digo penal/i, tipo: 'pen' },
  { patron: /c[oó]digo (del )?trabajo/i, tipo: 'lab' },
  { patron: /c[oó]digo tributario/i, tipo: 'tri' },
  { patron: /c[oó]digo de comercio/i, tipo: 'com' },
  { patron: /c[oó]digo de miner[ií]a/i, tipo: 'min' },
  { patron: /c[oó]digo de aguas/i, tipo: 'agu' },
  { patron: /c[oó]digo sanitario/i, tipo: 'san' },
  { patron: /constituci[oó]n( pol[ií]tica)?( de la rep[uú]blica)?/i, tipo: 'con' },
]

/** Busca un nombre de código en una ventana corta de texto DESPUÉS del
 * número (p. ej. "artículo 391 **del Código Penal**"). Una ventana angosta
 * (80 caracteres) evita capturar una mención de código que en realidad
 * pertenece a la oración siguiente, sin relación con este número. */
function codigoMencionadoCerca(texto: string, desde: number): CodigoTipo | null {
  const ventana = texto.slice(desde, desde + 80)
  for (const { patron, tipo } of NOMBRES_CODIGO) {
    if (patron.test(ventana)) return tipo
  }
  return null
}

/** Otros cuerpos normativos con numeración propia de artículos que NO están
 * indexados en la app (decretos, resoluciones, leyes sin código asociado en
 * NOMBRES_CODIGO). Caso real que motivó esto: Código Civil, art. 2472,
 * "...de acuerdo con el inciso cuarto del artículo 42 **del decreto ley
 * Nº 3.500**..." — sin este chequeo, al no reconocer "decreto ley" como un
 * código, el número caía por defecto al código ACTUAL (Civil), armando un
 * enlace a un Art. 42 real pero completamente ajeno al que el texto cita.
 * Mejor no ofrecer ningún enlace ahí que ofrecer uno equivocado. */
const PATRON_OTRO_CUERPO_NORMATIVO = /\b(decretos?( ley|s? supremos?)?|resoluci[oó]n(es)?|circular(es)?|dict[aá]men(es)?|oficio(s)?|dfl|ley(es)?\s+n[°º]?\.?\s*\d)/i

function referenciaAOtroCuerpoNormativo(texto: string, desde: number): boolean {
  return PATRON_OTRO_CUERPO_NORMATIVO.test(texto.slice(desde, desde + 80))
}

/** "163 bis" -> "Art. 163 bis". Mantiene el sufijo (bis/ter/quáter) tal como
 * viene escrito en el texto original, en minúscula, igual que el formato
 * real de los datos (ver codigoTrabajo.json: "Art. 163 bis"). */
function normalizarNumero(numero: string, sufijo: string | undefined): string {
  return sufijo ? `Art. ${numero} ${sufijo.toLowerCase()}` : `Art. ${numero}`
}

const PATRON_LISTA = /\bart(?:í|i)culos?\.?\s+((?:\d{1,4}(?:\s*(?:bis|ter|qu[áa]ter))?\s*(?:,\s*|\s+y\s+|\s+o\s+))*\d{1,4}(?:\s*(?:bis|ter|qu[áa]ter))?)/gi
const PATRON_NUMERO_INDIVIDUAL = /(\d{1,4})(?:\s*(bis|ter|qu[áa]ter))?/gi
const PATRON_RELATIVO = /\bart(?:í|i)culo\s+(anterior|siguiente)\b/gi

/**
 * Detecta todas las referencias a artículos dentro de `texto`. `codigoActual`
 * y `articuloActual` (el artículo que se está leyendo) son necesarios para:
 * (a) asumir que una referencia sin código explícito ("el artículo 44") es
 * del MISMO código, y (b) resolver "el artículo anterior/siguiente" en
 * relación al número actual.
 *
 * Los resultados vienen con offsets (`inicio`/`fin`) en `texto`, no
 * ordenados por confianza sino por posición — quien renderiza decide qué
 * hacer si dos coincidencias se solaparan (no debería pasar dado que los
 * patrones no se cruzan entre sí, pero por si acaso conviene no asumirlo).
 */
export function detectarReferencias(
  texto: string,
  codigoActual: CodigoTipo,
  articuloActual: string
): CoincidenciaReferencia[] {
  const resultado: CoincidenciaReferencia[] = []

  // 1. Listas explícitas: "artículo 1698", "artículos 44, 45 y 1547".
  for (const m of texto.matchAll(PATRON_LISTA)) {
    const listaNumeros = m[1]
    const inicioLista = m.index! + m[0].indexOf(listaNumeros)
    const finMatch = m.index! + m[0].length
    const codigoMencionado = codigoMencionadoCerca(texto, finMatch)
    // Si cerca hay un "decreto ley", "resolución", "ley N°", etc. y NO un
    // código conocido, esto no es una cita a ESTE código ni a otro
    // indexado — es mejor no ofrecer ningún enlace que ofrecer uno
    // equivocado por asumir "mismo código" a ciegas (ver comentario en
    // referenciaAOtroCuerpoNormativo).
    if (!codigoMencionado && referenciaAOtroCuerpoNormativo(texto, finMatch)) continue
    const codigoDestino = codigoMencionado ?? codigoActual

    for (const n of listaNumeros.matchAll(PATRON_NUMERO_INDIVIDUAL)) {
      const inicio = inicioLista + n.index!
      const fin = inicio + n[0].length
      // No referenciarse a sí mismo (pasaría si el propio artículo se cita a
      // sí mismo, ej. "conforme a lo dispuesto en este mismo artículo 44").
      const articuloDetectado = normalizarNumero(n[1], n[2])
      if (codigoDestino === codigoActual && articuloDetectado === articuloActual) continue
      resultado.push({ inicio, fin, referencia: { codigo: codigoDestino, articulo: articuloDetectado } })
    }
  }

  // 2. Relativas: "el artículo anterior/siguiente". Solo se resuelven si el
  // artículo actual tiene un número limpio (sin bis/ter/otro sufijo) — con
  // sufijo, "anterior/siguiente" es ambiguo (¿el 163, o el 162 ter si
  // existiera?) y una referencia mal resuelta es peor que no ofrecerla.
  const numeroActual = /^Art\.\s*(\d+)$/.exec(articuloActual)
  if (numeroActual) {
    const base = parseInt(numeroActual[1], 10)
    for (const m of texto.matchAll(PATRON_RELATIVO)) {
      const destino = m[1].toLowerCase() === 'anterior' ? base - 1 : base + 1
      if (destino < 1) continue
      resultado.push({
        inicio: m.index!,
        fin: m.index! + m[0].length,
        referencia: { codigo: codigoActual, articulo: `Art. ${destino}` },
      })
    }
  }

  return resultado.sort((a, b) => a.inicio - b.inicio)
}

/**
 * Descarta las coincidencias que apuntan a un artículo que en realidad NO
 * existe en los datos cargados (typo en el texto fuente, número mal escrito,
 * un "artículo siguiente" que resultó no existir, un código que aún no
 * terminó de cargar). Un enlace roto en una herramienta de estudio legal es
 * peor que no ofrecer el enlace — se prefiere fallar en silencio y dejar esa
 * porción como texto plano.
 */
export function filtrarReferenciasExistentes(coincidencias: CoincidenciaReferencia[]): CoincidenciaReferencia[] {
  return coincidencias.filter((c) => {
    const datos = obtenerCodigo(c.referencia.codigo)
    return datos?.articulos.some((a) => a.a === c.referencia.articulo) ?? false
  })
}

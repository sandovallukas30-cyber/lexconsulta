/**
 * Formato de los Apuntes -- texto plano con una sintaxis liviana (parecida a
 * Markdown, pero propia) que se escribe a mano, se pega desde Notion o se
 * importa desde un archivo .md/.txt. Este módulo solo interpreta el texto y
 * no sabe nada de React: lo usan el Modo Lectura, la Vista previa del editor,
 * la voz (texto plano) y el índice de títulos.
 *
 * Sintaxis en línea:
 *   **negrita**  (también *negrita*)     __subrayado__ (también _subrayado_)
 *   ~cursiva~    ==rojo==                ++resaltado amarillo++
 *   Se pueden anidar: ==**Art. 1545**==, ++ejemplo con ==rojo== adentro++.
 *
 * Bloques (una línea por bloque, salvo listas/tablas/recuadros/columnas):
 *   # Título   ## Subtítulo   ### Sección
 *   - viñeta  /  1. numerada     (la sangría con tab anida; una línea con tab y
 *                                 sin marca continúa el punto anterior)
 *   > 📝 recuadro                (varias líneas con > forman un solo recuadro)
 *   | a | b |  con |---|---|      tabla
 *   ---                          separador
 *   :::columnas ... :::col ... :::   columnas
 */

export type Bloque =
  | { t: 'h'; n: 1 | 2 | 3; texto: string; id: string }
  | { t: 'hr' }
  | { t: 'p'; texto: string; sangria: number }
  | { t: 'lista'; items: ItemLista[] }
  | { t: 'cita'; icono: string; hijos: Bloque[] }
  | { t: 'cols'; cols: Bloque[][] }
  | { t: 'tabla'; filas: string[][]; encabezado: boolean }

export interface ItemLista {
  /** 'vineta' para "- ", o el texto literal de la numeración ("1.", "2)"). */
  marca: 'vineta' | string
  texto: string
  hijos: Bloque[]
}

const RE_EMOJI_INICIAL = /^\p{Extended_Pictographic}[\u{FE0F}]?/u
const RE_ITEM = /^(\t*)(?:-(?![-\s]|$)\s?|-\s+(?=\S)|(\d{1,3}[.)])\s+)(.*)$/
const RE_SEPARADOR_TABLA = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

interface Item {
  tabs: number
  marca: 'vineta' | string
  texto: string
}

function matchItem(linea: string): Item | null {
  const m = RE_ITEM.exec(linea)
  if (!m) return null
  const tabs = m[1].length
  const numerada = m[2]
  if (numerada) return { tabs, marca: numerada, texto: m[3].trim() }
  return { tabs, marca: 'vineta', texto: m[3].trim() }
}

function cuentaTabs(linea: string): number {
  let n = 0
  while (linea[n] === '\t') n++
  return n
}

function esBlanca(linea: string): boolean {
  return linea.trim() === ''
}

function esEstructural(linea: string): boolean {
  const t = linea.trim()
  return /^#{1,3}\s/.test(t) || /^(-{3,}|\*{3,}|_{3,})$/.test(t) || t.startsWith('>') || t.startsWith('|') || /^:::/.test(t) || matchItem(linea) !== null
}

/** Parte una fila `| a | b |` en celdas, sin cortar el `|` de una nota `{{a|nota}}`. */
export function dividirCeldas(fila: string): string[] {
  return fila
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/\|(?![^{}]*\}\})/)
    .map((c) => c.trim())
}

function proximaNoBlanca(lineas: string[], desde: number): number {
  let i = desde
  while (i < lineas.length && esBlanca(lineas[i])) i++
  return i
}

/** Normaliza saltos de línea, espacios raros y tabs -- lo que llega pegado
 *  desde Word/Notion/PDF suele traer \r\n, espacios duros o sangrías con
 *  espacios en vez de tab. */
export function normalizarTexto(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/^( {2,})(?=(?:-\S|-\s+\S|\d{1,3}[.)]\s+\S))/gm, (m) => {
      const espacios = m.length
      return '\t'.repeat(espacios % 4 === 0 ? espacios / 4 : Math.round(espacios / 2))
    })
}

export function parsearApunte(texto: string): Bloque[] {
  const lineas = normalizarTexto(texto).split('\n')
  const contador = { h: 0 }
  return parsearBloques(lineas, contador)
}

function parsearBloques(lineas: string[], contador: { h: number }): Bloque[] {
  const salida: Bloque[] = []
  let i = 0
  while (i < lineas.length) {
    const linea = lineas[i]
    if (esBlanca(linea)) {
      i++
      continue
    }
    const t = linea.trim()

    // columnas
    if (/^:::columnas\s*$/i.test(t)) {
      let profundidad = 1
      let j = i + 1
      const cols: string[][] = [[]]
      while (j < lineas.length) {
        const tj = lineas[j].trim()
        if (/^:::columnas\s*$/i.test(tj)) profundidad++
        else if (/^:::\s*$/.test(tj)) {
          profundidad--
          if (profundidad === 0) break
        } else if (/^:::col\s*$/i.test(tj) && profundidad === 1) {
          cols.push([])
          j++
          continue
        }
        cols[cols.length - 1].push(lineas[j])
        j++
      }
      salida.push({ t: 'cols', cols: cols.map((c) => parsearBloques(c, contador)) })
      i = j + 1
      continue
    }

    // encabezado
    const mh = /^(#{1,3})\s+(.*)$/.exec(t)
    if (mh) {
      contador.h++
      salida.push({ t: 'h', n: mh[1].length as 1 | 2 | 3, texto: mh[2].trim(), id: `h${contador.h}` })
      i++
      continue
    }

    // separador
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      salida.push({ t: 'hr' })
      i++
      continue
    }

    // recuadro (cita)
    if (t.startsWith('>')) {
      const interior: string[] = []
      let j = i
      while (j < lineas.length && lineas[j].trim().startsWith('>')) {
        interior.push(lineas[j].trim().replace(/^>\s?/, ''))
        j++
      }
      let icono = ''
      const primera = interior.findIndex((l) => l.trim() !== '')
      if (primera >= 0) {
        const m = RE_EMOJI_INICIAL.exec(interior[primera].trim())
        if (m) {
          icono = m[0]
          interior[primera] = interior[primera].trim().slice(icono.length).trim()
        }
      }
      salida.push({ t: 'cita', icono, hijos: parsearBloques(interior, contador) })
      i = j
      continue
    }

    // tabla
    if (t.startsWith('|')) {
      const filas: string[][] = []
      let encabezado = false
      let j = i
      while (j < lineas.length && lineas[j].trim().startsWith('|')) {
        const fila = lineas[j].trim()
        if (RE_SEPARADOR_TABLA.test(fila)) {
          if (filas.length === 1) encabezado = true
        } else {
          filas.push(dividirCeldas(fila))
        }
        j++
      }
      if (filas.length > 0) salida.push({ t: 'tabla', filas, encabezado })
      i = j
      continue
    }

    // lista
    if (matchItem(linea)) {
      const { bloque, siguiente } = parsearLista(lineas, i)
      salida.push(bloque)
      i = siguiente
      continue
    }

    // párrafo (varias líneas seguidas sin sangría = un solo párrafo)
    const tabs = cuentaTabs(linea)
    const grupo: string[] = [t]
    let j = i + 1
    while (j < lineas.length && !esBlanca(lineas[j]) && !esEstructural(lineas[j]) && cuentaTabs(lineas[j]) === tabs) {
      grupo.push(lineas[j].trim())
      j++
    }
    salida.push({ t: 'p', texto: grupo.join('\n'), sangria: tabs })
    i = j
  }
  return salida
}

function parsearLista(lineas: string[], inicio: number): { bloque: Bloque; siguiente: number } {
  const raiz: ItemLista[] = []
  const pila: { depth: number; item: ItemLista }[] = []
  let i = inicio

  const agregarHijo = (padre: ItemLista, item: ItemLista) => {
    const ultimo = padre.hijos[padre.hijos.length - 1]
    if (ultimo && ultimo.t === 'lista') ultimo.items.push(item)
    else padre.hijos.push({ t: 'lista', items: [item] })
  }

  while (i < lineas.length) {
    const linea = lineas[i]
    if (esBlanca(linea)) {
      // una línea en blanco no corta la lista si lo que sigue todavía es
      // parte de ella (otro punto, o texto con sangría)
      const j = proximaNoBlanca(lineas, i)
      if (j < lineas.length && (matchItem(lineas[j]) || cuentaTabs(lineas[j]) > 0) && !esOtroBloque(lineas[j])) {
        i = j
        continue
      }
      break
    }
    const m = matchItem(linea)
    if (m) {
      const tope = pila.length ? pila[pila.length - 1].depth + 1 : 0
      const depth = Math.min(m.tabs, tope)
      while (pila.length && pila[pila.length - 1].depth >= depth) pila.pop()
      const item: ItemLista = { marca: m.marca, texto: m.texto, hijos: [] }
      if (pila.length === 0) raiz.push(item)
      else agregarHijo(pila[pila.length - 1].item, item)
      pila.push({ depth, item })
      i++
      continue
    }
    const tabs = cuentaTabs(linea)
    if (tabs > 0 && !esEstructural(linea) && pila.length) {
      while (pila.length > 1 && pila[pila.length - 1].depth > tabs - 1) pila.pop()
      pila[pila.length - 1].item.hijos.push({ t: 'p', texto: linea.trim(), sangria: 0 })
      i++
      continue
    }
    break
  }
  return { bloque: { t: 'lista', items: raiz }, siguiente: i }
}

function esOtroBloque(linea: string): boolean {
  const t = linea.trim()
  return /^#{1,3}\s/.test(t) || t.startsWith('>') || t.startsWith('|') || /^:::/.test(t) || /^(-{3,}|\*{3,}|_{3,})$/.test(t)
}

// ---------------------------------------------------------------------------
// Marcas en línea
// ---------------------------------------------------------------------------

/** Un solo regex para todas las marcas: el orden importa cuando dos empiezan
 *  en el mismo lugar (los pares dobles primero, para que "**a**" no se lea
 *  como "*" + "*a*" + "*"). La nota al margen es `{{texto anclado|nota}}`. */
export const RE_MARCAS =
  /(\{\{[^{}\n|]+\|[^{}\n]+\}\}|\+\+[^+\n]+\+\+|==[^=\n]+==|\*\*[^*\n]+\*\*|\*[^*\n]+\*|__[^_\n]+__|_[^_\n]+_|\^\^\^[^^\n]+\^\^\^|\^\^[^^\n]+\^\^|,,[^,\n]+,,|~(?=\S)[^~\n]*?\S~|~\S~)/

export type TipoMarca = 'amarillo' | 'rojo' | 'negrita' | 'subrayado' | 'cursiva' | 'grande' | 'enorme' | 'chico' | 'nota'

export interface TrozoInline {
  tipo: TipoMarca | null
  texto: string
  /** Solo para tipo 'nota': el texto de la nota al margen (`texto` es el ancla). */
  nota?: string
}

/** Un carácter que sería sintaxis se puede escribir como `&#42;` (código
 *  numérico) para que salga literal -- lo usa el editor visual al guardar. */
export function decodificarEntidades(texto: string): string {
  return texto.includes('&#') ? texto.replace(/&#(\d{1,6});/g, (_, n) => String.fromCodePoint(Number(n))) : texto
}

export function partirInline(texto: string): TrozoInline[] {
  return texto.split(RE_MARCAS).flatMap((parte): TrozoInline[] => {
    if (!parte) return []
    if (parte.startsWith('{{') && parte.endsWith('}}')) {
      const m = /^\{\{([^{}\n|]+)\|([^{}\n]+)\}\}$/.exec(parte)
      if (m) return [{ tipo: 'nota', texto: m[1], nota: decodificarEntidades(m[2]) }]
    }
    if (parte.length > 4 && parte.startsWith('++') && parte.endsWith('++')) return [{ tipo: 'amarillo', texto: parte.slice(2, -2) }]
    if (parte.length > 4 && parte.startsWith('==') && parte.endsWith('==')) return [{ tipo: 'rojo', texto: parte.slice(2, -2) }]
    if (parte.length > 4 && parte.startsWith('**') && parte.endsWith('**')) return [{ tipo: 'negrita', texto: parte.slice(2, -2) }]
    if (parte.length > 2 && parte.startsWith('*') && parte.endsWith('*')) return [{ tipo: 'negrita', texto: parte.slice(1, -1) }]
    if (parte.length > 4 && parte.startsWith('__') && parte.endsWith('__')) return [{ tipo: 'subrayado', texto: parte.slice(2, -2) }]
    if (parte.length > 2 && parte.startsWith('_') && parte.endsWith('_')) return [{ tipo: 'subrayado', texto: parte.slice(1, -1) }]
    if (parte.length > 6 && parte.startsWith('^^^') && parte.endsWith('^^^')) return [{ tipo: 'enorme', texto: parte.slice(3, -3) }]
    if (parte.length > 4 && parte.startsWith('^^') && parte.endsWith('^^')) return [{ tipo: 'grande', texto: parte.slice(2, -2) }]
    if (parte.length > 4 && parte.startsWith(',,') && parte.endsWith(',,')) return [{ tipo: 'chico', texto: parte.slice(2, -2) }]
    if (parte.length > 2 && parte.startsWith('~') && parte.endsWith('~')) return [{ tipo: 'cursiva', texto: parte.slice(1, -1) }]
    return [{ tipo: null, texto: decodificarEntidades(parte) }]
  })
}

/** Quita todas las marcas en línea, dejando solo el texto. */
export function quitarMarcas(texto: string): string {
  return partirInline(texto)
    .map((p) => (p.tipo ? quitarMarcas(p.texto) : p.texto))
    .join('')
}

// ---------------------------------------------------------------------------
// Derivados: índice de títulos, texto plano (voz, resumen), estructura ancha
// ---------------------------------------------------------------------------

export interface Encabezado {
  id: string
  n: 1 | 2 | 3
  texto: string
}

export function encabezadosDe(bloques: Bloque[]): Encabezado[] {
  const out: Encabezado[] = []
  const recorrer = (bs: Bloque[]) => {
    for (const b of bs) {
      if (b.t === 'h') out.push({ id: b.id, n: b.n, texto: quitarMarcas(b.texto) })
      else if (b.t === 'cita') recorrer(b.hijos)
      else if (b.t === 'cols') b.cols.forEach(recorrer)
      else if (b.t === 'lista') b.items.forEach((it) => recorrer(it.hijos))
    }
  }
  recorrer(bloques)
  return out
}

/** ¿Tiene columnas o tablas? Si sí, conviene darle más ancho a la lectura. */
export function tieneEstructuraAncha(bloques: Bloque[]): boolean {
  return bloques.some((b) => b.t === 'cols' || b.t === 'tabla' || (b.t === 'cita' && tieneEstructuraAncha(b.hijos)))
}

/** Texto limpio, sin marcas ni sintaxis -- para la voz y para los resúmenes
 *  de la lista de apuntes. Los saltos de línea quedan como puntos de pausa. */
export function textoPlanoDe(texto: string): string {
  const salida: string[] = []
  for (const cruda of normalizarTexto(texto).split('\n')) {
    let l = cruda.trim()
    if (!l || /^:::/.test(l) || /^(-{3,}|\*{3,}|_{3,})$/.test(l) || RE_SEPARADOR_TABLA.test(l)) continue
    l = l.replace(/^#{1,3}\s+/, '').replace(/^>\s?/, '')
    if (l.startsWith('|')) l = dividirCeldas(l).filter(Boolean).join(', ')
    l = l.replace(/^(?:-(?![-\s])\s?|-\s+)/, '').replace(/^(\d{1,3})[.)]\s+/, '$1. ')
    l = quitarMarcas(l).trim()
    if (l) salida.push(l)
  }
  return salida.join('\n')
}

export function resumenDe(texto: string, max = 220): string {
  const plano = textoPlanoDe(texto).replace(/\s+/g, ' ').trim()
  return plano.length > max ? plano.slice(0, max).trimEnd() + '…' : plano
}

/** Primer "# Título" del texto (si lo hay), y el resto sin esa línea -- para
 *  importar un archivo .md dejando el título en su campo. */
export function separarTitulo(texto: string): { titulo: string | null; cuerpo: string } {
  const t = normalizarTexto(texto)
  const m = /^\s*#\s+(.+)\n?/.exec(t)
  if (!m) return { titulo: null, cuerpo: t }
  return { titulo: quitarMarcas(m[1].trim()), cuerpo: t.slice(m[0].length).replace(/^\n+/, '') }
}

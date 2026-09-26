/**
 * Puente entre el texto de un Apunte (ver apunteFormato.ts) y el documento del
 * editor visual (ProseMirror/Tiptap). El texto sigue siendo lo que se guarda:
 * el editor lo abre con `textoADoc` y lo devuelve con `docATexto`, así los
 * apuntes se pueden seguir importando, exportando y abriendo en el modo texto.
 *
 * Sin dependencias de React ni de Tiptap: solo JSON, para poder probarlo.
 */
import { parsearApunte, partirInline, type Bloque, type ItemLista, type TipoMarca } from './apunteFormato'

export interface MarcaDoc {
  type: string
  attrs?: Record<string, unknown>
}

export interface NodoDoc {
  type: string
  attrs?: Record<string, unknown>
  content?: NodoDoc[]
  marks?: MarcaDoc[]
  text?: string
}

// ---------------------------------------------------------------------------
// Texto en línea <-> tramos con marcas
// ---------------------------------------------------------------------------

interface Tramo {
  texto: string
  marcas: MarcaDoc[]
}

const MARCA_DE_TIPO: Record<TipoMarca, (nota?: string) => MarcaDoc> = {
  negrita: () => ({ type: 'bold' }),
  cursiva: () => ({ type: 'italic' }),
  subrayado: () => ({ type: 'underline' }),
  rojo: () => ({ type: 'rojo' }),
  amarillo: () => ({ type: 'amarillo' }),
  grande: () => ({ type: 'tamano', attrs: { nivel: 1 } }),
  enorme: () => ({ type: 'tamano', attrs: { nivel: 2 } }),
  chico: () => ({ type: 'tamano', attrs: { nivel: -1 } }),
  nota: (nota) => ({ type: 'nota', attrs: { texto: nota ?? '' } }),
}

/** Orden de anidación al escribir: la primera va más afuera. */
const ORDEN_MARCAS = ['nota', 'tamano', 'amarillo', 'rojo', 'underline', 'italic', 'bold']

function ordenar(marcas: MarcaDoc[]): MarcaDoc[] {
  return [...marcas].sort((a, b) => ORDEN_MARCAS.indexOf(a.type) - ORDEN_MARCAS.indexOf(b.type))
}

function mismaMarca(a: MarcaDoc, b: MarcaDoc): boolean {
  return a.type === b.type && JSON.stringify(a.attrs ?? {}) === JSON.stringify(b.attrs ?? {})
}

export function tramosDeTexto(texto: string, heredadas: MarcaDoc[] = []): Tramo[] {
  const salida: Tramo[] = []
  for (const trozo of partirInline(texto)) {
    if (!trozo.tipo) {
      salida.push({ texto: trozo.texto, marcas: heredadas })
    } else {
      const marca = MARCA_DE_TIPO[trozo.tipo](trozo.nota)
      salida.push(...tramosDeTexto(trozo.texto, [...heredadas, marca]))
    }
  }
  return salida
}

/** Une tramos vecinos con las mismas marcas (sin importar el orden de las marcas). */
export function fusionarTramos(tramos: Tramo[]): Tramo[] {
  const out: Tramo[] = []
  for (const t of tramos) {
    if (!t.texto) continue
    const previo = out[out.length - 1]
    const iguales = previo && previo.marcas.length === t.marcas.length && previo.marcas.every((m) => t.marcas.some((n) => mismaMarca(m, n)))
    if (iguales) previo.texto += t.texto
    else out.push({ texto: t.texto, marcas: t.marcas })
  }
  return out
}

/** Texto en línea -> nodos de texto del editor (con saltos de línea como hardBreak). */
export function inlineADoc(texto: string): NodoDoc[] {
  const nodos: NodoDoc[] = []
  for (const tramo of fusionarTramos(tramosDeTexto(texto))) {
    const partes = tramo.texto.split('\n')
    partes.forEach((parte, i) => {
      if (i > 0) nodos.push({ type: 'hardBreak' })
      if (parte) {
        const nodo: NodoDoc = { type: 'text', text: parte }
        if (tramo.marcas.length > 0) nodo.marks = ordenar(tramo.marcas)
        nodos.push(nodo)
      }
    })
  }
  return nodos
}

const DELIMITADORES = (m: MarcaDoc): [string, string] => {
  switch (m.type) {
    case 'bold':
      return ['**', '**']
    case 'italic':
      return ['~', '~']
    case 'underline':
      return ['__', '__']
    case 'rojo':
      return ['==', '==']
    case 'amarillo':
      return ['++', '++']
    case 'tamano': {
      const n = Number(m.attrs?.nivel)
      return n >= 2 ? ['^^^', '^^^'] : n > 0 ? ['^^', '^^'] : [',,', ',,']
    }
    default:
      return ['', '']
  }
}

const CARACTERES_SINTAXIS = /[*_=+~^{}|]|,(?=,)|&(?=#)/g

function codificar(texto: string): string {
  return texto.replace(CARACTERES_SINTAXIS, (c) => `&#${c.codePointAt(0)};`)
}

/** Serializa tramos (de una sola línea) a texto con marcas anidadas. En cada
 *  paso lo más afuera va la marca que cubre la corrida más larga, así
 *  "**a ==b== c**" sale como una sola negrita y no partida en tres. */
function tramosATexto(tramos: Tramo[], escapar: boolean): string {
  let salida = ''
  let i = 0
  while (i < tramos.length) {
    const t = tramos[i]
    if (t.marcas.length === 0) {
      salida += escapar ? codificar(t.texto) : t.texto
      i++
      continue
    }
    let mejor = ordenar(t.marcas)[0]
    let largo = 0
    for (const m of ordenar(t.marcas)) {
      let j = i
      while (j < tramos.length && tramos[j].marcas.some((x) => mismaMarca(x, m))) j++
      if (j - i > largo) {
        mejor = m
        largo = j - i
      }
    }
    const grupo = tramos.slice(i, i + largo).map((x) => ({ texto: x.texto, marcas: x.marcas.filter((y) => !mismaMarca(y, mejor)) }))
    const interior = tramosATexto(grupo, escapar)
    const lead = interior.match(/^\s*/)?.[0] ?? ''
    const nucleo = interior.trim()
    const trail = nucleo ? (interior.match(/\s*$/)?.[0] ?? '') : ''
    if (!nucleo) {
      salida += interior
    } else if (mejor.type === 'nota') {
      const nota = String(mejor.attrs?.texto ?? '').replace(/[\n{}|]/g, (c) => (c === '\n' ? ' ' : `&#${c.codePointAt(0)};`))
      salida += `${lead}{{${nucleo.replace(/\|/g, '&#124;')}|${nota}}}${trail}`
    } else {
      const [x, y] = DELIMITADORES(mejor)
      salida += `${lead}${x}${nucleo}${y}${trail}`
    }
    i += largo
  }
  return salida
}

function claveTramos(tramos: Tramo[]): string {
  return JSON.stringify(fusionarTramos(tramos).map((t) => [t.texto, t.marcas.map((m) => `${m.type}:${JSON.stringify(m.attrs ?? {})}`).sort()]))
}

/** Nodos de texto del editor -> texto en línea. Si al volver a leer el texto no
 *  salen las mismas marcas (p. ej. hay un `*` suelto dentro de una negrita), se
 *  reintenta escribiendo los signos como códigos `&#42;`. */
export function docAInline(nodos: NodoDoc[] | undefined): string {
  const lineas: Tramo[][] = [[]]
  for (const n of nodos ?? []) {
    if (n.type === 'hardBreak') lineas.push([])
    else if (n.type === 'text' && n.text) lineas[lineas.length - 1].push({ texto: n.text, marcas: n.marks ?? [] })
  }
  return lineas
    .map((tramos) => {
      const esperado = claveTramos(tramos)
      const directo = tramosATexto(tramos, false)
      if (claveTramos(tramosDeTexto(directo)) === esperado) return directo
      return tramosATexto(tramos, true)
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// Texto -> documento del editor
// ---------------------------------------------------------------------------

function parrafo(texto: string, sangria = 0): NodoDoc {
  const contenido = inlineADoc(texto)
  const nodo: NodoDoc = { type: 'paragraph' }
  if (sangria > 0) nodo.attrs = { sangria }
  if (contenido.length > 0) nodo.content = contenido
  return nodo
}

function itemADoc(it: ItemLista): NodoDoc {
  const hijos: NodoDoc[] = [parrafo(it.texto)]
  for (const h of it.hijos) hijos.push(...bloqueADoc(h))
  return { type: 'listItem', content: hijos }
}

function listaADoc(items: ItemLista[]): NodoDoc[] {
  const listas: NodoDoc[] = []
  let corrida: ItemLista[] = []
  let numerada = false
  const cerrar = () => {
    if (corrida.length === 0) return
    if (numerada) {
      const inicio = parseInt(corrida[0].marca, 10)
      listas.push({ type: 'orderedList', attrs: { start: Number.isFinite(inicio) ? inicio : 1 }, content: corrida.map(itemADoc) })
    } else {
      listas.push({ type: 'bulletList', content: corrida.map(itemADoc) })
    }
    corrida = []
  }
  for (const it of items) {
    const esNum = it.marca !== 'vineta'
    if (corrida.length > 0 && esNum !== numerada) cerrar()
    numerada = esNum
    corrida.push(it)
  }
  cerrar()
  return listas
}

function bloqueADoc(b: Bloque): NodoDoc[] {
  switch (b.t) {
    case 'h':
      return [{ type: 'heading', attrs: { level: b.n }, content: inlineADoc(b.texto) }]
    case 'hr':
      return [{ type: 'horizontalRule' }]
    case 'p':
      return [parrafo(b.texto, b.sangria)]
    case 'lista':
      return listaADoc(b.items)
    case 'cita': {
      const hijos = b.hijos.flatMap(bloqueADoc)
      return [{ type: 'callout', attrs: { icono: b.icono }, content: hijos.length > 0 ? hijos : [parrafo('')] }]
    }
    case 'cols': {
      const columnas = b.cols.map((c): NodoDoc => {
        const hijos = c.flatMap(bloqueADoc)
        return { type: 'column', content: hijos.length > 0 ? hijos : [parrafo('')] }
      })
      while (columnas.length < 2) columnas.push({ type: 'column', content: [parrafo('')] })
      return [{ type: 'columns', content: columnas }]
    }
    case 'tabla': {
      const ancho = Math.max(...b.filas.map((f) => f.length))
      return [
        {
          type: 'table',
          content: b.filas.map((fila, i) => ({
            type: 'tableRow',
            content: Array.from({ length: ancho }, (_, c) => ({
              type: b.encabezado && i === 0 ? 'tableHeader' : 'tableCell',
              content: [parrafo(fila[c] ?? '')],
            })),
          })),
        },
      ]
    }
  }
}

export function textoADoc(texto: string): NodoDoc {
  const bloques = parsearApunte(texto)
  const contenido = bloques.flatMap(bloqueADoc)
  return { type: 'doc', content: contenido.length > 0 ? contenido : [parrafo('')] }
}

// ---------------------------------------------------------------------------
// Documento del editor -> texto
// ---------------------------------------------------------------------------

const INICIO_ESTRUCTURAL = /^(?:#{1,3}\s|[-*_]{3,}$|>|\||:::|-(?![-\s])|-\s|\d{1,3}[.)]\s)/

/** Si una línea de párrafo parece sintaxis de bloque, se protege su primer signo. */
function protegerInicio(linea: string): string {
  if (!INICIO_ESTRUCTURAL.test(linea.trimStart())) return linea
  const espacios = linea.length - linea.trimStart().length
  const cuerpo = linea.trimStart()
  const m = /^\d{1,3}([.)])/.exec(cuerpo)
  if (m) return linea.slice(0, espacios) + cuerpo.replace(m[1], `&#${m[1].codePointAt(0)};`)
  return linea.slice(0, espacios) + `&#${cuerpo.codePointAt(0)};` + cuerpo.slice(1)
}

function lineasDeParrafo(nodo: NodoDoc): string[] {
  return docAInline(nodo.content).split('\n').map(protegerInicio)
}

function itemATexto(item: NodoDoc, profundidad: number, marca: string): string[] {
  const tabs = '\t'.repeat(profundidad)
  const [primero, ...resto] = item.content ?? []
  const lineas: string[] = []
  const textoPrimero = primero && primero.type === 'paragraph' ? docAInline(primero.content).split('\n') : ['']
  textoPrimero.forEach((l, i) => lineas.push(i === 0 ? `${tabs}${marca}${l}` : `${tabs}\t${l}`))
  for (const r of resto) {
    if (r.type === 'paragraph') {
      for (const l of lineasDeParrafo(r)) if (l.trim()) lineas.push(`${tabs}\t${l}`)
    } else if (r.type === 'bulletList' || r.type === 'orderedList') {
      lineas.push(...listaATexto(r, profundidad + 1))
    }
  }
  return lineas
}

function listaATexto(lista: NodoDoc, profundidad: number): string[] {
  const inicio = Number(lista.attrs?.start ?? 1)
  const lineas: string[] = []
  ;(lista.content ?? []).forEach((it, i) => {
    const marca = lista.type === 'orderedList' ? `${inicio + i}. ` : '- '
    lineas.push(...itemATexto(it, profundidad, marca))
  })
  return lineas
}

function bloquesATexto(nodos: NodoDoc[]): string[] {
  const salida: string[] = []
  const bloquesSeparados: string[][] = []
  for (const n of nodos) {
    let lineas: string[] = []
    switch (n.type) {
      case 'heading':
        lineas = [`${'#'.repeat(Math.min(3, Math.max(1, Number(n.attrs?.level ?? 2))))} ${docAInline(n.content).replace(/\n/g, ' ')}`]
        break
      case 'paragraph': {
        const tabs = '\t'.repeat(Number(n.attrs?.sangria ?? 0))
        lineas = lineasDeParrafo(n).map((l) => (l.trim() ? tabs + l : l))
        break
      }
      case 'bulletList':
      case 'orderedList':
        lineas = listaATexto(n, 0)
        break
      case 'horizontalRule':
        lineas = ['---']
        break
      case 'callout': {
        const interior = bloquesATexto(n.content ?? [])
        const icono = String(n.attrs?.icono ?? '')
        if (icono) {
          const primeraIdx = interior.findIndex((l) => l.trim() !== '')
          const primera = primeraIdx >= 0 ? interior[primeraIdx] : ''
          if (primeraIdx >= 0 && !/^\t*(?:-|\d{1,3}[.)]\s)/.test(primera) && !/^(?:#|>|\||:::)/.test(primera)) interior[primeraIdx] = `${icono} ${primera}`
          else interior.unshift(icono)
        }
        lineas = interior.map((l) => (l.trim() === '' ? '>' : `> ${l}`))
        break
      }
      case 'columns': {
        lineas = [':::columnas']
        ;(n.content ?? []).forEach((c, i) => {
          if (i > 0) lineas.push(':::col')
          lineas.push(...bloquesATexto(c.content ?? []))
        })
        lineas.push(':::')
        break
      }
      case 'table': {
        const filas = (n.content ?? []).map((fila) =>
          (fila.content ?? []).map((celda) =>
            (celda.content ?? [])
              .map((p) => docAInline(p.content).replace(/\n/g, ' '))
              .filter(Boolean)
              .join(' ')
              .replace(/\|/g, '&#124;'),
          ),
        )
        const encabezado = (n.content?.[0]?.content ?? []).some((c) => c.type === 'tableHeader')
        filas.forEach((f, i) => {
          lineas.push(`| ${f.join(' | ')} |`)
          if (i === 0 && encabezado) lineas.push(`|${f.map(() => '---').join('|')}|`)
        })
        if (!encabezado && filas.length > 0) {
          // la sintaxis marca el encabezado con la fila |---|: sin ella la primera fila es de datos
        }
        break
      }
      default:
        break
    }
    if (lineas.length > 0 && lineas.some((l) => l.trim() !== '')) bloquesSeparados.push(lineas)
  }
  bloquesSeparados.forEach((b, i) => {
    if (i > 0) salida.push('')
    salida.push(...b)
  })
  return salida
}

export function docATexto(doc: NodoDoc): string {
  return (
    bloquesATexto(doc.content ?? [])
      .join('\n')
      .trim() + '\n'
  )
}

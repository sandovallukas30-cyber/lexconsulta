// Convierte el XML oficial de una norma de la BCN (LeyChile) al JSON que usa la app
// (mismo formato que src/data/leyTransparencia.json).
//
// Por qué XML y no PDF: el servicio "obtxml" de la BCN entrega el texto vigente
// ya estructurado (Libro/Título/Capítulo/Párrafo/Artículo, transitorios,
// derogados y fecha de cada versión), sin encabezados ni pies de página ni
// números de página que haya que limpiar. Es más fiable que extraer el PDF.
//
// Descarga (la BCN limita la tasa de consultas: dejar ~10 s entre descargas y
// reintentar si responde {"error": "Service limit has been reached"}):
//   curl -A "Mozilla/5.0" -o ley.xml "https://www.bcn.cl/leychile/consulta/obtxml?opt=7&idNorma=<idNorma>"
//
// Uso:
//   node scripts/bcn_xml_a_json.mjs <ley.xml> <salida.json> "<nombre>" <tipo> "<fuente>" [fechaHoy YYYY-MM-DD] [--doble="del Artículo 7"]
//
// En <fuente> se puede usar {pub} y {ver}: se reemplazan por la fecha de
// publicación y la de la última versión del XML en formato DD-MMM-AAAA.
import fs from 'fs'

const argsPos = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const [IN, OUT, NOMBRE, TIPO, FUENTE_PLANTILLA, HOY_ARG] = argsPos
// --doble="del Artículo 7": en un DFL que fija varios textos refundidos (ej.
// DFL 1/2000 de Justicia: Código Civil, Registro Civil, Ley 14.908...), tomar
// solo el "doble articulado" cuyo nombre contiene ese texto.
const DOBLE = process.argv.find((a) => a.startsWith('--doble='))?.slice('--doble='.length)
// --sin-envoltorio: en un DFL "Artículo único.- Fíjase el siguiente texto
// refundido... de la ley N°...", no cargar ese artículo del DFL (no es parte
// de la ley) sino solo el texto que envuelve.
const SIN_ENVOLTORIO = process.argv.includes('--sin-envoltorio')
if (!IN || !OUT || !NOMBRE || !TIPO || !FUENTE_PLANTILLA) {
  console.error('Uso: node bcn_xml_a_json.mjs <ley.xml> <salida.json> "<nombre>" <tipo> "<fuente>" [hoy]')
  process.exit(1)
}
const HOY = HOY_ARG ?? new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// Mini parser XML (el XML de la BCN es bien formado y sin CDATA relevante).
// ---------------------------------------------------------------------------
function decodificar(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function parsearXml(xml) {
  const raiz = { tag: '#root', attrs: {}, hijos: [], texto: '' }
  const pila = [raiz]
  const re = /<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>|<\?[^>]*\?>|<!--[\s\S]*?-->|([^<]+)/g
  let m
  while ((m = re.exec(xml))) {
    if (m[5] !== undefined) {
      pila[pila.length - 1].texto += decodificar(m[5])
      continue
    }
    if (!m[2]) continue // declaración o comentario
    const [, cierre, tag, attrsRaw, autoCierre] = m
    if (cierre) {
      pila.pop()
      continue
    }
    const attrs = {}
    for (const a of attrsRaw.matchAll(/([\w:.-]+)="([^"]*)"/g)) attrs[a[1]] = decodificar(a[2])
    const nodo = { tag, attrs, hijos: [], texto: '' }
    pila[pila.length - 1].hijos.push(nodo)
    if (!autoCierre) pila.push(nodo)
  }
  return raiz.hijos[0]
}

const hijo = (n, tag) => n?.hijos.find((h) => h.tag === tag)
const hijos = (n, tag) => n?.hijos.filter((h) => h.tag === tag) ?? []

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
function fechaCorta(iso) {
  const [a, m, d] = iso.split('-')
  return `${d}-${MESES[Number(m) - 1]}-${a}`
}

/** Anotaciones al margen de la BCN ("Ley 19.653 / Art. 1º Nº 1 / D.O.
 *  14.12.1999", "NOTA", "LEY 20603"...): vienen en la MISMA línea del texto,
 *  alineadas a la derecha tras una corrida larga de espacios, o solas en
 *  una línea con sangría enorme. No son parte del artículo. */
const RE_NOTA_MARGEN =
  /^(?:Ley|LEY|L\.|Art|ART|D\.?O\.?|D\.?F\.?L|D\.?L\.|Decreto|DTO|NOTA|N[°º]|Inc|INC|Letra|LETRA|N[úu]m|NUM|Rectif|RECTIF|D\.S|Res|Sustitu|Agreg|Reemplaz|Derog|Suprim|Intercal|Modific|Incorpor|Deroga|Ley\s*N)/

// Línea que, completa, es un trozo de anotación al margen (a veces la BCN la
// deja con poca sangría o sola en su línea).
const RE_LINEA_NOTA =
  /^(?:Ley N?[°º]? ?[\d.]+|LEY [\d.]+|Art[íi]culo [úu]nico N[°º]|Art(?:[íi]culo|\.)? ?\d+[°º]?(?: bis| ter)?(?: N[°º] ?\d+)?|D\.O\. ?\d{1,2}\.\d{1,2}\.\d{4}|N[°º] ?\d+(?: letra [a-z]\))?)$/

function quitarMargen(linea) {
  if (/^\s{10,}\S/.test(linea) && RE_LINEA_NOTA.test(linea.trim())) return ''
  if (/^\s{30,}\d{1,3}\s*$/.test(linea)) return ''
  // línea que es solo anotación: sangría de 30+ espacios y texto de nota
  const soloNota = /^(\s{30,})(\S.*)$/.exec(linea)
  if (soloNota && (RE_NOTA_MARGEN.test(soloNota[2]) || /^\d{1,2}[.-]\d{1,2}[.-]\d{2,4}$/.test(soloNota[2].trim()))) return ''
  // texto + 4 o más espacios + anotación: se reconoce porque empieza en la
  // columna de margen (55+) o porque parece una referencia ("D.O.", "Ley"...).
  // La prosa legal nunca tiene 4 espacios seguidos a mitad de línea.
  const m = /^(\s*\S.*?\S|\s*\S)(\s{4,})(\S.*)$/.exec(linea)
  if (m && (m[1].length + m[2].length >= 55 || RE_NOTA_MARGEN.test(m[3]))) return m[1]
  return linea
}

/** Reflujo del texto BCN: las líneas vienen cortadas a ~60 columnas; un
 *  inciso nuevo empieza con sangría (espacios) o tras una línea vacía. */
function refluir(textoCrudo) {
  const lineas = textoCrudo
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((l) => (l === '' ? null : quitarMargen(l)))
    .filter((l) => l !== '')
    .map((l) => l ?? '')
  const parrafos = []
  let actual = ''
  for (const l of lineas) {
    if (!l.trim()) {
      if (actual) parrafos.push(actual)
      actual = ''
      continue
    }
    const sangria = /^\s{2,}/.test(l)
    if (sangria && actual) {
      parrafos.push(actual)
      actual = ''
    }
    const limpia = l.trim().replace(/\s+/g, ' ')
    actual = actual ? `${actual} ${limpia}` : limpia
  }
  if (actual) parrafos.push(actual)
  return parrafos
}

const SUFIJOS = 'bis|ter|qu[áa]ter|quinquies|sexies|septies|octies|novies|nonies|decies|und[eé]cies|duod[eé]cies|transitorio|[A-Z]{1,2}'
const RE_CABECERA = new RegExp(
  '^["“]?\\s*(?:ART[ÍI]CULO|Art[íi]culo|ART\\.|Art\\.)\\s*' +
    '[^\\s.:,;–-]*(?:\\s*-\\s*[A-Z]{1,2}\\b)?\\s*[°º]?' +
    `(?:\\s*[°º]?\\s*(?:${SUFIJOS})\\b)*\\s*[°º]?\\s*` +
    // separador ".-", ":", "-"... (a veces falta: "Artículo 1º De los juicios")
    '(?:\\.-|\\.–|\\.—|\\.|:|-|–|—|(?<=[°º])(?=\\s))\\s*',
)

/** Quita "Artículo 54 Ñ.-", "Art. 12 El…", "Artículo 154°.-" usando el propio
 *  número del artículo (más fiable que un patrón genérico); si no calza, cae
 *  a RE_CABECERA. */
function limpiarCabecera(p, nombre) {
  if (nombre) {
    const tokens = nombre
      .replace(/transitorio/i, '')
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    if (tokens.length) {
      const re = new RegExp(
        '^["“]?\\s*(?:art[íi]culo|art\\.)\\s*' + tokens.join('[\\s°º-]*') + '(?![\\dA-Za-zÑñ])(?:\\s*transitori[oa])?\\s*[°º]?\\s*(?:\\.-|\\.–|\\.—|\\.|:|-|–|—)?\\s*',
        'i',
      )
      const m = p.match(re)
      if (m) return p.slice(m[0].length)
    }
  }
  const m = p.match(RE_CABECERA)
  if (!m) return p
  return p.slice(m[0].length)
}

function normalizarNombreParte(s) {
  let n = (s ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\((?:DEL|de la|del)\s+ART[^)]*\)/gi, '') // "25 (DEL ART. PRIMERO)" en dobles articulados
    .replace(/\s+/g, ' ')
    .trim()
  n = n.replace(/[°º]/g, '').replace(/\s+/g, ' ').trim()
  // Ordinales en palabras y "único" en minúscula (Art. primero, Art. único).
  if (/^[A-ZÁÉÍÓÚÑ]+$/.test(n) && n.length > 2 && !/^[IVXLCDM]+$/.test(n)) n = n.toLowerCase()
  n = n.replace(/\b(BIS|TER|QU[ÁA]TER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NOVIES|DECIES)\b/g, (x) => x.toLowerCase())
  n = n.replace(/\s*-\s*/g, '-')
  return n
}

const RE_ENCAB = /^(LIBRO|Libro|T[ÍI]TULO|T[íi]tulo|CAP[ÍI]TULO|Cap[íi]tulo|P[ÁA]RRAFO|P[áa]rrafo|§)\s*([IVXLCDM]+\b|\d+\s*[°ºo]?(?:\s*bis)?|PRELIMINAR|Preliminar|FINAL|Final|[A-ZÁÉÍÓÚ]+(?:O|A)\b|[A-Za-záéíóú]+(?:o|a)\b)?\s*[.:\-–]*\s*(.*)$/

function formatearEncabezado(texto) {
  const t = texto
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // "T I T U L O I" / "P á r r a f o 1º" → palabra junta
    .replace(/^((?:[A-Za-zÁÉÍÓÚáéíóú§] ){3,}[A-Za-zÁÉÍÓÚáéíóú])\b/, (m) => m.replace(/ /g, ''))
  if (!t) return null
  const m = t.match(RE_ENCAB)
  if (m && m[2]) {
    const num = m[2].replace(/\s+/g, ' ').trim()
    const resto = m[3].trim()
    return resto ? `${num} — ${resto}` : num
  }
  return t
}

// ---------------------------------------------------------------------------
// Recorrido
// ---------------------------------------------------------------------------
const xml = fs.readFileSync(IN, 'utf8')
if (!xml.startsWith('<?xml')) {
  console.error('El archivo no es XML de la BCN (¿límite de consultas?):', xml.slice(0, 120))
  process.exit(1)
}
// Vocabulario de la propia norma, para reparar "Rep\uFFFDblica" → "República"
// (la BCN tiene algunos caracteres dañados en origen).
const vocabulario = new Map()
for (const w of decodificar(xml).match(/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]{3,}/g) ?? []) vocabulario.set(w, (vocabulario.get(w) ?? 0) + 1)
// Respaldo: el vocabulario de todas las normas ya cargadas en src/data.
try {
  const dir = new URL('../src/data/', import.meta.url)
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const txt = fs.readFileSync(new URL(f, dir), 'utf8')
    for (const w of txt.match(/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]{3,}/g) ?? []) vocabulario.set(w, (vocabulario.get(w) ?? 0) + 1)
  }
} catch {
  // sin corpus: se usa solo el vocabulario de la norma
}
const CANDIDATOS = 'áéíóúñÁÉÍÓÚÑü°ºaeiou'
let reparados = 0
function repararCaracteres(t) {
  if (!t.includes('\uFFFD')) return t
  return t.replace(/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]*\uFFFD[A-Za-zÁÉÍÓÚÑÜáéíóúñü\uFFFD]*/g, (palabra) => {
    let mejor = null
    let freq = 0
    for (const c of CANDIDATOS) {
      const prueba = palabra.replaceAll('\uFFFD', c)
      const f = vocabulario.get(prueba) ?? 0
      if (f > freq) {
        mejor = prueba
        freq = f
      }
    }
    if (mejor) reparados++
    else avisos.push(`carácter dañado sin reparar: ${palabra}`)
    return mejor ?? palabra
  })
}

const norma = parsearXml(xml)
const ident = hijo(norma, 'Identificador')
const fechaPub = ident.attrs.fechaPublicacion
// "Última versión" = la más reciente que ya rige hoy (la BCN marca también
// versiones futuras con vigencia diferida, incluso con la fecha comodín
// 2222-02-02; esas se anotan artículo por artículo).
const fechasPartes = [...xml.matchAll(/fechaVersion="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]).filter((f) => f <= HOY)
const fechaVersion = fechasPartes.sort().at(-1) ?? norma.attrs.fechaVersion
const normaId = norma.attrs.normaId

const articulos = []
const vistos = new Map()
const avisos = []

function nivelDe(tipo) {
  const t = tipo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (t === 'libro') return 'libro'
  if (t === 'titulo') return 'titulo'
  if (t === 'capitulo') return 'capitulo'
  if (t === 'parrafo' || t === 'otros' || t === 'seccion' || t === 'subparrafo' || t === 'enumeracion') return 'parrafo'
  if (t.startsWith('disposicion') || t === 'disposiciones transitorias') return 'grupoTransitorio'
  if (t === 'doble articulado') return 'doble'
  if (t.startsWith('articulo')) return 'articulo'
  return 'otro'
}

function textoDe(n) {
  return hijo(n, 'Texto')?.texto ?? ''
}
function metaDe(n, tag) {
  const meta = hijo(n, 'Metadatos')
  const nodo = hijo(meta, tag)
  if (!nodo || nodo.attrs.presente === 'no') return ''
  return nodo.texto.replace(/\u00a0/g, ' ').trim()
}

function registrar(n, ctx) {
  const tipo = n.attrs.tipoParte ?? ''
  const transitorio = ctx.transitorio || n.attrs.transitorio === 'transitorio' || /transitori/i.test(tipo)
  let nombre = normalizarNombreParte(metaDe(n, 'NombreParte'))
  const parrafos = refluir(repararCaracteres(textoDe(n)))
  if (parrafos.length) parrafos[0] = limpiarCabecera(parrafos[0], nombre)
  // Doble articulado: el texto de la ley va entre comillas dentro de un artículo.
  if (ctx.dentroDoble && parrafos.length) {
    parrafos[0] = parrafos[0].replace(/^["“]\s*/, '')
    const u = parrafos.length - 1
    parrafos[u] = parrafos[u].replace(/["”]\s*(\.|;)?\s*$/, (m0, p) => (p === '.' ? '.' : ''))
  }
  if (!nombre) {
    const m = textoDe(n).trim().match(/^["“]?(?:ART[ÍI]CULO|Art[íi]culo|Art\.)\s*([^\s.:-]+(?:\s+(?:bis|ter|qu[áa]ter))?)/)
    nombre = m ? normalizarNombreParte(m[1]) : `s/n ${articulos.length + 1}`
  }
  nombre = nombre.replace(/transitori[oa]s?/i, 'transitorio')
  if (transitorio && !/transitori/i.test(nombre)) nombre = `${nombre} transitorio`
  let id = `Art. ${nombre}`
  const previos = vistos.get(id) ?? 0
  vistos.set(id, previos + 1)
  if (previos > 0) {
    avisos.push(`id duplicado: ${id}`)
    id = `${id} (${previos + 1})`
  }
  let t = repararCaracteres(parrafos.filter((p) => p.trim()).join('\n\n').trim())
    // anotación pegada a la palabra anterior en el origen: "reincidaLey N° 19.996"
    .replace(/([a-záéíóúñ])Ley N[°º] \d{1,2}\.\d{3}(?=\s|$)/g, '$1')
    // restos de anotaciones partidas en varias líneas: "Artículo único N° 51 D.O. 11.03.2005"
    .replace(/ ?(?:Ley N[°º] [\d.]+ )?(?:Art[íi]culo [úu]nico N[°º] ?\d+ )?D\.O\. \d{1,2}\.\d{1,2}\.\d{4}(?= |$)/gm, '')
  if (!t && n.attrs.derogado === 'derogado') t = 'Derogado.'
  const fv = n.attrs.fechaVersion
  if (fv && fv > HOY) {
    t +=
      fv >= '2200-01-01'
        ? '\n\nNOTA: Según la BCN, esta redacción tiene vigencia diferida sin fecha determinada; mientras no entre en vigor se aplica la redacción anterior.'
        : `\n\nNOTA: Según la BCN, este texto rige a partir del ${fechaCorta(fv)} (vigencia diferida); hasta esa fecha se aplica la redacción anterior.`
    avisos.push(`vigencia diferida ${id}: ${fv}`)
  }
  articulos.push({
    a: id,
    t,
    libro: transitorio ? null : ctx.libro,
    titulo: transitorio ? 'Artículos Transitorios' : ctx.titulo,
    capitulo: transitorio ? null : ctx.capitulo,
    parrafo: transitorio ? null : ctx.parrafo,
    _transitorio: transitorio || /transitori/i.test(id),
  })
}

function recorrer(contenedor, ctx) {
  for (const n of hijos(hijo(contenedor, 'EstructurasFuncionales'), 'EstructuraFuncional')) {
    const nivel = nivelDe(n.attrs.tipoParte ?? '')
    const encab = formatearEncabezado(metaDe(n, 'TituloParte') || textoDe(n))
    if (nivel === 'articulo' && /^\s*(?:ART[IÍ]CULOS|Art[íi]culos|DISPOSICIONES|Disposiciones)\s+TRANSITORI/i.test(textoDe(n))) {
      // encabezado de grupo mal tipificado como artículo ("ARTICULOS TRANSITORIOS")
      recorrer(n, { ...ctx, transitorio: true })
    } else if (
      nivel === 'articulo' &&
      SIN_ENVOLTORIO &&
      hijos(hijo(n, 'EstructurasFuncionales'), 'EstructuraFuncional').some((h) => nivelDe(h.attrs.tipoParte ?? '') === 'doble')
    ) {
      avisos.push('se omitió el artículo del DFL que fija el texto refundido')
      recorrer(n, ctx)
    } else if (nivel === 'articulo') {
      registrar(n, ctx)
      // Un artículo puede contener un "doble articulado" (texto de otra ley).
      recorrer(n, ctx)
    } else if (nivel === 'doble') {
      recorrer(n, { ...ctx, dentroDoble: true })
    } else if (nivel === 'grupoTransitorio') {
      recorrer(n, { ...ctx, transitorio: true })
    } else if (nivel === 'libro') {
      recorrer(n, { ...ctx, libro: encab, titulo: null, capitulo: null, parrafo: null })
    } else if (nivel === 'titulo') {
      recorrer(n, { ...ctx, titulo: encab, capitulo: null, parrafo: null, transitorio: ctx.transitorio || n.attrs.transitorio === 'transitorio' })
    } else if (nivel === 'capitulo') {
      recorrer(n, { ...ctx, capitulo: encab, parrafo: null })
    } else if (nivel === 'parrafo') {
      const subnivel = /^(Otros|Enumeraci)/.test(n.attrs.tipoParte ?? '')
      recorrer(n, { ...ctx, parrafo: ctx.parrafo && subnivel ? `${ctx.parrafo} · ${encab}` : encab })
    } else {
      avisos.push(`tipoParte no reconocido: ${n.attrs.tipoParte}`)
      recorrer(n, ctx)
    }
  }
}

const ctxInicial = { libro: null, titulo: null, capitulo: null, parrafo: null, transitorio: false, dentroDoble: false }
if (DOBLE) {
  let encontrado = null
  const buscar = (n) => {
    for (const h of hijos(hijo(n, 'EstructurasFuncionales'), 'EstructuraFuncional')) {
      if (encontrado) return
      if (nivelDe(h.attrs.tipoParte ?? '') === 'doble' && metaDe(h, 'NombreParte').includes(DOBLE)) encontrado = h
      else buscar(h)
    }
  }
  buscar(norma)
  if (!encontrado) {
    console.error(`No se encontró un doble articulado que contenga "${DOBLE}"`)
    process.exit(1)
  }
  recorrer(encontrado, { ...ctxInicial, dentroDoble: true })
} else {
  recorrer(norma, ctxInicial)
}

// Ids repetidos: la BCN a veces conserva la versión DEROGADA de un artículo
// cuyo número se reutilizó en otro párrafo (Ley 18.216: arts. 10-12). Si en
// el grupo hay uno solo vigente, se queda ese con el id limpio.
{
  const grupos = new Map()
  for (const a of articulos) {
    const base = a.a.replace(/ \(\d+\)$/, '')
    if (!grupos.has(base)) grupos.set(base, [])
    grupos.get(base).push(a)
  }
  for (const [base, lista] of grupos) {
    if (lista.length < 2) continue
    const vigentes = lista.filter((a) => !/^derogado\.?$/i.test(a.t.trim()))
    if (vigentes.length === 1) {
      for (const a of lista) if (a !== vigentes[0]) a._descartar = true
      vigentes[0].a = base
      avisos.push(`duplicado resuelto: ${base} (se descartó la versión derogada)`)
    }
  }
  for (let i = articulos.length - 1; i >= 0; i--) if (articulos[i]._descartar) articulos.splice(i, 1)
}

// Permanentes primero, transitorios al final (como los demás JSON de la app).
const permanentes = articulos.filter((x) => !x._transitorio)
const transitorios = articulos.filter((x) => x._transitorio)
const salida = {
  codigo: NOMBRE,
  tipo: TIPO,
  fuente: FUENTE_PLANTILLA.replace('{pub}', fechaCorta(fechaPub)).replace('{ver}', fechaCorta(fechaVersion)),
  total_articulos: permanentes.length,
  total_transitorios: transitorios.length,
  articulos: [
    ...permanentes.map(({ _transitorio, _descartar, ...r }) => r),
    ...transitorios.map(({ _transitorio, _descartar, ...r }) => ({ ...r, libro: null, titulo: 'Artículos Transitorios', capitulo: null, parrafo: null })),
  ],
}
fs.writeFileSync(OUT, JSON.stringify(salida, null, 2) + '\n', 'utf8')
console.error(
  `${OUT}: idNorma ${normaId}, publicada ${fechaPub}, versión ${fechaVersion}, ` +
    `${permanentes.length} permanentes + ${transitorios.length} transitorios`,
)
if (reparados) console.error(`  reparados ${reparados} caracteres "\uFFFD" por vocabulario`)
for (const a of avisos) console.error('  aviso:', a)

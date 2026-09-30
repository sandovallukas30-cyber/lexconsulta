// Control de calidad de los JSON de normas (src/data/*.json con `articulos`).
//
// Uso:  node scripts/verificar_leyes.mjs [carpeta=src/data] [--estricto]
//
// Errores (exit 1):
//   - total_articulos / total_transitorios no coinciden con lo cargado
//   - marcadores de página ("--- PAGE", "--- Pagina") o caracteres "�"
//   - encabezados/pies de página de la BCN dentro del texto
//   - artículos con id duplicado o texto vacío
// Advertencias (errores con --estricto, que se usa para las normas nuevas):
//   - saltos en la numeración de los artículos permanentes (ej. 12 → 15)
//   - anotaciones al margen de la BCN coladas en el texto ("D.O. 12.03.2010")
import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)
const estricto = args.includes('--estricto')
const carpeta = args.find((a) => !a.startsWith('--')) ?? 'src/data'

const RE_PAGINA = /---\s*(PAGE|P[aá]gina)/i
// Solo el pie/encabezado típico de los PDF de LeyChile, no menciones legítimas
// (la LOC del Congreso regula la propia Biblioteca del Congreso Nacional).
const RE_BCN = /(www\.(bcn|leychile)\.cl|Documento generado el|Biblioteca del Congreso Nacional de Chile\s*-|Ley Chile\s*-\s*Biblioteca)/i
const RE_MARGEN = /\bD\.O\.\s*\d{1,2}\.\d{1,2}\.\d{4}\b/

/** Número base de un id "Art. 183-A bis" → 183 (null si no es numérico). */
function numeroBase(id) {
  const m = /^Art\.\s*(\d+)/.exec(id)
  return m ? Number(m[1]) : null
}

let errores = 0
let advertencias = 0
const filas = []

for (const archivo of fs.readdirSync(carpeta).filter((f) => f.endsWith('.json')).sort()) {
  const ruta = path.join(carpeta, archivo)
  let datos
  try {
    datos = JSON.parse(fs.readFileSync(ruta, 'utf8'))
  } catch (e) {
    console.log(`✘ ${archivo}: JSON inválido (${e.message})`)
    errores++
    continue
  }
  if (!Array.isArray(datos.articulos)) continue

  const problemas = []
  const avisos = []
  const arts = datos.articulos
  const transitorios = arts.filter((a) => /transitori/i.test(a.a))
  const permanentes = arts.filter((a) => !/transitori/i.test(a.a))

  if (datos.total_articulos !== permanentes.length)
    problemas.push(`total_articulos=${datos.total_articulos} pero hay ${permanentes.length} permanentes`)
  if ((datos.total_transitorios ?? 0) !== transitorios.length)
    problemas.push(`total_transitorios=${datos.total_transitorios ?? 0} pero hay ${transitorios.length}`)

  const vistos = new Set()
  for (const a of arts) {
    if (vistos.has(a.a)) problemas.push(`id duplicado: ${a.a}`)
    vistos.add(a.a)
    if (!a.t || !a.t.trim()) problemas.push(`texto vacío: ${a.a}`)
    if (RE_PAGINA.test(a.t)) problemas.push(`marcador de página en ${a.a}`)
    if (a.t.includes('�')) problemas.push(`carácter "�" en ${a.a}`)
    if (RE_BCN.test(a.t)) problemas.push(`encabezado/pie BCN en ${a.a}`)
    if (RE_MARGEN.test(a.t)) avisos.push(`anotación al margen en ${a.a}`)
  }

  // Saltos de numeración entre artículos permanentes consecutivos.
  let previo = null
  for (const a of permanentes) {
    const n = numeroBase(a.a)
    if (n === null) continue
    if (previo !== null && n > previo + 1) avisos.push(`salto ${previo} → ${n}`)
    if (previo === null || n > previo) previo = n
  }

  const lista = estricto ? problemas.concat(avisos) : problemas
  errores += lista.length
  if (!estricto) advertencias += avisos.length
  filas.push({ archivo, n: arts.length, problemas: lista, avisos: estricto ? [] : avisos })
}

for (const f of filas) {
  const marca = f.problemas.length ? '✘' : f.avisos.length ? '!' : '✔'
  console.log(`${marca} ${f.archivo} (${f.n} artículos)`)
  for (const p of f.problemas.slice(0, 12)) console.log(`    error: ${p}`)
  if (f.problemas.length > 12) console.log(`    … y ${f.problemas.length - 12} más`)
  for (const a of f.avisos.slice(0, 5)) console.log(`    aviso: ${a}`)
  if (f.avisos.length > 5) console.log(`    … y ${f.avisos.length - 5} avisos más`)
}
console.log(`\n${filas.length} normas revisadas · ${errores} errores · ${advertencias} advertencias`)
process.exit(errores ? 1 : 0)

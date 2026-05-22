// Parser robusto del Código del Trabajo desde texto extraído del PDF oficial.
import fs from 'fs';

const IN = process.argv[2];
const OUT = process.argv[3];
const NOMBRE = process.argv[4] ?? 'Código del Trabajo';
const TIPO = process.argv[5] ?? 'lab';
const FUENTE = process.argv[6] ?? 'DFL-1, publicado 16-ENE-2003, última versión 07-FEB-2026';

if (!IN || !OUT) {
  console.error('Usage: node procesar_codigo.mjs <in.txt> <out.json> [nombre] [tipo] [fuente]');
  process.exit(1);
}

const raw = fs.readFileSync(IN, 'utf8');
const lines = raw.split('\n').map((l) => l.trim());

// --- Pre-clean: drop page markers, footers ---
const cleaned = [];
for (const l of lines) {
  if (!l) continue;
  if (l.startsWith('--- PAGE')) continue;
  if (l.includes('Biblioteca del Congreso Nacional')) continue;
  cleaned.push(l);
}

// --- Header detectors ---
// IMPORTANT: 'Art' / 'Artículo' must start with CAPITAL A. Otherwise "artículo 2472" inside text matches.
const RE_LIBRO = /^LIBRO\s+([IVXLCDM]+)\s*$/;
const RE_TITULO_CAPS = /^(?:TITULO|TÍTULO)\s+(PRELIMINAR|FINAL|[IVXLCDM]+)\s*$/;
const RE_TITULO_TC = /^T[íi]tulo\s+([IVXLCDM]+)\s*$/;
const RE_CAPITULO = /^Cap[íi]tulo\s+([IVXLCDM]+)\s*$/;
const RE_PARRAFO = /^P[áa]rrafo\s+(\d+\s*[ºo°]?|[IVXLCDM]+)\s*$/;
// Captures number with optional sub-letter (183-A, 183-AA) and ordinal suffix (bis/ter/quáter etc.) in any order/case.
const SUFIJO = '(?:[Bb]is|[Tt]er|[Qq]u[áa]ter|[Qq]uinquies|[Ss]exies|[Ss]epties|[Oo]cties|[Nn]ovies|[Dd]ecies)';
const RE_ART = new RegExp(
  '^(?:Artículo|Articulo|Art\\.)\\s*' +
    '(' +
      '\\d+' +
      '(?:\\s*-\\s*[A-ZÑ]{1,2})?' +     // -A, -AA, -AB
      '(?:\\s+' + SUFIJO + ')?' +      // bis, ter, quáter
      '(?:\\s+[A-ZÑ](?![a-z]))?' +      // A, B (un solo letter trailing)
      '(?:\\s+' + SUFIJO + ')?' +      // bis again (152 quáter O bis)
    ')' +
    '\\.?\\s*o?\\s*[°º]?\\.?\\s*(?:-)?\\s*(.*)$'
);
const RE_TRANSITORIOS_MARK = /^(?:ARTICULOS|ART[ÍI]CULOS|DISPOSICIONES)\s+TRANSITORIAS?\s*$/i;

// Ordinales femeninos (PRIMERA, SEGUNDA, ... CENTÉSIMA) usados en disposiciones transitorias de la Constitución
const ORD_FEM = '(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA|UND[ÉE]CIMA|DUOD[ÉE]CIMA|DECIMO[A-Z]+|VIG[ÉE]SIMA|TRIG[ÉE]SIMA|CUADRAG[ÉE]SIMA|QUINCUAG[ÉE]SIMA|SEXAG[ÉE]SIMA|SEPTUAG[ÉE]SIMA|OCTOG[ÉE]SIMA|NONAG[ÉE]SIMA|CENT[ÉE]SIMA)';
const RE_TRANS_ORD = new RegExp(`^(${ORD_FEM}(?:\\s+${ORD_FEM})?)\\.?\\s*-?\\s*(.*)$`);

// Mapa simple para convertir ordinal femenino a número
const ORD_FEM_NUM = {
  PRIMERA: 1, SEGUNDA: 2, TERCERA: 3, CUARTA: 4, QUINTA: 5,
  SEXTA: 6, 'SÉPTIMA': 7, SEPTIMA: 7, OCTAVA: 8, NOVENA: 9, 'DÉCIMA': 10, DECIMA: 10,
  'UNDÉCIMA': 11, UNDECIMA: 11, 'DUODÉCIMA': 12, DUODECIMA: 12,
  DECIMOTERCERA: 13, DECIMOCUARTA: 14, DECIMOQUINTA: 15, DECIMOSEXTA: 16,
  'DECIMOSÉPTIMA': 17, DECIMOSEPTIMA: 17, DECIMOCTAVA: 18, DECIMONOVENA: 19,
  'VIGÉSIMA': 20, VIGESIMA: 20, 'TRIGÉSIMA': 30, TRIGESIMA: 30,
  'CUADRAGÉSIMA': 40, CUADRAGESIMA: 40, 'QUINCUAGÉSIMA': 50, QUINCUAGESIMA: 50,
  'SEXAGÉSIMA': 60, SEXAGESIMA: 60,
};
function ordFemToNumber(s) {
  const partes = s.toUpperCase().split(/\s+/);
  let total = 0;
  for (const p of partes) total += ORD_FEM_NUM[p] ?? 0;
  return total || s;
}

function esLibro(l) { return RE_LIBRO.test(l); }
function esTitulo(l) { return RE_TITULO_CAPS.test(l) || RE_TITULO_TC.test(l); }
function esCapitulo(l) { return RE_CAPITULO.test(l); }
function esParrafo(l) { return RE_PARRAFO.test(l); }
function esArticulo(l) { return RE_ART.test(l); }
function esCualquierEncabezado(l) {
  return esLibro(l) || esTitulo(l) || esCapitulo(l) || esParrafo(l) || esArticulo(l) || RE_TRANSITORIOS_MARK.test(l);
}

function tomarNombre(arr, start) {
  const partes = [];
  for (let j = start; j < arr.length && partes.length < 3; j++) {
    const rawLine = arr[j];
    const cleanLine = rawLine.startsWith('<<P>>') ? rawLine.slice(5) : rawLine;
    if (esCualquierEncabezado(cleanLine)) break;
    // Stop si la línea parece ser una nota o referencia bibliográfica
    if (/^NOTA\b|^V[éeE]ase\b|^Decreto\b|^Ley\b/.test(cleanLine)) break;
    partes.push(cleanLine);
    if (partes.join(' ').length > 80) break;
  }
  return { nombre: partes.join(' ').replace(/<<P>>/g, ' ').replace(/\s+/g, ' ').trim(), saltar: partes.length };
}

// --- Main parse ---
const estado = { libro: null, titulo: null, capitulo: null, parrafo: null };
const articulos = [];
let actual = null;
let enTransitorios = false;

function flush() {
  if (actual && actual.t.length > 0) {
    // Normalize: keep <<P>> markers as paragraph separators, collapse other whitespace
    actual.t = actual.t
      .replace(/<<P>>/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/ ?\n\n ?/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    articulos.push(actual);
  }
  actual = null;
}

for (let i = 0; i < cleaned.length; i++) {
  const raw = cleaned[i];
  const indented = raw.startsWith('<<P>>');
  const l = indented ? raw.slice(5) : raw;

  if (RE_TRANSITORIOS_MARK.test(l)) {
    flush();
    enTransitorios = true;
    // Clear hierarchical state for transitorios
    estado.libro = null;
    estado.titulo = 'Artículos Transitorios';
    estado.capitulo = null;
    estado.parrafo = null;
    continue;
  }

  let m;
  if ((m = l.match(RE_LIBRO))) {
    flush();
    const { nombre, saltar } = tomarNombre(cleaned, i + 1);
    estado.libro = nombre ? `${m[1]} — ${nombre}` : m[1];
    estado.titulo = null;
    estado.capitulo = null;
    estado.parrafo = null;
    i += saltar;
    continue;
  }
  if ((m = l.match(RE_TITULO_CAPS)) || (m = l.match(RE_TITULO_TC))) {
    flush();
    const { nombre, saltar } = tomarNombre(cleaned, i + 1);
    estado.titulo = nombre ? `${m[1]} — ${nombre}` : m[1];
    estado.capitulo = null;
    estado.parrafo = null;
    i += saltar;
    continue;
  }
  if ((m = l.match(RE_CAPITULO))) {
    flush();
    const { nombre, saltar } = tomarNombre(cleaned, i + 1);
    estado.capitulo = nombre ? `${m[1]} — ${nombre}` : m[1];
    estado.parrafo = null;
    i += saltar;
    continue;
  }
  if ((m = l.match(RE_PARRAFO))) {
    flush();
    const num = m[1].replace(/\s+/g, '');
    const { nombre, saltar } = tomarNombre(cleaned, i + 1);
    estado.parrafo = nombre ? `${num} — ${nombre}` : num;
    i += saltar;
    continue;
  }
  if ((m = l.match(RE_ART))) {
    flush();
    const numero = m[1].replace(/\s+/g, ' ').trim();
    const restoLinea = m[2].trim();
    const label = enTransitorios ? `Art. ${numero} transitorio` : `Art. ${numero}`;
    actual = {
      a: label,
      t: restoLinea,
      libro: estado.libro,
      titulo: estado.titulo,
      capitulo: estado.capitulo,
      parrafo: estado.parrafo,
    };
    continue;
  }

  // Disposiciones transitorias con formato ordinal femenino (PRIMERA.-, SEGUNDA.-, ...)
  if (enTransitorios) {
    const mOrd = l.match(RE_TRANS_ORD);
    if (mOrd) {
      flush();
      const ordinal = mOrd[1].trim();
      const num = ordFemToNumber(ordinal);
      const restoLinea = mOrd[2].trim();
      actual = {
        a: `Art. ${num} transitorio`,
        t: restoLinea,
        libro: null,
        titulo: 'Disposiciones Transitorias',
        capitulo: null,
        parrafo: null,
      };
      continue;
    }
  }

  if (actual) {
    const sep = indented ? ' <<P>>' : ' ';
    actual.t = (actual.t + sep + l).trim();
  }
}

flush();

const permanentes = articulos.filter((a) => !a.a.includes('transitorio')).length;
const transitorios = articulos.filter((a) => a.a.includes('transitorio')).length;

const out = {
  codigo: NOMBRE,
  tipo: TIPO,
  fuente: FUENTE,
  total_articulos: permanentes,
  total_transitorios: transitorios,
  articulos,
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

console.log(`Total artículos: ${articulos.length}`);
console.log(`  Permanentes: ${permanentes}`);
console.log(`  Transitorios: ${transitorios}`);

const libros = new Map();
for (const a of articulos) {
  const k = a.libro ?? '(sin libro)';
  libros.set(k, (libros.get(k) ?? 0) + 1);
}
console.log('\nLibros:');
for (const [k, v] of libros) console.log(`  ${k}: ${v}`);

const malInicio = articulos.filter((a) => {
  const t = a.t.trim();
  return /^[,;:.\-)\]]/.test(t) || /^[a-záéíóúñ]/.test(t.charAt(0));
});
console.log(`\nArtículos con inicio sospechoso: ${malInicio.length}`);
for (const a of malInicio.slice(0, 10)) {
  console.log(`  ${a.a}: "${a.t.substring(0, 80)}..."`);
}

// Sanity check: out-of-range articles
const numerados = articulos.map((a) => {
  const m = a.a.match(/Art\.\s*(\d+)/);
  return { a: a.a, n: m ? parseInt(m[1], 10) : null, len: a.t.length };
}).filter((x) => x.n !== null);
const fuera = numerados.filter((x) => !x.a.includes('transitorio') && x.n > 600);
if (fuera.length > 0) {
  console.log(`\nArtículos con número > 600 (probables fantasmas):`);
  for (const x of fuera) console.log(`  ${x.a} (${x.len} chars)`);
}

// Key articles
for (const num of ['Art. 7', 'Art. 21', 'Art. 44', 'Art. 61', 'Art. 161', 'Art. 515', 'Art. 1 transitorio']) {
  const a = articulos.find((x) => x.a === num);
  if (a) {
    console.log(`\n${num} (${a.t.length} chars):`);
    console.log(`  ${a.t.substring(0, 180)}${a.t.length > 180 ? '...' : ''}`);
  } else {
    console.log(`\n${num}: NO ENCONTRADO`);
  }
}

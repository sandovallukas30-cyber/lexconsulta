// Aplica el mismo algoritmo de dedup que usa procesar_codigo.mjs, pero sobre
// JSONs ya generados. Útil para limpiar duplicados de códigos cuyo PDF
// original ya no está disponible localmente.
//
// Uso: node scripts/dedup_json.mjs src/data/codigoPenal.json [...]
import fs from 'fs';

const SUFIJOS_BIS = /^(bis|ter|qu[áa]ter|quinquies|sexies|septies|octies|novies|decies)\b/i;
const RE_RUIDO_INICIO = /^(?:N[°ºo]\s*\d|NOTA\b|D\.O\.|Lei\b|LEY\s+N[°º])/i;

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Uso: node scripts/dedup_json.mjs <archivo.json> [...]');
  process.exit(1);
}

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(data.articulos)) {
    console.error(`${file}: sin arreglo .articulos`);
    continue;
  }
  const total = data.articulos.length;
  const articulosFinal = [];
  const vistos = new Set();
  let renombrados = 0;
  let descartados = 0;

  for (const a of data.articulos) {
    if (!vistos.has(a.a)) {
      articulosFinal.push(a);
      vistos.add(a.a);
      continue;
    }
    const m = a.t.match(SUFIJOS_BIS);
    if (m) {
      const sufijo = m[1].toLowerCase();
      let nuevoId = `${a.a} ${sufijo}`;
      let n = 2;
      while (vistos.has(nuevoId)) {
        nuevoId = `${a.a} ${sufijo}-${n}`;
        n++;
      }
      a.a = nuevoId;
      a.t = a.t.replace(SUFIJOS_BIS, '').trimStart().replace(/^[.\-)\s]+/, '');
      articulosFinal.push(a);
      vistos.add(a.a);
      renombrados++;
      continue;
    }
    if (RE_RUIDO_INICIO.test(a.t)) {
      descartados++;
      continue;
    }
    // Segundo cuerpo legal adjunto en el PDF — descartar
    descartados++;
  }

  data.articulos = articulosFinal;
  data.total_articulos = articulosFinal.filter((a) => !a.a.includes('transitorio')).length;
  data.total_transitorios = articulosFinal.filter((a) => a.a.includes('transitorio')).length;

  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log(`${file}: ${total} → ${articulosFinal.length} (${renombrados} renombrados como BIS/TER, ${descartados} descartados)`);
}

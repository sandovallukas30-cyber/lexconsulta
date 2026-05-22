// Extract text from PDF preserving indentation as paragraph markers.
// Lines starting with more X than the page baseline are treated as new paragraphs (incisos).
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

const PDF = process.argv[2];
const OUT = process.argv[3];
const X_MAX = parseFloat(process.argv[4] ?? '380');
const INDENT_THRESHOLD = parseFloat(process.argv[5] ?? '8'); // px above baseline to consider indented

if (!PDF || !OUT) {
  console.error('Usage: node extract_pdf.mjs <pdf> <out.txt> [xmax] [indentThreshold]');
  process.exit(1);
}

const data = new Uint8Array(fs.readFileSync(PDF));
const loadingTask = getDocument({ data });
const pdf = await loadingTask.promise;
console.error(`Pages: ${pdf.numPages}`);

const pages = [];
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const items = content.items
    .filter((it) => it.transform[4] < X_MAX)
    .map((it) => ({
      text: it.str,
      x: it.transform[4],
      y: it.transform[5],
    }));

  // Group items into lines by y (rounded)
  const lineMap = new Map();
  for (const it of items) {
    const key = Math.round(it.y / 2) * 2;
    if (!lineMap.has(key)) lineMap.set(key, []);
    lineMap.get(key).push(it);
  }
  const lineEntries = [...lineMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, its]) => {
      its.sort((a, b) => a.x - b.x);
      const text = its.map((it) => it.text).join('').replace(/\s+/g, ' ').trim();
      const xStart = its[0]?.x ?? 0;
      return { text, xStart };
    })
    .filter((l) => l.text.length > 0);

  if (lineEntries.length === 0) {
    pages.push([]);
    continue;
  }

  // Determine baseline X (minimum x among lines, ignoring outliers)
  const xs = lineEntries.map((l) => l.xStart).sort((a, b) => a - b);
  const baseline = xs[0];

  // Tag indented lines with <<P>> marker (new paragraph/inciso)
  const out = [];
  for (let idx = 0; idx < lineEntries.length; idx++) {
    const l = lineEntries[idx];
    const indented = l.xStart > baseline + INDENT_THRESHOLD;
    if (indented && idx > 0) {
      out.push('<<P>>' + l.text);
    } else {
      out.push(l.text);
    }
  }
  pages.push(out);

  if (i % 50 === 0) console.error(`  procesada página ${i}`);
}

const finalText = pages
  .map((p, idx) => `--- PAGE ${idx + 1} ---\n` + p.join('\n'))
  .join('\n\n');
fs.writeFileSync(OUT, finalText, 'utf8');
console.error(`Saved: ${OUT} (${finalText.length} chars)`);

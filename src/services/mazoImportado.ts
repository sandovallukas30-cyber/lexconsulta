/** Importar un mazo de Anki o de Quizlet como apunte: cada fila «frente, reverso»
 *  pasa a una línea «- **frente:** reverso», que es justo lo que el repaso de
 *  Prima Lex convierte en tarjeta. Sin IA, solo reglas.
 *
 *  Formatos que entiende:
 *  - Anki → «Notas en texto plano» (.txt, columnas con tabulador; las líneas que
 *    empiezan con # son configuración y se saltan) o CSV.
 *  - Quizlet → exportar (término y definición separados por tabulador o coma).
 *  - Cualquier .csv / .tsv de dos columnas. Si hay más columnas (etiquetas, notas), se usan las dos primeras. */

export interface MazoImportado {
  titulo: string
  contenido: string
  tarjetas: number
  omitidas: number
}

const ENCABEZADOS = new Set(['front', 'back', 'term', 'definition', 'question', 'answer', 'frente', 'reverso', 'termino', 'término', 'definicion', 'definición', 'pregunta', 'respuesta'])

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Filas de un texto delimitado, con comillas dobles al estilo CSV (admite saltos de línea dentro de una celda). */
export function leerFilas(texto: string, delimitador: string): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let celda = ''
  let entreComillas = false
  const cerrarFila = () => {
    fila.push(celda)
    celda = ''
    if (fila.some((c) => c.trim() !== '')) filas.push(fila)
    fila = []
  }
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celda += '"'
          i++
        } else entreComillas = false
      } else celda += c
    } else if (c === '"' && celda === '') entreComillas = true
    else if (c === delimitador) {
      fila.push(celda)
      celda = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      cerrarFila()
    } else celda += c
  }
  if (celda !== '' || fila.length > 0) cerrarFila()
  return filas
}

/** Tabulador, punto y coma o coma: el que deja más columnas parejas en las primeras filas. */
function elegirDelimitador(texto: string): string {
  const muestra = texto.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')).slice(0, 12)
  let mejor = '\t'
  let mejorPuntaje = 0
  for (const d of ['\t', ';', ',']) {
    const cuentas = muestra.map((l) => leerFilas(l, d)[0]?.length ?? 0)
    const conDos = cuentas.filter((n) => n >= 2).length
    const puntaje = conDos * 100 + (d === '\t' ? 1 : 0)
    if (conDos > 0 && puntaje > mejorPuntaje) {
      mejor = d
      mejorPuntaje = puntaje
    }
  }
  return mejor
}

/** ¿Este archivo es un mazo (y no un apunte en texto)? CSV/TSV siempre; un .txt solo si casi todas sus líneas llevan tabulador. */
export function esMazo(nombre: string, texto: string): boolean {
  if (/\.(csv|tsv)$/i.test(nombre)) return true
  if (!/\.txt$/i.test(nombre)) return false
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
  if (lineas.length < 2) return false
  return lineas.filter((l) => l.includes('\t')).length / lineas.length >= 0.8
}

/** Limpia lo que traen los mazos de Anki: HTML, entidades, huecos {{c1::…}} y asteriscos que romperían el formato. */
export function limpiarCelda(t: string): string {
  return t
    .replace(/<br\s*\/?>|<\/div>|<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, '$1')
    .replace(/\[sound:[^\]]*\]/g, '')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function mazoAApunte(texto: string, nombreArchivo: string): MazoImportado {
  const limpio = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto
  const delimitador = elegirDelimitador(limpio)
  const cuerpo = limpio
    .split(/\r?\n/)
    .filter((l) => !l.startsWith('#'))
    .join('\n')
  let filas = leerFilas(cuerpo, delimitador)
  if (filas.length > 0 && filas[0].length >= 2 && ENCABEZADOS.has(sinTildes(limpiarCelda(filas[0][0]))) && ENCABEZADOS.has(sinTildes(limpiarCelda(filas[0][1])))) {
    filas = filas.slice(1)
  }
  const lineas: string[] = []
  let omitidas = 0
  for (const f of filas) {
    const frente = limpiarCelda(f[0] ?? '')
    const reverso = limpiarCelda(f[1] ?? '')
    if (!frente || !reverso) {
      omitidas++
      continue
    }
    lineas.push(`- **${frente.replace(/:\s*$/, '')}:** ${reverso}`)
  }
  const titulo = nombreArchivo.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Mazo importado'
  return { titulo, contenido: lineas.join('\n'), tarjetas: lineas.length, omitidas }
}

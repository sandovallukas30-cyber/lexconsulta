/** Plazos, cuantías y penas dentro del texto de un artículo («dentro de tercero día», «treinta
 *  días hábiles», «10 unidades tributarias mensuales», «presidio menor en su grado medio»):
 *  lo que más se pregunta en una prueba y lo que más cuesta encontrar en un artículo largo.
 *  Solo reglas, sin IA; se marcan para leerlos de un vistazo, no se interpretan. */

export interface RangoPlazo {
  inicio: number
  fin: number
}

const CANTIDAD =
  '(?:\\d{1,4}|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciséis|dieciocho|veinte|veinticinco|treinta|cuarenta|cuarenta y cinco|cincuenta|sesenta|noventa|cien|ciento ochenta|trescientos sesenta y cinco)'
const UNIDAD_TIEMPO = '(?:días?|meses|mes|años?|semanas?|horas?)'
const CALIFICATIVO = '(?:\\s+(?:hábiles|corridos|completos|cabales|continuos|seguidos|fatales))?'
const ORDINAL = '(?:primero|segundo|tercero|tercer|cuarto|quinto|sexto|séptimo|octavo|noveno|décimo)'
const MONEDA = '(?:unidades tributarias(?: mensuales| anuales)?|unidad tributaria(?: mensual| anual)?|unidades de fomento|unidad de fomento|UTM|UTA|UF|ingresos mínimos(?: mensuales)?|sueldos? vitales?)'
const GRADO = '(?:mínimo|medio|máximo)'

const PATRONES: RegExp[] = [
  // «dentro de tercero día», «al quinto día»
  new RegExp(`\\b(?:dentro de(?:l)?\\s+)?${ORDINAL}\\s+día\\b`, 'giu'),
  // «dentro del plazo de treinta días hábiles», «seis meses», «90 días»
  new RegExp(`\\b(?:dentro de(?:l plazo de)?\\s+)?${CANTIDAD}\\s+${UNIDAD_TIEMPO}${CALIFICATIVO}\\b`, 'giu'),
  // «10 unidades tributarias mensuales», «cinco a veinte UTM»
  new RegExp(`\\b${CANTIDAD}(?:[.,]\\d+)?(?:\\s+a\\s+${CANTIDAD}(?:[.,]\\d+)?)?\\s+${MONEDA}(?![\\p{L}])`, 'giu'),
  // «presidio menor en su grado medio», «reclusión mayor en sus grados mínimo a medio»
  new RegExp(`\\b(?:presidio|reclusión|relegación|confinamiento|extrañamiento|destierro)\\s+(?:mayor|menor)\\s+en\\s+(?:su|sus|cualquiera de sus)\\s+grados?(?:\\s+${GRADO}(?:\\s+a\\s+${GRADO})?)?`, 'giu'),
  new RegExp(`\\bprisión\\s+en\\s+(?:su|sus|cualquiera de sus)\\s+grados?(?:\\s+${GRADO}(?:\\s+a\\s+${GRADO})?)?`, 'giu'),
]

export function detectarPlazos(texto: string): RangoPlazo[] {
  const crudos: RangoPlazo[] = []
  for (const p of PATRONES) {
    for (const m of texto.matchAll(p)) crudos.push({ inicio: m.index!, fin: m.index! + m[0].length })
  }
  // de dos coincidencias que se pisan, queda la más larga (o la primera)
  crudos.sort((a, b) => a.inicio - b.inicio || b.fin - a.fin)
  const resultado: RangoPlazo[] = []
  for (const r of crudos) {
    const ultimo = resultado[resultado.length - 1]
    if (ultimo && r.inicio < ultimo.fin) {
      if (r.fin > ultimo.fin) ultimo.fin = r.fin
      continue
    }
    resultado.push({ ...r })
  }
  return resultado
}

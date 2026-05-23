/**
 * Moderniza ortografía antigua (Andrés Bello, pre-1927) presente en el Código de
 * Procedimiento Civil (1902) y otros textos del siglo XIX.
 *
 * Reglas seguras: solo aplica donde la sustitución es inequívoca. Casos ambiguos se omiten.
 */

// Sustituciones de palabras completas (case-sensitive en la base; abajo se mapean también capitalizadas).
const PALABRAS: Array<[RegExp, string]> = [
  // i final que hoy es y
  [/\bhoi\b/g, 'hoy'],
  [/\bmui\b/g, 'muy'],
  [/\bhai\b/g, 'hay'],
  [/\blei\b/g, 'ley'],
  [/\bleis\b/g, 'leyes'],
  [/\brei\b/g, 'rey'],
  [/\breis\b/g, 'reyes'],
  [/\bdoi\b/g, 'doy'],
  [/\bvoi\b/g, 'voy'],
  [/\bsoi\b/g, 'soy'],
  [/\bestoi\b/g, 'estoy'],

  // j antigua que hoy es g (antes de e, i)
  [/\bjeneral(es)?\b/g, 'general$1'],
  [/\bjeneralmente\b/g, 'generalmente'],
  [/\bjentes?\b/g, 'gente$1'],
  [/\bjente\b/g, 'gente'],
  [/\bjenero\b/g, 'género'],
  [/\bjenérico\b/g, 'genérico'],
  [/\bjérmen(es)?\b/g, 'germen$1'],
  [/\bjeneración\b/g, 'generación'],
  [/\bjenero\b/g, 'género'],
  [/\bjendarme(s)?\b/g, 'gendarme$1'],
  [/\bjudicialmente\b/g, 'judicialmente'], // ya OK pero por si acaso
  [/\bjeografia\b/g, 'geografía'],
  [/\bjeolojico\b/g, 'geológico'],
  [/\bimajinario\b/g, 'imaginario'],
  [/\bimajinacion\b/g, 'imaginación'],
  [/\blójico\b/g, 'lógico'],
  [/\blójica\b/g, 'lógica'],
  [/\blójicamente\b/g, 'lógicamente'],
  [/\bvíjente\b/g, 'vigente'],
  [/\bvijente\b/g, 'vigente'],
  [/\borijinal(es)?\b/g, 'original$1'],
  [/\borijinario\b/g, 'originario'],
  [/\borijen(es)?\b/g, 'origen$1'],
  [/\bdiríjase\b/g, 'diríjase'],
  [/\bdirije\b/g, 'dirige'],
  [/\bdirijir\b/g, 'dirigir'],
  [/\belijirse\b/g, 'elegirse'],
  [/\belijir\b/g, 'elegir'],
  [/\belije\b/g, 'elige'],
  [/\beléjico\b/g, 'eléctrico'],
  [/\bréjimen\b/g, 'régimen'],
  [/\brejimen\b/g, 'régimen'],
  [/\bréjio\b/g, 'regio'],
  [/\brejion(es)?\b/g, 'región$1'],
  [/\brejistro(s)?\b/g, 'registro$1'],
  [/\brejistrar(?=\b|se)/g, 'registrar'],
  [/\brefugjio\b/g, 'refugio'],
  [/\bestranjero(s)?\b/g, 'extranjero$1'],
  [/\bestranjera(s)?\b/g, 'extranjera$1'],

  // x por s (palabras del siglo XIX)
  [/\bestraño(s)?\b/g, 'extraño$1'],
  [/\bestraña(s)?\b/g, 'extraña$1'],
  [/\bestraordinario(s)?\b/g, 'extraordinario$1'],
  [/\bestraordinaria(s)?\b/g, 'extraordinaria$1'],
  [/\bestraordinariamente\b/g, 'extraordinariamente'],
  [/\bestremo(s)?\b/g, 'extremo$1'],
  [/\bestrema(s)?\b/g, 'extrema$1'],
  [/\bestremidad(es)?\b/g, 'extremidad$1'],
  [/\bestracto(s)?\b/g, 'extracto$1'],
  [/\bestracción\b/g, 'extracción'],
  [/\besposicion(es)?\b/g, 'exposición$1'],
  [/\besposicion\b/g, 'exposición'],
  [/\bespediente(s)?\b/g, 'expediente$1'],
  [/\bespedir(?=\b|se)/g, 'expedir'],
  [/\bespedido\b/g, 'expedido'],
  [/\bespedicion(es)?\b/g, 'expedición$1'],
  [/\besplicar(?=\b|se)/g, 'explicar'],
  [/\besplicación\b/g, 'explicación'],
  [/\besposicion(es)?\b/g, 'exposición$1'],

  // Acentos faltantes en palabras frecuentes (ortografía pre-1927)
  [/\bcodigo(s)?\b/g, 'código$1'],
  [/\barticulo(s)?\b/g, 'artículo$1'],
  [/\bjuridico(s)?\b/g, 'jurídico$1'],
  [/\bjuridica(s)?\b/g, 'jurídica$1'],
  [/\bprescripcion(es)?\b/g, 'prescripción$1'],
  [/\bprovision(es)?\b/g, 'provisión$1'],
  [/\bsolicitud(es)?\b/g, 'solicitud$1'], // ya está
  [/\binterposicion\b/g, 'interposición'],
  [/\bcomposicion(es)?\b/g, 'composición$1'],
  [/\bdisposicion(es)?\b/g, 'disposición$1'],
  [/\bjurisdiccion(es)?\b/g, 'jurisdicción$1'],
  [/\bcondicion(es)?\b/g, 'condición$1'],
  [/\bnotificacion(es)?\b/g, 'notificación$1'],
  [/\boposicion(es)?\b/g, 'oposición$1'],
  [/\bcontestacion(es)?\b/g, 'contestación$1'],
  [/\bdemandacion(es)?\b/g, 'demanda$1'],
  [/\bresolucion(es)?\b/g, 'resolución$1'],
  [/\bobligacion(es)?\b/g, 'obligación$1'],
  [/\baccion(es)?\b/g, 'acción$1'],
  [/\bsubastacion\b/g, 'subastación'],
  [/\baccion\b/g, 'acción'],
  [/\bsentencias?\b/g, 'sentencia$1'], // ya OK
]

// Sustituciones con contexto (regex con captura)
const CONTEXTUALES: Array<[RegExp, string]> = [
  // i como conjunción: " i " entre palabras minúsculas → " y "
  // Evita matchear "Art. I", "Capítulo I", numerales romanos.
  [/(\s|,|;)i(\s+[a-záéíóúñ])/g, '$1y$2'],
  // i al inicio de frase como conjunción (más raro pero ocurre)
  [/^i\s+([a-záéíóúñ])/gm, 'y $1'],
]

/**
 * Capitaliza la primera letra para mapear "Hoi" → "Hoy", "Lei" → "Ley", etc.
 */
function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Aplica todas las reglas. Genera versiones capitalizadas automáticamente.
 */
export function modernizar(texto: string): string {
  if (!texto) return texto
  let resultado = texto

  // Contextuales primero (para no interferir con palabras)
  for (const [re, sub] of CONTEXTUALES) {
    resultado = resultado.replace(re, sub)
  }

  // Palabras: aplicar versión minúscula y capitalizada
  for (const [re, sub] of PALABRAS) {
    resultado = resultado.replace(re, sub)
    // Versión capitalizada
    const reSource = re.source
    const reFlags = re.flags
    // Construir regex equivalente para versión Capitalizada (primera letra mayúscula)
    const primeraLetra = reSource.match(/\\b([a-z])/)
    if (primeraLetra) {
      const letra = primeraLetra[1]
      const reCap = new RegExp(reSource.replace(`\\b${letra}`, `\\b${letra.toUpperCase()}`), reFlags)
      const subCap = capitalizar(sub)
      resultado = resultado.replace(reCap, subCap)
    }
  }

  return resultado
}

/** Indica si un código necesita modernización (los pre-1927). */
export function necesitaModernizacion(tipoCodigo: string): boolean {
  return ['pci', 'pen', 'com'].includes(tipoCodigo)
}

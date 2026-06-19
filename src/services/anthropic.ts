import { callMessages } from './aiClient'
import type { PerfilUsuario, Articulo, Cita } from '../types'
import type { ResultadoBusqueda } from './busqueda'
export { precargar } from './codigos'

const MODELO = 'claude-sonnet-4-5'
const MAX_TOKENS = 1500

function systemPromptConsulta(perfil: PerfilUsuario): string {
  const base = `Eres Prima Lex, un consultor jurídico chileno asistido por IA. Tu fuente única son los artículos del ordenamiento jurídico chileno que recibirás como contexto en cada consulta. NUNCA inventes artículos ni cites normas que no estén en el contexto provisto.

Formato de respuesta (markdown):
- Usa markdown ligero: **negritas** para términos clave, listas con "-" cuando sea útil.
- NO uses encabezados markdown (##, ###). En su lugar separa secciones con un párrafo en blanco.
- NO uses separadores (---, ***).
- Mantén la respuesta compacta: máximo 3-4 párrafos cortos.
- Cita artículos siempre en formato "Art. N" (ejemplo: "Art. 161"). El usuario los verá como tarjetas expandibles automáticamente; no repitas el texto completo del artículo.

Reglas:
1. Basa cada afirmación en los artículos del contexto. Si la consulta no se puede responder con lo provisto, dilo claramente.
2. Si la pregunta es ambigua, responde lo más probable y al final ofrece aclarar en una línea.
3. No incluyas "Disclaimer" ni advertencias largas (la UI ya tiene una).
4. PRIORIDAD DE CITAS: cuando varios artículos del contexto sean pertinentes, cita primero los más fundamentales (definitorios, de principios, del Título Preliminar o de los primeros artículos del código) y luego los más específicos que regulan el caso concreto. Una respuesta sin los artículos generales aplicables está incompleta.
5. Aspira a citar entre 2 y 5 artículos relevantes. No cites artículos que no tengan relación clara con la consulta, aunque aparezcan en el contexto.
`

  if (perfil === 'profesional') {
    return (
      base +
      `\nUsuario: Profesional del derecho.
- Terminología técnico-jurídica precisa, sin explicar conceptos básicos.
- Cita incisos específicos cuando corresponda ("Art. 161 inciso 2°").
- Sé conciso y directo.`
    )
  }

  return (
    base +
    `\nUsuario: Ciudadano sin formación legal.
- Lenguaje simple y directo. Si usas un tecnicismo, explícalo en una frase.
- Da ejemplos concretos cuando ayuden.
- Cierra con una frase de acción práctica cuando corresponda.`
  )
}

function formatearContexto(articulos: ResultadoBusqueda[]): string {
  if (articulos.length === 0) return '(no se encontraron artículos relevantes)'
  return articulos
    .map(
      (r, i) =>
        `[${i + 1}] ${r.articulo.a} — ${r.nombreCodigo}\n${r.articulo.t}`
    )
    .join('\n\n')
}

export interface RespuestaIA {
  texto: string
  citas: Cita[]
  /** Etiquetas "Art. N" mencionadas en la respuesta que NO aparecen en el contexto.
   * Indican posibles alucinaciones de la IA — la UI debería marcarlas. */
  citasNoVerificadas: string[]
  modeloUsado: string
}

export async function consultar(
  pregunta: string,
  contexto: ResultadoBusqueda[],
  perfil: PerfilUsuario,
  usuarioEmail?: string | null,
  onConsultasRestantes?: (n: number) => void,
): Promise<RespuestaIA> {
  const system = systemPromptConsulta(perfil)
  const contextoTexto = formatearContexto(contexto)

  const userContent = `CONTEXTO (artículos más relevantes para esta consulta):
${contextoTexto}

CONSULTA DEL USUARIO:
${pregunta}`

  const res = await callMessages({
    model: MODELO,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: userContent }],
  }, usuarioEmail, onConsultasRestantes)

  const texto = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')

  // Extract cited articles from the response by detecting "Art. N" patterns
  const { citas, noVerificadas } = extraerCitasMencionadas(texto, contexto)

  return {
    texto,
    citas,
    citasNoVerificadas: noVerificadas,
    modeloUsado: MODELO,
  }
}

function extraerCitasMencionadas(
  texto: string,
  contexto: ResultadoBusqueda[]
): { citas: Cita[]; noVerificadas: string[] } {
  const mencionados = new Set<string>()
  const re = /Art\.?\s*(\d+(?:\s*-?\s*[A-ZÑ]{1,2})?(?:\s+(?:bis|ter|qu[áa]ter|quinquies)){0,2})/gi
  let m
  while ((m = re.exec(texto)) !== null) {
    mencionados.add(`Art. ${m[1].trim().replace(/\s+/g, ' ')}`)
  }

  const enContexto = new Set(contexto.map((r) => r.articulo.a))

  const citas: Cita[] = []
  const vistos = new Set<string>()
  for (const r of contexto) {
    if (mencionados.has(r.articulo.a) && !vistos.has(r.articulo.a)) {
      vistos.add(r.articulo.a)
      citas.push({
        articulo: r.articulo.a,
        titulo: tituloDeArticulo(r.articulo),
        texto_original: r.articulo.t,
        relevancia: descripcionRelevancia(r),
        tipo: r.codigo,
      })
    }
  }

  // Citas mencionadas en la respuesta que NO están en el contexto pasado a la IA.
  // Son potenciales alucinaciones: la IA inventó un número de artículo o citó uno
  // que no le entregamos.
  const noVerificadas: string[] = []
  for (const cita of mencionados) {
    if (!enContexto.has(cita)) noVerificadas.push(cita)
  }

  return { citas, noVerificadas }
}

function descripcionRelevancia(r: ResultadoBusqueda): string {
  if (r.numeroDirecto && r.matches.length === 0) return 'Artículo solicitado directamente'
  if (r.matches.length > 0) {
    const labels = r.matches.slice(0, 4)
    return `Coincide con: ${labels.join(', ')}`
  }
  return 'Mencionado en la respuesta'
}

function tituloDeArticulo(a: Articulo): string {
  const partes = [a.libro, a.titulo, a.capitulo, a.parrafo].filter(Boolean)
  if (partes.length > 0) return partes[partes.length - 1] as string
  const primerasPalabras = a.t.split(/\s+/).slice(0, 8).join(' ')
  return primerasPalabras + (a.t.split(/\s+/).length > 8 ? '…' : '')
}

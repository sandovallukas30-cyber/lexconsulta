import Anthropic from '@anthropic-ai/sdk'
import type { PerfilUsuario, Articulo, Cita } from '../types'
import type { ResultadoBusqueda } from './busqueda'

const MODELO = 'claude-sonnet-4-5'
const MAX_TOKENS = 1500

function getClient(): Anthropic {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Falta VITE_ANTHROPIC_API_KEY en .env')
  }
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  })
}

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
  modeloUsado: string
}

export async function consultar(
  pregunta: string,
  contexto: ResultadoBusqueda[],
  perfil: PerfilUsuario
): Promise<RespuestaIA> {
  const client = getClient()
  const system = systemPromptConsulta(perfil)
  const contextoTexto = formatearContexto(contexto)

  const userContent = `CONTEXTO (artículos más relevantes para esta consulta):
${contextoTexto}

CONSULTA DEL USUARIO:
${pregunta}`

  const res = await client.messages.create({
    model: MODELO,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: userContent }],
  })

  const texto = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')

  // Extract cited articles from the response by detecting "Art. N" patterns
  const citas = extraerCitasMencionadas(texto, contexto)

  return {
    texto,
    citas,
    modeloUsado: MODELO,
  }
}

function extraerCitasMencionadas(texto: string, contexto: ResultadoBusqueda[]): Cita[] {
  const mencionados = new Set<string>()
  const re = /Art\.?\s*(\d+(?:\s*-?\s*[A-ZÑ]{1,2})?(?:\s+(?:bis|ter|qu[áa]ter|quinquies)){0,2})/gi
  let m
  while ((m = re.exec(texto)) !== null) {
    mencionados.add(`Art. ${m[1].trim().replace(/\s+/g, ' ')}`)
  }

  const out: Cita[] = []
  const vistos = new Set<string>()
  for (const r of contexto) {
    if (mencionados.has(r.articulo.a) && !vistos.has(r.articulo.a)) {
      vistos.add(r.articulo.a)
      out.push({
        articulo: r.articulo.a,
        titulo: tituloDeArticulo(r.articulo),
        texto_original: r.articulo.t,
        relevancia: descripcionRelevancia(r),
        tipo: r.codigo,
      })
    }
  }
  return out
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

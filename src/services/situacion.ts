import { callMessages } from './aiClient'
import { buscar } from './busqueda'
import { codigosCargados, precargar } from './codigos'
import type {
  AreaSituacion,
  Cita,
  PasoAccion,
  PerfilUsuario,
  RespuestaSituacion,
  ResultadoSituacion,
} from '../types'

const MODELO = 'claude-sonnet-4-5'
const MAX_TOKENS = 2000

function extraerJSON(texto: string): string {
  const trimmed = texto.trim()
  if (trimmed.startsWith('{')) return trimmed
  const fenced = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenced) return fenced[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1) return trimmed.slice(start, end + 1)
  return trimmed
}

function systemPrompt(perfil: PerfilUsuario): string {
  const base = `Eres Prima Lex, un consultor jurídico chileno. Recibirás:
1. El ÁREA de la consulta (despido, maternidad, etc.)
2. Las RESPUESTAS del usuario a un cuestionario guiado
3. ARTÍCULOS RELEVANTES del Código del Trabajo y/o Constitución como contexto

Debes generar un análisis estructurado en JSON con esta forma EXACTA:

{
  "diagnostico": "1-3 oraciones que describen jurídicamente la situación del usuario",
  "marcoLegal": [
    { "articulo": "Art. 161", "relevancia": "breve por qué aplica" }
  ],
  "pasos": [
    { "titulo": "Paso 1: ...", "detalle": "explicación accionable", "plazo": "60 días corridos", "urgente": true }
  ],
  "plazosCriticos": ["Tienes 60 días para demandar", "..."],
  "dondeAcudir": ["Dirección del Trabajo", "Tribunal del Trabajo"]
}

Reglas:
- "marcoLegal": SOLO artículos del contexto provisto. Máximo 5. Indica número exacto del artículo.
- "pasos": entre 3 y 6 pasos concretos y accionables en orden. Cada paso es algo que el usuario PUEDE HACER.
- "plazosCriticos": fechas o plazos legales relevantes para que el usuario no pierda derechos. Si no hay, [].
- "dondeAcudir": instituciones u organismos concretos. Lista corta.
- Responde SOLO con el JSON, sin texto antes ni después, sin bloques markdown.
- Si el caso requiere asesoría profesional urgente, indícalo en "diagnostico".
`

  if (perfil === 'profesional') {
    return (
      base +
      `\nUsuario: PROFESIONAL DEL DERECHO.
- Usa terminología técnica precisa.
- Cita incisos específicos cuando corresponda.
- Sé conciso, evita explicar lo obvio.`
    )
  }

  return (
    base +
    `\nUsuario: CIUDADANO sin formación legal.
- Usa lenguaje simple y directo.
- Los pasos deben ser instrucciones claras como "Pide la carta de despido por escrito".
- Evita jerga; si la usas, explícala.
- Empático pero objetivo.`
  )
}

function formatearRespuestas(area: AreaSituacion, respuestas: RespuestaSituacion[]): string {
  const lines: string[] = [`ÁREA: ${area.titulo}`, '']
  for (const p of area.preguntas) {
    const r = respuestas.find((x) => x.preguntaId === p.id)
    const valor = r?.valor?.trim() || '(no respondió)'
    lines.push(`- ${p.pregunta}: ${valor}`)
  }
  return lines.join('\n')
}

function construirQueryBusqueda(area: AreaSituacion, respuestas: RespuestaSituacion[]): string {
  const partes = [area.titulo]
  for (const r of respuestas) {
    if (r.valor && r.valor.length > 0 && r.valor.length < 60) partes.push(r.valor)
  }
  return partes.join(' ')
}

export async function analizarSituacion(
  area: AreaSituacion,
  respuestas: RespuestaSituacion[],
  perfil: PerfilUsuario,
  codigosActivos: string[]
): Promise<ResultadoSituacion> {
  const cargados = codigosCargados().filter((c) => codigosActivos.includes(c))
  await precargar(cargados)
  const queryBusqueda = construirQueryBusqueda(area, respuestas)
  const articulosContexto = buscar(queryBusqueda, cargados, 8)

  const contextoTxt =
    articulosContexto.length === 0
      ? '(no se encontraron artículos relevantes)'
      : articulosContexto
          .map((r, i) => `[${i + 1}] ${r.articulo.a} — ${r.nombreCodigo}\n${r.articulo.t}`)
          .join('\n\n')

  const user = `ÁREA Y RESPUESTAS DEL USUARIO:
${formatearRespuestas(area, respuestas)}

ARTÍCULOS RELEVANTES (contexto):
${contextoTxt}

Genera el análisis JSON ahora.`

  const res = await callMessages({
    model: MODELO,
    max_tokens: MAX_TOKENS,
    system: systemPrompt(perfil),
    messages: [{ role: 'user', content: user }],
  })

  const texto = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('')

  let parsed: {
    diagnostico?: string
    marcoLegal?: { articulo: string; relevancia: string }[]
    pasos?: PasoAccion[]
    plazosCriticos?: string[]
    dondeAcudir?: string[]
  }
  try {
    parsed = JSON.parse(extraerJSON(texto))
  } catch {
    throw new Error('La IA devolvió una respuesta no parseable. Intenta de nuevo.')
  }

  // Cruzar marcoLegal con los artículos del contexto para enriquecer las citas
  const citas: Cita[] = []
  const mencionadosSet = new Set<string>()
  for (const m of parsed.marcoLegal ?? []) {
    const idNorm = m.articulo.replace(/\s+/g, ' ').trim()
    if (mencionadosSet.has(idNorm)) continue
    mencionadosSet.add(idNorm)
    const enCtx = articulosContexto.find((r) => r.articulo.a === idNorm)
    citas.push({
      articulo: idNorm,
      titulo: enCtx ? tituloDeArticulo(enCtx.articulo) : m.relevancia,
      texto_original: enCtx?.articulo.t ?? '',
      relevancia: m.relevancia,
      tipo: enCtx?.codigo,
    })
  }

  return {
    diagnostico: parsed.diagnostico ?? '',
    marcoLegal: citas,
    pasos: Array.isArray(parsed.pasos) ? parsed.pasos : [],
    plazosCriticos: Array.isArray(parsed.plazosCriticos) ? parsed.plazosCriticos : [],
    dondeAcudir: Array.isArray(parsed.dondeAcudir) ? parsed.dondeAcudir : [],
    modeloUsado: MODELO,
  }
}

function tituloDeArticulo(a: { libro?: string | null; titulo?: string | null; capitulo?: string | null; t: string }): string {
  const partes = [a.libro, a.titulo, a.capitulo].filter(Boolean)
  if (partes.length > 0) return partes[partes.length - 1] as string
  return a.t.split(/\s+/).slice(0, 8).join(' ') + '…'
}

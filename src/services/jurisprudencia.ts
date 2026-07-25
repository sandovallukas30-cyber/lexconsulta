import { useStore } from '../store/useStore'
import type { EntradaJurisprudencia } from '../types'

// Búsqueda simple de jurisprudencia relevante basada en palabras clave
// Retorna máximo 3 sentencias/dictámenes relacionadas
export function buscarJurisprudenciaRelevante(
  consulta: string,
  limite: number = 3
): EntradaJurisprudencia[] {
  const store = useStore.getState()
  const jurisprudencia = store.jurisprudencia

  if (!consulta || consulta.length < 3) return []

  const palabrasClave = consulta
    .toLowerCase()
    .split(/[\s,;.]+/)
    .filter((p) => p.length > 3)

  // Puntaje de relevancia para cada entrada
  const conPuntaje = jurisprudencia.map((entrada) => {
    let puntaje = 0

    // Buscar palabras en título
    const titulo = entrada.materia.toLowerCase()
    const referencia = entrada.referencia.toLowerCase()
    const resumen = entrada.resumen.toLowerCase()

    for (const palabra of palabrasClave) {
      if (titulo.includes(palabra)) puntaje += 5
      if (referencia.includes(palabra)) puntaje += 3
      if (resumen.includes(palabra)) puntaje += 2
    }

    // Bonus por tipo de órgano (Tribunal Ambiental = más relevante para ambiental, etc)
    if (
      consulta.toLowerCase().includes('ambiental') &&
      entrada.organo.includes('Tribunal Ambiental')
    ) {
      puntaje += 3
    }
    if (
      consulta.toLowerCase().includes('trabajo') &&
      entrada.organo.includes('Dirección del Trabajo')
    ) {
      puntaje += 3
    }

    return { entrada, puntaje }
  })

  // Ordenar por puntaje y tomar top N
  return conPuntaje
    .filter((item) => item.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, limite)
    .map((item) => item.entrada)
}

// Helper para formatar jurisprudencia como texto en markdown
export function formatearJurisprudenciaMarkdown(
  entradas: EntradaJurisprudencia[]
): string {
  if (entradas.length === 0) return ''

  let markdown = '\n\n## 📋 Jurisprudencia Relacionada\n\n'

  for (const entrada of entradas) {
    markdown += `### ${entrada.referencia} — ${entrada.materia}\n`
    markdown += `**${entrada.organo}** | ${entrada.fecha.substring(0, 10)}\n\n`
    markdown += `${entrada.resumen}\n\n`

    if (entrada.articulosRelacionados && entrada.articulosRelacionados.length > 0) {
      markdown += `**Artículos:** ${entrada.articulosRelacionados.join(', ')}\n\n`
    }

    markdown += '---\n\n'
  }

  return markdown
}

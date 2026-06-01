import relacionesData from '../data/relacionesCodigoTrabajo.json'
import type { PreguntaRelaciones, TipoRelacionJuego } from '../types'

export interface DatoRelacion {
  desde: string
  hasta: string
  tipo: TipoRelacionJuego
  explicacion: string
}

function obtenerRelacionesEstáticas(): DatoRelacion[] {
  return relacionesData.relaciones.map((r: any) => ({
    desde: r.desde,
    hasta: r.hasta,
    tipo: r.tipo as TipoRelacionJuego,
    explicacion: r.explicacion,
  }))
}

/** Genera 5 preguntas de relaciones variadas. */
export function generarPreguntasRelaciones(): PreguntaRelaciones[] {
  const relaciones = obtenerRelacionesEstáticas()
  if (relaciones.length === 0) {
    throw new Error('No hay relaciones disponibles')
  }

  const preguntas: PreguntaRelaciones[] = []
  const usadas = new Set<number>()

  // Seleccionar 5 relaciones aleatorias
  while (preguntas.length < 5 && usadas.size < relaciones.length) {
    const idx = Math.floor(Math.random() * relaciones.length)
    if (usadas.has(idx)) continue

    usadas.add(idx)
    const rel = relaciones[idx]

    // Extraer números de los artículos (ej: "Art. 7" → 7)
    const fromNum = parseInt(rel.desde.match(/\d+/)?.[0] || '0')
    const toNum = parseInt(rel.hasta.match(/\d+/)?.[0] || '0')

    if (fromNum === 0 || toNum === 0) continue

    // Generar 2 artículos "distractores" (no relacionados directamente)
    const todosNumeros = relaciones.flatMap((r) => [
      parseInt(r.desde.match(/\d+/)?.[0] || '0'),
      parseInt(r.hasta.match(/\d+/)?.[0] || '0'),
    ])
    const unicos = [...new Set(todosNumeros)].filter((n) => n > 0)

    let distractor1: number, distractor2: number
    do {
      distractor1 = unicos[Math.floor(Math.random() * unicos.length)]
    } while (distractor1 === fromNum || distractor1 === toNum)

    do {
      distractor2 = unicos[Math.floor(Math.random() * unicos.length)]
    } while (distractor2 === fromNum || distractor2 === toNum || distractor2 === distractor1)

    // Crear 3 artículos: [correcto_desde, correcto_hasta, distractor]
    // Randomizar el orden
    const articulos = [`Art. ${fromNum}`, `Art. ${toNum}`, `Art. ${distractor1}`]
    const orden = [0, 1, 2].sort(() => Math.random() - 0.5)
    const articulosDesordenados = orden.map((i) => articulos[i])

    // Mapear qué posición tiene la respuesta correcta
    const posDesde = articulosDesordenados.indexOf(`Art. ${fromNum}`)
    const posHasta = articulosDesordenados.indexOf(`Art. ${toNum}`)

    preguntas.push({
      id: crypto.randomUUID(),
      articulos: articulosDesordenados as [string, string, string],
      respuestasCorrectas: [
        {
          desde: posDesde,
          hasta: posHasta,
          tipo: rel.tipo,
        },
      ],
    })
  }

  if (preguntas.length === 0) {
    throw new Error('No se pudieron generar preguntas válidas')
  }

  return preguntas
}

/** Obtiene la explicación de una relación (para el resumen). */
export function obtenerExplicacionRelacion(desde: string, hasta: string): string {
  const relaciones = obtenerRelacionesEstáticas()
  const rel = relaciones.find((r) => r.desde === desde && r.hasta === hasta)
  return rel?.explicacion || `${desde} se relaciona con ${hasta}`
}

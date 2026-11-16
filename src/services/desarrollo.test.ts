import { describe, expect, it } from 'vitest'
import { canonico, evaluarRespuesta, generarDesarrollo, preguntasDeApunte, seccionesDe, type PuntoClave } from './desarrollo'

const APUNTE = {
  id: 'a1',
  contenido: [
    '# Gobierno',
    '',
    '## Acusación constitucional',
    'La acusación contra un **Ministro** se presenta mientras esté en funciones o dentro de **tres meses** después de su cese. La Cámara decide por **mayoría de los diputados presentes** y el Senado por **mayoría de los senadores en ejercicio**.',
    '',
    '## Corta',
    'Algo breve con **un** punto.',
    '',
    '## Interpelación',
    'La Cámara cita a un Ministro a petición de un tercio de los diputados en ejercicio. Se pide por **un tercio**, no por 2/5 como la **comisión investigadora**, y no obliga al Presidente. Es una herramienta de **fiscalización** política.',
  ].join('\n'),
}

describe('canonico', () => {
  it('iguala números y fracciones en palabras con cifras', () => {
    expect(canonico('Treinta días')).toBe('30 dias')
    expect(canonico('un tercio de los diputados')).toBe('1/3 de los diputados')
    expect(canonico('Dos Quintos')).toBe('2/5')
    expect(canonico('cuarenta y cinco días')).toBe('45 dias')
  })
})

describe('secciones y preguntas', () => {
  it('separa el apunte por títulos', () => {
    expect(seccionesDe(APUNTE.contenido).map((s) => s.titulo)).toEqual(['Gobierno', 'Acusación constitucional', 'Corta', 'Interpelación'])
  })

  it('arma preguntas solo con secciones largas y con puntos clave', () => {
    const p = preguntasDeApunte(APUNTE)
    expect(p.map((x) => x.titulo)).toEqual(['Acusación constitucional', 'Interpelación'])
    expect(p[0].enunciado).toBe('Desarrolle: Acusación constitucional')
    expect(p[0].puntos.some((x) => x.tipo === 'cantidad' && x.texto.includes('tres meses'))).toBe(true)
    expect(p[0].puntos.some((x) => x.tipo === 'concepto' && x.texto === 'Ministro')).toBe(true)
    expect(p[1].puntos.filter((x) => x.tipo === 'cantidad').map((x) => x.texto)).toEqual(expect.arrayContaining(['2/5', 'un tercio']))
  })

  it('usa «Compare y distinga» si la sección trae una tabla', () => {
    const t = { id: 'b', contenido: '## Plazos\n| a | b |\n| - | - |\n| **Presidente** | **seis meses** |\n| **Ministro** | **tres meses** |\nTexto de relleno para pasar el largo mínimo de la sección y que sea una pregunta válida de desarrollo.' }
    expect(preguntasDeApunte(t)[0].enunciado).toBe('Compare y distinga: Plazos')
  })

  it('las de prioridad van primero y se respeta la cantidad', () => {
    const todas = preguntasDeApunte(APUNTE)
    const r = generarDesarrollo([APUNTE], 1, () => 0.5, new Set([todas[1].id]))
    expect(r).toHaveLength(1)
    expect(r[0].id).toBe(todas[1].id)
  })
})

describe('evaluarRespuesta', () => {
  const puntos: PuntoClave[] = [
    { texto: 'tres meses', tipo: 'cantidad' },
    { texto: 'mayoría de los diputados presentes', tipo: 'concepto' },
    { texto: 'Ministro', tipo: 'concepto' },
    { texto: 'dentro de 30 días hábiles', tipo: 'cantidad' },
  ]

  it('acepta números en palabras y variaciones de forma', () => {
    const r = evaluarRespuesta('Se acusa al ministro dentro de 3 meses; la camara aprueba por mayoria de diputados presentes y el plazo es de treinta dias', puntos)
    expect(r.cubiertos).toEqual([true, true, true, true])
    expect(r.porcentaje).toBe(1)
  })

  it('marca lo que falta', () => {
    const r = evaluarRespuesta('Procede contra el ministro', puntos)
    expect(r.cubiertos).toEqual([false, false, true, false])
    expect(r.porcentaje).toBe(0.25)
  })

  it('un plazo distinto no cuenta', () => {
    expect(evaluarRespuesta('dentro de seis meses', [{ texto: 'tres meses', tipo: 'cantidad' }]).cubiertos).toEqual([false])
  })

  it('respuesta vacía no cubre nada', () => {
    expect(evaluarRespuesta('', puntos).porcentaje).toBe(0)
  })
})

describe('puntos repetidos', () => {
  it('«dentro de tres meses» y «tres meses» cuentan como un solo punto', () => {
    const a = { id: 'x', contenido: '## Plazo\nLa acusación se presenta dentro de tres meses desde el cese, y esos tres meses se cuentan desde que el **Ministro** dejó el cargo, según la **Constitución** y la **ley** orgánica de la materia, sin excepciones.' }
    const cantidades = preguntasDeApunte(a)[0].puntos.filter((p) => p.tipo === 'cantidad')
    expect(cantidades).toHaveLength(1)
  })
})

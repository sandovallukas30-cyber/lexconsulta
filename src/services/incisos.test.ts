import { describe, expect, it } from 'vitest'
import { numerosDeIncisos, ubicacionDeParrafo } from './incisos'

describe('numerosDeIncisos', () => {
  it('artículo corriente: cada párrafo es un inciso, de corrido', () => {
    expect(numerosDeIncisos(['Primero.', 'Segundo.', 'Tercero.'])).toEqual([1, 2, 3])
  })

  it('lista de ítems con párrafo de cierre (Constitución, art. 17): los ítems no cuentan y el cierre es el inciso 2', () => {
    const art17 = [
      'La calidad de ciudadano se pierde:',
      '1º.- Por pérdida de la nacionalidad chilena;',
      '2º.- Por condena a pena aflictiva, y',
      '3º.- Por condena por delitos que la ley califique como conducta terrorista.',
      'Los que hubieren perdido la ciudadanía por la causal indicada en el número 2º, la recuperarán en conformidad a la ley.',
    ]
    expect(numerosDeIncisos(art17)).toEqual([1, null, null, null, 2])
  })

  it('lista de ítems en medio del artículo (Constitución, art. 65): incisos 1 a 4 y los números dentro del 4', () => {
    const art65 = [
      'Las leyes pueden tener origen en la Cámara de Diputados o en el Senado.',
      'Las leyes sobre tributos de cualquiera naturaleza tienen su origen en la Cámara de Diputados.',
      'Corresponderá al Presidente de la República la iniciativa exclusiva de los proyectos de ley.',
      'Corresponderá, asimismo, al Presidente de la República la iniciativa exclusiva para:',
      '1º.- Imponer, suprimir, reducir o condonar tributos;',
      '2º.- Crear nuevos servicios públicos;',
      '6º.- Establecer o modificar las normas sobre seguridad social.',
    ]
    expect(numerosDeIncisos(art65)).toEqual([1, 2, 3, 4, null, null, null])
  })

  it('numerales con incisos propios (Constitución, art. 19): cada número reinicia la cuenta', () => {
    const art19 = [
      'La Constitución asegura a todas las personas:',
      '1º.- El derecho a la vida.',
      'La ley protege la vida del que está por nacer.',
      'La pena de muerte sólo podrá establecerse por delito contemplado en ley.',
      '2º.- La igualdad ante la ley.',
      'Ni la ley ni autoridad alguna podrán establecer diferencias arbitrarias;',
      '3º.- La igual protección de la ley en el ejercicio de sus derechos.',
      'Toda persona tiene derecho a defensa jurídica.',
      'La ley arbitrará los medios para otorgar asesoramiento.',
      'Toda persona imputada de delito tiene derecho irrenunciable a ser asistida por un abogado.',
      'Nadie podrá ser juzgado por comisiones especiales.',
      'Toda sentencia de un órgano que ejerza jurisdicción debe fundarse en un proceso previo legalmente tramitado.',
    ]
    // art. 19 N.º 3, inciso 6.º = «Toda sentencia de un órgano que ejerza jurisdicción…» (así lo cita la Corte Suprema)
    expect(numerosDeIncisos(art19)).toEqual([1, 1, 2, 3, 1, 2, 1, 2, 3, 4, 5, 6])
  })

  it('lista con letras o paréntesis (art. 63): los ítems no cuentan y los párrafos intermedios siguen la cuenta', () => {
    const art63 = ['Sólo son materias de ley:', '1) Las que deben ser objeto de leyes orgánicas;', '2) Las que la Constitución exija;', 'Lo dispuesto en este número no se aplicará al Banco Central.', '3) Las que son objeto de codificación;']
    expect(numerosDeIncisos(art63)).toEqual([1, null, null, 2, null])
  })

  it('los encabezados de sección pegados al final no son incisos', () => {
    expect(numerosDeIncisos(['Las leyes obligan.', 'Y rigen para todos.', '§ 2. Promulgación de la ley'])).toEqual([1, 2, null])
    expect(numerosDeIncisos(['Texto.', 'TÍTULO II'])).toEqual([1, null])
  })

  it('un único numeral con guion seguido de un párrafo no se toma como «incisos propios»', () => {
    expect(numerosDeIncisos(['Se aplica:', '1º.- A los casos del artículo anterior.', 'En los demás casos, no.'])).toEqual([1, null, 2])
  })
})

describe('ubicacionDeParrafo', () => {
  const art17 = [
    'La calidad de ciudadano se pierde:',
    '1º.- Por pérdida de la nacionalidad chilena;',
    '2º.- Por condena a pena aflictiva, y',
    '3º.- Por condena por delitos que la ley califique como conducta terrorista.',
    'Los que hubieren perdido la ciudadanía por la causal indicada en el número 2º, la recuperarán en conformidad a la ley.',
  ]
  const art19 = [
    'La Constitución asegura a todas las personas:',
    '1º.- El derecho a la vida.',
    'La ley protege la vida del que está por nacer.',
    '2º.- La igualdad ante la ley.',
    'Ni la ley ni autoridad alguna podrán establecer diferencias arbitrarias;',
    '3º.- La igual protección de la ley en el ejercicio de sus derechos.',
    'Toda persona tiene derecho a defensa jurídica.',
    'La ley arbitrará los medios para otorgar asesoramiento.',
    'Toda persona imputada de delito tiene derecho irrenunciable a ser asistida por un abogado.',
    'Nadie podrá ser juzgado por comisiones especiales.',
    'Toda sentencia de un órgano que ejerza jurisdicción debe fundarse en un proceso previo legalmente tramitado.',
  ]
  const art65 = [
    'Las leyes pueden tener origen en la Cámara de Diputados o en el Senado.',
    'Las leyes sobre tributos tienen su origen en la Cámara de Diputados.',
    'Corresponderá al Presidente la iniciativa exclusiva de los proyectos de ley.',
    'Corresponderá, asimismo, al Presidente la iniciativa exclusiva para:',
    '1º.- Imponer, suprimir, reducir o condonar tributos;',
    '6º.- Establecer o modificar las normas sobre seguridad social.',
  ]

  it('art. 17: el párrafo final es el inciso 2 y los números del inciso 1 no llevan inciso', () => {
    expect(ubicacionDeParrafo(art17, 4)).toEqual({ inciso: 2, numero: null, letra: null, propio: false })
    expect(ubicacionDeParrafo(art17, 2)).toEqual({ inciso: null, numero: '2', letra: null, propio: false })
  })

  it('art. 19: «N° 3, inciso 6» y el primer párrafo del número es el número solo', () => {
    expect(ubicacionDeParrafo(art19, 10)).toEqual({ inciso: 6, numero: '3', letra: null, propio: true })
    expect(ubicacionDeParrafo(art19, 5)).toEqual({ inciso: null, numero: '3', letra: null, propio: true })
    expect(ubicacionDeParrafo(art19, 2)).toEqual({ inciso: 2, numero: '1', letra: null, propio: true })
  })

  it('art. 65: los números de la lista cuelgan del inciso 4', () => {
    expect(ubicacionDeParrafo(art65, 5)).toEqual({ inciso: 4, numero: '6', letra: null, propio: false })
    expect(ubicacionDeParrafo(art65, 3)).toEqual({ inciso: 4, numero: null, letra: null, propio: false })
  })

  it('un artículo de un solo inciso no lleva «inc.»', () => {
    expect(ubicacionDeParrafo(['Único párrafo.'], 0)).toEqual({ inciso: null, numero: null, letra: null, propio: false })
  })

  it('un encabezado pegado no se cita', () => {
    expect(ubicacionDeParrafo(['Texto.', '§ 2. Promulgación'], 1)).toBeNull()
  })
})

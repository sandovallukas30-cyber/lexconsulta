import { describe, expect, it } from 'vitest'
import { esMazo, leerFilas, limpiarCelda, mazoAApunte } from './mazoImportado'
import { generarTarjetas } from './tarjetasApunte'

describe('esMazo', () => {
  it('un .csv o .tsv siempre es un mazo', () => {
    expect(esMazo('civil.csv', 'a,b')).toBe(true)
    expect(esMazo('civil.tsv', 'a\tb')).toBe(true)
  })
  it('un .txt es mazo solo si casi todas las líneas llevan tabulador', () => {
    expect(esMazo('anki.txt', 'uno\tdos\ntres\tcuatro\ncinco\tseis')).toBe(true)
    expect(esMazo('apunte.txt', '# Título\nUn párrafo normal.\nOtro párrafo\ttiene un tabulador.')).toBe(false)
    expect(esMazo('apunte.md', 'a\tb\nc\td')).toBe(false)
  })
})

describe('leerFilas', () => {
  it('respeta comillas, comillas dobles y saltos de línea dentro de una celda', () => {
    expect(leerFilas('a,"b, con coma","dice ""hola"""\nc,d,e', ',')).toEqual([
      ['a', 'b, con coma', 'dice "hola"'],
      ['c', 'd', 'e'],
    ])
    expect(leerFilas('x,"línea 1\nlínea 2"', ',')).toEqual([['x', 'línea 1\nlínea 2']])
  })
  it('ignora las filas vacías', () => {
    expect(leerFilas('a\tb\n\n\nc\td\n', '\t')).toEqual([['a', 'b'], ['c', 'd']])
  })
})

describe('limpiarCelda', () => {
  it('quita HTML, entidades, huecos de Anki y asteriscos', () => {
    expect(limpiarCelda('Ser <b>dueño</b><br>de&nbsp;algo &amp; más')).toBe('Ser dueño de algo & más')
    expect(limpiarCelda('El {{c1::plazo::pista}} es de {{c2::4 años}}')).toBe('El plazo es de 4 años')
    expect(limpiarCelda('**negrita** y *cursiva*')).toBe('negrita y cursiva')
  })
})

describe('mazoAApunte', () => {
  it('convierte un export de Anki (tabulador, con líneas # de configuración)', () => {
    const anki = '#separator:tab\n#html:true\nPrescripción\tModo de extinguir <b>acciones</b>\nMora\tRetardo imputable\n'
    const r = mazoAApunte(anki, 'Civil_I.txt')
    expect(r.titulo).toBe('Civil I')
    expect(r.contenido).toBe('- **Prescripción:** Modo de extinguir acciones\n- **Mora:** Retardo imputable')
    expect(r.tarjetas).toBe(2)
  })
  it('detecta la coma en un CSV de Quizlet y salta el encabezado', () => {
    const csv = 'Term,Definition\n"Dolo","Intención positiva de inferir injuria"\nCulpa,"Falta de diligencia, descuido"\n'
    const r = mazoAApunte(csv, 'quizlet.csv')
    expect(r.contenido).toBe('- **Dolo:** Intención positiva de inferir injuria\n- **Culpa:** Falta de diligencia, descuido')
  })
  it('usa solo las dos primeras columnas y cuenta las filas incompletas', () => {
    const r = mazoAApunte('uno\tdos\tetiqueta\nsolo frente\t\n\ttres\n', 'x.tsv')
    expect(r.tarjetas).toBe(1)
    expect(r.omitidas).toBe(2)
  })
  it('lo que sale es lo que el repaso convierte en tarjetas', () => {
    const r = mazoAApunte('Dolo\tIntención de dañar\nCulpa\tFalta de diligencia\n', 'penal.tsv')
    const tarjetas = generarTarjetas({ id: 'a1', contenido: r.contenido })
    expect(tarjetas.map((t) => [t.frente, t.reverso])).toEqual([
      ['Dolo', 'Intención de dañar'],
      ['Culpa', 'Falta de diligencia'],
    ])
  })
})

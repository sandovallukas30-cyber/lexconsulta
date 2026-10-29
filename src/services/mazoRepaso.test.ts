import { describe, expect, it } from 'vitest'
import type { ApunteModulo, DatosAcademicosModulo, EstadoTarjetaRepaso } from '../types'
import { coincideEstado, contarPorEstado, esDificil, FILTROS_INICIALES, filtrarMazo, seccionesDe, tarjetasDeAsignaturas, tituloMazo } from './mazoRepaso'

const apunte = (id: string, contenido: string): ApunteModulo => ({ id, titulo: `Apunte ${id}`, contenido, fechaCreacion: 1, fechaModificacion: 1 })
const datos = (...apuntes: ApunteModulo[]): DatosAcademicosModulo => ({ clases: [], evaluaciones: [], textos: [], apuntes, cuadernos: [], briefs: [] }) as DatosAcademicosModulo

const academico = {
  civil: datos(apunte('a1', '## Obligaciones\n- **Dolo:** intención de dañar\n- **Culpa:** falta de diligencia\n## Contratos\n- **Oferta:** propuesta de contrato')),
  penal: datos(apunte('b1', '## Teoría del delito\n- **Tipicidad:** adecuación al tipo\n- **Antijuridicidad:** contraria a derecho')),
}

const estado = (extra: Partial<EstadoTarjetaRepaso> = {}): EstadoTarjetaRepaso => ({ caja: 1, proximo: 0, aciertos: 0, fallos: 0, ultimo: 1, ...extra })

const todas = tarjetasDeAsignaturas(academico)
const id = (frente: string) => todas.find((t) => t.frente === frente)!.id

describe('tarjetasDeAsignaturas', () => {
  it('junta las tarjetas de todas las asignaturas o solo de las pedidas, con su origen', () => {
    expect(todas).toHaveLength(5)
    expect(tarjetasDeAsignaturas(academico, ['penal']).map((t) => t.frente)).toEqual(['Tipicidad', 'Antijuridicidad'])
    expect(todas.find((t) => t.frente === 'Dolo')).toMatchObject({ ramoId: 'civil', apunteTitulo: 'Apunte a1', seccion: 'Obligaciones' })
  })
  it('ignora asignaturas que no existen', () => {
    expect(tarjetasDeAsignaturas(academico, ['nada'])).toEqual([])
  })
})

describe('estados', () => {
  const ahora = 1000
  it('«me toca hoy» incluye nuevas y vencidas, no las que vuelven más adelante', () => {
    expect(coincideEstado('pendientes', undefined, ahora)).toBe(true)
    expect(coincideEstado('pendientes', estado({ proximo: 500 }), ahora)).toBe(true)
    expect(coincideEstado('pendientes', estado({ proximo: 5000 }), ahora)).toBe(false)
  })
  it('«nuevas» son las que nunca se repasaron', () => {
    expect(coincideEstado('nuevas', undefined, ahora)).toBe(true)
    expect(coincideEstado('nuevas', estado(), ahora)).toBe(false)
  })
  it('«las que me cuestan»: olvidadas, falladas dos veces o de dificultad alta, aunque no toquen hoy', () => {
    expect(esDificil(undefined)).toBe(false)
    expect(esDificil(estado())).toBe(false)
    expect(esDificil(estado({ olvidos: 1 }))).toBe(true)
    expect(esDificil(estado({ fallos: 2 }))).toBe(true)
    expect(esDificil(estado({ dificultad: 7.2 }))).toBe(true)
    expect(esDificil(estado({ fallos: 1, dificultad: 5 }))).toBe(false)
    expect(coincideEstado('dificiles', estado({ fallos: 3, proximo: 99999 }), ahora)).toBe(true)
  })
  it('«todas» deja pasar todo', () => {
    expect(coincideEstado('todas', estado({ proximo: 99999 }), ahora)).toBe(true)
  })
})

describe('filtrarMazo', () => {
  const estados = {
    [id('Dolo')]: estado({ fallos: 3, proximo: 99999999999999 }),
    [id('Culpa')]: estado({ proximo: 99999999999999 }),
    [id('Tipicidad')]: estado({ olvidos: 1 }),
  }
  it('por estado', () => {
    const f = (estado: 'pendientes' | 'dificiles' | 'nuevas' | 'todas') => filtrarMazo(todas, estados, { ...FILTROS_INICIALES, estado }).map((t) => t.frente).sort()
    expect(f('dificiles')).toEqual(['Dolo', 'Tipicidad'])
    expect(f('nuevas')).toEqual(['Antijuridicidad', 'Oferta'])
    expect(f('pendientes')).toEqual(['Antijuridicidad', 'Oferta', 'Tipicidad'])
    expect(f('todas')).toHaveLength(5)
  })
  it('por asignatura y por sección', () => {
    const civil = filtrarMazo(todas, estados, { ramos: ['civil'], estado: 'todas', seccion: '' })
    expect(civil).toHaveLength(3)
    const contratos = filtrarMazo(todas, estados, { ramos: ['civil'], estado: 'todas', seccion: 'Contratos' })
    expect(contratos.map((t) => t.frente)).toEqual(['Oferta'])
    expect(filtrarMazo(todas, estados, { ramos: ['penal'], estado: 'todas', seccion: 'Contratos' })).toEqual([])
  })
  it('contarPorEstado respeta los demás filtros', () => {
    expect(contarPorEstado(todas, estados, { ramos: ['civil'], estado: 'pendientes', seccion: '' })).toEqual({ pendientes: 1, dificiles: 1, nuevas: 1, todas: 3 })
  })
})

describe('seccionesDe', () => {
  it('lista las secciones de las asignaturas elegidas con su cantidad', () => {
    expect(seccionesDe(todas, ['civil'])).toEqual([
      { seccion: 'Obligaciones', n: 2 },
      { seccion: 'Contratos', n: 1 },
    ])
    expect(seccionesDe(todas)).toHaveLength(3)
  })
})

describe('tituloMazo', () => {
  it('describe el mazo', () => {
    expect(tituloMazo(FILTROS_INICIALES, [])).toBe('Me toca hoy · todas mis asignaturas')
    expect(tituloMazo({ ramos: ['civil'], estado: 'dificiles', seccion: 'Contratos' }, ['Derecho Civil I'])).toBe('Las que me cuestan · Derecho Civil I · Contratos')
  })
})

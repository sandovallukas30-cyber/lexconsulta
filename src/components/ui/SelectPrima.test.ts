import { createElement as h, Fragment } from 'react'
import { describe, expect, it } from 'vitest'
import { opcionesDe } from './opcionesSelect'

describe('opcionesDe', () => {
  it('lee opciones sueltas, con valor explícito o con su texto como valor', () => {
    const o = opcionesDe([h('option', { key: 1, value: 'a' }, 'Uno'), h('option', { key: 2 }, 'Dos')])
    expect(o).toEqual([
      { valor: 'a', texto: 'Uno', deshabilitada: false, grupo: null },
      { valor: 'Dos', texto: 'Dos', deshabilitada: false, grupo: null },
    ])
  })
  it('lee grupos, fragmentos y opciones deshabilitadas', () => {
    const o = opcionesDe([
      h('option', { key: 0, value: '' }, 'Sin asignatura'),
      h('optgroup', { key: 1, label: 'Mis asignaturas' }, [h('option', { key: 'x', value: 'x' }, 'Civil'), h('option', { key: 'y', value: 'y', disabled: true }, 'Penal')]),
      h(Fragment, { key: 2 }, [h('option', { key: 'z', value: 'z' }, 'Otra')]),
    ])
    expect(o.map((x) => [x.valor, x.grupo, x.deshabilitada])).toEqual([
      ['', null, false],
      ['x', 'Mis asignaturas', false],
      ['y', 'Mis asignaturas', true],
      ['z', null, false],
    ])
  })
  it('junta el texto cuando el contenido viene en pedazos y acepta números como valor', () => {
    const o = opcionesDe([h('option', { key: 1, value: 3 }, 'Video: ', 'Grande')])
    expect(o[0]).toMatchObject({ valor: '3', texto: 'Video: Grande' })
  })
  it('ignora lo que no es una opción', () => {
    expect(opcionesDe([h('div', { key: 1 }, 'x'), 'texto suelto', null])).toEqual([])
  })
})

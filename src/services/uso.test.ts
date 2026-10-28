import { describe, expect, it } from 'vitest'
import { CLAVES_FUNCIONES, FUNCIONES_USO, MAX_SEGUNDOS_POR_VISTA, MAX_VECES_POR_FUNCION, VISTAS_USO, sanearUso } from '../../api/_catalogoUso'
import { AcumuladorUso } from './uso'

describe('estadísticas de uso: catálogo', () => {
  it('cada función tiene una descripción y la clave tiene el formato esperado', () => {
    expect(CLAVES_FUNCIONES.length).toBeGreaterThan(20)
    for (const clave of CLAVES_FUNCIONES) {
      expect(clave).toMatch(/^[a-z]+\.[A-Za-z]+$/)
      expect(FUNCIONES_USO[clave].length).toBeGreaterThan(5)
      expect(clave.length).toBeLessThanOrEqual(40) // el límite de la columna en la base
    }
  })
})

describe('estadísticas de uso: validación de lo que llega al servidor', () => {
  const base = { v: 1, d: 'tablet', nueva: false, ses: true, e: { 'apunte.nuevo': 2 }, t: { hoy: 30 } }

  it('acepta un envío válido', () => {
    expect(sanearUso(base)).toEqual({ v: 1, d: 'tablet', nueva: false, ses: true, e: { 'apunte.nuevo': 2 }, t: { hoy: 30 } })
  })

  it('rechaza lo que no es un envío', () => {
    for (const malo of [null, undefined, 'texto', 5, [], {}, { ...base, v: 2 }, { ...base, d: 'televisor' }, { ...base, d: undefined }]) {
      expect(sanearUso(malo)).toBeNull()
    }
  })

  it('descarta funciones y pantallas que no están en el catálogo (nada de texto libre)', () => {
    const r = sanearUso({ ...base, e: { 'apunte.nuevo': 1, 'mi.apunte.secreto': 9, '<script>': 1 }, t: { hoy: 10, 'texto libre con el título': 50 } })
    expect(r?.e).toEqual({ 'apunte.nuevo': 1 })
    expect(r?.t).toEqual({ hoy: 10 })
  })

  it('acota los valores exagerados y descarta los inválidos', () => {
    const r = sanearUso({ ...base, e: { 'apunte.nuevo': 999_999, 'apunte.abrir': -3, 'apunte.editar': 'mucho', 'apunte.buscar': NaN }, t: { hoy: 10 ** 9, tareas: 0.4 } })
    expect(r?.e).toEqual({ 'apunte.nuevo': MAX_VECES_POR_FUNCION })
    expect(r?.t).toEqual({ hoy: MAX_SEGUNDOS_POR_VISTA })
  })

  it('un envío sin nada que contar ni visita nueva no se guarda', () => {
    expect(sanearUso({ ...base, ses: false, e: {}, t: {} })).toBeNull()
    expect(sanearUso({ ...base, ses: true, e: {}, t: {} })).not.toBeNull()
  })

  it('el envío saneado no puede llevar campos de más (un nombre o correo se pierde)', () => {
    const r = sanearUso({ ...base, correo: 'a@b.cl', nombre: 'Juan', apunte: 'texto largo' })
    expect(Object.keys(r!).sort()).toEqual(['d', 'e', 'nueva', 'ses', 't', 'v'])
  })
})

describe('estadísticas de uso: acumulador del navegador', () => {
  it('cuenta funciones y tiempo, y los deja en cero al enviar', () => {
    const a = new AcumuladorUso()
    a.contar('apunte.nuevo')
    a.contar('apunte.nuevo')
    a.contar('repaso.pista')
    a.sumarTiempo('hoy', 5)
    a.sumarTiempo('hoy', 5)
    a.sumarTiempo('explorador', 10)
    const primero = a.vaciar('escritorio', true)
    expect(primero).toEqual({ v: 1, d: 'escritorio', nueva: true, ses: true, e: { 'apunte.nuevo': 2, 'repaso.pista': 1 }, t: { hoy: 10, explorador: 10 } })
    expect(a.vaciar('escritorio', true)).toBeNull() // ya se mandó todo y la visita ya se contó
  })

  it('la visita se cuenta solo en el primer envío', () => {
    const a = new AcumuladorUso()
    a.sumarTiempo('hoy', 5)
    expect(a.vaciar('movil', false)?.ses).toBe(true)
    a.sumarTiempo('hoy', 5)
    expect(a.vaciar('movil', false)?.ses).toBe(false)
  })

  it('ignora pantallas desconocidas y tiempos inválidos', () => {
    const a = new AcumuladorUso()
    a.sumarTiempo('pantalla-inventada', 30)
    a.sumarTiempo(undefined, 30)
    a.sumarTiempo('hoy', -5)
    a.sumarTiempo('hoy', NaN)
    const r = a.vaciar('movil', false)
    expect(r?.t).toEqual({})
  })

  it('lo que acumula siempre pasa la validación del servidor', () => {
    const a = new AcumuladorUso()
    for (const clave of CLAVES_FUNCIONES) a.contar(clave)
    for (const v of VISTAS_USO) a.sumarTiempo(v, 20)
    const envio = a.vaciar('tablet', false)
    expect(sanearUso(envio)).toEqual(envio)
  })
})

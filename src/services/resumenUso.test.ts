import { describe, expect, it } from 'vitest'
import { CLAVES_FUNCIONES, VISTAS_USO } from '../../api/_catalogoUso'
import { diasDelRango, formatoDuracion, resumirUso, type FilaUso } from './resumenUso'

const fila = (dia: string, tipo: FilaUso['tipo'], clave: string, dispositivo: FilaUso['dispositivo'], cantidad = 0, segundos = 0): FilaUso => ({
  dia,
  tipo,
  clave,
  dispositivo,
  cantidad,
  segundos,
})

describe('panel de uso: resumen', () => {
  const filas: FilaUso[] = [
    fila('2026-10-26', 'sesion', 'nueva', 'tablet', 3),
    fila('2026-10-26', 'sesion', 'regreso', 'escritorio', 2),
    fila('2026-10-28', 'sesion', 'regreso', 'tablet', 5),
    fila('2026-10-26', 'vista', 'modulos', 'tablet', 0, 600),
    fila('2026-10-28', 'vista', 'modulos', 'tablet', 0, 400),
    fila('2026-10-28', 'vista', 'hoy', 'tablet', 0, 1000),
    fila('2026-10-26', 'evento', 'apunte.nuevo', 'tablet', 4),
    fila('2026-10-28', 'evento', 'apunte.nuevo', 'tablet', 1),
    fila('2026-10-28', 'evento', 'apunte.articulos', 'tablet', 7),
  ]
  const r = resumirUso(filas, '2026-10-25', '2026-10-29')

  it('cuenta las visitas nuevas y las que regresan', () => {
    expect(r.visitas).toEqual({ total: 10, nuevas: 3, regresos: 7 })
  })

  it('da una entrada por cada día del rango, con 0 en los días sin visitas', () => {
    expect(r.porDia.map((d) => d.dia)).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'])
    expect(r.porDia.map((d) => d.visitas)).toEqual([0, 5, 0, 5, 0])
  })

  it('reparte las visitas por tipo de pantalla', () => {
    expect(r.porDispositivo).toEqual({ movil: 0, tablet: 8, escritorio: 2 })
  })

  it('ordena las pantallas por tiempo e incluye las que no se usaron', () => {
    expect(r.vistas.length).toBe(VISTAS_USO.length)
    expect(r.vistas[0]).toMatchObject({ vista: 'hoy', segundos: 1000 })
    expect(r.vistas[1]).toMatchObject({ vista: 'modulos', segundos: 1000 })
    expect(r.vistas.reduce((a, v) => a + v.porcentaje, 0)).toBeCloseTo(100)
    expect(r.vistas[r.vistas.length - 1].segundos).toBe(0)
    expect(r.totalSegundos).toBe(2000)
    expect(r.segundosPorVisita).toBe(200)
  })

  it('ordena las funciones por uso y lista las que nadie usó', () => {
    expect(r.funciones.length).toBe(CLAVES_FUNCIONES.length)
    expect(r.funciones[0]).toMatchObject({ clave: 'apunte.articulos', veces: 7 })
    expect(r.funciones[1]).toMatchObject({ clave: 'apunte.nuevo', veces: 5 })
    expect(r.sinUso.length).toBe(CLAVES_FUNCIONES.length - 2)
    expect(r.sinUso.find((f) => f.clave === 'apunte.nuevo')).toBeUndefined()
  })

  it('sin datos: todo en cero, sin dividir por cero', () => {
    const vacio = resumirUso([], '2026-10-01', '2026-10-03')
    expect(vacio.visitas.total).toBe(0)
    expect(vacio.segundosPorVisita).toBe(0)
    expect(vacio.vistas.every((v) => v.porcentaje === 0)).toBe(true)
    expect(vacio.sinUso.length).toBe(CLAVES_FUNCIONES.length)
    expect(vacio.porDia).toHaveLength(3)
  })

  it('ignora claves que no están en el catálogo y valores raros', () => {
    const raro = resumirUso(
      [fila('2026-10-26', 'evento', 'cosa.inventada', 'tablet', 99), fila('2026-10-26', 'vista', 'pantalla.x', 'tablet', 0, 99), fila('2026-10-26', 'evento', 'apunte.nuevo', 'tablet', Number.NaN)],
      '2026-10-26',
      '2026-10-26'
    )
    expect(raro.funciones.every((f) => f.veces === 0)).toBe(true)
    expect(raro.totalSegundos).toBe(0)
  })

  it('devuelve números aunque la base mande los bigint como texto', () => {
    const texto = resumirUso([{ ...fila('2026-10-26', 'sesion', 'nueva', 'movil'), cantidad: '4' as unknown as number }], '2026-10-26', '2026-10-26')
    expect(texto.visitas.nuevas).toBe(4)
  })
})

describe('panel de uso: auxiliares', () => {
  it('diasDelRango incluye ambos extremos', () => {
    expect(diasDelRango('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
  })
  it('formatoDuracion', () => {
    expect(formatoDuracion(30)).toBe('30 s')
    expect(formatoDuracion(45 * 60)).toBe('45 min')
    expect(formatoDuracion(3600)).toBe('1 h')
    expect(formatoDuracion(4800)).toBe('1 h 20 min')
  })
})

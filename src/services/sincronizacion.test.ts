// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { TareaPlan } from '../types'
import { decidir, huella, type EstadoSync } from './sincronizacion'
import { unirPorIdReciente } from './respaldo'
import type { ArchivoRespaldo } from './respaldo'

const vacio: EstadoSync = { versionNube: null, huellaSubida: null, ultimaSync: null }
const archivo = (extra: object = {}): ArchivoRespaldo => ({
  app: 'prima-lex', version: 1, fecha: 'x',
  datos: { ramos: [], academicoModulos: {}, progresoModulos: {}, diasActividadEstudio: [], colecciones: [], subrayados: {}, mapasMentales: [], repasoApuntes: {}, posicionLectura: {}, notasArticulo: {}, tareasPlan: [], sesionesFoco: [], ...extra },
})

describe('huella', () => {
  it('igual para lo mismo, distinta si cambia algo, e ignora la fecha del respaldo', () => {
    const a = archivo()
    expect(huella(a)).toBe(huella({ ...a, fecha: 'otra' }))
    expect(huella(a)).not.toBe(huella(archivo({ diasActividadEstudio: ['2026-10-16'] })))
  })
})

describe('decidir', () => {
  const yo = 'disp-A'
  it('primera vez, sin nada en la nube: solo sube', () => {
    expect(decidir(null, vacio, yo, 'h1')).toEqual({ bajar: false, subir: true })
  })
  it('hay datos en la nube de otro dispositivo y nunca se bajaron: baja y sube lo unido', () => {
    expect(decidir({ actualizado: 't1', dispositivo: 'disp-B' }, vacio, yo, 'h1')).toEqual({ bajar: true, subir: true })
  })
  it('todo al día: no hace nada', () => {
    const e: EstadoSync = { versionNube: 't1', huellaSubida: 'h1', ultimaSync: 1 }
    expect(decidir({ actualizado: 't1', dispositivo: yo }, e, yo, 'h1')).toEqual({ bajar: false, subir: false })
  })
  it('cambié algo aquí y la nube sigue igual: solo sube', () => {
    const e: EstadoSync = { versionNube: 't1', huellaSubida: 'h1', ultimaSync: 1 }
    expect(decidir({ actualizado: 't1', dispositivo: yo }, e, yo, 'h2')).toEqual({ bajar: false, subir: true })
  })
  it('otro dispositivo subió algo más nuevo: baja', () => {
    const e: EstadoSync = { versionNube: 't1', huellaSubida: 'h1', ultimaSync: 1 }
    expect(decidir({ actualizado: 't2', dispositivo: 'disp-B' }, e, yo, 'h1').bajar).toBe(true)
  })
  it('lo último que subió este mismo dispositivo no se vuelve a bajar', () => {
    const e: EstadoSync = { versionNube: 't1', huellaSubida: 'h1', ultimaSync: 1 }
    expect(decidir({ actualizado: 't2', dispositivo: yo }, e, yo, 'h1').bajar).toBe(false)
  })
})

describe('unirPorIdReciente', () => {
  const t = (id: string, titulo: string, actualizada: number): TareaPlan =>
    ({ id, titulo, ramoId: null, fecha: null, prioridad: 'media', hecha: false, hechaEn: null, subtareas: [], creada: 1, actualizada })

  it('si el mismo elemento está en los dos lados gana el tocado más recientemente', () => {
    const r = unirPorIdReciente([t('a', 'local viejo', 1), t('b', 'local nuevo', 9)], [t('a', 'remoto nuevo', 5), t('b', 'remoto viejo', 2)])
    expect(r.find((x) => x.id === 'a')?.titulo).toBe('remoto nuevo')
    expect(r.find((x) => x.id === 'b')?.titulo).toBe('local nuevo')
  })
  it('empate: queda el local; y se suman los que solo existen en la nube', () => {
    const r = unirPorIdReciente([t('a', 'local', 3)], [t('a', 'remoto', 3), t('c', 'solo nube', 1)])
    expect(r.map((x) => x.titulo)).toEqual(['local', 'solo nube'])
  })
})

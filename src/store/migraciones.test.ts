// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { useStore } from './useStore'

type Migrar = (persisted: unknown, version: number) => Record<string, unknown>
const migrar = useStore.persist.getOptions().migrate as unknown as Migrar

describe('migraciones del store', () => {
  it('la versión actual es la 37 (si cambia, suma un bloque de migración y actualiza este test)', () => {
    expect(useStore.persist.getOptions().version).toBe(37)
  })

  it('un estado vacío no rompe', () => {
    expect(() => migrar(undefined, 0)).not.toThrow()
    expect(() => migrar(null, 20)).not.toThrow()
  })

  it('v33: una vista retirada vuelve a Módulos', () => {
    for (const v of ['consultar', 'situacion', 'plazos', 'mapa', 'historial']) {
      expect(migrar({ vistaActiva: v }, 32).vistaActiva).toBe('modulos')
    }
  })

  it('una vista que sigue existiendo se respeta, y canvas se retira', () => {
    expect(migrar({ vistaActiva: 'explorador' }, 32).vistaActiva).toBe('explorador')
    expect(migrar({ vistaActiva: 'canvas' }, 32).vistaActiva).toBe('modulos')
    expect(migrar({ vistaActiva: 'canvas' }, 33).vistaActiva).toBe('modulos')
  })

  it('v35: aparecen las tareas del plan, sin pisar las que ya hay', () => {
    expect(migrar({}, 34).tareasPlan).toEqual([])
    const t = [{ id: 'a' }]
    expect(migrar({ tareasPlan: t }, 34).tareasPlan).toBe(t)
  })

  it('v36: el verde de antes pasa a azul (y, encadenado, al índigo nuevo); las demás elecciones se respetan', () => {
    expect(migrar({ temaColor: 'esmeralda' }, 35).temaColor).toBe('lex')
    expect(migrar({ temaColor: 'violeta' }, 35).temaColor).toBe('violeta')
  })

  it('v37: el azul por defecto pasa al índigo de Prima Lex; otras elecciones se respetan', () => {
    expect(migrar({ temaColor: 'azul' }, 36).temaColor).toBe('lex')
    expect(migrar({ temaColor: 'borgona' }, 36).temaColor).toBe('borgona')
  })

  it('las migraciones se encadenan desde una versión muy vieja', () => {
    const r = migrar({ vistaActiva: 'plazos', temaColor: 'esmeralda' }, 25)
    expect(r.vistaActiva).toBe('modulos')
    expect(r.temaColor).toBe('lex')
    expect(r.tareasPlan).toEqual([])
    expect(Array.isArray(r.codigos)).toBe(true)
  })

  it('migrar en la versión actual no cambia nada', () => {
    const s = { vistaActiva: 'hoy', temaColor: 'esmeralda', tareasPlan: [] }
    expect(migrar(s, 37)).toEqual(s)
  })
})

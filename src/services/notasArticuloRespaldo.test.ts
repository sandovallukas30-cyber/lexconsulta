// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store/useStore'
import { aplicarRespaldo, crearRespaldo, validarRespaldo } from './respaldo'

beforeEach(() => {
  useStore.setState({ notasArticulo: {} })
})

describe('notas de artículos en el respaldo', () => {
  it('guardarNotaPropia guarda, reemplaza y borra con texto vacío', () => {
    const { guardarNotaPropia } = useStore.getState()
    guardarNotaPropia('civ:1545', 'La ley del contrato')
    expect(useStore.getState().notasArticulo['civ:1545'].texto).toBe('La ley del contrato')
    guardarNotaPropia('civ:1545', 'Otra')
    expect(useStore.getState().notasArticulo['civ:1545'].texto).toBe('Otra')
    guardarNotaPropia('civ:1545', '   ')
    expect(useStore.getState().notasArticulo['civ:1545']).toBeUndefined()
  })

  it('van en el respaldo y vuelven iguales al leerlo', () => {
    useStore.getState().guardarNotaPropia('civ:1545', 'Nota propia')
    const crudo = JSON.stringify(crearRespaldo())
    const r = validarRespaldo(crudo)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.respaldo.datos.notasArticulo['civ:1545'].texto).toBe('Nota propia')
  })

  it('un respaldo antiguo, sin notas, no las borra al unirse con la nube', () => {
    useStore.getState().guardarNotaPropia('civ:1545', 'Local')
    const antiguo = validarRespaldo(JSON.stringify({ app: 'prima-lex', version: crearRespaldo().version, fecha: 'x', datos: { ramos: [] } }))
    expect(antiguo.ok).toBe(true)
    if (antiguo.ok) aplicarRespaldo(antiguo.respaldo, 'nube')
    expect(useStore.getState().notasArticulo['civ:1545'].texto).toBe('Local')
  })

  it('al sincronizar gana la nota más reciente de cada artículo', () => {
    useStore.setState({ notasArticulo: { 'civ:1': { texto: 'vieja local', fecha: 1 }, 'civ:2': { texto: 'solo local', fecha: 5 } } })
    const nube = validarRespaldo(
      JSON.stringify({
        app: 'prima-lex',
        version: crearRespaldo().version,
        fecha: 'x',
        datos: { notasArticulo: { 'civ:1': { texto: 'nueva de la nube', fecha: 9 }, 'civ:3': { texto: 'solo nube', fecha: 2 } } },
      })
    )
    expect(nube.ok).toBe(true)
    if (nube.ok) aplicarRespaldo(nube.respaldo, 'nube')
    const n = useStore.getState().notasArticulo
    expect(n['civ:1'].texto).toBe('nueva de la nube')
    expect(n['civ:2'].texto).toBe('solo local')
    expect(n['civ:3'].texto).toBe('solo nube')
  })
})

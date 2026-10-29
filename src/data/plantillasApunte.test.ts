import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsearApunte, type Bloque } from '../services/apunteFormato'
import { generarTarjetas } from '../services/tarjetasApunte'
import { PLANTILLAS_APUNTE } from './plantillasApunte'

const iconosDisponibles = new Set(Array.from(readFileSync('src/assets/iconos/tabler-subset.css', 'utf8').matchAll(/\.(ti-[a-z0-9-]+)\b/g), (m) => m[1]))

function contar(bloques: Bloque[], tipo: Bloque['t']): number {
  return bloques.reduce((n, b) => n + (b.t === tipo ? 1 : 0) + (b.t === 'cita' ? contar(b.hijos, tipo) : 0), 0)
}

describe('plantillas de apunte', () => {
  it('hay ids y nombres únicos', () => {
    expect(new Set(PLANTILLAS_APUNTE.map((p) => p.id)).size).toBe(PLANTILLAS_APUNTE.length)
    expect(new Set(PLANTILLAS_APUNTE.map((p) => p.nombre)).size).toBe(PLANTILLAS_APUNTE.length)
  })
  it('usan íconos que existen en el set recortado de la app', () => {
    for (const p of PLANTILLAS_APUNTE) expect(iconosDisponibles.has(p.icono), `${p.id}: ${p.icono}`).toBe(true)
  })
  it('no generan tarjetas de repaso a medio llenar', () => {
    for (const p of PLANTILLAS_APUNTE) expect(generarTarjetas({ id: p.id, contenido: p.contenido }), p.id).toEqual([])
  })
  it('tienen títulos, y sus tablas se reconocen como tablas con encabezado', () => {
    for (const p of PLANTILLAS_APUNTE) {
      const bloques = parsearApunte(p.contenido)
      expect(bloques.filter((b) => b.t === 'h').length, p.id).toBeGreaterThanOrEqual(4)
      const tablas = bloques.filter((b): b is Extract<Bloque, { t: 'tabla' }> => b.t === 'tabla')
      for (const t of tablas) {
        expect(t.encabezado, p.id).toBe(true)
        expect(new Set(t.filas.map((f) => f.length)).size, `${p.id}: filas parejas`).toBe(1)
      }
    }
  })
  it('usan solo recuadros 📝, ⚖️ y ⚠️ (🎯 y 💡 son tarjetas)', () => {
    for (const p of PLANTILLAS_APUNTE) {
      const iconos = parsearApunte(p.contenido).flatMap((b) => (b.t === 'cita' ? [b.icono] : []))
      for (const i of iconos) expect(['📝', '⚖', '⚠'], `${p.id}: ${i}`).toContain(i.replace('️', ''))
      expect(contar(parsearApunte(p.contenido), 'cita'), p.id).toBeGreaterThanOrEqual(1)
    }
  })
})

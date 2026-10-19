import { describe, expect, it } from 'vitest'
import { minutosDeApunte } from './enfoqueApunte'
import type { SesionFoco } from './enfoque'

const ses = (minutos: number, apunteId?: string): SesionFoco => ({
  id: `s${minutos}${apunteId ?? ''}`, inicio: 0, minutos, ramoId: 'r', tareaId: null, tipo: 'pomodoro', fecha: '2026-10-19', ...(apunteId ? { apunteId } : {}),
})

describe('minutosDeApunte', () => {
  it('suma solo las sesiones de ese apunte', () => {
    expect(minutosDeApunte([ses(25, 'a'), ses(50, 'a'), ses(30, 'b'), ses(10)], 'a')).toBe(75)
  })
  it('da 0 si nunca se estudió', () => {
    expect(minutosDeApunte([ses(25, 'b')], 'a')).toBe(0)
  })
})

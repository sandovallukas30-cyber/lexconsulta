import type { SesionFoco } from './enfoque'
import { useEnfoque } from '../store/useEnfoque'
import { useEnfoqueLocal } from '../store/useEnfoqueLocal'
import { useSala } from '../store/useSala'

/** Minutos de enfoque acumulados con un apunte. */
export function minutosDeApunte(sesiones: SesionFoco[], apunteId: string): number {
  let total = 0
  for (const s of sesiones) if (s.apunteId === apunteId) total += s.minutos
  return total
}

/** Deja el temporizador apuntando a este ramo y apunte, y abre la Sala de estudio con el apunte elegido. */
export function enfocarConApunte(ramoId: string, apunteId: string): void {
  useEnfoque.getState().setObjetivo(ramoId, null, apunteId)
  const { sala, set } = useEnfoqueLocal.getState()
  set({ sala: { ...sala, material: 'apunte', apunte: `${ramoId}:${apunteId}` } })
  useSala.getState().abrir()
}

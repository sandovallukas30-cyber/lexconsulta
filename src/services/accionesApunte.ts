import { useStore } from '../store/useStore'
import { avisar } from '../store/useAvisos'
import type { ApunteModulo, DatosAcademicosModulo } from '../types'

/** Duplicar y mover apuntes (B4). Funciones sin UI: leen y escriben el store
 *  directamente para operar siempre sobre la lista vigente. */

const VACIO: DatosAcademicosModulo = { clases: [], evaluaciones: [], textos: [], apuntes: [], cuadernos: [], briefs: [] }

function datosDe(moduloId: string): DatosAcademicosModulo {
  return useStore.getState().academicoModulos[moduloId] ?? VACIO
}

/** Copia del apunte justo debajo del original, con título "… (copia)". */
export function duplicarApunte(moduloId: string, apunte: ApunteModulo): ApunteModulo {
  const ahora = Date.now()
  const copia: ApunteModulo = {
    ...apunte,
    id: crypto.randomUUID(),
    titulo: `${apunte.titulo} (copia)`,
    fechaCreacion: ahora,
    fechaModificacion: ahora,
  }
  const lista = datosDe(moduloId).apuntes
  const i = lista.findIndex((a) => a.id === apunte.id)
  const nueva = [...lista]
  nueva.splice(i < 0 ? nueva.length : i + 1, 0, copia)
  useStore.getState().setApuntesModulo(moduloId, nueva)
  avisar.exito(`Apunte duplicado: "${copia.titulo}"`)
  return copia
}

/** Mueve el apunte a otro módulo/ramo y/o cuaderno. La clase vinculada solo
 *  se conserva si el destino es el mismo módulo (las clases son de cada
 *  módulo). Se puede deshacer. */
export function moverApunte(origenId: string, apunte: ApunteModulo, destinoId: string, cuadernoId: string | undefined) {
  const s = useStore.getState()
  const mismoModulo = origenId === destinoId
  const movido: ApunteModulo = {
    ...apunte,
    cuadernoId,
    claseId: mismoModulo ? apunte.claseId : undefined,
    fechaModificacion: Date.now(),
  }
  if (mismoModulo) {
    s.setApuntesModulo(origenId, datosDe(origenId).apuntes.map((a) => (a.id === apunte.id ? movido : a)))
  } else {
    s.setApuntesModulo(origenId, datosDe(origenId).apuntes.filter((a) => a.id !== apunte.id))
    s.setApuntesModulo(destinoId, [...datosDe(destinoId).apuntes, movido])
  }
  avisar.conDeshacer(`"${apunte.titulo}" movido`, () => {
    const st = useStore.getState()
    if (!mismoModulo) st.setApuntesModulo(destinoId, datosDe(destinoId).apuntes.filter((a) => a.id !== apunte.id))
    const enOrigen = datosDe(origenId).apuntes
    st.setApuntesModulo(
      origenId,
      enOrigen.some((a) => a.id === apunte.id) ? enOrigen.map((a) => (a.id === apunte.id ? apunte : a)) : [...enOrigen, apunte]
    )
  })
}


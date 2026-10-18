import { useStore } from '../store/useStore'
import { nombreRamo } from './tareasPlan'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** «19 oct» */
export function fechaCorta(fecha: string): string {
  const [, m, d] = fecha.split('-').map(Number)
  return `${d} ${MESES[m - 1]}`
}

/** Abre (o crea, si todavía no existe) el apunte de una clase y lo deja listo
 *  para escribir en el editor visual. De paso marca que estuviste en la clase. */
export function abrirApunteDeClase(moduloId: string, claseId: string): void {
  const st = useStore.getState()
  const datos = st.academicoModulos[moduloId]
  const clase = datos?.clases.find((c) => c.id === claseId)
  if (!clase) return

  let apunte = datos.apuntes.find((a) => a.claseId === claseId)
  if (!apunte) {
    const ahora = Date.now()
    apunte = {
      id: crypto.randomUUID(),
      titulo: `${nombreRamo(moduloId, st.ramos) ?? 'Clase'} · ${fechaCorta(clase.fecha)}`,
      contenido: '',
      fechaCreacion: ahora,
      fechaModificacion: ahora,
      claseId,
    }
    st.setApuntesModulo(moduloId, [...datos.apuntes, apunte])
  }
  if (clase.asistio === undefined) marcarAsistencia(moduloId, claseId, true)
  st.abrirApunte(moduloId, apunte.id, undefined, true)
}

/** Marca (o desmarca, si ya estaba igual) la asistencia a una clase. */
export function marcarAsistencia(moduloId: string, claseId: string, valor: boolean): void {
  const st = useStore.getState()
  const lista = st.academicoModulos[moduloId]?.clases ?? []
  st.setClasesModulo(
    moduloId,
    lista.map((c) => (c.id === claseId ? { ...c, asistio: c.asistio === valor ? undefined : valor, completada: valor ? true : c.completada } : c))
  )
}

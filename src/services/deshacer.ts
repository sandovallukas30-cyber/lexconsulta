import { useStore } from '../store/useStore'
import { avisar } from '../store/useAvisos'

/** Eliminar con "Deshacer" (8 s) en vez de confirm(): se borra de inmediato
 *  -- la UI responde sin un diálogo que interrumpe -- y el aviso ofrece
 *  revertirlo. Lo borrado se guarda en la clausura del botón, no en el
 *  store, así que no hay nada que limpiar si el aviso expira. */

export function eliminarColeccionConDeshacer(id: string) {
  const coleccion = useStore.getState().colecciones.find((c) => c.id === id)
  if (!coleccion) return
  useStore.getState().eliminarColeccion(id)
  avisar.conDeshacer(`Colección "${coleccion.titulo}" eliminada`, () => useStore.getState().restaurarColeccion(coleccion))
}

export function eliminarMapaMentalConDeshacer(id: string) {
  const mapa = useStore.getState().mapasMentales.find((m) => m.id === id)
  if (!mapa) return
  useStore.getState().eliminarMapaMental(id)
  avisar.conDeshacer(`Mapa "${mapa.titulo}" eliminado`, () => useStore.getState().restaurarMapaMental(mapa))
}

export function eliminarRamoConDeshacer(id: string) {
  const borrado = useStore.getState().eliminarRamo(id)
  if (!borrado) return
  avisar.conDeshacer(`Ramo "${borrado.ramo.nombre}" eliminado`, () => useStore.getState().restaurarRamo(borrado.ramo, borrado.datos))
}

/** Para las listas de un módulo (apuntes, clases, evaluaciones, textos,
 *  casos): `leer` devuelve la lista actual desde el store y `escribir` la
 *  reemplaza. Al deshacer se reinserta el elemento en su posición original
 *  sobre la lista VIGENTE en ese momento (no sobre una copia vieja), para no
 *  pisar lo que el usuario haya cambiado entre medio. */
export function eliminarDeListaConDeshacer<T extends { id: string }>(
  id: string,
  leer: () => T[],
  escribir: (lista: T[]) => void,
  mensaje: string
) {
  const lista = leer()
  const indice = lista.findIndex((x) => x.id === id)
  if (indice < 0) return
  const item = lista[indice]
  escribir(lista.filter((x) => x.id !== id))
  avisar.conDeshacer(mensaje, () => {
    const actual = leer()
    if (actual.some((x) => x.id === id)) return
    const copia = [...actual]
    copia.splice(Math.min(indice, copia.length), 0, item)
    escribir(copia)
  })
}

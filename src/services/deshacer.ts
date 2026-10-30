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
  avisar.conDeshacer(`Asignatura "${borrado.ramo.nombre}" eliminada`, () => useStore.getState().restaurarRamo(borrado.ramo, borrado.datos))
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

/** Quitar un artículo de una colección con «Deshacer»: guarda el artículo con su lugar en la lista, las conexiones y los
 *  grupos que se llevaba, y al deshacer los devuelve sin tocar lo demás que se haya cambiado en esos segundos. */
export function quitarArticuloConDeshacer(coleccionId: string, ref: { codigo: string; articulo: string }) {
  const antes = useStore.getState().colecciones.find((c) => c.id === coleccionId)
  if (!antes) return
  const es = (r: { codigo: string; articulo: string }) => r.codigo === ref.codigo && r.articulo === ref.articulo
  const indice = antes.articulos.findIndex(es)
  if (indice < 0) return
  const articulo = antes.articulos[indice]
  const conexiones = (antes.conexiones ?? []).filter((cx) => es(cx.desde) || es(cx.hasta))
  const gruposAntes = antes.grupos ?? []
  useStore.getState().quitarArticuloDeColeccion(coleccionId, articulo)
  avisar.conDeshacer(`${articulo.articulo} quitado de la colección`, () => {
    useStore.setState((s) => ({
      colecciones: s.colecciones.map((c) => {
        if (c.id !== coleccionId || c.articulos.some(es)) return c
        const articulos = [...c.articulos]
        articulos.splice(Math.min(indice, articulos.length), 0, articulo)
        const idsConexiones = new Set((c.conexiones ?? []).map((x) => x.id))
        const grupos = (c.grupos ?? []).map((g) => {
          const original = gruposAntes.find((x) => x.id === g.id)
          return original && original.articulos.some(es) && !g.articulos.some(es) ? { ...g, articulos: [...g.articulos, { codigo: articulo.codigo, articulo: articulo.articulo }] } : g
        })
        for (const original of gruposAntes) if (original.articulos.some(es) && !grupos.some((g) => g.id === original.id)) grupos.push(original)
        return { ...c, articulos, conexiones: [...(c.conexiones ?? []), ...conexiones.filter((x) => !idsConexiones.has(x.id))], grupos, fechaModificacion: Date.now() }
      }),
    }))
  })
}

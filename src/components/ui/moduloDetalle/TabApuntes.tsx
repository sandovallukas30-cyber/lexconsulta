import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useStore } from '../../../store/useStore'
import { eliminarDeListaConDeshacer } from '../../../services/deshacer'
import { ModoLecturaApunte } from '../ModoLecturaApunte'
import { CampoContenidoApunte } from '../CampoContenidoApunte'
import { resumenDe, separarTitulo } from '../../../services/apunteFormato'
import { convertirPdfNotion } from '../../../services/notionPdf/importarPdfNotion'
import type { ApunteModulo, CuadernoApuntes, SesionClase } from '../../../types'
import { VERDE } from './utilidades'
import { BotonAgregar, BotonEliminar, BotonesFormulario, CampoSelectClase, CampoTexto, EstadoVacio, EtiquetaArticulo, EtiquetaClase } from './comunes'

export function TabApuntes({
  moduloId, apuntes, clases, cuadernos, modoOscuro,
}: {
  moduloId: string
  apuntes: ApunteModulo[]
  clases: SesionClase[]
  cuadernos: CuadernoApuntes[]
  modoOscuro: boolean
}) {
  const setApuntesModulo = useStore((s) => s.setApuntesModulo)
  const setCuadernosModulo = useStore((s) => s.setCuadernosModulo)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [claseId, setClaseId] = useState('')
  const [cuadernoId, setCuadernoId] = useState('')
  const [articuloRelacionado, setArticuloRelacionado] = useState('')
  const [filtro, setFiltro] = useState<string>('todos')
  const [mostrarNuevoCuaderno, setMostrarNuevoCuaderno] = useState(false)
  const [nombreNuevoCuaderno, setNombreNuevoCuaderno] = useState('')
  // Apunte que se está leyendo (Modo Lectura) -- separado de `editandoId`:
  // abrir un apunte de la lista ya no entra directo al formulario de
  // edición (era el reclamo -- "para repasar tengo que abrir el editor"),
  // entra acá. "Editar" desde adentro del Modo Lectura es lo que lleva al
  // formulario.
  const [apunteLeyendo, setApunteLeyendo] = useState<ApunteModulo | null>(null)
  const [editarAlAbrir, setEditarAlAbrir] = useState(false)
  const refArchivo = useRef<HTMLInputElement>(null)
  const [errorImportar, setErrorImportar] = useState<string | null>(null)
  const [avisoImportar, setAvisoImportar] = useState<string | null>(null)
  const [importando, setImportando] = useState<string | null>(null)
  const [resaltarAlAbrir, setResaltarAlAbrir] = useState<string | undefined>(undefined)
  const apuntePendiente = useStore((s) => s.apuntePendiente)
  const limpiarApuntePendiente = useStore((s) => s.limpiarApuntePendiente)

  // Apunte pedido desde el buscador (Omnibar): abrirlo en Modo Lectura.
  useEffect(() => {
    if (!apuntePendiente || apuntePendiente.moduloId !== moduloId) return
    const a = apuntes.find((x) => x.id === apuntePendiente.apunteId)
    limpiarApuntePendiente()
    if (!a) return
    setEditarAlAbrir(false)
    setResaltarAlAbrir(apuntePendiente.resaltar)
    setApunteLeyendo(a)
  }, [apuntePendiente, moduloId, apuntes, limpiarApuntePendiente])

  const ordenados = [...apuntes].sort((a, b) => b.fechaModificacion - a.fechaModificacion)
  const filtrados = ordenados.filter((a) => {
    if (filtro === 'todos') return true
    if (filtro === 'sin-cuaderno') return !a.cuadernoId
    return a.cuadernoId === filtro
  })

  const iniciarNuevo = () => {
    setEditandoId(null)
    setTitulo('')
    setContenido('')
    setClaseId('')
    setCuadernoId(filtro !== 'todos' && filtro !== 'sin-cuaderno' ? filtro : '')
    setArticuloRelacionado('')
    setMostrarForm(true)
  }

  const iniciarEdicion = (a: ApunteModulo) => {
    setEditarAlAbrir(false)
    setApunteLeyendo(null)
    setEditandoId(a.id)
    setTitulo(a.titulo)
    setContenido(a.contenido)
    setClaseId(a.claseId ?? '')
    setCuadernoId(a.cuadernoId ?? '')
    setArticuloRelacionado(a.articuloRelacionado ?? '')
    setMostrarForm(true)
  }

  const importarArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo || importando) return
    setErrorImportar(null)
    setAvisoImportar(null)
    const esPdf = /\.pdf$/i.test(archivo.name) || archivo.type === 'application/pdf'
    if (!esPdf && /\.(docx?|pptx?|xlsx?)$/i.test(archivo.name)) {
      setErrorImportar('Se importan archivos .md, .txt o un PDF exportado de Notion. De un Word, copiá el texto y pegalo en un apunte nuevo.')
      return
    }
    let tituloArchivo: string | null
    let cuerpo: string
    if (esPdf) {
      try {
        setImportando('Preparando…')
        const res = await convertirPdfNotion(archivo, setImportando)
        tituloArchivo = res.titulo
        cuerpo = res.md
        if (res.avisos.length > 0) setAvisoImportar(`Se importó, pero revisá: ${res.avisos.join(' ')}`)
      } catch (err) {
        setErrorImportar(err instanceof Error ? err.message : 'No se pudo convertir el PDF.')
        return
      } finally {
        setImportando(null)
      }
    } else {
      if (archivo.size > 3 * 1024 * 1024) {
        setErrorImportar('El archivo pesa más de 3 MB, es demasiado para un solo apunte.')
        return
      }
      const texto = (await archivo.text()).replace(/^\uFEFF/, '')
      const separado = separarTitulo(texto)
      tituloArchivo = separado.titulo
      cuerpo = separado.cuerpo
    }
    const ahora = Date.now()
    const nuevo: ApunteModulo = {
      id: crypto.randomUUID(),
      titulo: (tituloArchivo ?? archivo.name.replace(/\.[^.]+$/, '')).trim() || 'Apunte importado',
      contenido: cuerpo.trimEnd(),
      cuadernoId: filtro !== 'todos' && filtro !== 'sin-cuaderno' ? filtro : undefined,
      fechaCreacion: ahora,
      fechaModificacion: ahora,
    }
    setApuntesModulo(moduloId, [...apuntes, nuevo])
    setEditarAlAbrir(false)
    setApunteLeyendo(nuevo)
  }

  const guardar = () => {
    if (!titulo.trim()) return
    const ahora = Date.now()
    let guardado: ApunteModulo
    if (editandoId) {
      guardado = {
        ...(apuntes.find((a) => a.id === editandoId) as ApunteModulo),
        titulo: titulo.trim(),
        contenido,
        claseId: claseId || undefined,
        cuadernoId: cuadernoId || undefined,
        articuloRelacionado: articuloRelacionado.trim() || undefined,
        fechaModificacion: ahora,
      }
      setApuntesModulo(moduloId, apuntes.map((a) => (a.id === editandoId ? guardado : a)))
    } else {
      guardado = {
        id: crypto.randomUUID(),
        titulo: titulo.trim(),
        contenido,
        claseId: claseId || undefined,
        cuadernoId: cuadernoId || undefined,
        articuloRelacionado: articuloRelacionado.trim() || undefined,
        fechaCreacion: ahora,
        fechaModificacion: ahora,
      }
      setApuntesModulo(moduloId, [...apuntes, guardado])
    }
    setMostrarForm(false)
    setEditandoId(null)
    // Guardar ya deja leyendo lo que se acaba de escribir -- antes cerraba
    // el formulario y volvía a la lista sin más, y para repasar había que
    // volver a entrar (al editor, encima, que es lo que se quería evitar).
    setEditarAlAbrir(false)
    setApunteLeyendo(guardado)
  }

  const eliminar = (id: string) => {
    eliminarDeListaConDeshacer(
      id,
      () => useStore.getState().academicoModulos[moduloId]?.apuntes ?? [],
      (lista) => setApuntesModulo(moduloId, lista),
      'Apunte eliminado'
    )
    if (apunteLeyendo?.id === id) setApunteLeyendo(null)
  }

  // Cambios hechos desde el editor visual del Modo Lectura: se guardan solos.
  // Se lee la lista más reciente del store (no la de este render) porque el
  // título y el contenido pueden guardarse casi a la vez.
  const actualizarApunte = (id: string, cambios: { titulo?: string; contenido?: string }) => {
    const actuales = useStore.getState().academicoModulos[moduloId]?.apuntes ?? []
    setApuntesModulo(moduloId, actuales.map((a) => (a.id === id ? { ...a, ...cambios, fechaModificacion: Date.now() } : a)))
    setApunteLeyendo((prev) => (prev && prev.id === id ? { ...prev, ...cambios } : prev))
  }

  const crearCuaderno = () => {
    if (!nombreNuevoCuaderno.trim()) return
    const nuevo: CuadernoApuntes = { id: crypto.randomUUID(), nombre: nombreNuevoCuaderno.trim() }
    setCuadernosModulo(moduloId, [...cuadernos, nuevo])
    setCuadernoId(nuevo.id)
    setNombreNuevoCuaderno('')
    setMostrarNuevoCuaderno(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Apuntes propios</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refArchivo.current?.click()}
            disabled={!!importando}
            title="Importar un archivo .md, .txt o un PDF de Notion como apunte"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              modoOscuro ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <i className={`ti ${importando ? 'ti-loader-2 animate-spin' : 'ti-file-import'} text-sm`} />
            Importar
          </button>
          <input ref={refArchivo} type="file" accept=".md,.markdown,.txt,.pdf,text/plain,text/markdown,application/pdf" className="hidden" onChange={importarArchivo} />
          <BotonAgregar label="Nuevo apunte" onClick={iniciarNuevo} modoOscuro={modoOscuro} />
        </div>
      </div>

      {importando && (
        <p role="status" className={`mb-3 text-xs ${modoOscuro ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {importando}
        </p>
      )}

      {avisoImportar && (
        <p role="status" className="mb-3 text-xs text-amber-600">
          {avisoImportar}
        </p>
      )}

      {errorImportar && (
        <p role="alert" className="mb-3 text-xs text-red-600">
          {errorImportar}
        </p>
      )}

      {cuadernos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[{ id: 'todos', nombre: 'Todos' }, { id: 'sin-cuaderno', nombre: 'Sin cuaderno' }, ...cuadernos].map((c) => (
            <button
              key={c.id}
              onClick={() => setFiltro(c.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filtro === c.id
                  ? 'text-white border-transparent'
                  : modoOscuro ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
              style={filtro === c.id ? { background: VERDE } : undefined}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      {mostrarForm && (
        <div className={`p-4 rounded-xl border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <CampoTexto label="Título" valor={titulo} onChange={setTitulo} modoOscuro={modoOscuro} placeholder="Ej: Clase 3 — Modos de extinguir" />
          <CampoContenidoApunte valor={contenido} onChange={setContenido} modoOscuro={modoOscuro} />
          {clases.length > 0 && (
            <CampoSelectClase label="Clase a la que pertenece (opcional)" valor={claseId} onChange={setClaseId} clases={clases} modoOscuro={modoOscuro} />
          )}
          <CampoTexto label="Artículo relacionado (opcional)" valor={articuloRelacionado} onChange={setArticuloRelacionado} modoOscuro={modoOscuro} placeholder="Ej: Art. 1545" />
          <div>
            <span className={`block text-xs font-medium mb-1 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>Cuaderno (opcional)</span>
            {mostrarNuevoCuaderno ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={nombreNuevoCuaderno}
                  onChange={(e) => setNombreNuevoCuaderno(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') crearCuaderno() }}
                  placeholder="Ej: Cuaderno de audiencias"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none border ${
                    modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                  }`}
                />
                <button onClick={crearCuaderno} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: VERDE }}>Crear</button>
                <button onClick={() => setMostrarNuevoCuaderno(false)} className={`px-3 py-1.5 rounded-lg text-xs ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>Cancelar</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={cuadernoId}
                  onChange={(e) => setCuadernoId(e.target.value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none border ${
                    modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                  }`}
                >
                  <option value="">Sin cuaderno</option>
                  {cuadernos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button onClick={() => setMostrarNuevoCuaderno(true)} className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${modoOscuro ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>
                  + Nuevo
                </button>
              </div>
            )}
          </div>
          <BotonesFormulario onCancelar={() => { setMostrarForm(false); setEditandoId(null) }} onGuardar={guardar} modoOscuro={modoOscuro} />
        </div>
      )}

      {filtrados.length === 0 ? (
        <EstadoVacio icono="ti-notes" texto={apuntes.length === 0 ? 'Aún no tienes apuntes en este módulo.' : 'No hay apuntes en este cuaderno.'} modoOscuro={modoOscuro} />
      ) : (
        <div className="space-y-2">
          {filtrados.map((a) => {
            const cuaderno = cuadernos.find((c) => c.id === a.cuadernoId)
            return (
              <div key={a.id} className={`p-3 rounded-xl border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => { setEditarAlAbrir(false); setApunteLeyendo(a) }} className={`text-sm font-medium text-left hover:underline ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {a.titulo}
                    </button>
                    {cuaderno && (
                      <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md ${modoOscuro ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
                        <i className="ti ti-notebook text-xs" />
                        {cuaderno.nombre}
                      </span>
                    )}
                    <EtiquetaArticulo articulo={a.articuloRelacionado} modoOscuro={modoOscuro} />
                    <EtiquetaClase clase={clases.find((c) => c.id === a.claseId)} modoOscuro={modoOscuro} />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditarAlAbrir(true)
                        setApunteLeyendo(a)
                      }}
                      title="Editar"
                      className={`w-7 h-7 rounded-md flex items-center justify-center ${modoOscuro ? 'text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'}`}
                    >
                      <i className="ti ti-pencil text-sm" />
                    </button>
                    <BotonEliminar onClick={() => eliminar(a.id)} modoOscuro={modoOscuro} />
                  </div>
                </div>
                {a.contenido && (
                  <p className={`text-xs line-clamp-3 ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>{resumenDe(a.contenido)}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ModoLecturaApunte
        abierto={!!apunteLeyendo}
        apunte={apunteLeyendo}
        clase={apunteLeyendo?.claseId ? clases.find((c) => c.id === apunteLeyendo.claseId) : undefined}
        cuaderno={apunteLeyendo?.cuadernoId ? cuadernos.find((c) => c.id === apunteLeyendo.cuadernoId) : undefined}
        editarAlAbrir={editarAlAbrir}
        resaltarAlAbrir={resaltarAlAbrir}
        onCerrar={() => {
          setApunteLeyendo(null)
          setResaltarAlAbrir(undefined)
        }}
        onEditar={() => apunteLeyendo && iniciarEdicion(apunteLeyendo)}
        onCambiar={(cambios) => apunteLeyendo && actualizarApunte(apunteLeyendo.id, cambios)}
      />
    </div>
  )
}

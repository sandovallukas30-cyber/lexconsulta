import { useEffect, useState } from 'react'
import { useStore } from '../../../store/useStore'
import { eliminarDeListaConDeshacer } from '../../../services/deshacer'
import type { ArchivoTexto, SesionClase, TextoObligatorio } from '../../../types'
import { guardarArchivo, limpiarArchivosHuerfanos, problemaArchivo } from '../../../services/almacenArchivos'
import { registrarUso } from '../../../services/uso'
import { CampoArchivo, EnlaceArchivo } from './ArchivoTexto'
import { VERDE } from './utilidades'
import { BotonAgregar, BotonEliminar, BotonesFormulario, FormularioRapido, CampoSelectClase, CampoTexto, EstadoVacio, EtiquetaArticulo, EtiquetaClase } from './comunes'

export function TabTextos({ moduloId, textos, clases, modoOscuro }: { moduloId: string; textos: TextoObligatorio[]; clases: SesionClase[]; modoOscuro: boolean }) {
  const setTextosModulo = useStore((s) => s.setTextosModulo)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [enlace, setEnlace] = useState('')
  const [claseId, setClaseId] = useState('')
  const [articuloRelacionado, setArticuloRelacionado] = useState('')
  const [archivoActual, setArchivoActual] = useState<ArchivoTexto | undefined>(undefined)
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null)
  const [archivoQuitado, setArchivoQuitado] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)

  // al abrir la pestaña se liberan los archivos de textos que ya no existen (si se acaba de eliminar uno, sigue ahí
  // para poder deshacer: esto corre solo al entrar)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const usados = new Set<string>()
      for (const d of Object.values(useStore.getState().academicoModulos)) for (const x of d.textos ?? []) if (x.archivo) usados.add(x.archivo.id)
      void limpiarArchivosHuerfanos(usados)
    }, 1500)
    return () => window.clearTimeout(t)
  }, [])

  const reiniciarArchivo = (actual?: ArchivoTexto) => {
    setArchivoActual(actual)
    setArchivoNuevo(null)
    setArchivoQuitado(false)
    setErrorArchivo(null)
  }

  const elegirArchivo = (f: File) => {
    const problema = problemaArchivo(f)
    setErrorArchivo(problema)
    if (!problema) {
      setArchivoNuevo(f)
      setArchivoQuitado(false)
    }
  }

  const iniciarNuevo = () => {
    reiniciarArchivo(undefined)
    setEditandoId(null)
    setTitulo('')
    setAutor('')
    setEnlace('')
    setClaseId('')
    setArticuloRelacionado('')
    setMostrarForm(true)
  }

  const iniciarEdicion = (t: TextoObligatorio) => {
    setEditandoId(t.id)
    setTitulo(t.titulo)
    setAutor(t.autor ?? '')
    setEnlace(t.enlace ?? '')
    setClaseId(t.claseId ?? '')
    setArticuloRelacionado(t.articuloRelacionado ?? '')
    reiniciarArchivo(t.archivo)
    setMostrarForm(true)
  }

  const guardar = async () => {
    if (!titulo.trim()) return
    // el archivo se guarda primero: si no cabe, el texto no queda apuntando a algo que no existe
    let archivo: ArchivoTexto | undefined = archivoQuitado ? undefined : archivoActual
    if (archivoNuevo) {
      const id = crypto.randomUUID()
      try {
        await guardarArchivo(id, archivoNuevo)
      } catch (e) {
        setErrorArchivo(e instanceof Error ? e.message : 'No se pudo guardar el archivo.')
        return
      }
      archivo = { id, nombre: archivoNuevo.name, tamano: archivoNuevo.size, tipo: archivoNuevo.type }
      registrarUso('biblioteca.archivo')
    }
    const lista = useStore.getState().academicoModulos[moduloId]?.textos ?? textos
    if (editandoId) {
      setTextosModulo(moduloId, lista.map((t) => (t.id === editandoId
        ? { ...t, titulo: titulo.trim(), autor: autor.trim() || undefined, enlace: enlace.trim() || undefined, claseId: claseId || undefined, articuloRelacionado: articuloRelacionado.trim() || undefined, archivo }
        : t)))
    } else {
      const nuevo: TextoObligatorio = {
        id: crypto.randomUUID(),
        titulo: titulo.trim(),
        autor: autor.trim() || undefined,
        enlace: enlace.trim() || undefined,
        claseId: claseId || undefined,
        articuloRelacionado: articuloRelacionado.trim() || undefined,
        archivo,
        leido: false,
      }
      setTextosModulo(moduloId, [...lista, nuevo])
    }
    setMostrarForm(false)
    setEditandoId(null)
    reiniciarArchivo(undefined)
  }

  const toggleLeido = (id: string) => {
    setTextosModulo(moduloId, textos.map((t) => (t.id === id ? { ...t, leido: !t.leido } : t)))
  }

  const eliminar = (id: string) => {
    eliminarDeListaConDeshacer(
      id,
      () => useStore.getState().academicoModulos[moduloId]?.textos ?? [],
      (lista) => setTextosModulo(moduloId, lista),
      'Texto eliminado'
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Textos obligatorios</h2>
        <BotonAgregar label="Agregar texto" onClick={iniciarNuevo} modoOscuro={modoOscuro} />
      </div>

      {mostrarForm && (
        <FormularioRapido
          onGuardar={guardar}
          onCancelar={() => { setMostrarForm(false); setEditandoId(null) }}
          className={`p-4 rounded-tarjeta border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}
        >
          <CampoTexto label="Título" valor={titulo} onChange={setTitulo} modoOscuro={modoOscuro} placeholder="Ej: Tratado de las obligaciones, T. I" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoTexto label="Autor (opcional)" valor={autor} onChange={setAutor} modoOscuro={modoOscuro} placeholder="Ej: René Abeliuk" />
            <CampoTexto label="Enlace (opcional)" valor={enlace} onChange={setEnlace} modoOscuro={modoOscuro} placeholder="https://..." />
          </div>
          <CampoArchivo
            actual={archivoActual}
            nuevo={archivoNuevo}
            quitado={archivoQuitado}
            error={errorArchivo}
            onElegir={elegirArchivo}
            onQuitar={() => {
              setArchivoNuevo(null)
              setArchivoQuitado(true)
              setErrorArchivo(null)
            }}
            modoOscuro={modoOscuro}
          />
          <CampoTexto label="Artículo relacionado (opcional)" valor={articuloRelacionado} onChange={setArticuloRelacionado} modoOscuro={modoOscuro} placeholder="Ej: Art. 1545" />
          {clases.length > 0 && (
            <CampoSelectClase label="Lectura para la clase (opcional)" valor={claseId} onChange={setClaseId} clases={clases} modoOscuro={modoOscuro} />
          )}
          <BotonesFormulario onCancelar={() => { setMostrarForm(false); setEditandoId(null) }} onGuardar={guardar} modoOscuro={modoOscuro} />
        </FormularioRapido>
      )}

      {textos.length === 0 ? (
        <EstadoVacio
          icono="ti-books"
          texto="Aún no has agregado textos obligatorios."
          acciones={[{ label: 'Agregar texto', icono: 'ti-plus', onClick: iniciarNuevo }]}
          modoOscuro={modoOscuro}
        />
      ) : (
        <div className="space-y-2">
          {textos.map((t) => (
            <div key={t.id} className={`flex items-start gap-3 p-3 rounded-tarjeta border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <button onClick={() => toggleLeido(t.id)} className="mt-0.5 flex-shrink-0">
                <i
                  className={`ti ${t.leido ? 'ti-square-rounded-check' : 'ti-square-rounded'} text-lg`}
                  style={{ color: t.leido ? VERDE : undefined }}
                />
              </button>
              <div className="flex-1 min-w-0">
                <button onClick={() => iniciarEdicion(t)} className={`text-sm font-medium block text-left hover:underline ${t.leido ? 'line-through opacity-60' : ''} ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {t.titulo}
                </button>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {t.autor && <span className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{t.autor}</span>}
                  <EtiquetaArticulo articulo={t.articuloRelacionado} modoOscuro={modoOscuro} />
                  <EtiquetaClase clase={clases.find((c) => c.id === t.claseId)} modoOscuro={modoOscuro} />
                </div>
                {t.archivo && <EnlaceArchivo archivo={t.archivo} modoOscuro={modoOscuro} />}
                {t.enlace && (
                  <a href={t.enlace} target="_blank" rel="noopener noreferrer" className="text-xs block mt-0.5 hover:underline" style={{ color: 'var(--accent-texto)' }}>
                    Ver enlace
                  </a>
                )}
              </div>
              <BotonEliminar onClick={() => eliminar(t.id)} modoOscuro={modoOscuro} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import type { BriefCaso, SesionClase } from '../../../types'
import { formatearFechaCorta } from './utilidades'
import { BotonAgregar, BotonEliminar, BotonesFormulario, CampoArea, CampoSelectClase, CampoTexto, EstadoVacio, EtiquetaArticulo, EtiquetaClase } from './comunes'

function campoBriefVacio() {
  return { caratula: '', tribunal: '', fecha: '', hechos: '', cuestionJuridica: '', normaAplicable: '', analisis: '', conclusion: '', claseId: '', articuloRelacionado: '' }
}

export function TabCasos({ moduloId, briefs, clases, modoOscuro }: { moduloId: string; briefs: BriefCaso[]; clases: SesionClase[]; modoOscuro: boolean }) {
  const setBriefsModulo = useStore((s) => s.setBriefsModulo)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [campos, setCampos] = useState(campoBriefVacio())
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  const ordenados = [...briefs].sort((a, b) => b.fechaModificacion - a.fechaModificacion)

  const set = (campo: keyof ReturnType<typeof campoBriefVacio>) => (valor: string) => setCampos((c) => ({ ...c, [campo]: valor }))

  const iniciarNuevo = () => {
    setEditandoId(null)
    setCampos(campoBriefVacio())
    setMostrarForm(true)
  }

  const iniciarEdicion = (b: BriefCaso) => {
    setEditandoId(b.id)
    setCampos({
      caratula: b.caratula,
      tribunal: b.tribunal ?? '',
      fecha: b.fecha ?? '',
      hechos: b.hechos,
      cuestionJuridica: b.cuestionJuridica,
      normaAplicable: b.normaAplicable,
      analisis: b.analisis,
      conclusion: b.conclusion,
      claseId: b.claseId ?? '',
      articuloRelacionado: b.articuloRelacionado ?? '',
    })
    setMostrarForm(true)
  }

  const guardar = () => {
    if (!campos.caratula.trim()) return
    const ahora = Date.now()
    const limpiar = (v: string) => v.trim() || undefined
    if (editandoId) {
      setBriefsModulo(moduloId, briefs.map((b) => (b.id === editandoId
        ? {
            ...b,
            caratula: campos.caratula.trim(),
            tribunal: limpiar(campos.tribunal),
            fecha: limpiar(campos.fecha),
            hechos: campos.hechos,
            cuestionJuridica: campos.cuestionJuridica,
            normaAplicable: campos.normaAplicable,
            analisis: campos.analisis,
            conclusion: campos.conclusion,
            claseId: campos.claseId || undefined,
            articuloRelacionado: campos.articuloRelacionado.trim() || undefined,
            fechaModificacion: ahora,
          }
        : b)))
    } else {
      const nuevo: BriefCaso = {
        id: crypto.randomUUID(),
        caratula: campos.caratula.trim(),
        tribunal: limpiar(campos.tribunal),
        fecha: limpiar(campos.fecha),
        hechos: campos.hechos,
        cuestionJuridica: campos.cuestionJuridica,
        normaAplicable: campos.normaAplicable,
        analisis: campos.analisis,
        conclusion: campos.conclusion,
        claseId: campos.claseId || undefined,
        articuloRelacionado: campos.articuloRelacionado.trim() || undefined,
        fechaCreacion: ahora,
        fechaModificacion: ahora,
      }
      setBriefsModulo(moduloId, [...briefs, nuevo])
    }
    setMostrarForm(false)
    setEditandoId(null)
  }

  const eliminar = (id: string) => {
    setBriefsModulo(moduloId, briefs.filter((b) => b.id !== id))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Casos (brief IRAC)</h2>
          <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
            Hechos, Cuestión jurídica, Norma aplicable, Análisis y Conclusión de un fallo.
          </p>
        </div>
        <BotonAgregar label="Agregar caso" onClick={iniciarNuevo} modoOscuro={modoOscuro} />
      </div>

      {mostrarForm && (
        <div className={`p-4 rounded-xl border mb-4 space-y-3 ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto label="Carátula / rol" valor={campos.caratula} onChange={set('caratula')} modoOscuro={modoOscuro} placeholder="Ej: Rol 12.345-2023, Corte Suprema" />
            <CampoTexto label="Tribunal (opcional)" valor={campos.tribunal} onChange={set('tribunal')} modoOscuro={modoOscuro} />
          </div>
          <CampoTexto label="Fecha del fallo (opcional)" tipo="date" valor={campos.fecha} onChange={set('fecha')} modoOscuro={modoOscuro} />
          <CampoArea label="Hechos" valor={campos.hechos} onChange={set('hechos')} modoOscuro={modoOscuro} placeholder="Qué pasó, quiénes son las partes" />
          <CampoArea label="Cuestión jurídica (Issue)" valor={campos.cuestionJuridica} onChange={set('cuestionJuridica')} modoOscuro={modoOscuro} placeholder="La pregunta de derecho que el tribunal debe resolver" />
          <CampoArea label="Norma aplicable (Rule)" valor={campos.normaAplicable} onChange={set('normaAplicable')} modoOscuro={modoOscuro} placeholder="Artículos, normas o principios que rigen el caso" />
          <CampoArea label="Análisis (Application)" valor={campos.analisis} onChange={set('analisis')} modoOscuro={modoOscuro} placeholder="Cómo el tribunal aplicó la norma a estos hechos" />
          <CampoArea label="Conclusión" valor={campos.conclusion} onChange={set('conclusion')} modoOscuro={modoOscuro} placeholder="Qué resolvió el tribunal" />
          <CampoTexto label="Artículo relacionado (opcional)" valor={campos.articuloRelacionado} onChange={set('articuloRelacionado')} modoOscuro={modoOscuro} placeholder="Ej: Art. 1545" />
          {clases.length > 0 && (
            <CampoSelectClase label="Clase a la que pertenece (opcional)" valor={campos.claseId} onChange={set('claseId')} clases={clases} modoOscuro={modoOscuro} />
          )}
          <BotonesFormulario onCancelar={() => { setMostrarForm(false); setEditandoId(null) }} onGuardar={guardar} modoOscuro={modoOscuro} />
        </div>
      )}

      {ordenados.length === 0 ? (
        <EstadoVacio icono="ti-gavel" texto="Aún no has analizado ningún caso en este módulo." modoOscuro={modoOscuro} />
      ) : (
        <div className="space-y-2">
          {ordenados.map((b) => {
            const expandido = expandidoId === b.id
            return (
              <div key={b.id} className={`rounded-xl border ${modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className="flex items-start justify-between gap-2 p-3">
                  <button onClick={() => setExpandidoId(expandido ? null : b.id)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{b.caratula}</span>
                      <EtiquetaArticulo articulo={b.articuloRelacionado} modoOscuro={modoOscuro} />
                      <EtiquetaClase clase={clases.find((c) => c.id === b.claseId)} modoOscuro={modoOscuro} />
                    </div>
                    {(b.tribunal || b.fecha) && (
                      <span className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                        {[b.tribunal, b.fecha ? formatearFechaCorta(b.fecha) : null].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => iniciarEdicion(b)} className={`w-7 h-7 rounded-md flex items-center justify-center ${modoOscuro ? 'text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'}`}>
                      <i className="ti ti-pencil text-sm" />
                    </button>
                    <BotonEliminar onClick={() => eliminar(b.id)} modoOscuro={modoOscuro} />
                  </div>
                </div>
                {expandido && (
                  <div className={`px-3 pb-3 space-y-2 border-t pt-3 ${modoOscuro ? 'border-zinc-700' : 'border-zinc-100'}`}>
                    {[
                      ['Hechos', b.hechos],
                      ['Cuestión jurídica', b.cuestionJuridica],
                      ['Norma aplicable', b.normaAplicable],
                      ['Análisis', b.analisis],
                      ['Conclusión', b.conclusion],
                    ].filter(([, v]) => v).map(([label, valor]) => (
                      <div key={label}>
                        <span className={`block text-[11px] font-semibold uppercase tracking-wide ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>{label}</span>
                        <p className={`text-xs whitespace-pre-wrap ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>{valor}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

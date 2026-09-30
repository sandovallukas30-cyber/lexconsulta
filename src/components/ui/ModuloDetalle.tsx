import { useStore } from '../../store/useStore'
import type { Modulo } from '../../types'
import { coleccionesDeModulo } from '../../services/modulosAcademico'
import { confirmarSalida } from '../../services/guardiaCambios'
import { VERDE, type Tab } from './moduloDetalle/utilidades'
import { TabResumen } from './moduloDetalle/TabResumen'
import { TabClases } from './moduloDetalle/TabClases'
import { TabExamenes } from './moduloDetalle/TabExamenes'
import { TabTextos } from './moduloDetalle/TabTextos'
import { TabApuntes } from './moduloDetalle/TabApuntes'
import { TabCasos } from './moduloDetalle/TabCasos'
import { useState } from 'react'

export type { Tab }

const TABS: { id: Tab; label: string; icono: string }[] = [
  { id: 'resumen', label: 'Resumen', icono: 'ti-layout-dashboard' },
  { id: 'clases', label: 'Clases', icono: 'ti-calendar-event' },
  { id: 'examenes', label: 'Exámenes', icono: 'ti-clipboard-check' },
  { id: 'textos', label: 'Textos', icono: 'ti-books' },
  { id: 'apuntes', label: 'Apuntes', icono: 'ti-notes' },
  { id: 'casos', label: 'Casos', icono: 'ti-gavel' },
]

interface Props {
  modulo: Modulo
  modoOscuro: boolean
  onVolver: () => void
  tabInicial?: Tab
  /** Solo presente cuando `modulo` es en realidad un Ramo propio (ver
   *  moduloDesdeRamo en services/modulosAcademico.ts) -- muestra el botón
   *  "Editar ramo" para llegar a ModalRamo sin tener que volver a la lista.
   *  Un Módulo fijo del catálogo no es editable, así que en ese caso este
   *  prop simplemente se omite y el botón no aparece. */
  onEditar?: () => void
  /** Evaluación a abrir en edición al entrar (desde "Próximas evaluaciones"). */
  evaluacionEnfocada?: string
}

export function ModuloDetalle({ modulo, modoOscuro, onVolver, tabInicial, onEditar, evaluacionEnfocada }: Props) {
  const apuntePendiente = useStore((s) => s.apuntePendiente)
  const [tab, setTab] = useState<Tab>(apuntePendiente?.moduloId === modulo.id ? 'apuntes' : tabInicial ?? 'resumen')
  // Abrir un apunte desde el buscador con este módulo ya montado en otra
  // pestaña: ajuste de estado durante el render (patrón recomendado por
  // React en vez de un efecto que dispara un render extra).
  const [pendienteVisto, setPendienteVisto] = useState(apuntePendiente)
  if (apuntePendiente !== pendienteVisto) {
    setPendienteVisto(apuntePendiente)
    if (apuntePendiente?.moduloId === modulo.id) setTab('apuntes')
  }
  const setCodigoExplorador = useStore((s) => s.setCodigoExplorador)
  const setVistaActiva = useStore((s) => s.setVistaActiva)
  const setColeccionActiva = useStore((s) => s.setColeccionActiva)
  const colecciones = useStore((s) => s.colecciones)
  const canvases = useStore((s) => s.canvases)
  const mapasMentales = useStore((s) => s.mapasMentales)
  const actualizarCanvas = useStore((s) => s.actualizarCanvas)
  const actualizarMapaMental = useStore((s) => s.actualizarMapaMental)
  const setCanvasActivo = useStore((s) => s.setCanvasActivo)
  const setMapaMentalActivo = useStore((s) => s.setMapaMentalActivo)
  const datos = useStore((s) => s.academicoModulos[modulo.id]) ?? { clases: [], evaluaciones: [], textos: [], apuntes: [], cuadernos: [], briefs: [] }
  const coleccionesModulo = coleccionesDeModulo(colecciones, modulo.codigoRelacionado)
  const canvasesModulo = canvases.filter((c) => c.moduloId === modulo.id)
  const canvasesDisponibles = canvases.filter((c) => c.moduloId !== modulo.id)
  const mapasModulo = mapasMentales.filter((m) => m.moduloId === modulo.id)
  const mapasDisponibles = mapasMentales.filter((m) => m.moduloId !== modulo.id)

  const abrirCodigo = () => {
    if (!modulo.codigoRelacionado) return
    setCodigoExplorador(modulo.codigoRelacionado)
    setVistaActiva('explorador')
  }

  const abrirColeccion = (id: string) => {
    setColeccionActiva(id)
    setVistaActiva('colecciones')
  }

  const abrirCanvas = (id: string) => {
    setCanvasActivo(id)
    setVistaActiva('canvas')
  }

  const abrirMapaMental = (id: string) => {
    setMapaMentalActivo(id)
    setVistaActiva('mapasmentales')
  }

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button
          onClick={onVolver}
          className={`flex items-center gap-1.5 text-xs font-medium mb-5 transition-colors ${
            modoOscuro ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <i className="ti ti-arrow-left text-sm" />
          Todos los módulos
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: modulo.color + '20' }}
            >
              <i className={`ti ${modulo.icono} text-xl`} style={{ color: modulo.color }} />
            </div>
            <div className="min-w-0">
              <h1 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
                {modulo.nombre}
              </h1>
              <p className={`text-xs truncate ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
                {modulo.descripcion}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            {onEditar && (
              <button
                onClick={onEditar}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  modoOscuro ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <i className="ti ti-pencil text-sm" />
                Editar ramo
              </button>
            )}
            {modulo.codigoRelacionado && (
              <button
                onClick={abrirCodigo}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  modoOscuro ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <i className="ti ti-book-2 text-sm" />
                Ver código
              </button>
            )}
          </div>
        </div>

        <div
          role="tablist"
          className={`flex gap-1 mb-6 border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id !== tab && !confirmarSalida()) return
                setTab(t.id)
              }}
              role="tab"
              aria-selected={tab === t.id}
              className={`flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex-shrink-0 ${
                tab === t.id
                  ? 'border-current'
                  : 'border-transparent'
              } ${
                tab === t.id
                  ? modoOscuro ? 'text-white' : 'text-zinc-900'
                  : modoOscuro ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'
              }`}
              style={tab === t.id ? { color: VERDE, borderColor: VERDE } : undefined}
            >
              <i className={`ti ${t.icono} text-base`} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'resumen' && (
          <TabResumen
            datos={datos}
            modoOscuro={modoOscuro}
            onIrA={setTab}
            colecciones={coleccionesModulo}
            onAbrirColeccion={abrirColeccion}
            canvases={canvasesModulo}
            canvasesDisponibles={canvasesDisponibles}
            onAbrirCanvas={abrirCanvas}
            onVincularCanvas={(id) => actualizarCanvas(id, { moduloId: modulo.id })}
            mapas={mapasModulo}
            mapasDisponibles={mapasDisponibles}
            onAbrirMapa={abrirMapaMental}
            onVincularMapa={(id) => actualizarMapaMental(id, { moduloId: modulo.id })}
          />
        )}
        {tab === 'clases' && <TabClases moduloId={modulo.id} clases={datos.clases} modoOscuro={modoOscuro} />}
        {tab === 'examenes' && <TabExamenes moduloId={modulo.id} evaluaciones={datos.evaluaciones} modoOscuro={modoOscuro} enfocarId={evaluacionEnfocada} />}
        {tab === 'textos' && <TabTextos moduloId={modulo.id} textos={datos.textos} clases={datos.clases} modoOscuro={modoOscuro} />}
        {tab === 'apuntes' && <TabApuntes moduloId={modulo.id} apuntes={datos.apuntes} clases={datos.clases} cuadernos={datos.cuadernos} modoOscuro={modoOscuro} />}
        {tab === 'casos' && <TabCasos moduloId={modulo.id} briefs={datos.briefs} clases={datos.clases} modoOscuro={modoOscuro} />}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { MODULOS } from '../../data/modulos'
import { ModuloCard } from '../ui/ModuloCard'
import { ModuloDetalle, type Tab } from '../ui/ModuloDetalle'
import { RamoCard } from '../ui/RamoCard'
import { ModalRamo } from '../ui/ModalRamo'
import { obtenerProximosEventos, diasHasta, formatearCountdown, urgenciaDe, type Urgencia } from '../../services/modulosAcademico'
import type { Ramo } from '../../types'

const VERDE = 'var(--accent-base)'
const MAX_EVENTOS_PROXIMOS = 6

function colorUrgenciaFondo(u: Urgencia): string {
  if (u === 'urgente') return 'text-red-600'
  if (u === 'proximo') return 'text-amber-600'
  if (u === 'vencido') return 'text-zinc-400'
  return ''
}

function ProximosEventos({ modoOscuro, onAbrir }: { modoOscuro: boolean; onAbrir: (moduloId: string, tab: Tab) => void }) {
  const academicoModulos = useStore((s) => s.academicoModulos)
  const eventos = obtenerProximosEventos(academicoModulos).slice(0, MAX_EVENTOS_PROXIMOS)

  if (eventos.length === 0) return null

  return (
    <div>
      <h2 className={`text-sm font-semibold mb-3 ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>
        Próximamente en tus ramos
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {eventos.map((ev, i) => {
          const modulo = MODULOS.find((m) => m.id === ev.moduloId)
          if (!modulo) return null
          const dias = diasHasta(ev.fecha)
          const u = urgenciaDe(dias)
          return (
            <button
              key={`${ev.moduloId}-${ev.tipo}-${i}`}
              onClick={() => onAbrir(ev.moduloId, ev.tipo === 'clase' ? 'clases' : 'examenes')}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                modoOscuro ? 'bg-zinc-800/60 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: modulo.color + '20' }}
              >
                <i className={`ti ${ev.tipo === 'clase' ? 'ti-calendar-event' : 'ti-clipboard-check'} text-base`} style={{ color: modulo.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>{modulo.nombre}</div>
                <div className={`text-sm font-medium truncate ${modoOscuro ? 'text-zinc-100' : 'text-zinc-900'}`}>{ev.titulo}</div>
              </div>
              <span className={`text-xs font-medium flex-shrink-0 ${colorUrgenciaFondo(u)}`}>{formatearCountdown(dias)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MisRamos({ modoOscuro }: { modoOscuro: boolean }) {
  const ramos = useStore((s) => s.ramos)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [ramoEditando, setRamoEditando] = useState<Ramo | null>(null)

  const abrirNuevo = () => {
    setRamoEditando(null)
    setModalAbierto(true)
  }

  const abrirEdicion = (ramo: Ramo) => {
    setRamoEditando(ramo)
    setModalAbierto(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-sm font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>Mis ramos</h2>
        <button
          onClick={abrirNuevo}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            modoOscuro ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          <i className="ti ti-plus text-sm" />
          Agregar ramo
        </button>
      </div>

      {ramos.length === 0 ? (
        <div className={`flex flex-col items-center justify-center text-center py-10 rounded-xl border border-dashed ${
          modoOscuro ? 'border-zinc-800 text-zinc-500' : 'border-zinc-300 text-zinc-400'
        }`}>
          <i className="ti ti-school text-2xl mb-2 opacity-60" />
          <p className="text-sm">Agrega los ramos que cursas este semestre, con su profesor y horario.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ramos.map((ramo) => (
            <RamoCard
              key={ramo.id}
              ramo={ramo}
              modulos={MODULOS.filter((m) => ramo.modulosVinculados.includes(m.id))}
              modoOscuro={modoOscuro}
              onClick={() => abrirEdicion(ramo)}
            />
          ))}
        </div>
      )}

      <ModalRamo abierto={modalAbierto} ramoEditando={ramoEditando} onCerrar={() => setModalAbierto(false)} />
    </div>
  )
}

export function ModulosView() {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const progresoModulos = useStore((s) => s.progresoModulos)
  const moduloActivoId = useStore((s) => s.moduloActivoId)
  const setModuloActivo = useStore((s) => s.setModuloActivo)
  const [tabInicial, setTabInicial] = useState<Tab | undefined>(undefined)

  const modulosOrdenados = [...MODULOS].sort((a, b) => a.orden - b.orden)
  const moduloActivo = moduloActivoId ? MODULOS.find((m) => m.id === moduloActivoId) : undefined

  const abrirModulo = (moduloId: string, tab?: Tab) => {
    setTabInicial(tab)
    setModuloActivo(moduloId)
  }

  if (moduloActivo) {
    return <ModuloDetalle modulo={moduloActivo} modoOscuro={modoOscuro} tabInicial={tabInicial} onVolver={() => setModuloActivo(null)} />
  }

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: modoOscuro
                ? 'color-mix(in srgb, var(--accent-base) 15%, transparent)'
                : 'color-mix(in srgb, var(--accent-base) 6%, transparent)',
            }}
          >
            <i className="ti ti-layout-grid text-xl" style={{ color: VERDE }} />
          </div>
          <div>
            <h1 className={`text-2xl font-serif font-bold ${modoOscuro ? 'text-white' : 'text-zinc-900'}`}>
              Módulos
            </h1>
            <p className={`text-xs ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Selecciona un área del derecho para explorar sus contenidos y ver tu progreso
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <MisRamos modoOscuro={modoOscuro} />

          <ProximosEventos modoOscuro={modoOscuro} onAbrir={abrirModulo} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulosOrdenados.map((modulo) => (
              <ModuloCard
                key={modulo.id}
                modulo={modulo}
                progreso={progresoModulos[modulo.id]}
                modoOscuro={modoOscuro}
                onClick={() => abrirModulo(modulo.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

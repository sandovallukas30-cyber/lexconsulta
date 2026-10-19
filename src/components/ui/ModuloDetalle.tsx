import { BotonVolver } from './BotonVolver'
import { useStore } from '../../store/useStore'
import type { Modulo, Ramo } from '../../types'
import { coleccionesDeModulo } from '../../services/modulosAcademico'
import { confirmarSalida } from '../../services/guardiaCambios'
import { disenoDe, profesoresDe, tintaPastel } from '../../services/disenoRamo'
import { VERDE, type Tab } from './moduloDetalle/utilidades'
import { TabResumen } from './moduloDetalle/TabResumen'
import { TabClases } from './moduloDetalle/TabClases'
import { TabExamenes } from './moduloDetalle/TabExamenes'
import { TabTextos } from './moduloDetalle/TabTextos'
import { TabApuntes } from './moduloDetalle/TabApuntes'
import { TabCasos } from './moduloDetalle/TabCasos'
import { BandaRamo } from './BandaRamo'
import { Segmentado } from './Segmentado'
import { useState } from 'react'

export type { Tab }

/** Las seis pantallas de siempre, agrupadas en cuatro secciones: Resumen, Clases y apuntes,
 *  Evaluaciones y Biblioteca (textos y casos). Dentro de una sección con dos pantallas hay un
 *  selector corto. `Tab` sigue siendo el de las seis pantallas, así que quien abre un ramo en una
 *  pestaña concreta (p. ej. «examenes» desde las próximas evaluaciones) no cambia. */
type Grupo = 'resumen' | 'clases' | 'examenes' | 'biblioteca'

const GRUPOS: { id: Grupo; label: string; icono: string; tabs: Tab[] }[] = [
  { id: 'resumen', label: 'Resumen', icono: 'ti-layout-dashboard', tabs: ['resumen'] },
  { id: 'clases', label: 'Clases y apuntes', icono: 'ti-calendar-event', tabs: ['clases', 'apuntes'] },
  { id: 'examenes', label: 'Evaluaciones', icono: 'ti-clipboard-check', tabs: ['examenes'] },
  { id: 'biblioteca', label: 'Biblioteca', icono: 'ti-books', tabs: ['textos', 'casos'] },
]

const grupoDe = (t: Tab): Grupo => GRUPOS.find((g) => g.tabs.includes(t))?.id ?? 'resumen'

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
  /** El ramo propio (profesores, horario, sala); ausente en los módulos del catálogo. */
  ramo?: Ramo
  /** Evaluación a abrir en edición al entrar (desde "Próximas evaluaciones"). */
  evaluacionEnfocada?: string
}

export function ModuloDetalle({ modulo, modoOscuro, onVolver, tabInicial, onEditar, ramo, evaluacionEnfocada }: Props) {
  const apuntePendiente = useStore((s) => s.apuntePendiente)
  const [tab, setTab] = useState<Tab>(apuntePendiente?.moduloId === modulo.id ? 'apuntes' : tabInicial ?? 'resumen')
  // lo último que se vio en cada sección de dos pantallas, para volver a ella con el mismo selector
  const [ultimaDe, setUltimaDe] = useState<Partial<Record<Grupo, Tab>>>({})
  // «Nuevo apunte» desde el Resumen: abre Apuntes y crea uno al llegar
  const [nuevoApunteAlEntrar, setNuevoApunteAlEntrar] = useState(false)
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
  const abrirApunte = useStore((s) => s.abrirApunte)
  const colecciones = useStore((s) => s.colecciones)
  const mapasMentales = useStore((s) => s.mapasMentales)
  const actualizarMapaMental = useStore((s) => s.actualizarMapaMental)
  const setMapaMentalActivo = useStore((s) => s.setMapaMentalActivo)
  const datos = useStore((s) => s.academicoModulos[modulo.id]) ?? { clases: [], evaluaciones: [], textos: [], apuntes: [], cuadernos: [], briefs: [] }
  const coleccionesModulo = coleccionesDeModulo(colecciones, modulo.codigoRelacionado)
  const mapasModulo = mapasMentales.filter((m) => m.moduloId === modulo.id)
  const mapasDisponibles = mapasMentales.filter((m) => m.moduloId !== modulo.id)

  const grupo = grupoDe(tab)
  const grupoActual = GRUPOS.find((g) => g.id === grupo)!

  const irA = (destino: Tab) => {
    if (destino === tab) return
    if (!confirmarSalida()) return
    setTab(destino)
    const g = grupoDe(destino)
    if (GRUPOS.find((x) => x.id === g)!.tabs.length > 1) setUltimaDe((u) => ({ ...u, [g]: destino }))
  }

  const abrirCodigo = () => {
    if (!modulo.codigoRelacionado) return
    setCodigoExplorador(modulo.codigoRelacionado)
    setVistaActiva('explorador')
  }

  const abrirColeccion = (id: string) => {
    setColeccionActiva(id)
    setVistaActiva('colecciones')
  }

  const abrirMapaMental = (id: string) => {
    setMapaMentalActivo(id)
    setVistaActiva('mapasmentales')
  }

  const tinta = tintaPastel(modulo.color) // la franja es pastel: el texto va en un tono oscuro del mismo color
  const profesores = ramo ? profesoresDe(ramo) : []
  const lugar = ramo ? [ramo.horario, ramo.sala].filter(Boolean).join(' · ') : ''
  const botonBanda = 'sin-neu inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-full text-xs font-bold transition-colors'
  const estiloBotonBanda = { background: 'rgba(255,255,255,.6)', color: tinta }

  // contadores en el selector corto de las secciones de dos pantallas
  const cuentas: Partial<Record<Tab, number>> = {
    clases: datos.clases.length,
    apuntes: datos.apuntes.length,
    textos: datos.textos.length,
    casos: datos.briefs.length,
  }
  const TEXTO_TAB: Partial<Record<Tab, string>> = { clases: 'Clases', apuntes: 'Apuntes', textos: 'Textos', casos: 'Casos' }

  return (
    <div className={`h-full overflow-y-auto ${modoOscuro ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <nav aria-label="Migas" className="flex items-center gap-1 -ml-2.5 mb-4 min-w-0">
          <button onClick={onVolver} className="boton boton-fantasma boton-chico">
            <i className="ti ti-arrow-left text-sm" />
            Todos los módulos
          </button>
          {/* si se llegó desde otra parte (Explorador, Omnibar, otro módulo) */}
          <BotonVolver ocultarSi={(l) => l.vista === 'modulos' && l.moduloActivoId === null} />
        </nav>

        <BandaRamo color={modulo.color} diseno={disenoDe(ramo ?? { id: modulo.id })} className="rounded-tarjeta mb-6 shadow-tarjeta">
          <div className="p-4 sm:p-6 flex flex-col gap-3" style={{ color: tinta }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-[18px] flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,.6)' }}
                >
                  <i className={`ti ${modulo.icono} text-2xl sm:text-3xl`} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-extrabold leading-tight" style={{ fontFamily: 'var(--font-head)' }}>
                    {modulo.nombre}
                  </h1>
                  {!ramo && <p className="text-sm mt-0.5 opacity-90 line-clamp-2">{modulo.descripcion}</p>}
                  {ramo && ramo.semestre && <p className="text-sm mt-0.5 opacity-90">{ramo.semestre}{ramo.codigoCurso ? ` · ${ramo.codigoCurso}` : ''}</p>}
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {onEditar && (
                  <button onClick={onEditar} className={botonBanda} style={estiloBotonBanda}>
                    <i className="ti ti-pencil text-sm" aria-hidden="true" />
                    Editar ramo
                  </button>
                )}
                {modulo.codigoRelacionado && (
                  <button onClick={abrirCodigo} className={botonBanda} style={estiloBotonBanda}>
                    <i className="ti ti-book-2 text-sm" aria-hidden="true" />
                    Ver código
                  </button>
                )}
              </div>
            </div>

            {ramo && (profesores.length > 0 || lugar || ramo.email) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                {profesores.length > 0 && (
                  <ul className="flex flex-wrap items-center gap-1.5" aria-label="Profesores">
                    {profesores.map((nombre) => (
                      <li key={nombre} className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,.6)' }}>
                        <i className="ti ti-user text-sm" aria-hidden="true" />
                        {nombre}
                      </li>
                    ))}
                  </ul>
                )}
                {lugar && (
                  <span className="inline-flex items-center gap-1.5 font-medium opacity-95">
                    <i className="ti ti-clock text-sm" aria-hidden="true" />
                    {lugar}
                  </span>
                )}
                {ramo.email && (
                  <a href={`mailto:${ramo.email}`} className="inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline" style={{ color: tinta }}>
                    <i className="ti ti-mail text-sm" aria-hidden="true" />
                    {ramo.email}
                  </a>
                )}
              </div>
            )}
          </div>
        </BandaRamo>

        <div
          role="tablist"
          aria-label="Secciones del ramo"
          className={`flex gap-1 mb-5 border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}
        >
          {GRUPOS.map((g, i) => (
            <button
              key={g.id}
              onClick={() => irA(ultimaDe[g.id] ?? g.tabs[0])}
              // patrón ARIA de pestañas: una sola parada de Tab en la fila y
              // las flechas (e Inicio/Fin) cambian de pestaña
              onKeyDown={(e) => {
                const destino =
                  e.key === 'ArrowRight' ? (i + 1) % GRUPOS.length
                  : e.key === 'ArrowLeft' ? (i - 1 + GRUPOS.length) % GRUPOS.length
                  : e.key === 'Home' ? 0
                  : e.key === 'End' ? GRUPOS.length - 1
                  : -1
                if (destino < 0) return
                e.preventDefault()
                if (!confirmarSalida()) return
                const d = GRUPOS[destino]
                setTab(ultimaDe[d.id] ?? d.tabs[0])
                const fila = e.currentTarget.parentElement
                ;(fila?.children[destino] as HTMLElement | undefined)?.focus()
              }}
              tabIndex={grupo === g.id ? 0 : -1}
              role="tab"
              aria-selected={grupo === g.id}
              className={`flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap flex-shrink-0 ${
                grupo === g.id
                  ? 'border-current'
                  : 'border-transparent'
              } ${
                grupo === g.id
                  ? modoOscuro ? 'text-white' : 'text-zinc-900'
                  : modoOscuro ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'
              }`}
              style={grupo === g.id ? { color: 'var(--accent-texto)', borderColor: VERDE } : undefined}
            >
              <i className={`ti ${g.icono} text-base`} aria-hidden="true" />
              {g.label}
            </button>
          ))}
        </div>

        {grupoActual.tabs.length > 1 && (
          <div className="mb-5">
            <Segmentado<Tab>
              id={`detalle-${grupo}`}
              grande
              etiqueta={`Dentro de ${grupoActual.label}`}
              valor={tab}
              onChange={irA}
              opciones={grupoActual.tabs.map((t) => ({ valor: t, texto: `${TEXTO_TAB[t]} · ${cuentas[t] ?? 0}` }))}
            />
          </div>
        )}

        {tab === 'resumen' && (
          <TabResumen
            moduloId={modulo.id}
            datos={datos}
            modoOscuro={modoOscuro}
            onIrA={irA}
            onNuevoApunte={() => {
              if (!confirmarSalida()) return
              setNuevoApunteAlEntrar(true)
              setTab('apuntes')
              setUltimaDe((u) => ({ ...u, clases: 'apuntes' }))
            }}
            onAbrirApunte={(id) => abrirApunte(modulo.id, id)}
            colecciones={coleccionesModulo}
            onAbrirColeccion={abrirColeccion}
            mapas={mapasModulo}
            mapasDisponibles={mapasDisponibles}
            onAbrirMapa={abrirMapaMental}
            onVincularMapa={(id) => actualizarMapaMental(id, { moduloId: modulo.id })}
          />
        )}
        {tab === 'clases' && <TabClases moduloId={modulo.id} clases={datos.clases} modoOscuro={modoOscuro} />}
        {tab === 'examenes' && <TabExamenes moduloId={modulo.id} evaluaciones={datos.evaluaciones} modoOscuro={modoOscuro} enfocarId={evaluacionEnfocada} />}
        {tab === 'textos' && <TabTextos moduloId={modulo.id} textos={datos.textos} clases={datos.clases} modoOscuro={modoOscuro} />}
        {tab === 'apuntes' && (
          <TabApuntes
            moduloId={modulo.id}
            apuntes={datos.apuntes}
            clases={datos.clases}
            cuadernos={datos.cuadernos}
            modoOscuro={modoOscuro}
            crearAlEntrar={nuevoApunteAlEntrar}
            onCreadoAlEntrar={() => setNuevoApunteAlEntrar(false)}
          />
        )}
        {tab === 'casos' && <TabCasos moduloId={modulo.id} briefs={datos.briefs} clases={datos.clases} modoOscuro={modoOscuro} />}
      </div>
    </div>
  )
}

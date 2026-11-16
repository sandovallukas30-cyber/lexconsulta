import { SelectPrima } from './SelectPrima'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { nombreRamo } from '../../services/tareasPlan'
import { tarjetasDe, type TarjetaRepaso } from '../../services/tarjetasApunte'
import { generarSimulacro, MIN_TARJETAS_SIMULACRO, tarjetasParaSimulacro, type PreguntaSimulacro } from '../../services/simulacro'
import { EXIGENCIA_COMUN, puntajeANota } from '../../services/puntaje'
import { formatoNota, NOTA_APROBAR } from '../../services/notas'
import { registrarUso } from '../../services/uso'
import { apuntesDeUnidades, apuntesPorUnidad, evaluacionesConTemario, SIN_UNIDAD } from '../../services/temario'
import { generarDesarrollo, preguntasDeApunte, UMBRAL_LOGRADO, type PreguntaDesarrollo } from '../../services/desarrollo'
import { pendientes, type ResultadoPrueba } from '../../services/registroPrueba'
import { Segmentado } from './Segmentado'
import { confirmar } from '../../services/confirmar'
import { DesarrolloPregunta } from './DesarrolloPregunta'
import { PanelErroresPrueba } from './PanelErroresPrueba'
import type { TipoPregunta } from '../../services/simulacro'

const CANTIDADES = [5, 10, 20, 30]
const CANTIDADES_DESARROLLO = [3, 5, 8]
const LETRAS = ['A', 'B', 'C', 'D']

type Fase = 'config' | 'preguntando' | 'resultado' | 'desarrollando' | 'resultadoDes'
type Modo = 'alternativas' | 'desarrollo'

const minutosYSegundos = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Simulacro: preguntas de opción múltiple armadas con los «término: definición» de tus apuntes. */
export function SimulacroPractica({ onVolver, inicial }: { onVolver: () => void; inicial?: { ramoId?: string; unidadIds?: string[]; soloErrores?: boolean } }) {
  const academico = useStore((s) => s.academicoModulos)
  const ramos = useStore((s) => s.ramos)
  const registrarRepaso = useStore((s) => s.registrarRepasoTarjeta)
  const registrarPrueba = useStore((s) => s.registrarPrueba)
  const borrarRegistroPrueba = useStore((s) => s.borrarRegistroPrueba)
  const erroresPrueba = useStore((s) => s.erroresPrueba)

  const [fase, setFase] = useState<Fase>('config')
  const [seleccion, setSeleccion] = useState(inicial?.ramoId ?? 'todas')
  const [cantidad, setCantidad] = useState(10)
  const [preguntas, setPreguntas] = useState<PreguntaSimulacro[]>([])
  const [indice, setIndice] = useState(0)
  const [respuestas, setRespuestas] = useState<(number | null)[]>([])
  const [inicio, setInicio] = useState(0)
  const [fin, setFin] = useState(0)
  const [programado, setProgramado] = useState(false)
  // unidades del temario elegidas (vacío = todo el ramo)
  const [unidadesSel, setUnidadesSel] = useState<string[]>(inicial?.unidadIds ?? [])
  const [modo, setModo] = useState<Modo>('alternativas')
  const [temas, setTemas] = useState<PreguntaDesarrollo[]>([])
  const [temaI, setTemaI] = useState(0)
  const [resDes, setResDes] = useState<{ pregunta: PreguntaDesarrollo; cubiertos: boolean[] }[]>([])

  // material de cada asignatura: cuántas tarjetas de término y definición hay en sus apuntes
  const opcionesRamo = useMemo(() => {
    const porRamo = Object.entries(academico).map(([id, d]) => {
      const apuntes = d.apuntes ?? []
      const tarjetas = apuntes.flatMap((a) => tarjetasDe(a))
      const temasRamo = apuntes.reduce((n, a) => n + preguntasDeApunte(a).length, 0)
      return { id, nombre: nombreRamo(id, ramos) ?? id, apuntes, unidades: d.unidades ?? [], evaluaciones: d.evaluaciones ?? [], tarjetas, n: tarjetasParaSimulacro(tarjetas).length, temas: temasRamo }
    })
    return porRamo.filter((r) => r.n > 0 || r.temas > 0).sort((a, b) => b.n + b.temas - (a.n + a.temas))
  }, [academico, ramos])

  const todas = useMemo(() => opcionesRamo.flatMap((r) => r.tarjetas), [opcionesRamo])
  const ramoActual = seleccion === 'todas' ? undefined : opcionesRamo.find((r) => r.id === seleccion)
  const tarjetasFuente = useMemo<TarjetaRepaso[]>(() => {
    if (!ramoActual) return todas
    if (unidadesSel.length === 0) return ramoActual.tarjetas
    return apuntesDeUnidades(ramoActual.apuntes, unidadesSel).flatMap((a) => tarjetasDe(a))
  }, [ramoActual, todas, unidadesSel])
  const material = tarjetasParaSimulacro(tarjetasFuente).length
  const conteoUnidades = ramoActual ? apuntesPorUnidad(ramoActual.apuntes, ramoActual.unidades) : new Map<string, number>()
  const evaluacionesTemario = ramoActual ? evaluacionesConTemario(ramoActual.evaluaciones) : []
  const alternarUnidad = (id: string) => setUnidadesSel((u) => (u.includes(id) ? u.filter((x) => x !== id) : [...u, id]))
  // apuntes que alimentan el desarrollo (mismo filtro de ramo y unidades)
  const apuntesFuente = useMemo(() => {
    if (!ramoActual) return opcionesRamo.flatMap((r) => r.apuntes)
    return apuntesDeUnidades(ramoActual.apuntes, unidadesSel)
  }, [ramoActual, opcionesRamo, unidadesSel])
  const temasDisponibles = useMemo(() => apuntesFuente.reduce((n, a) => n + preguntasDeApunte(a).length, 0), [apuntesFuente])
  const esDesarrollo = modo === 'desarrollo'
  const disponible = esDesarrollo ? temasDisponibles : material
  const alcanza = esDesarrollo ? temasDisponibles >= 1 : material >= MIN_TARJETAS_SIMULACRO
  const cantidadReal = Math.min(cantidad, disponible)
  const filtroRegistro = useMemo(() => ({ ...(ramoActual ? { ramoId: ramoActual.id } : {}), ...(unidadesSel.length > 0 ? { unidadIds: unidadesSel } : {}) }), [ramoActual, unidadesSel])

  // a qué ramo y unidad pertenece un apunte (para anotarlo en el registro de errores)
  const ubicar = (apunteId: string): { ramoId?: string; unidadId?: string } => {
    const r = opcionesRamo.find((x) => x.apuntes.some((a) => a.id === apunteId))
    if (!r) return {}
    const a = r.apuntes.find((x) => x.id === apunteId)
    return { ramoId: r.id, ...(a?.unidadId && r.unidades.some((u) => u.id === a.unidadId) ? { unidadId: a.unidadId } : {}) }
  }

  const empezar = (soloErrores = false) => {
    if (esDesarrollo) {
      const prioridad = new Set(pendientes(erroresPrueba, filtroRegistro).filter(([, r]) => r.tipo === 'desarrollo').map(([id]) => id))
      const lista = generarDesarrollo(apuntesFuente, cantidad, Math.random, prioridad)
      const elegidos = soloErrores ? lista.filter((t) => prioridad.has(t.id)) : lista
      if (elegidos.length === 0) return
      registrarUso('practica.simulacro')
      setTemas(elegidos)
      setTemaI(0)
      setResDes([])
      setInicio(Date.now())
      setFase('desarrollando')
      return
    }
    let prioridad: Map<string, TipoPregunta> | undefined
    if (soloErrores) {
      prioridad = new Map(
        pendientes(erroresPrueba, filtroRegistro)
          .filter(([, r]) => r.tipo !== 'desarrollo')
          .map(([, r]) => [r.origen, r.tipo as TipoPregunta] as const)
      )
    }
    const { preguntas: generadas } = generarSimulacro(tarjetasFuente, cantidad, Math.random, prioridad)
    if (generadas.length === 0) return
    registrarUso('practica.simulacro')
    setPreguntas(generadas)
    setRespuestas(generadas.map(() => null))
    setIndice(0)
    setProgramado(false)
    setInicio(Date.now())
    setFase('preguntando')
  }

  // desde «Hoy te toca → Corregir errores»: arranca directo con lo que sigues fallando
  useEffect(() => {
    if (inicial?.soloErrores) empezar(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // al cambiar de pregunta, tema o pantalla, el foco va al título (si no, cae al <body> cuando el botón pulsado desaparece)
  const refTitulo = useRef<HTMLHeadingElement>(null)
  const primerRender = useRef(true)
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false
      return
    }
    refTitulo.current?.focus()
  }, [fase, indice, temaI])

  const actual = preguntas[indice]
  const elegida = respuestas[indice] ?? null

  const elegir = (i: number) => {
    if (elegida !== null) return
    setRespuestas((r) => r.map((x, k) => (k === indice ? i : x)))
  }
  const siguiente = () => {
    if (elegida === null) return
    if (indice + 1 < preguntas.length) setIndice(indice + 1)
    else {
      setFin(Date.now())
      setFase('resultado')
      registrarPrueba(
        preguntas.map<ResultadoPrueba>((p, i) => ({
          id: p.id,
          tipo: p.tipo,
          etiqueta: p.frente,
          origen: p.tarjetaId,
          ...ubicar(p.tarjetaId.split(':')[0]),
          ok: respuestas[i] === p.correcta,
        }))
      )
    }
  }

  const terminarTema = (cubiertos: boolean[]) => {
    const nuevo = [...resDes, { pregunta: temas[temaI], cubiertos }]
    setResDes(nuevo)
    if (temaI + 1 < temas.length) {
      setTemaI(temaI + 1)
      return
    }
    setFin(Date.now())
    setFase('resultadoDes')
    registrarPrueba(
      nuevo.map<ResultadoPrueba>(({ pregunta, cubiertos: c }) => ({
        id: pregunta.id,
        tipo: 'desarrollo',
        etiqueta: pregunta.titulo,
        origen: pregunta.id,
        ...ubicar(pregunta.apunteId),
        ok: c.filter(Boolean).length / pregunta.puntos.length >= UMBRAL_LOGRADO,
        faltaron: pregunta.puntos.filter((_, k) => !c[k]).map((p) => p.texto),
      }))
    )
  }

  // teclado: 1 a 4 eligen, Enter o flecha derecha avanzan, Escape sale
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      // Enter y flechas sobre un botón, campo o diálogo hacen lo de ese control, no el atajo
      const el = e.target instanceof HTMLElement ? e.target : null
      if (el && (/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest('[role=dialog]')) && !(e.key >= '1' && e.key <= '4')) return
      if (fase === 'preguntando') {
        if (e.key >= '1' && e.key <= '4') elegir(Number(e.key) - 1)
        else if ((e.key === 'Enter' || e.key === 'ArrowRight') && elegida !== null) siguiente()
        else return
        e.preventDefault()
      } else if (e.key === 'Escape' && fase !== 'desarrollando') onVolver()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  })

  const aciertos = respuestas.filter((r, i) => r !== null && r === preguntas[i]?.correcta).length
  const falladas = preguntas.filter((p, i) => respuestas[i] !== p.correcta)
  const nota = puntajeANota(aciertos, preguntas.length, EXIGENCIA_COMUN)

  // dónde fallaste, por unidad del temario (solo si el ramo tiene unidades)
  const porUnidad = useMemo(() => {
    const ramo = opcionesRamo.find((r) => r.apuntes.some((a) => preguntas.some((p) => p.tarjetaId.startsWith(`${a.id}:`))))
    if (!ramo || ramo.unidades.length === 0) return []
    const unidadDeApunte = new Map(ramo.apuntes.map((a) => [a.id, ramo.unidades.some((u) => u.id === a.unidadId) ? a.unidadId! : SIN_UNIDAD]))
    const cuenta = new Map<string, { total: number; fallos: number }>()
    preguntas.forEach((p, i) => {
      const u = unidadDeApunte.get(p.tarjetaId.split(':')[0])
      if (!u) return
      const c = cuenta.get(u) ?? { total: 0, fallos: 0 }
      c.total++
      if (respuestas[i] !== p.correcta) c.fallos++
      cuenta.set(u, c)
    })
    return [...cuenta.entries()]
      .map(([id, c]) => ({ id, nombre: id === SIN_UNIDAD ? 'Sin unidad' : (ramo.unidades.find((u) => u.id === id)?.nombre ?? ''), ...c }))
      .sort((a, b) => b.fallos / b.total - a.fallos / a.total || b.fallos - a.fallos)
  }, [opcionesRamo, preguntas, respuestas])

  const repetirFalladas = () => {
    if (falladas.length === 0) return
    setPreguntas(falladas)
    setRespuestas(falladas.map(() => null))
    setIndice(0)
    setProgramado(false)
    setInicio(Date.now())
    setFase('preguntando')
  }

  const programarRepaso = () => {
    for (const id of new Set(falladas.map((p) => p.tarjetaId))) registrarRepaso(id, 1)
    setProgramado(true)
  }

  const suave = { color: 'var(--neu-ink2)' }
  const salir = () => {
    if (fase !== 'desarrollando') return onVolver()
    void confirmar({ titulo: '¿Salir del desarrollo?', mensaje: 'Se pierde lo que escribiste en este tema y lo que falta del intento.', etiquetaConfirmar: 'Salir', peligro: true }).then((ok) => {
      if (ok) onVolver()
    })
  }
  const cabecera = (titulo: string) => (
    <header className="flex items-center gap-3">
      <button onClick={salir} className="boton boton-chico boton-suave" aria-label="Volver a Práctica">
        <i className="ti ti-arrow-left" aria-hidden="true" />
      </button>
      <h1 ref={refTitulo} tabIndex={-1} className="titulo-pagina titulo-visible flex-1 min-w-0 truncate outline-none">{titulo}</h1>
    </header>
  )

  if (fase === 'config') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
          {cabecera('Simulacro')}
          <p className="text-sm" style={suave}>
            {esDesarrollo
              ? 'Preguntas de desarrollo armadas con las secciones de tus apuntes. Escribes la respuesta y la app marca qué puntos clave (plazos, quórums, conceptos) te faltaron.'
              : 'Preguntas de opción múltiple armadas con los «término: definición» de tus apuntes, con plazos y quórums. Al terminar ves qué fallaste y puedes mandarlo al repaso.'}
          </p>
          {opcionesRamo.length === 0 ? (
            <section className="neu-raised p-5" aria-label="Sin material">
              <p className="text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>Todavía no hay material para un simulacro</p>
              <p className="text-sm mt-1" style={suave}>
                Escribe en tus apuntes líneas como «- **Dolo:** intención positiva de inferir injuria» (o importa un mazo de Anki o Quizlet) y vuelve aquí. Hacen falta al menos {MIN_TARJETAS_SIMULACRO}.
              </p>
            </section>
          ) : (
            <section className="neu-raised p-5 space-y-4" aria-label="Armar simulacro">
              <Segmentado<Modo>
                id="modo-prueba"
                etiqueta="Tipo de pregunta"
                valor={modo}
                onChange={(v) => {
                  setModo(v)
                  setCantidad(v === 'desarrollo' ? 3 : 10)
                }}
                opciones={[{ valor: 'alternativas', texto: 'Alternativas' }, { valor: 'desarrollo', texto: 'Desarrollo' }]}
              />
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--neu-ink3)' }}>Material</span>
                <SelectPrima value={seleccion} onChange={(e) => { setSeleccion(e.target.value); setUnidadesSel([]) }} className="w-full h-control px-3 rounded-control border text-sm bg-[var(--neu-bg)] border-zinc-200 text-[var(--neu-ink)]">
                  <option value="todas">
                    Todas mis asignaturas ({esDesarrollo ? `${opcionesRamo.reduce((n, r) => n + r.temas, 0)} temas` : `${tarjetasParaSimulacro(todas).length} tarjetas`})
                  </option>
                  {opcionesRamo.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} ({esDesarrollo ? `${r.temas} ${r.temas === 1 ? 'tema' : 'temas'}` : `${r.n} ${r.n === 1 ? 'tarjeta' : 'tarjetas'}`})
                    </option>
                  ))}
                </SelectPrima>
              </label>
              {ramoActual && ramoActual.unidades.length > 0 && (
                <fieldset>
                  <legend className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--neu-ink3)' }}>Qué entra</legend>
                  {evaluacionesTemario.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {evaluacionesTemario.slice(0, 3).map((e) => (
                        <button key={e.id} onClick={() => setUnidadesSel(e.unidadIds ?? [])} className="boton boton-chico boton-suave">
                          Lo que entra en «{e.nombre}»
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Unidades del temario">
                    <button onClick={() => setUnidadesSel([])} aria-pressed={unidadesSel.length === 0} className={`boton boton-chico ${unidadesSel.length === 0 ? 'boton-primario' : 'boton-suave'}`}>
                      Todo el ramo
                    </button>
                    {ramoActual.unidades.map((u) => (
                      <button key={u.id} onClick={() => alternarUnidad(u.id)} aria-pressed={unidadesSel.includes(u.id)} className={`boton boton-chico ${unidadesSel.includes(u.id) ? 'boton-primario' : 'boton-suave'}`}>
                        {u.nombre}
                        <span className="opacity-70"> · {conteoUnidades.get(u.id) ?? 0}</span>
                      </button>
                    ))}
                    {(conteoUnidades.get(SIN_UNIDAD) ?? 0) > 0 && (
                      <button onClick={() => alternarUnidad(SIN_UNIDAD)} aria-pressed={unidadesSel.includes(SIN_UNIDAD)} className={`boton boton-chico ${unidadesSel.includes(SIN_UNIDAD) ? 'boton-primario' : 'boton-suave'}`}>
                        Sin unidad
                        <span className="opacity-70"> · {conteoUnidades.get(SIN_UNIDAD)}</span>
                      </button>
                    )}
                  </div>
                </fieldset>
              )}
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--neu-ink3)' }}>{esDesarrollo ? 'Temas' : 'Preguntas'}</span>
                <div className="flex gap-2 flex-wrap" role="group" aria-label="Cantidad de preguntas">
                  {(esDesarrollo ? CANTIDADES_DESARROLLO : CANTIDADES).map((n) => (
                    <button key={n} onClick={() => setCantidad(n)} aria-pressed={cantidad === n} className={`boton ${cantidad === n ? 'boton-primario' : 'boton-suave'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                {alcanza && cantidad > disponible && <p className="text-xs mt-2" style={suave}>Con este material salen {cantidadReal} {esDesarrollo ? (cantidadReal === 1 ? 'tema' : 'temas') : 'preguntas'}.</p>}
              </div>
              {!alcanza && esDesarrollo && (
                <p className="text-sm" style={{ color: 'var(--neu-danger)' }}>
                  No hay temas para desarrollar aquí. Hacen falta secciones con título, algo de texto y al menos 3 puntos clave (en **negrita**, o con plazos y quórums).
                </p>
              )}
              {!alcanza && !esDesarrollo && <p className="text-sm" style={{ color: 'var(--neu-danger)' }}>Este material tiene solo {material} {material === 1 ? 'tarjeta' : 'tarjetas'}; hacen falta al menos {MIN_TARJETAS_SIMULACRO}.</p>}
              <button onClick={() => empezar()} disabled={!alcanza} className="boton boton-primario w-full">
                {esDesarrollo ? 'Empezar desarrollo' : 'Empezar simulacro'}
              </button>
            </section>
          )}
          {opcionesRamo.length > 0 && (
            <PanelErroresPrueba registro={erroresPrueba} filtro={filtroRegistro} modo={modo} onPracticar={() => empezar(true)} onBorrar={() => borrarRegistroPrueba()} />
          )}
        </div>
      </div>
    )
  }

  if (fase === 'preguntando' && actual) {
    const acerto = elegida === actual.correcta
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
          {cabecera(`Pregunta ${indice + 1} de ${preguntas.length}`)}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--neu-bg3)' }} role="progressbar" aria-valuemin={0} aria-valuemax={preguntas.length} aria-valuenow={indice + (elegida !== null ? 1 : 0)} aria-label="Avance del simulacro">
            <div className="h-full rounded-full transition-all" style={{ width: `${((indice + (elegida !== null ? 1 : 0)) / preguntas.length) * 100}%`, background: 'var(--accent-base)' }} />
          </div>
          <section className="neu-raised p-5 sm:p-6" aria-label="Pregunta">
            <p className="text-[17px] font-semibold leading-snug" style={{ color: 'var(--neu-ink)' }}>{actual.enunciado}</p>
            <ul className="mt-4 space-y-2" aria-label="Opciones">
              {actual.opciones.map((o, i) => {
                const esCorrecta = i === actual.correcta
                const esElegida = i === elegida
                const mostrar = elegida !== null
                const estilo =
                  mostrar && esCorrecta
                    ? { borderColor: 'var(--texto-ok)', background: 'rgba(5,150,105,0.12)' }
                    : mostrar && esElegida
                      ? { borderColor: 'var(--texto-mal)', background: 'rgba(220,38,38,0.1)' }
                      : undefined
                return (
                  <li key={o}>
                    <button
                      onClick={() => elegir(i)}
                      disabled={mostrar}
                      className="w-full text-left flex gap-3 items-start p-3 rounded-control border-2 border-transparent bg-[var(--neu-bg)] min-h-[48px] disabled:cursor-default"
                      style={estilo}
                      aria-label={`Opción ${LETRAS[i]}: ${o}${mostrar && esCorrecta ? ' (correcta)' : mostrar && esElegida ? ' (tu respuesta, incorrecta)' : ''}`}
                    >
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: 'var(--neu-bg3)', color: 'var(--neu-ink)' }} aria-hidden="true">
                        {LETRAS[i]}
                      </span>
                      <span className="text-[15px] leading-snug" style={{ color: 'var(--neu-ink)' }}>{o}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div aria-live="polite">
              {elegida !== null && (
                <div className="mt-4">
                  <p className="text-sm font-bold" style={{ color: acerto ? 'var(--texto-ok)' : 'var(--texto-mal)' }}>{acerto ? 'Correcto' : 'Incorrecto'}</p>
                  {!acerto && (
                    <p className="text-sm mt-1" style={suave}>
                      <strong style={{ color: 'var(--neu-ink)' }}>{actual.frente}:</strong> {actual.reverso}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
          <button onClick={siguiente} disabled={elegida === null} className="boton boton-primario w-full">
            {indice + 1 < preguntas.length ? 'Siguiente' : 'Ver resultado'}
          </button>
          <p className="text-xs text-center solo-teclado" style={suave}>Teclas 1 a 4 para elegir · Enter para seguir</p>
        </div>
      </div>
    )
  }

  if (fase === 'desarrollando' && temas[temaI]) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
          {cabecera(`Tema ${temaI + 1} de ${temas.length}`)}
          <DesarrolloPregunta key={temas[temaI].id} pregunta={temas[temaI]} esUltima={temaI + 1 === temas.length} onTerminar={terminarTema} />
        </div>
      </div>
    )
  }

  if (fase === 'resultadoDes') {
    const logrados = resDes.filter((r) => r.cubiertos.filter(Boolean).length / r.pregunta.puntos.length >= UMBRAL_LOGRADO)
    const porReforzar = resDes.filter((r) => !logrados.includes(r))
    const repetirDesarrollo = () => {
      if (porReforzar.length === 0) return
      setTemas(porReforzar.map((r) => r.pregunta))
      setTemaI(0)
      setResDes([])
      setInicio(Date.now())
      setFase('desarrollando')
    }
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
          {cabecera('Resultado')}
          <section className="neu-raised p-5 sm:p-6 text-center" aria-label="Resultado del desarrollo">
            <p className="text-[44px] font-extrabold leading-none" style={{ color: 'var(--neu-ink)' }}>
              {logrados.length}<span className="text-[22px] font-semibold" style={suave}> de {resDes.length} logrados</span>
            </p>
            <p className="text-sm mt-1" style={suave}>Tiempo: {minutosYSegundos(fin - inicio)} · «Logrado» es cubrir al menos el {Math.round(UMBRAL_LOGRADO * 100)} % de los puntos clave.</p>
          </section>
          <section className="neu-raised p-5 space-y-3" aria-label="Detalle por tema">
            <h2 className="text-[17px] font-bold" style={{ color: 'var(--neu-ink)', fontFamily: 'var(--font-head)' }}>Por tema</h2>
            <ul className="space-y-3">
              {resDes.map(({ pregunta, cubiertos }) => {
                const hechos = cubiertos.filter(Boolean).length
                const falto = pregunta.puntos.filter((_, k) => !cubiertos[k])
                return (
                  <li key={pregunta.id} className="text-sm">
                    <p className="flex gap-2 items-baseline">
                      <span className="flex-1 min-w-0 font-semibold" style={{ color: 'var(--neu-ink)' }}>{pregunta.titulo}</span>
                      <span className="flex-shrink-0 font-semibold" style={{ color: hechos / pregunta.puntos.length >= UMBRAL_LOGRADO ? 'var(--texto-ok)' : 'var(--texto-mal)' }}>
                        {hechos} de {pregunta.puntos.length}
                      </span>
                    </p>
                    {falto.length > 0 && <p style={suave}>Te faltó: {falto.map((p) => p.texto).join(' · ')}</p>}
                  </li>
                )
              })}
            </ul>
          </section>
          {porReforzar.length > 0 && (
            <button onClick={repetirDesarrollo} className="boton boton-primario w-full">
              Repetir lo que no logré ({porReforzar.length})
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={() => setFase('config')} className={`boton ${porReforzar.length > 0 ? 'boton-suave' : 'boton-primario'} flex-1`}>Otro simulacro</button>
            <button onClick={onVolver} className="boton boton-suave flex-1">Volver a Práctica</button>
          </div>
        </div>
      </div>
    )
  }

  // resultado
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {cabecera('Resultado')}
        <section className="neu-raised p-5 sm:p-6 text-center" aria-label="Resultado del simulacro">
          <p className="text-[44px] font-extrabold leading-none" style={{ color: 'var(--neu-ink)' }}>
            {aciertos}<span className="text-[22px] font-semibold" style={suave}> de {preguntas.length}</span>
          </p>
          {nota !== null && (
            <p className="mt-2 text-base font-bold" style={{ color: nota >= NOTA_APROBAR ? 'var(--texto-ok)' : 'var(--texto-mal)' }}>
              Nota estimada {formatoNota(nota)} <span className="font-normal text-sm" style={suave}>con {EXIGENCIA_COMUN} % de exigencia</span>
            </p>
          )}
          <p className="text-sm mt-1" style={suave}>Tiempo: {minutosYSegundos(fin - inicio)}</p>
        </section>

        {porUnidad.length > 1 && falladas.length > 0 && (
          <section className="neu-raised p-5 space-y-2" aria-label="Dónde fallaste, por unidad">
            <h2 className="text-[17px] font-bold" style={{ color: 'var(--neu-ink)', fontFamily: 'var(--font-head)' }}>Por unidad</h2>
            <ul className="space-y-1.5">
              {porUnidad.map((u) => (
                <li key={u.id} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--neu-ink)' }}>{u.nombre}</span>
                  <span className="font-semibold flex-shrink-0" style={{ color: u.fallos === 0 ? 'var(--texto-ok)' : u.fallos / u.total >= 0.5 ? 'var(--texto-mal)' : 'var(--neu-ink2)' }}>
                    {u.total - u.fallos} de {u.total}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs" style={suave}>Empieza a repasar por la que tiene menos aciertos.</p>
          </section>
        )}

        {falladas.length > 0 ? (
          <section className="neu-raised p-5 space-y-3" aria-label="Lo que fallaste">
            <h2 className="text-[17px] font-bold" style={{ color: 'var(--neu-ink)', fontFamily: 'var(--font-head)' }}>Lo que fallaste ({falladas.length})</h2>
            <ul className="space-y-3">
              {falladas.map((p) => (
                <li key={p.id} className="text-sm">
                  <p className="font-semibold" style={{ color: 'var(--neu-ink)' }}>{p.frente}</p>
                  <p style={suave}>{p.reverso}</p>
                </li>
              ))}
            </ul>
            <button onClick={programarRepaso} disabled={programado} className="boton boton-suave w-full">
              {programado ? 'Programado: lo verás en tu repaso' : 'Mandar lo que fallé al repaso'}
            </button>
          </section>
        ) : (
          <p className="text-sm text-center font-semibold" style={{ color: 'var(--texto-ok)' }}>Sin errores. ¡Buen simulacro!</p>
        )}

        {falladas.length > 0 && (
          <button onClick={repetirFalladas} className="boton boton-primario w-full">
            Repetir solo lo que fallé ({falladas.length})
          </button>
        )}
        <div className="flex gap-2">
          <button onClick={() => setFase('config')} className={`boton ${falladas.length > 0 ? 'boton-suave' : 'boton-primario'} flex-1`}>Otro simulacro</button>
          <button onClick={onVolver} className="boton boton-suave flex-1">Volver a Práctica</button>
        </div>
      </div>
    </div>
  )
}

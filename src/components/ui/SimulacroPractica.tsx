import { SelectPrima } from './SelectPrima'
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { nombreRamo } from '../../services/tareasPlan'
import { tarjetasDe, type TarjetaRepaso } from '../../services/tarjetasApunte'
import { generarSimulacro, MIN_TARJETAS_SIMULACRO, tarjetasParaSimulacro, type PreguntaSimulacro } from '../../services/simulacro'
import { EXIGENCIA_COMUN, puntajeANota } from '../../services/puntaje'
import { formatoNota, NOTA_APROBAR } from '../../services/notas'
import { registrarUso } from '../../services/uso'

const CANTIDADES = [5, 10, 20, 30]
const LETRAS = ['A', 'B', 'C', 'D']

type Fase = 'config' | 'preguntando' | 'resultado'

const minutosYSegundos = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Simulacro: preguntas de opción múltiple armadas con los «término: definición» de tus apuntes. */
export function SimulacroPractica({ onVolver }: { onVolver: () => void }) {
  const academico = useStore((s) => s.academicoModulos)
  const ramos = useStore((s) => s.ramos)
  const registrarRepaso = useStore((s) => s.registrarRepasoTarjeta)

  const [fase, setFase] = useState<Fase>('config')
  const [seleccion, setSeleccion] = useState('todas')
  const [cantidad, setCantidad] = useState(10)
  const [preguntas, setPreguntas] = useState<PreguntaSimulacro[]>([])
  const [indice, setIndice] = useState(0)
  const [respuestas, setRespuestas] = useState<(number | null)[]>([])
  const [inicio, setInicio] = useState(0)
  const [fin, setFin] = useState(0)
  const [programado, setProgramado] = useState(false)

  // material de cada asignatura: cuántas tarjetas de término y definición hay en sus apuntes
  const opcionesRamo = useMemo(() => {
    const porRamo = Object.entries(academico).map(([id, d]) => {
      const tarjetas = (d.apuntes ?? []).flatMap((a) => tarjetasDe(a))
      return { id, nombre: nombreRamo(id, ramos) ?? id, tarjetas, n: tarjetasParaSimulacro(tarjetas).length }
    })
    return porRamo.filter((r) => r.n > 0).sort((a, b) => b.n - a.n)
  }, [academico, ramos])

  const todas = useMemo(() => opcionesRamo.flatMap((r) => r.tarjetas), [opcionesRamo])
  const material = seleccion === 'todas' ? tarjetasParaSimulacro(todas).length : (opcionesRamo.find((r) => r.id === seleccion)?.n ?? 0)
  const alcanza = material >= MIN_TARJETAS_SIMULACRO
  const cantidadReal = Math.min(cantidad, material)

  const empezar = () => {
    const fuente: TarjetaRepaso[] = seleccion === 'todas' ? todas : (opcionesRamo.find((r) => r.id === seleccion)?.tarjetas ?? [])
    const { preguntas: generadas } = generarSimulacro(fuente, cantidad)
    if (generadas.length === 0) return
    registrarUso('practica.simulacro')
    setPreguntas(generadas)
    setRespuestas(generadas.map(() => null))
    setIndice(0)
    setProgramado(false)
    setInicio(Date.now())
    setFase('preguntando')
  }

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
    }
  }

  // teclado: 1 a 4 eligen, Enter o flecha derecha avanzan, Escape sale
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (fase === 'preguntando') {
        if (e.key >= '1' && e.key <= '4') elegir(Number(e.key) - 1)
        else if ((e.key === 'Enter' || e.key === 'ArrowRight') && elegida !== null) siguiente()
        else return
        e.preventDefault()
      } else if (e.key === 'Escape') onVolver()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  })

  const aciertos = respuestas.filter((r, i) => r !== null && r === preguntas[i]?.correcta).length
  const falladas = preguntas.filter((p, i) => respuestas[i] !== p.correcta)
  const nota = puntajeANota(aciertos, preguntas.length, EXIGENCIA_COMUN)

  const programarRepaso = () => {
    for (const id of new Set(falladas.map((p) => p.tarjetaId))) registrarRepaso(id, 1)
    setProgramado(true)
  }

  const suave = { color: 'var(--neu-ink2)' }
  const cabecera = (titulo: string) => (
    <header className="flex items-center gap-3">
      <button onClick={onVolver} className="boton boton-chico boton-suave" aria-label="Volver a Práctica">
        <i className="ti ti-arrow-left" aria-hidden="true" />
      </button>
      <h1 className="titulo-pagina titulo-visible flex-1 min-w-0 truncate">{titulo}</h1>
    </header>
  )

  if (fase === 'config') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
          {cabecera('Simulacro')}
          <p className="text-sm" style={suave}>
            Preguntas de opción múltiple armadas con los «término: definición» de tus apuntes. Al terminar ves qué fallaste y puedes mandarlo al repaso.
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
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--neu-ink3)' }}>Material</span>
                <SelectPrima value={seleccion} onChange={(e) => setSeleccion(e.target.value)} className="w-full h-control px-3 rounded-control border text-sm bg-[var(--neu-bg)] border-zinc-200 text-[var(--neu-ink)]">
                  <option value="todas">Todas mis asignaturas ({tarjetasParaSimulacro(todas).length} tarjetas)</option>
                  {opcionesRamo.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} ({r.n} {r.n === 1 ? 'tarjeta' : 'tarjetas'})
                    </option>
                  ))}
                </SelectPrima>
              </label>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--neu-ink3)' }}>Preguntas</span>
                <div className="flex gap-2 flex-wrap" role="group" aria-label="Cantidad de preguntas">
                  {CANTIDADES.map((n) => (
                    <button key={n} onClick={() => setCantidad(n)} aria-pressed={cantidad === n} className={`boton ${cantidad === n ? 'boton-primario' : 'boton-suave'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                {alcanza && cantidad > material && <p className="text-xs mt-2" style={suave}>Con este material salen {cantidadReal} preguntas.</p>}
              </div>
              {!alcanza && <p className="text-sm" style={{ color: 'var(--neu-danger)' }}>Este material tiene solo {material} {material === 1 ? 'tarjeta' : 'tarjetas'}; hacen falta al menos {MIN_TARJETAS_SIMULACRO}.</p>}
              <button onClick={empezar} disabled={!alcanza} className="boton boton-primario w-full">
                Empezar simulacro
              </button>
            </section>
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
            <ul className="mt-4 space-y-2" role="group" aria-label="Opciones">
              {actual.opciones.map((o, i) => {
                const esCorrecta = i === actual.correcta
                const esElegida = i === elegida
                const mostrar = elegida !== null
                const estilo =
                  mostrar && esCorrecta
                    ? { borderColor: '#059669', background: 'rgba(5,150,105,0.12)' }
                    : mostrar && esElegida
                      ? { borderColor: '#dc2626', background: 'rgba(220,38,38,0.1)' }
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
                  <p className="text-sm font-bold" style={{ color: acerto ? '#059669' : '#dc2626' }}>{acerto ? 'Correcto' : 'Incorrecto'}</p>
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
          <p className="text-xs text-center" style={suave}>Teclas 1 a 4 para elegir · Enter para seguir</p>
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
            <p className="mt-2 text-base font-bold" style={{ color: nota >= NOTA_APROBAR ? '#059669' : '#dc2626' }}>
              Nota estimada {formatoNota(nota)} <span className="font-normal text-sm" style={suave}>con {EXIGENCIA_COMUN} % de exigencia</span>
            </p>
          )}
          <p className="text-sm mt-1" style={suave}>Tiempo: {minutosYSegundos(fin - inicio)}</p>
        </section>

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
          <p className="text-sm text-center font-semibold" style={{ color: '#059669' }}>Sin errores. ¡Buen simulacro!</p>
        )}

        <div className="flex gap-2">
          <button onClick={() => setFase('config')} className="boton boton-primario flex-1">Otro simulacro</button>
          <button onClick={onVolver} className="boton boton-suave flex-1">Volver a Práctica</button>
        </div>
      </div>
    </div>
  )
}

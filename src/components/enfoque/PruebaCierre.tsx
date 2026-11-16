import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { tarjetasDe } from '../../services/tarjetasApunte'
import { generarSimulacro, MIN_TARJETAS_SIMULACRO, tarjetasParaSimulacro, type PreguntaSimulacro } from '../../services/simulacro'
import { apuntesDeUnidades } from '../../services/temario'
import { registrarUso } from '../../services/uso'

const LETRAS = ['A', 'B', 'C', 'D']
const CANTIDAD = 3

/** Al cerrar una sesión de enfoque: tres preguntas rápidas de lo que estudiaste (la unidad, o el ramo entero si la
 *  unidad tiene poco material). Lo que falles queda en «Tus errores» del simulacro. */
export function PruebaCierre({ ramoId, unidadId }: { ramoId: string; unidadId?: string }) {
  const datos = useStore((s) => s.academicoModulos[ramoId])
  const registrarPrueba = useStore((s) => s.registrarPrueba)
  const [preguntas, setPreguntas] = useState<PreguntaSimulacro[] | null>(null)
  const [i, setI] = useState(0)
  const [respuestas, setRespuestas] = useState<(number | null)[]>([])

  const unidad = datos?.unidades?.find((u) => u.id === unidadId)
  const fuente = useMemo(() => {
    const apuntes = datos?.apuntes ?? []
    const deUnidad = unidad ? apuntesDeUnidades(apuntes, [unidad.id]).flatMap((a) => tarjetasDe(a)) : []
    if (tarjetasParaSimulacro(deUnidad).length >= MIN_TARJETAS_SIMULACRO) return { tarjetas: deUnidad, deUnidad: true }
    return { tarjetas: apuntes.flatMap((a) => tarjetasDe(a)), deUnidad: false }
  }, [datos, unidad])
  if (tarjetasParaSimulacro(fuente.tarjetas).length < MIN_TARJETAS_SIMULACRO) return null

  const empezar = () => {
    const { preguntas: p } = generarSimulacro(fuente.tarjetas, CANTIDAD)
    if (p.length === 0) return
    registrarUso('practica.simulacro')
    setPreguntas(p)
    setRespuestas(p.map(() => null))
    setI(0)
  }

  if (!preguntas) {
    return (
      <button onClick={empezar} className="boton boton-suave boton-chico w-full">
        <i className="ti ti-help-circle" aria-hidden="true" /> Ponerme a prueba: {CANTIDAD} preguntas de {fuente.deUnidad && unidad ? `«${unidad.nombre}»` : 'esta asignatura'}
      </button>
    )
  }

  const fin = i >= preguntas.length
  if (fin) {
    const bien = preguntas.filter((p, k) => respuestas[k] === p.correcta).length
    return (
      <div className="rounded-control p-3 text-sm space-y-1" style={{ background: 'var(--neu-bg)' }} aria-live="polite">
        <p className="font-bold" style={{ color: bien === preguntas.length ? 'var(--texto-ok)' : 'var(--neu-ink)' }}>
          {bien} de {preguntas.length} correctas
        </p>
        {bien < preguntas.length && <p style={{ color: 'var(--neu-ink2)' }}>Lo que fallaste quedó en «Tus errores» del simulacro.</p>}
        <button onClick={empezar} className="boton boton-fantasma boton-chico">Otras {CANTIDAD}</button>
      </div>
    )
  }

  const p = preguntas[i]
  const elegida = respuestas[i]
  const elegir = (k: number) => {
    if (elegida !== null) return
    const nuevas = respuestas.map((x, j) => (j === i ? k : x))
    setRespuestas(nuevas)
    // se anota al tiro (si cierras la calificación antes de terminar, lo respondido no se pierde)
    const q = p
    registrarPrueba([
      {
        id: q.id,
        tipo: q.tipo,
        etiqueta: q.frente,
        origen: q.tarjetaId,
        ramoId,
        ...(unidad && datos?.apuntes.find((a) => q.tarjetaId.startsWith(`${a.id}:`))?.unidadId === unidad.id ? { unidadId: unidad.id } : {}),
        ok: k === q.correcta,
      },
    ])
  }

  return (
    <div className="rounded-control p-3 space-y-2" style={{ background: 'var(--neu-bg)' }} role="group" aria-label={`Pregunta ${i + 1} de ${preguntas.length}`}>
      <p className="text-xs font-bold" style={{ color: 'var(--neu-ink3)' }}>Pregunta {i + 1} de {preguntas.length}</p>
      <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--neu-ink)' }}>{p.enunciado}</p>
      <ul className="space-y-1.5">
        {p.opciones.map((o, k) => {
          const mostrar = elegida !== null
          const estilo = mostrar && k === p.correcta ? { borderColor: 'var(--texto-ok)', background: 'rgba(5,150,105,0.12)' } : mostrar && k === elegida ? { borderColor: 'var(--texto-mal)', background: 'rgba(220,38,38,0.1)' } : undefined
          const estado = mostrar && k === p.correcta ? 'correcta' : mostrar && k === elegida ? 'tu respuesta, incorrecta' : ''
          return (
            <li key={o}>
              <button onClick={() => elegir(k)} disabled={mostrar} className="w-full text-left flex gap-2 items-start p-2 rounded-control border-2 border-transparent min-h-[40px] text-sm disabled:cursor-default" style={{ ...estilo, color: 'var(--neu-ink)', background: estilo?.background ?? 'var(--neu-card)' }}>
                <span className="font-bold flex-shrink-0" aria-hidden="true">{LETRAS[k]}</span>
                <span className="leading-snug">
                  {o}
                  {estado && <span className="ml-1 text-xs font-bold" style={{ color: k === p.correcta ? 'var(--texto-ok)' : 'var(--texto-mal)' }}>({estado})</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p aria-live="polite" className="text-sm font-bold" style={{ color: elegida === p.correcta ? 'var(--texto-ok)' : 'var(--texto-mal)' }}>
        {elegida === null ? '' : elegida === p.correcta ? 'Correcto' : 'Incorrecto'}
      </p>
      {elegida !== null && (
        <button autoFocus onClick={() => setI(i + 1)} className="boton boton-primario boton-chico w-full">
          {i + 1 < preguntas.length ? 'Siguiente' : 'Ver resultado'}
        </button>
      )}
    </div>
  )
}

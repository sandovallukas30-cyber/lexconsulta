import { useEffect, useState } from 'react'

const FASES: [string, number][] = [
  ['Inhala', 4],
  ['Sostén', 4],
  ['Exhala', 6],
]
const CICLO = FASES.reduce((s, [, n]) => s + n, 0)

/** Círculo que guía la respiración (4 segundos inhalando, 4 sosteniendo, 6 soltando). */
export function Respiracion({ compacta = false }: { compacta?: boolean }) {
  const [activa, setActiva] = useState(false)
  const [t, setT] = useState(0)
  const [ciclos, setCiclos] = useState(0)

  useEffect(() => {
    if (!activa) return
    const id = window.setInterval(
      () =>
        setT((x) => {
          const n = x + 1
          if (n >= CICLO) {
            setCiclos((c) => c + 1)
            return 0
          }
          return n
        }),
      1000
    )
    return () => window.clearInterval(id)
  }, [activa])

  let acum = 0
  let fase = FASES[0]
  let restante = 0
  for (const f of FASES) {
    if (t < acum + f[1]) {
      fase = f
      restante = acum + f[1] - t
      break
    }
    acum += f[1]
  }
  const escala = !activa ? 0.55 : fase[0] === 'Exhala' ? 0.55 : 1

  return (
    <div className={`enf-resp${compacta ? ' enf-resp-compacta' : ''}`}>
      <div className="enf-resp-circulo" aria-hidden="true" style={{ transform: `scale(${escala})`, transitionDuration: activa ? `${fase[1]}s` : '.4s' }} />
      <div className="enf-resp-texto" aria-live="polite">
        {activa ? (
          <>
            <b>{fase[0]}</b>
            <span>{restante}</span>
          </>
        ) : (
          <b>Respira un momento</b>
        )}
      </div>
      <button
        type="button"
        className="boton boton-suave boton-chico"
        onClick={() => {
          setActiva((a) => !a)
          setT(0)
        }}
      >
        {activa ? 'Terminar' : 'Empezar'}
      </button>
      {activa && ciclos > 0 && (
        <div className="enf-resp-ciclos">
          {ciclos} {ciclos === 1 ? 'ciclo' : 'ciclos'}
        </div>
      )}
    </div>
  )
}

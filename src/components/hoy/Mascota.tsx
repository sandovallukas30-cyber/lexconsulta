import { useEffect, useMemo, useState } from 'react'
import { useAjustes, prefiereMenosMovimiento } from '../../store/useAjustes'
import { useSituacionMascota } from '../../hooks/useSituacionMascota'
import { hoyISO } from '../../services/tareasPlan'
import { animoDe, fraseMascota, mascotaSvg, situacionDe } from '../../services/mascota'

/** El dibujo de la mascota (SVG propio de services/mascota.ts, sin datos del usuario). */
export function DibujoMascota({ svg, className, style }: { svg: string; className?: string; style?: React.CSSProperties }) {
  return <div className={className} style={style} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
}

/** Mascota de Hoy: se ve según cómo va tu día, dice algo y se deja acariciar. */
export function Mascota() {
  const a = useAjustes()
  const datos = useSituacionMascota()
  const [caricias, setCaricias] = useState(0)
  const [corazones, setCorazones] = useState(0)
  const situacion = situacionDe(datos)
  const acariciada = caricias > 0 && corazones > 0
  const animo = acariciada ? 'feliz' : animoDe(situacion)
  const svg = useMemo(() => mascotaSvg({ tipo: a.mascotaTipo, color: a.mascotaColor, accesorio: a.mascotaAccesorio, animo }), [a.mascotaTipo, a.mascotaColor, a.mascotaAccesorio, animo])
  // la frase se mantiene durante unas horas; cada caricia la cambia
  const semilla = `${hoyISO()}-${Math.floor(datos.hora / 3)}-${caricias}`
  const frase = acariciada
    ? ['¡Ay, qué rico!', 'Me encanta. Gracias por el cariño.', 'Prrr… digo, ¡guau! digo… ¡hu-hu!'][caricias % 3]
    : fraseMascota(situacion, datos, a.mascotaNombre, semilla)

  // el cariño dura un ratito
  useEffect(() => {
    if (corazones === 0) return
    const id = window.setTimeout(() => setCorazones(0), 2200)
    return () => window.clearTimeout(id)
  }, [corazones])

  if (!a.mascotaActiva) return null
  const quieta = prefiereMenosMovimiento() || !a.animaciones
  return (
    <div className="flex items-end gap-2 sm:gap-3 max-w-full">
      <p
        className="relative hidden sm:block max-w-[250px] text-[13px] font-semibold leading-snug rounded-2xl px-4 py-2.5 mb-5"
        style={{ background: 'var(--neu-card)', boxShadow: 'var(--neu-plana)', color: 'var(--neu-ink)' }}
        aria-live="polite"
      >
        {frase}
        <span
          aria-hidden="true"
          className="absolute -right-1.5 bottom-3 w-3 h-3 rotate-45"
          style={{ background: 'var(--neu-card)', boxShadow: '2px -2px 3px var(--neu-sd)' }}
        />
      </p>
      <button
        onClick={() => {
          setCaricias((n) => n + 1)
          setCorazones((n) => n + 1)
        }}
        title={`${a.mascotaNombre}: ${frase}`}
        aria-label={`Acariciar a ${a.mascotaNombre}. ${frase}`}
        className="sin-neu sin-tactil relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full"
        style={{ background: 'var(--neu-card)', boxShadow: 'var(--neu-plana)' }}
      >
        <DibujoMascota svg={svg} className={`w-full h-full p-1.5 ${quieta ? '' : 'mascota-flota'}`} />
        {acariciada && (
          <span aria-hidden="true" className="absolute inset-0 pointer-events-none">
            {[0, 1, 2].map((i) => (
              <span key={i} className="absolute mascota-corazon text-base" style={{ left: `${22 + i * 22}%`, top: 4, color: '#ef6b86', animationDelay: `${i * 140}ms` }}>♥</span>
            ))}
          </span>
        )}
      </button>
    </div>
  )
}

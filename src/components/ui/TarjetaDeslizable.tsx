import type { ReactNode } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { prefiereMenosMovimiento } from '../../store/useAjustes'

export type DireccionTarjeta = 'izquierda' | 'derecha' | 'arriba'

interface Etiqueta {
  texto: string
  /** color del sello que aparece sobre la tarjeta mientras se arrastra */
  color: string
}

interface Props {
  children: ReactNode
  /** Mientras sea false la tarjeta no se arrastra (p. ej. antes de voltearla). */
  habilitada: boolean
  etiquetas: Partial<Record<DireccionTarjeta, Etiqueta>>
  /** 'x' deja libre el scroll vertical (tarjetas con texto largo); 'xy' permite también subir. */
  ejes?: 'x' | 'xy'
  onResponder: (dir: DireccionTarjeta) => void
  className?: string
}

const UMBRAL = 110

function vibrar() {
  try {
    navigator.vibrate?.(12)
  } catch {
    /* sin vibración */
  }
}

/** Tarjeta que se arrastra con el dedo (o el mouse), se inclina y muestra un sello de color según hacia dónde
 *  va. Al soltarla pasado el umbral, sale volando y avisa con `onResponder`; si no, vuelve a su lugar.
 *  Se monta con `key` distinta por tarjeta, así cada una nace centrada. */
export function TarjetaDeslizable({ children, habilitada, etiquetas, ejes = 'xy', onResponder, className }: Props) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotar = useTransform(x, [-220, 0, 220], [-10, 0, 10])
  const opIzq = useTransform(x, [-UMBRAL, -30, 0], [1, 0.25, 0])
  const opDer = useTransform(x, [0, 30, UMBRAL], [0, 0.25, 1])
  const opArriba = useTransform(y, [-UMBRAL, -30, 0], [1, 0.25, 0])

  const soltar = (dx: number, dy: number, vx: number, vy: number) => {
    let dir: DireccionTarjeta | null = null
    const vertical = Math.abs(dy) > Math.abs(dx)
    if (vertical && (dy < -UMBRAL || vy < -700) && etiquetas.arriba) dir = 'arriba'
    else if (!vertical && (dx > UMBRAL || vx > 700) && etiquetas.derecha) dir = 'derecha'
    else if (!vertical && (dx < -UMBRAL || vx < -700) && etiquetas.izquierda) dir = 'izquierda'

    if (!dir) {
      animate(x, 0, { type: 'spring', stiffness: 420, damping: 32 })
      animate(y, 0, { type: 'spring', stiffness: 420, damping: 32 })
      return
    }
    vibrar()
    const sale = prefiereMenosMovimiento() ? 0 : 0.16
    const destino = typeof window !== 'undefined' ? Math.max(window.innerWidth, 500) : 700
    const fin = () => onResponder(dir)
    if (dir === 'arriba') animate(y, -destino, { duration: sale, onComplete: fin })
    else animate(x, (dir === 'derecha' ? 1 : -1) * destino, { duration: sale, onComplete: fin })
  }

  const sello = (dir: DireccionTarjeta, op: typeof opIzq, posicion: string) => {
    const e = etiquetas[dir]
    if (!e) return null
    return (
      <motion.span
        aria-hidden="true"
        className={`pointer-events-none absolute z-10 px-3 py-1 rounded-lg border-2 text-sm font-extrabold uppercase tracking-wider bg-white/85 ${posicion}`}
        style={{ opacity: op, color: e.color, borderColor: e.color }}
      >
        {e.texto}
      </motion.span>
    )
  }

  return (
    <motion.div
      drag={habilitada ? (ejes === 'x' ? 'x' : true) : false}
      dragSnapToOrigin={false}
      dragMomentum={false}
      dragElastic={0.9}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragDirectionLock={ejes === 'x'}
      style={{ x, y, rotate: rotar, touchAction: habilitada && ejes === 'xy' ? 'none' : undefined }}
      onDragEnd={(_, info) => soltar(info.offset.x, info.offset.y, info.velocity.x, info.velocity.y)}
      className={`relative ${habilitada ? 'cursor-grab active:cursor-grabbing' : ''} ${className ?? ''}`}
    >
      {sello('izquierda', opIzq, 'top-4 right-4 rotate-6')}
      {sello('derecha', opDer, 'top-4 left-4 -rotate-6')}
      {sello('arriba', opArriba, 'bottom-4 left-1/2 -translate-x-1/2')}
      {children}
    </motion.div>
  )
}

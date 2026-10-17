import { useAjustes, prefiereMenosMovimiento } from '../store/useAjustes'

/** Pequeño estallido de confeti al cumplir una tarea o terminar un enfoque
 *  (de los efectos de Orbis). Respeta los ajustes y «reducir movimiento».
 *  Se dibuja en <body>, no bloquea clics y se elimina solo. */

const COLORES = ['#5457e0', '#ff7a59', '#1f9d61', '#d98a1a', '#e4504f', '#8689ff']
const MAX_VIVAS = 120
let vivas = 0

export function celebrar(origen?: Element | null, grande = false) {
  const a = useAjustes.getState()
  if (!a.celebraciones || !a.animaciones || prefiereMenosMovimiento() || typeof document === 'undefined') return
  const cantidad = grande ? 34 : 14
  if (vivas + cantidad > MAX_VIVAS) return

  const zoom = a.zoom || 1
  const r = origen?.getBoundingClientRect()
  // el zoom de la página escala las coordenadas: se convierten a unidades de página
  const x = ((r ? r.left + r.width / 2 : window.innerWidth / 2) / zoom)
  const y = ((r ? r.top + r.height / 2 : window.innerHeight / 3) / zoom)

  for (let i = 0; i < cantidad; i++) {
    const p = document.createElement('i')
    const ang = Math.random() * Math.PI * 2
    const dist = (grande ? 90 : 55) + Math.random() * (grande ? 120 : 60)
    const dx = Math.cos(ang) * dist
    const dy = Math.sin(ang) * dist - 30
    const t = 700 + Math.random() * 500
    Object.assign(p.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: `${5 + Math.random() * 4}px`,
      height: `${7 + Math.random() * 5}px`,
      borderRadius: '2px',
      background: COLORES[i % COLORES.length],
      pointerEvents: 'none',
      zIndex: '2147483000',
      transform: 'translate(-50%, -50%)',
      transition: `transform ${t}ms cubic-bezier(.2,.7,.3,1), opacity ${t}ms ease-in`,
      opacity: '1',
    })
    document.body.appendChild(p)
    vivas++
    requestAnimationFrame(() => {
      p.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 60}px)) rotate(${Math.random() * 540 - 270}deg)`
      p.style.opacity = '0'
    })
    const quitar = () => {
      if (p.isConnected) {
        p.remove()
        vivas--
      }
    }
    window.setTimeout(quitar, t + 80)
  }
}

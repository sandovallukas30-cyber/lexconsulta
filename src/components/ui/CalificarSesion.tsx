import { useState } from 'react'
import { useEnfoque } from '../../store/useEnfoque'

const TEXTO = ['', 'Costó mucho', 'Algo disperso', 'Normal', 'Buen enfoque', 'Concentración total']

/** Calificación de 1 a 5 estrellas. Sin `onChange` es solo de lectura. */
export function Estrellas({ valor, onChange, tamano = 22 }: { valor: number; onChange?: (n: number) => void; tamano?: number }) {
  // el set de íconos Tabler que se carga no trae estrellas rellenas: se usa el carácter ★
  const icono = () => (
    <span aria-hidden="true" style={{ fontSize: tamano, lineHeight: 1 }}>★</span>
  )
  // Solo lectura: spans (puede ir dentro de un botón, como en el historial)
  if (!onChange) {
    return (
      <span className="inline-flex gap-0.5" role="img" aria-label={`Concentración: ${valor} de 5`} style={{ color: '#f2b53c' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{ opacity: n <= valor ? 1 : 0.3 }}>{icono()}</span>
        ))}
      </span>
    )
  }
  return (
    <div className="inline-flex gap-1" role="radiogroup" aria-label={`Concentración: ${valor} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={`${n} de 5`}
          onClick={() => onChange(n)}
          className="sin-neu sin-tactil p-0.5 transition-transform hover:scale-110"
          style={{ color: n <= valor ? '#f2b53c' : 'var(--neu-ink3)' }}
        >
          {icono()}
        </button>
      ))}
    </div>
  )
}

/** Aparece al guardar una sesión: ¿cómo te fue? Alimenta los patrones de Estadísticas. */
export function CalificarSesion() {
  const calificar = useEnfoque((s) => s.calificar)
  const calificarSesion = useEnfoque((s) => s.calificarSesion)
  const omitir = useEnfoque((s) => s.omitirCalificacion)
  const [valor, setValor] = useState(0)
  const [nota, setNota] = useState('')
  if (!calificar) return null
  const reiniciar = () => {
    setValor(0)
    setNota('')
  }
  return (
    <div className="neu-flat p-4 space-y-2.5" role="group" aria-label="Calificar la sesión">
      <p className="text-sm font-bold" style={{ color: 'var(--neu-ink)' }}>
        Guardé {calificar.minutos} min de enfoque. ¿Cómo te fue?
      </p>
      <Estrellas valor={valor} onChange={setValor} />
      <p className="text-xs min-h-[18px]" style={{ color: 'var(--neu-ink2)' }}>{TEXTO[valor] ?? ''}</p>
      <input
        value={nota}
        maxLength={200}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Una nota (opcional)"
        aria-label="Nota de la sesión"
        className="w-full h-9 px-3 text-sm outline-none"
      />
      <div className="flex gap-2 justify-end">
        <button className="boton boton-fantasma boton-chico" onClick={() => { omitir(); reiniciar() }}>Omitir</button>
        <button className="boton boton-primario boton-chico" disabled={valor === 0} onClick={() => { calificarSesion(valor, nota); reiniciar() }}>Guardar</button>
      </div>
    </div>
  )
}

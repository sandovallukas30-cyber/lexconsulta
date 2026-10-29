import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { claveNotaArticulo, MAX_NOTA_ARTICULO } from '../../services/notasArticulo'
import { registrarUso } from '../../services/uso'

/** «Mi nota» pegada a un artículo del Explorador: aparece cada vez que lo abres.
 *  Se guarda sola poco después de dejar de escribir. Va con una `key` por artículo. */
export function NotaArticulo({ codigo, articulo, modoOscuro }: { codigo: string; articulo: string; modoOscuro: boolean }) {
  const clave = claveNotaArticulo(codigo, articulo)
  const guardada = useStore((s) => s.notasArticulo[clave])
  const guardar = useStore((s) => s.guardarNotaPropia)
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(guardada?.texto ?? '')
  const pendiente = useRef<number | undefined>(undefined)
  const ultimo = useRef(texto)

  const confirmar = (t: string) => {
    window.clearTimeout(pendiente.current)
    if (t === (useStore.getState().notasArticulo[clave]?.texto ?? '')) return
    guardar(clave, t)
    if (t.trim()) registrarUso('explorador.nota')
  }
  const cambiar = (t: string) => {
    const corto = t.slice(0, MAX_NOTA_ARTICULO)
    setTexto(corto)
    ultimo.current = corto
    window.clearTimeout(pendiente.current)
    pendiente.current = window.setTimeout(() => confirmar(corto), 700)
  }
  // al salir del artículo (o cerrar la pestaña) se guarda lo último escrito
  useEffect(
    () => () => {
      window.clearTimeout(pendiente.current)
      if (ultimo.current !== (useStore.getState().notasArticulo[clave]?.texto ?? '')) useStore.getState().guardarNotaPropia(clave, ultimo.current)
    },
    [clave]
  )

  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  const hay = texto.trim().length > 0

  if (!editando && !hay) {
    return (
      <div className="mt-6">
        <button onClick={() => setEditando(true)} className="boton boton-chico boton-suave">
          <i className="ti ti-note" aria-hidden="true" /> Agregar mi nota
        </button>
      </div>
    )
  }
  return (
    <section
      className={`mt-6 rounded-control border p-3 ${modoOscuro ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/60 border-amber-200/70'}`}
      aria-label={`Mi nota sobre ${articulo}`}
    >
      <label className="block">
        <span className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${modoOscuro ? 'text-amber-300' : 'text-amber-800'}`}>
          <i className="ti ti-note" aria-hidden="true" /> Mi nota
        </span>
        <textarea
          value={texto}
          autoFocus={editando && !hay}
          onChange={(e) => cambiar(e.target.value)}
          onBlur={() => {
            confirmar(ultimo.current)
            if (!ultimo.current.trim()) setEditando(false)
          }}
          rows={Math.min(8, Math.max(3, texto.split('\n').length + 1))}
          maxLength={MAX_NOTA_ARTICULO}
          placeholder="Qué dice, cómo se aplica, un ejemplo, qué preguntó el profesor…"
          className={`w-full resize-y rounded-md px-2.5 py-2 text-[15px] leading-relaxed outline-none campo-foco border ${
            modoOscuro ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
          }`}
        />
      </label>
      <p className={`text-[11px] mt-1 ${suave}`}>Se guarda sola y viaja con tu cuenta. Solo la ves tú.</p>
    </section>
  )
}

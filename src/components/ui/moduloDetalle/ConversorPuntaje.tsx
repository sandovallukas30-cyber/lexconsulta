import { useState } from 'react'
import { formatoNota, NOTA_APROBAR } from '../../../services/notas'
import { EXIGENCIA_COMUN, puntajeANota, puntajeParaNota } from '../../../services/puntaje'

const numero = (v: string): number => (v.trim() === '' ? Number.NaN : Number(v.replace(',', '.')))

/** «Puntaje → nota»: cuando la prueba se corrige en puntos y la nota sale con exigencia (60 % lo más común). */
export function ConversorPuntaje({ modoOscuro }: { modoOscuro: boolean }) {
  const [maximo, setMaximo] = useState('')
  const [obtenido, setObtenido] = useState('')
  const [exigencia, setExigencia] = useState(String(EXIGENCIA_COMUN))
  const max = numero(maximo)
  const exi = numero(exigencia)
  const nota = puntajeANota(numero(obtenido), max, exi)
  const paraCuatro = puntajeParaNota(NOTA_APROBAR, max, exi)
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  const campo = `w-full rounded-control px-2 py-1.5 text-sm text-center border outline-none campo-foco ${
    modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
  }`
  const redondeo = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')

  return (
    <div className={`p-4 rounded-tarjeta border mt-3 ${modoOscuro ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
      <span className={`text-xs font-semibold ${modoOscuro ? 'text-zinc-300' : 'text-zinc-600'}`}>Convertir puntaje a nota</span>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {[
          { id: 'max', etiqueta: 'Puntaje total', valor: maximo, cambiar: setMaximo, marca: 'p. ej. 60' },
          { id: 'obt', etiqueta: 'Tus puntos', valor: obtenido, cambiar: setObtenido, marca: 'p. ej. 41' },
          { id: 'exi', etiqueta: 'Exigencia %', valor: exigencia, cambiar: setExigencia, marca: '60' },
        ].map((c) => (
          <label key={c.id} className="min-w-0">
            <span className={`block text-[11px] mb-1 ${suave}`}>{c.etiqueta}</span>
            <input type="number" inputMode="decimal" min={0} step="any" value={c.valor} placeholder={c.marca} onChange={(e) => c.cambiar(e.target.value)} className={campo} />
          </label>
        ))}
      </div>
      <p className={`text-sm mt-3 font-medium ${modoOscuro ? 'text-white' : 'text-zinc-900'}`} aria-live="polite">
        {nota !== null ? (
          <>
            Tu nota: <span className={nota >= NOTA_APROBAR ? 'text-emerald-600' : 'text-red-600'}>{formatoNota(nota)}</span>
            {paraCuatro !== null && <span className={`font-normal text-xs ${suave}`}> · el 4,0 se saca con {redondeo(paraCuatro)} puntos</span>}
          </>
        ) : paraCuatro !== null ? (
          <span className={`font-normal text-xs ${suave}`}>El 4,0 se saca con {redondeo(paraCuatro)} de {redondeo(max)} puntos. Escribe tus puntos y ves la nota.</span>
        ) : (
          <span className={`font-normal text-xs ${suave}`}>Escribe el puntaje total y tus puntos: con la exigencia indicada, el 4,0 queda en ese porcentaje.</span>
        )}
      </p>
    </div>
  )
}

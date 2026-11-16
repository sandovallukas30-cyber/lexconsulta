import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialogo } from '../../hooks/useDialogo'
import { useStore } from '../../store/useStore'
import { obtenerCodigo, precargar } from '../../services/codigos'
import { nombreCortoMetadata } from '../../data/codigosMetadata'
import { contarPropias, marcarDiferencias, normalizarNumeroArticulo, type TrozoComparado } from '../../services/compararArticulos'
import { registrarUso } from '../../services/uso'
import { SelectPrima } from './SelectPrima'
import type { CodigoTipo } from '../../types'

/** Dos artículos lado a lado (del mismo código o de otro), con lo que cada uno tiene y el otro no marcado en color:
 *  pensado para las preguntas de «compare y distinga». */
export function CompararArticulos({ codigo, articulo, onCerrar }: { codigo: CodigoTipo; articulo: string; onCerrar: () => void }) {
  const ref = useDialogo<HTMLDivElement>(true, onCerrar)
  const codigos = useStore((s) => s.codigos)
  const [codigoDer, setCodigoDer] = useState<CodigoTipo>(codigo)
  const [, forzar] = useState(0)
  const [marcar, setMarcar] = useState(true)
  useEffect(() => registrarUso('explorador.comparar'), [])

  // por defecto, el artículo siguiente del mismo código (lo más común: 52 vs 53)
  const [entrada, setEntrada] = useState(() => {
    const lista = obtenerCodigo(codigo)?.articulos ?? []
    const i = lista.findIndex((a) => a.a === articulo)
    return (lista[i + 1]?.a ?? '').replace(/^Art\.\s*/, '')
  })

  useEffect(() => {
    if (!obtenerCodigo(codigoDer)) void precargar([codigoDer]).then(() => forzar((n) => n + 1))
  }, [codigoDer])

  const izq = obtenerCodigo(codigo)?.articulos.find((a) => a.a === articulo)
  const buscado = normalizarNumeroArticulo(entrada)
  const listaDer = obtenerCodigo(codigoDer)?.articulos
  const der = buscado ? listaDer?.find((a) => a.a.toLowerCase() === buscado.toLowerCase()) : undefined

  const trozos = useMemo(() => {
    if (!izq || !der) return null
    return { izq: marcarDiferencias(izq.t, der.t), der: marcarDiferencias(der.t, izq.t) }
  }, [izq, der])

  const opcionesCodigo = codigos.filter((c) => c.activo && !c.bloqueado)
  const suave = { color: 'var(--neu-ink2)' }

  // se llama como función (no como <Columna/>) para no volver a montarla en cada cambio
  const columna = ({ cod, art, texto, lista }: { cod: CodigoTipo; art: string; texto: string; lista: TrozoComparado[] | null }) => (
    <section className="min-w-0 rounded-control p-3 sm:p-4 flex flex-col" style={{ background: 'var(--neu-bg)' }} aria-label={`${art} de ${nombreCortoMetadata(cod)}`}>
      <p className="text-sm font-bold" style={{ color: 'var(--accent-texto)' }}>
        {art} <span className="font-semibold" style={suave}>· {nombreCortoMetadata(cod)}</span>
      </p>
      {lista && marcar && <p className="text-[11px] mt-0.5" style={suave}>{contarPropias(lista)} palabras clave que el otro no tiene</p>}
      <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line font-serif overflow-y-auto" style={{ color: 'var(--neu-ink)' }}>
        {lista && marcar
          ? lista.map((t, i) =>
              t.propio ? (
                <mark key={i} className="rounded px-0.5" style={{ background: 'rgba(245,158,11,0.3)', color: 'inherit' }}>
                  {t.texto}
                </mark>
              ) : (
                <span key={i}>{t.texto}</span>
              ),
            )
          : texto}
      </p>
    </section>
  )

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onCerrar}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparar-titulo"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-5xl max-h-[94dvh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl"
        style={{ background: 'var(--neu-card)', color: 'var(--neu-ink)' }}
      >
        <header className="flex flex-wrap items-end gap-3 p-4 sm:p-5 border-b" style={{ borderColor: 'var(--neu-line)' }}>
          <div className="flex-1 min-w-[180px]">
            <h2 id="comparar-titulo" className="text-lg font-bold" style={{ fontFamily: 'var(--font-head)' }}>Comparar artículos</h2>
            <p className="text-xs" style={suave}>{articulo} con otro artículo, del mismo código o de otro.</p>
          </div>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--neu-ink3)' }}>Código</span>
            <SelectPrima value={codigoDer} onChange={(e) => setCodigoDer(e.target.value as CodigoTipo)} className="h-control px-3 rounded-control border text-sm bg-[var(--neu-bg)] border-zinc-200 text-[var(--neu-ink)] max-w-[220px]">
              {opcionesCodigo.map((c) => (
                <option key={c.tipo} value={c.tipo}>{c.nombreCorto}</option>
              ))}
            </SelectPrima>
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--neu-ink3)' }}>Artículo</span>
            <input
              data-autofocus
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              inputMode="text"
              placeholder="Ej: 53"
              aria-label="Número del artículo a comparar"
              className="w-24 h-control px-3 rounded-control border text-sm outline-none campo-foco bg-[var(--neu-bg)] border-zinc-200 text-[var(--neu-ink)]"
            />
          </label>
          <button onClick={() => setMarcar((v) => !v)} aria-pressed={marcar} className={`boton ${marcar ? 'boton-primario' : 'boton-suave'}`} title="Marca en cada artículo las palabras clave que el otro no tiene">
            <i className="ti ti-highlight" aria-hidden="true" /> Diferencias
          </button>
          <button onClick={onCerrar} className="boton boton-fantasma boton-icono" aria-label="Cerrar">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 grid gap-3 md:grid-cols-2">
          {izq ? columna({ cod: codigo, art: izq.a, texto: izq.t, lista: trozos?.izq ?? null }) : <p style={suave}>No encontré {articulo}.</p>}
          {der ? (
            columna({ cod: codigoDer, art: der.a, texto: der.t, lista: trozos?.der ?? null })
          ) : (
            <p className="text-sm p-3" style={suave}>
              {!listaDer ? 'Cargando el código…' : entrada.trim() ? `No encontré ese artículo en ${nombreCortoMetadata(codigoDer)}. Escribe solo el número, por ejemplo 53 o 1 bis.` : 'Escribe el número del artículo que quieres comparar.'}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

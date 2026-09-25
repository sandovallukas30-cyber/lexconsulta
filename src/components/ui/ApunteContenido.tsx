import { createContext, useContext, type ReactNode } from 'react'
import { partirInline, type Bloque, type ItemLista } from '../../services/apunteFormato'

export type TemaApunte = 'claro' | 'oscuro' | 'papel'

type VarianteCita = 'amber' | 'rose' | 'orange' | 'zinc'

interface Paleta {
  rojo: string
  amarillo: string
  borde: string
  cabecera: string
  cita: Record<VarianteCita, string>
}

const PALETAS: Record<TemaApunte, Paleta> = {
  claro: {
    rojo: 'text-red-600',
    amarillo: 'bg-yellow-200/80',
    borde: 'border-zinc-300',
    cabecera: 'bg-zinc-100',
    cita: {
      amber: 'bg-amber-50 border-amber-200',
      rose: 'bg-rose-50 border-rose-200',
      orange: 'bg-orange-50 border-orange-200',
      zinc: 'bg-zinc-100 border-zinc-200',
    },
  },
  oscuro: {
    rojo: 'text-red-400',
    amarillo: 'bg-yellow-400/25',
    borde: 'border-zinc-700',
    cabecera: 'bg-zinc-800',
    cita: {
      amber: 'bg-amber-400/10 border-amber-400/25',
      rose: 'bg-rose-400/10 border-rose-400/25',
      orange: 'bg-orange-400/10 border-orange-400/25',
      zinc: 'bg-zinc-800 border-zinc-700',
    },
  },
  papel: {
    rojo: 'text-red-700',
    amarillo: 'bg-yellow-300/60',
    borde: 'border-[#d9c79a]',
    cabecera: 'bg-[#ecdfc0]',
    cita: {
      amber: 'bg-[#efe1bb] border-[#dcc891]',
      rose: 'bg-[#f1d9cc] border-[#e2bfae]',
      orange: 'bg-[#f0dcc0] border-[#e0c39a]',
      zinc: 'bg-[#ecdfc0] border-[#d9c79a]',
    },
  },
}

const Contexto = createContext<{ paleta: Paleta; idBase: string }>({ paleta: PALETAS.claro, idBase: 'ap' })

function varianteDeIcono(icono: string): VarianteCita {
  if (icono.startsWith('⚠')) return 'orange'
  if (icono.startsWith('🎯')) return 'rose'
  if (icono.startsWith('⚖') || icono.startsWith('📌') || icono.startsWith('📷') || icono.startsWith('🔗')) return 'zinc'
  return 'amber'
}

function renderInline(texto: string, paleta: Paleta, clave = ''): ReactNode[] {
  return partirInline(texto).map((tr, i) => {
    if (!tr.tipo) return tr.texto
    const k = `${clave}${i}`
    const hijos = renderInline(tr.texto, paleta, `${k}.`)
    switch (tr.tipo) {
      case 'negrita':
        return <strong key={k}>{hijos}</strong>
      case 'subrayado':
        return <u key={k}>{hijos}</u>
      case 'cursiva':
        return <em key={k}>{hijos}</em>
      case 'rojo':
        return (
          <span key={k} className={`${paleta.rojo} font-semibold`}>
            {hijos}
          </span>
        )
      case 'amarillo':
        return (
          <mark key={k} className={`${paleta.amarillo} text-inherit rounded-[3px] box-decoration-clone`}>
            {hijos}
          </mark>
        )
    }
  })
}

function Inline({ texto }: { texto: string }) {
  const { paleta } = useContext(Contexto)
  return <>{renderInline(texto, paleta)}</>
}

type Modo = 'normal' | 'cita' | 'item'

const MARCAS_VINETA = ['•', '◦', '▪']

function ListaView({ items, depth, modo }: { items: ItemLista[]; depth: number; modo: Modo }) {
  const margen = modo === 'item' ? 'mt-1.5' : modo === 'cita' ? 'mb-2 last:mb-0' : 'mb-4'
  return (
    <div role="list" className={`${margen} space-y-1.5`}>
      {items.map((it, i) => (
        <div role="listitem" key={i} className="flex gap-2">
          <span aria-hidden className="flex-shrink-0 min-w-[1.4em] text-right select-none tabular-nums">
            {it.marca === 'vineta' ? MARCAS_VINETA[depth % 3] : it.marca}
          </span>
          <div className="min-w-0 flex-1">
            {it.texto && (
              <div className="whitespace-pre-wrap leading-relaxed">
                <Inline texto={it.texto} />
              </div>
            )}
            <Bloques bloques={it.hijos} modo="item" depth={depth + 1} />
          </div>
        </div>
      ))}
    </div>
  )
}

function BloqueView({ b, modo, depth }: { b: Bloque; modo: Modo; depth: number }) {
  const { paleta, idBase } = useContext(Contexto)
  switch (b.t) {
    case 'h': {
      const id = `${idBase}-${b.id}`
      if (b.n === 1) {
        return (
          <h2 id={id} className="scroll-mt-4 font-serif font-bold leading-tight mt-[1.6em] mb-[0.6em] text-[1.6em] first:mt-0">
            <Inline texto={b.texto} />
          </h2>
        )
      }
      if (b.n === 2) {
        return (
          <h3 id={id} className={`scroll-mt-4 font-serif font-bold leading-snug mt-[1.5em] mb-[0.5em] pb-1 text-[1.35em] border-b ${paleta.borde} first:mt-0`}>
            <Inline texto={b.texto} />
          </h3>
        )
      }
      return (
        <h4 id={id} className="scroll-mt-4 font-serif font-bold leading-snug mt-[1.2em] mb-[0.4em] text-[1.12em] first:mt-0">
          <Inline texto={b.texto} />
        </h4>
      )
    }
    case 'hr':
      return <hr className={`my-6 border-t ${paleta.borde}`} />
    case 'p': {
      const margen = modo === 'item' ? 'mt-1.5' : modo === 'cita' ? 'mb-2 last:mb-0' : 'mb-4'
      return (
        <p className={`whitespace-pre-wrap leading-relaxed ${margen}`} style={b.sangria > 0 ? { marginLeft: `${b.sangria * 1.25}em` } : undefined}>
          <Inline texto={b.texto} />
        </p>
      )
    }
    case 'lista':
      return <ListaView items={b.items} depth={depth} modo={modo} />
    case 'cita':
      return (
        <div className={`flex gap-3 rounded-xl border px-4 py-3 mb-4 ${paleta.cita[varianteDeIcono(b.icono)]}`}>
          {b.icono && (
            <span aria-hidden className="flex-shrink-0 text-[1.2em] leading-snug" style={{ fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif' }}>
              {b.icono}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <Bloques bloques={b.hijos} modo="cita" depth={0} />
          </div>
        </div>
      )
    case 'cols':
      return (
        <div className="grid gap-x-8 gap-y-4 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))' }}>
          {b.cols.map((c, i) => (
            <div key={i} className="min-w-0 [&>*:first-child]:!mt-0">
              <Bloques bloques={c} modo="normal" depth={0} />
            </div>
          ))}
        </div>
      )
    case 'tabla': {
      const cuerpo = b.encabezado ? b.filas.slice(1) : b.filas
      return (
        <div className={`overflow-x-auto mb-4 rounded-lg border ${paleta.borde}`}>
          <table className="w-full border-collapse text-[0.92em]">
            {b.encabezado && (
              <thead>
                <tr>
                  {b.filas[0].map((c, i) => (
                    <th key={i} className={`${paleta.cabecera} text-left font-semibold px-3 py-2 align-top`}>
                      <Inline texto={c} />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {cuerpo.map((fila, r) => (
                <tr key={r}>
                  {fila.map((c, i) => (
                    <td key={i} className={`px-3 py-2 align-top border-t ${paleta.borde}`}>
                      <Inline texto={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }
}

function Bloques({ bloques, modo, depth }: { bloques: Bloque[]; modo: Modo; depth: number }) {
  return (
    <>
      {bloques.map((b, i) => (
        <BloqueView key={i} b={b} modo={modo} depth={depth} />
      ))}
    </>
  )
}

/** Dibuja un apunte ya parseado (ver services/apunteFormato.ts). El color de
 *  texto y el tamaño de letra los pone quien lo envuelve; acá solo se
 *  decide la paleta de los elementos con color propio (rojo, resaltado,
 *  recuadros, tablas). `idBase` prefija los ids de los títulos para poder
 *  saltar a ellos desde el índice. */
export function ApunteContenido({ bloques, tema, idBase = 'ap' }: { bloques: Bloque[]; tema: TemaApunte; idBase?: string }) {
  return (
    <Contexto.Provider value={{ paleta: PALETAS[tema], idBase }}>
      <Bloques bloques={bloques} modo="normal" depth={0} />
    </Contexto.Provider>
  )
}

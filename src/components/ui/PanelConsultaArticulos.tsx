import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { avisar } from '../../store/useAvisos'
import { useCodigo } from '../../hooks/useCodigo'
import { citaArticulo, copiarAlPortapapeles, textoConCita } from '../../services/citas'
import { TEMAS_LECTURA } from '../../services/lecturaTema'
import { fragmentoEn, normalizarConsulta } from '../../services/buscarApuntes'
import type { CategoriaCodigo, CodigoTipo, TemaLectura } from '../../types'

const ETIQUETA_CATEGORIA: Record<CategoriaCodigo, string> = {
  fundamentales: 'Fundamentales',
  sustantivos: 'Códigos',
  procedimentales: 'Códigos procesales',
  especiales: 'Leyes especiales',
  tratados: 'Tratados',
}
const ORDEN_CATEGORIAS: CategoriaCodigo[] = ['fundamentales', 'sustantivos', 'procedimentales', 'especiales', 'tratados']

// Se recuerda mientras la app esté abierta: al volver a abrir el panel queda el mismo código.
let ultimoCodigo: CodigoTipo | null = null

/** «Art. 1.445 bis» / «artículo 1445°» → «1445bis»: lo que se compara con lo que escribe la persona. */
const normalizar = (s: string) => s.toLowerCase().replace(/^art(?:[íi]culo)?\.?\s*/, '').replace(/[\s.°º]/g, '')

interface Props {
  temaLectura: TemaLectura
  /** Disposición: a un costado de la nota (pantallas anchas) o debajo de ella (celular). La decide el contenedor. */
  className?: string
  onCerrar: () => void
}

/** Mini buscador de artículos para consultar un código o ley sin salir del apunte: se elige la norma, se escribe el número
 *  y aparece la ficha del artículo. Va al lado (o debajo) de la nota, nunca encima de su contenido. */
export function PanelConsultaArticulos({ temaLectura, className = '', onCerrar }: Props) {
  const tema = TEMAS_LECTURA[temaLectura]
  const normas = useStore((s) => s.codigos)
  const [tipo, setTipo] = useState<CodigoTipo | null>(() => ultimoCodigo ?? normas.find((c) => c.tipo === 'con')?.tipo ?? normas[0]?.tipo ?? null)
  const [consulta, setConsulta] = useState('')
  const [elegido, setElegido] = useState<string | null>(null)
  const [recientes, setRecientes] = useState<{ tipo: CodigoTipo; a: string }[]>([])
  const refInput = useRef<HTMLInputElement>(null)

  const { codigo, cargando, error, reintentar } = useCodigo(tipo)
  const articulos = codigo?.articulos
  const meta = normas.find((c) => c.tipo === tipo)

  useEffect(() => {
    refInput.current?.focus()
  }, [])

  const grupos = useMemo(
    () =>
      // todas las normas disponibles, también las que la persona desactivó en «Códigos»: consultar no requiere tenerlas activas
      ORDEN_CATEGORIAS.map((cat) => ({ cat, items: normas.filter((c) => c.categoria === cat) })).filter((g) => g.items.length > 0),
    [normas]
  )

  const q = normalizar(consulta)
  // Si lo escrito empieza con un número es un artículo; si son letras, se busca esa palabra dentro del texto de la norma
  const porPalabra = consulta.trim().length >= 3 && !/^\s*(?:art(?:[íi]culo)?\.?\s*)?\d/i.test(consulta)
  const textosNormalizados = useMemo(
    () => articulos?.map((a) => a.t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()) ?? [],
    [articulos]
  )
  const coincidenciasTexto = useMemo(() => {
    if (!porPalabra || !articulos) return null
    const palabras = normalizarConsulta(consulta)
    const idx: number[] = []
    textosNormalizados.forEach((t, i) => {
      if (palabras.every((p) => t.includes(p))) idx.push(i)
    })
    return {
      total: idx.length,
      lista: idx.slice(0, 12).map((i) => ({ a: articulos[i].a, frag: fragmentoEn(articulos[i].t, palabras)?.fragmento ?? null })),
    }
  }, [porPalabra, consulta, articulos, textosNormalizados])
  const exacto = useMemo(() => (q && articulos && !porPalabra ? articulos.find((a) => normalizar(a.a) === q) ?? null : null), [q, articulos, porPalabra])
  const sugerencias = useMemo(
    () => (q && articulos && !exacto && !porPalabra ? articulos.filter((a) => normalizar(a.a).startsWith(q)).slice(0, 8) : []),
    [q, articulos, exacto, porPalabra]
  )
  // la ficha muestra lo escrito si coincide exacto; si no, lo último que se eligió de las sugerencias o de los recientes
  const indice = articulos ? articulos.findIndex((a) => a.a === (exacto?.a ?? elegido)) : -1
  const actual = indice >= 0 && articulos ? articulos[indice] : null

  const abrir = (a: string, desde: CodigoTipo | null = tipo) => {
    if (!desde) return
    setElegido(a)
    setConsulta('')
    setRecientes((r) => [{ tipo: desde, a }, ...r.filter((x) => !(x.tipo === desde && x.a === a))].slice(0, 6))
  }

  const ir = (delta: -1 | 1) => {
    const destino = articulos?.[indice + delta]
    if (destino) abrir(destino.a)
  }

  const parrafos = useMemo(() => (actual ? actual.t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) : []), [actual])

  const copiar = async () => {
    if (!actual || !tipo) return
    const ok = await copiarAlPortapapeles(textoConCita(tipo, actual))
    if (ok) avisar.exito(`Copiado: ${citaArticulo(tipo, actual.a)}`)
    else avisar.error('No se pudo copiar el artículo. Inténtalo de nuevo.')
  }

  const campo = `w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.border} ${tema.chipBg} ${tema.text}`

  return (
    <aside
      aria-label="Consultar un artículo"
      className={`flex flex-col min-h-0 ${tema.bg} ${tema.border} print:hidden ${className}`}
      // Esc cierra solo el panel (no la nota)
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCerrar()
        }
      }}
    >
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0 ${tema.border}`}>
        <i className="ti ti-book-2 text-lg" style={{ color: 'var(--accent-texto)' }} aria-hidden="true" />
        <h2 className={`text-sm font-bold flex-1 ${tema.text}`}>Consultar artículo</h2>
        <button onClick={onCerrar} aria-label="Cerrar la consulta" className={`w-8 h-8 rounded-lg flex items-center justify-center ${tema.textSoft} ${tema.hoverSuave}`}>
          <i className="ti ti-x text-base" />
        </button>
      </div>

      <div className="px-4 pt-3 pb-2 grid gap-2 flex-shrink-0">
        <label className="grid gap-1">
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${tema.textSoft}`}>Código o ley</span>
          <select
            value={tipo ?? ''}
            onChange={(e) => {
              const nuevo = e.target.value as CodigoTipo
              ultimoCodigo = nuevo
              setTipo(nuevo)
              setConsulta('')
              setElegido(null)
              refInput.current?.focus()
            }}
            className={campo}
          >
            {grupos.map((g) => (
              <optgroup key={g.cat} label={ETIQUETA_CATEGORIA[g.cat]}>
                {g.items.map((c) => (
                  <option key={c.tipo} value={c.tipo}>
                    {c.nombre}{c.activo ? '' : ' (desactivada)'}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${tema.textSoft}`}>Artículo o palabra</span>
          <input
            ref={refInput}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => {
              // Enter confirma: el artículo escrito completo, o la primera sugerencia
              if (e.key === 'Enter') {
                if (exacto) abrir(exacto.a)
                else if (sugerencias[0]) abrir(sugerencias[0].a)
              }
            }}
            onBlur={() => exacto && abrir(exacto.a)}
            inputMode="text"
            autoComplete="off"
            placeholder="Número (19, 1445) o una palabra"
            className={campo}
          />
        </label>
        {sugerencias.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Artículos que coinciden">
            {sugerencias.map((a) => (
              <button key={a.a} role="listitem" onClick={() => abrir(a.a)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${tema.chipBg} ${tema.chipHover} ${tema.text}`}>
                {a.a}
              </button>
            ))}
          </div>
        )}
        {coincidenciasTexto && (
          <div className="grid gap-1.5">
            <p className={`text-xs ${tema.textSoft}`}>
              {coincidenciasTexto.total === 0
                ? `Ninguna disposición de ${meta?.nombreCorto ?? 'esta norma'} contiene esas palabras.`
                : `${coincidenciasTexto.total} artículo${coincidenciasTexto.total === 1 ? '' : 's'} con esas palabras${coincidenciasTexto.total > 12 ? ' (se muestran los 12 primeros)' : ''}:`}
            </p>
            {coincidenciasTexto.lista.map((r) => (
              <button key={r.a} onClick={() => abrir(r.a)} className={`text-left rounded-lg px-3 py-2 ${tema.chipBg} ${tema.chipHover}`}>
                <span className={`block text-xs font-bold ${tema.text}`}>{r.a}</span>
                {r.frag && (
                  <span className={`block text-xs mt-0.5 ${tema.textSoft}`}>
                    {r.frag.antes}
                    <mark className="rounded px-0.5" style={{ background: 'var(--marca-palabra)', color: 'inherit' }}>{r.frag.coincidencia}</mark>
                    {r.frag.despues}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {q && articulos && !porPalabra && !exacto && sugerencias.length === 0 && (
          <p className={`text-xs ${tema.textSoft}`}>No hay un artículo «{consulta.trim()}» en {meta?.nombreCorto ?? 'esta norma'}.</p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        {cargando && <p className={`text-sm py-6 text-center ${tema.textSoft}`}>Cargando {meta?.nombreCorto ?? 'la norma'}…</p>}
        {error && (
          <p className="text-sm py-4" style={{ color: 'var(--neu-danger)' }}>
            No se pudo cargar. <button onClick={reintentar} className="underline font-semibold">Reintentar</button>
          </p>
        )}

        {actual && tipo && (
          <article className={`mt-1 rounded-xl border overflow-hidden ${tema.border}`} style={{ borderLeft: '4px solid var(--accent-base)' }}>
            <header className={`flex items-center gap-1 px-3 py-2 ${tema.chipBg}`}>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide truncate" style={{ color: 'var(--accent-texto)' }}>{meta?.nombreCorto ?? tipo}</p>
                <h3 className={`text-lg font-bold leading-tight font-serif ${tema.text}`}>{actual.a}</h3>
              </div>
              <button onClick={() => ir(-1)} disabled={indice <= 0} aria-label="Artículo anterior" title="Artículo anterior" className={`w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-30 ${tema.textSoft} ${tema.chipHover}`}>
                <i className="ti ti-arrow-left text-lg" />
              </button>
              <button onClick={() => ir(1)} disabled={!articulos || indice >= articulos.length - 1} aria-label="Artículo siguiente" title="Artículo siguiente" className={`w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-30 ${tema.textSoft} ${tema.chipHover}`}>
                <i className="ti ti-arrow-right text-lg" />
              </button>
              <button onClick={() => void copiar()} aria-label="Copiar el artículo con su cita" title="Copiar el artículo con su cita" className={`w-9 h-9 rounded-lg flex items-center justify-center ${tema.textSoft} ${tema.chipHover}`}>
                <i className="ti ti-copy text-lg" />
              </button>
            </header>
            <div className={`px-3.5 py-3 zona-lectura ${tema.text}`} style={{ fontSize: 16, lineHeight: 1.7 }}>
              {parrafos.map((p, i) => (
                <p key={i} className={i === 0 ? 'mb-3 last:mb-0' : 'mb-3 last:mb-0 indent-5'}>
                  {p}
                </p>
              ))}
            </div>
          </article>
        )}

        {!actual && !cargando && !error && !q && (
          <p className={`text-xs py-4 ${tema.textSoft}`}>Elige una norma y escribe el número del artículo: la ficha aparece aquí, al lado de tu nota.</p>
        )}

        {recientes.length > 0 && (
          <div className="mt-4">
            <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${tema.textSoft}`}>Consultados</p>
            <div className="flex flex-wrap gap-1.5">
              {recientes.map((r) => (
                <button
                  key={`${r.tipo}-${r.a}`}
                  onClick={() => {
                    ultimoCodigo = r.tipo
                    setTipo(r.tipo)
                    abrir(r.a, r.tipo)
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${tema.chipBg} ${tema.chipHover} ${tema.text}`}
                >
                  {r.a} · {normas.find((c) => c.tipo === r.tipo)?.nombreCorto ?? r.tipo}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

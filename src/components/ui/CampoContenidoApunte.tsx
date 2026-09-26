import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { parsearApunte } from '../../services/apunteFormato'
import { ApunteContenido } from './ApunteContenido'

const VERDE = 'var(--accent-base)'

interface Props {
  valor: string
  onChange: (v: string) => void
  modoOscuro: boolean
}

type AccionId = 'negrita' | 'cursiva' | 'subrayado' | 'rojo' | 'amarillo' | 'titulo' | 'vineta' | 'numerada' | 'recuadro' | 'tabla' | 'columnas' | 'separador'

interface Boton {
  id: AccionId
  icono: string
  titulo: string
  color?: string
}

const BOTONES: (Boton | 'sep')[] = [
  { id: 'negrita', icono: 'ti-bold', titulo: 'Negrita (Ctrl+B)' },
  { id: 'cursiva', icono: 'ti-italic', titulo: 'Cursiva (Ctrl+I)' },
  { id: 'subrayado', icono: 'ti-underline', titulo: 'Subrayado (Ctrl+U)' },
  { id: 'rojo', icono: 'ti-letter-a', titulo: 'Texto rojo — lo importante', color: 'text-red-500 hover:bg-red-500/10' },
  { id: 'amarillo', icono: 'ti-highlight', titulo: 'Marcador amarillo — ejemplos', color: 'text-amber-500 hover:bg-amber-500/10' },
  'sep',
  { id: 'titulo', icono: 'ti-heading', titulo: 'Título (repetí para cambiar el nivel)' },
  { id: 'vineta', icono: 'ti-list', titulo: 'Viñetas — Tab anida un sub-nivel' },
  { id: 'numerada', icono: 'ti-list-numbers', titulo: 'Lista numerada' },
  { id: 'recuadro', icono: 'ti-quote', titulo: 'Recuadro destacado' },
  { id: 'tabla', icono: 'ti-table', titulo: 'Tabla' },
  { id: 'columnas', icono: 'ti-columns', titulo: 'Columnas' },
  { id: 'separador', icono: 'ti-separator-horizontal', titulo: 'Línea separadora' },
]

const AYUDA: { sintaxis: string; efecto: string }[] = [
  { sintaxis: '**texto**', efecto: 'negrita' },
  { sintaxis: '~texto~', efecto: 'cursiva' },
  { sintaxis: '__texto__', efecto: 'subrayado' },
  { sintaxis: '==texto==', efecto: 'texto rojo (lo importante)' },
  { sintaxis: '++texto++', efecto: 'marcador amarillo (ejemplos)' },
  { sintaxis: '^^texto^^  ^^^texto^^^  ,,texto,,', efecto: 'letra grande, enorme, chica' },
  { sintaxis: '{{texto|nota}}', efecto: 'nota al margen del texto' },
  { sintaxis: '## Título   ### Sección', efecto: 'títulos (arman el índice al leer)' },
  { sintaxis: '- punto   1. punto', efecto: 'viñetas y numeradas (Tab = sub-nivel)' },
  { sintaxis: '> 📝 texto', efecto: 'recuadro destacado' },
  { sintaxis: '| a | b |  +  |---|---|', efecto: 'tabla' },
  { sintaxis: ':::columnas  ...  :::col  ...  :::', efecto: 'columnas lado a lado' },
  { sintaxis: '---', efecto: 'línea separadora' },
]

/** Caja de texto de un Apunte con su barra de formato, atajos de teclado y
 *  Vista previa. Todo opera sobre el texto plano (ver services/apunteFormato):
 *  los botones solo insertan la sintaxis, así lo que se guarda se puede leer
 *  y editar igual sin la barra. */
export function CampoContenidoApunte({ valor, onChange, modoOscuro }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [vistaPrevia, setVistaPrevia] = useState(false)
  const [ayuda, setAyuda] = useState(false)
  const bloques = useMemo(() => (vistaPrevia ? parsearApunte(valor) : []), [vistaPrevia, valor])

  const poner = (nuevo: string, desde: number, hasta: number) => {
    onChange(nuevo)
    const ta = ref.current
    requestAnimationFrame(() => {
      ta?.focus()
      ta?.setSelectionRange(desde, hasta)
    })
  }

  const seleccion = () => {
    const ta = ref.current
    return { inicio: ta?.selectionStart ?? valor.length, fin: ta?.selectionEnd ?? valor.length }
  }

  /** Envuelve la selección con la marca (o la quita si ya estaba envuelta). */
  const alternarMarca = (marca: string) => {
    const { inicio, fin } = seleccion()
    const m = marca.length
    const sel = valor.slice(inicio, fin)
    if (valor.slice(inicio - m, inicio) === marca && valor.slice(fin, fin + m) === marca && inicio >= m) {
      poner(valor.slice(0, inicio - m) + sel + valor.slice(fin + m), inicio - m, fin - m)
    } else if (sel.length >= 2 * m && sel.startsWith(marca) && sel.endsWith(marca)) {
      poner(valor.slice(0, inicio) + sel.slice(m, -m) + valor.slice(fin), inicio, fin - 2 * m)
    } else {
      poner(valor.slice(0, inicio) + marca + sel + marca + valor.slice(fin), inicio + m, fin + m)
    }
  }

  /** Aplica una transformación a las líneas que toca la selección. */
  const sobreLineas = (transformar: (lineas: string[]) => string[]) => {
    const { inicio, fin } = seleccion()
    const ini = valor.lastIndexOf('\n', inicio - 1) + 1
    const sigSalto = valor.indexOf('\n', fin)
    const finLinea = sigSalto === -1 ? valor.length : sigSalto
    const nuevas = transformar(valor.slice(ini, finLinea).split('\n')).join('\n')
    poner(valor.slice(0, ini) + nuevas + valor.slice(finLinea), ini, ini + nuevas.length)
  }

  const alternarTitulo = () =>
    sobreLineas((lineas) => {
      const actual = /^(#{1,3})\s/.exec(lineas[0])?.[1].length ?? 0
      const siguiente = actual === 0 ? 2 : actual === 2 ? 3 : actual === 3 ? 1 : 0
      return lineas.map((l) => {
        const limpia = l.replace(/^#{1,3}\s+/, '')
        return l.trim() === '' || siguiente === 0 ? limpia : `${'#'.repeat(siguiente)} ${limpia}`
      })
    })

  const alternarVineta = () =>
    sobreLineas((lineas) => {
      const todas = lineas.every((l) => l.trim() === '' || /^\t*-\s/.test(l))
      return lineas.map((l) => {
        if (l.trim() === '') return l
        return todas ? l.replace(/^(\t*)-\s+/, '$1') : /^\t*-\s/.test(l) ? l : l.replace(/^(\t*)/, '$1- ')
      })
    })

  const alternarNumerada = () =>
    sobreLineas((lineas) => {
      const todas = lineas.every((l) => l.trim() === '' || /^\t*\d{1,3}[.)]\s/.test(l))
      let n = 0
      return lineas.map((l) => {
        if (l.trim() === '') return l
        if (todas) return l.replace(/^(\t*)\d{1,3}[.)]\s+/, '$1')
        n++
        return l.replace(/^(\t*)(?:\d{1,3}[.)]\s+|-\s+)?/, `$1${n}. `)
      })
    })

  const alternarRecuadro = () =>
    sobreLineas((lineas) => {
      const todas = lineas.every((l) => l.trim() === '' || l.startsWith('>'))
      if (lineas.length === 1 && lineas[0].trim() === '') return ['> 📝 ']
      return lineas.map((l) => (l.trim() === '' ? l : todas ? l.replace(/^>\s?/, '') : `> ${l}`))
    })

  const insertarBloque = (bloque: string, marcarDesde: number, marcarLargo: number) => {
    const { inicio, fin } = seleccion()
    const antes = valor.slice(0, inicio)
    const despues = valor.slice(fin)
    const prefijo = antes === '' ? '' : antes.endsWith('\n\n') ? '' : antes.endsWith('\n') ? '\n' : '\n\n'
    const sufijo = despues.startsWith('\n\n') ? '' : despues.startsWith('\n') ? '\n' : despues === '' ? '\n' : '\n\n'
    const nuevo = antes + prefijo + bloque + sufijo + despues
    const base = antes.length + prefijo.length
    poner(nuevo, base + marcarDesde, base + marcarDesde + marcarLargo)
  }

  const insertarTabla = () => {
    const plantilla = '| Columna 1 | Columna 2 |\n|---|---|\n| Dato | Dato |'
    insertarBloque(plantilla, 2, 9)
  }

  const insertarColumnas = () => {
    const { inicio, fin } = seleccion()
    const sel = valor.slice(inicio, fin).trim()
    const primera = sel || 'Primera columna'
    const bloque = `:::columnas\n${primera}\n\n:::col\nSegunda columna\n\n:::`
    const desde = ':::columnas\n'.length
    insertarBloque(bloque, desde, primera.length)
  }

  const insertarSeparador = () => insertarBloque('---', 0, 3)

  const sangrar = (delta: 1 | -1) =>
    sobreLineas((lineas) =>
      lineas.map((l) => {
        if (delta === 1) return l.trim() === '' ? l : `\t${l}`
        return l.replace(/^(?:\t| {1,4})/, '')
      }),
    )

  const alPulsar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return
    const mod = e.ctrlKey || e.metaKey
    if (mod && !e.altKey && !e.shiftKey) {
      const marca = e.key === 'b' ? '**' : e.key === 'i' ? '~' : e.key === 'u' ? '__' : null
      if (marca) {
        e.preventDefault()
        alternarMarca(marca)
        return
      }
    }
    const { inicio, fin } = seleccion()
    if (e.key === 'Tab' && !mod && !e.altKey) {
      const ini = valor.lastIndexOf('\n', inicio - 1) + 1
      const linea = valor.slice(ini, valor.indexOf('\n', inicio) === -1 ? valor.length : valor.indexOf('\n', inicio))
      const variasLineas = valor.slice(inicio, fin).includes('\n')
      if (variasLineas || /^\t*(?:-|\d{1,3}[.)])\s?/.test(linea)) {
        e.preventDefault()
        sangrar(e.shiftKey ? -1 : 1)
      }
      return
    }
    if (e.key === 'Enter' && !mod && !e.shiftKey && !e.altKey && inicio === fin) {
      const ini = valor.lastIndexOf('\n', inicio - 1) + 1
      const sigSalto = valor.indexOf('\n', inicio)
      const finLinea = sigSalto === -1 ? valor.length : sigSalto
      if (inicio !== finLinea) return
      const linea = valor.slice(ini, finLinea)
      const m = /^(\t*)(-(?=\s)|\d{1,3}[.)]|>)\s?(.*)$/.exec(linea)
      if (!m) return
      e.preventDefault()
      const [, tabs, marca, resto] = m
      if (resto.trim() === '') {
        // punto vacío + Enter = salir de la lista
        poner(valor.slice(0, ini) + valor.slice(finLinea), ini, ini)
        return
      }
      const num = /^(\d{1,3})([.)])$/.exec(marca)
      const siguiente = num ? `${Number(num[1]) + 1}${num[2]}` : marca
      const insercion = `\n${tabs}${siguiente} `
      poner(valor.slice(0, inicio) + insercion + valor.slice(fin), inicio + insercion.length, inicio + insercion.length)
    }
  }

  const ejecutar = (id: AccionId) => {
    switch (id) {
      case 'negrita':
        return alternarMarca('**')
      case 'cursiva':
        return alternarMarca('~')
      case 'subrayado':
        return alternarMarca('__')
      case 'rojo':
        return alternarMarca('==')
      case 'amarillo':
        return alternarMarca('++')
      case 'titulo':
        return alternarTitulo()
      case 'vineta':
        return alternarVineta()
      case 'numerada':
        return alternarNumerada()
      case 'recuadro':
        return alternarRecuadro()
      case 'tabla':
        return insertarTabla()
      case 'columnas':
        return insertarColumnas()
      case 'separador':
        return insertarSeparador()
    }
  }

  const claseBoton = modoOscuro ? 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <span className={`text-xs font-medium ${modoOscuro ? 'text-zinc-400' : 'text-zinc-600'}`}>Contenido</span>
        <div className="flex items-center gap-0.5 flex-wrap">
          {!vistaPrevia &&
            BOTONES.map((b, i) =>
              b === 'sep' ? (
                <div key={i} className={`w-px h-5 mx-1 ${modoOscuro ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
              ) : (
                <button
                  key={b.id}
                  type="button"
                  title={b.titulo}
                  aria-label={b.titulo}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => ejecutar(b.id)}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${b.color ?? claseBoton}`}
                >
                  <i className={`ti ${b.icono} text-sm`} />
                </button>
              ),
            )}
          <div className={`w-px h-5 mx-1 ${modoOscuro ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <button
            type="button"
            title="Guía de formato"
            aria-label="Guía de formato"
            aria-expanded={ayuda}
            onClick={() => setAyuda((v) => !v)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${ayuda ? (modoOscuro ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-100 text-zinc-800') : claseBoton}`}
          >
            <i className="ti ti-help text-sm" />
          </button>
          <button
            type="button"
            onClick={() => setVistaPrevia((v) => !v)}
            className={`flex items-center gap-1 px-2 h-7 rounded-md text-xs font-medium transition-colors ${vistaPrevia ? 'text-white' : claseBoton}`}
            style={vistaPrevia ? { background: VERDE } : undefined}
          >
            <i className={`ti ${vistaPrevia ? 'ti-pencil' : 'ti-eye'} text-sm`} />
            {vistaPrevia ? 'Editar' : 'Vista previa'}
          </button>
        </div>
      </div>

      {ayuda && (
        <div
          className={`mb-2 rounded-lg border px-3 py-2 text-xs ${modoOscuro ? 'bg-zinc-900/60 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600'}`}
        >
          <p className="font-medium mb-1.5">Formato — se escribe como texto, los botones solo lo insertan por vos:</p>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {AYUDA.map((a) => (
              <li key={a.sintaxis} className="flex items-baseline gap-2">
                <code
                  className={`px-1 rounded font-mono text-[11px] flex-shrink-0 ${modoOscuro ? 'bg-zinc-800 text-zinc-200' : 'bg-white border border-zinc-200 text-zinc-700'}`}
                >
                  {a.sintaxis}
                </code>
                <span>{a.efecto}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 opacity-80">Atajos: Ctrl+B negrita · Ctrl+I cursiva · Ctrl+U subrayado · Tab / Shift+Tab sangría · Enter continúa la lista.</p>
        </div>
      )}

      {vistaPrevia ? (
        <div
          className={`w-full rounded-lg px-4 py-3 text-sm border overflow-y-auto ${modoOscuro ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'}`}
          style={{ minHeight: 380, maxHeight: 560 }}
        >
          {valor.trim() ? (
            <ApunteContenido bloques={bloques} tema={modoOscuro ? 'oscuro' : 'claro'} idBase="previa" />
          ) : (
            <p className={`italic ${modoOscuro ? 'text-zinc-500' : 'text-zinc-400'}`}>Nada que previsualizar todavía.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={alPulsar}
          rows={16}
          spellCheck
          className={`w-full rounded-lg px-3 py-2 text-sm outline-none border resize-y font-[inherit] ${
            modoOscuro ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
          }`}
          placeholder={'Escribe tu apunte… ## Título, **negrita**, ==rojo==, ++amarillo++, "- " para viñetas. El botón ? explica todo el formato.'}
        />
      )}
    </div>
  )
}

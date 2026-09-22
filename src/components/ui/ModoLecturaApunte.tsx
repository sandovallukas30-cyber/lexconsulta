import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useLecturaVoz } from '../../hooks/useLecturaVoz'
import { useWakeLock } from '../../hooks/useWakeLock'
import { TAMANOS_FUENTE, TEMAS_LECTURA } from '../../services/lecturaTema'
import type { ApunteModulo, SesionClase, CuadernoApuntes } from '../../types'

const VERDE = 'var(--accent-base)'
const PALABRAS_POR_MINUTO = 180

/** Misma idea que la convención liviana de los nodos de Mapas Mentales
 *  (`*negrita*`, `_subrayado_`), pero más tolerante -- pensada para texto
 *  PEGADO desde otro lado (ej. un apunte que ya tenías en Notion), no solo
 *  para texto escrito a mano con la barra de esta app. Se suma `==rojo==`
 *  (sin equivalente en Notion/Markdown estándar, es propio de esta app)
 *  para destacar lo importante -- el equivalente al destacador rojo que
 *  se usa a mano al repasar apuntes de derecho.
 *
 *  Por qué el doble asterisco importa: Notion (y Markdown en general)
 *  marca negrita con **doble** asterisco, no uno solo. El primer intento
 *  de esta función solo reconocía un asterisco, así que "**no hay
 *  libertad**" quedaba mal partido: el regex de un solo `*` igual
 *  encontraba ALGO que hacer negrita (el texto entre el segundo y el
 *  tercer asterisco), pero dejaba el primer y el cuarto asterisco sueltos
 *  como texto literal -- *así* quedaba. Ahora se prueba primero el par
 *  doble (`\*\*...\*\*`, `__..._ _`) y recién si no hay, el simple -- para
 *  que ninguno de los dos deje sobras. */
function renderEnriquecidoInline(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|__[^_\n]+__|_[^_\n]+_|==[^=\n]+==)/g)
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>
    }
    if (parte.startsWith('*') && parte.endsWith('*') && parte.length > 2) {
      return <strong key={i}>{parte.slice(1, -1)}</strong>
    }
    if (parte.startsWith('__') && parte.endsWith('__') && parte.length > 4) {
      return <u key={i}>{parte.slice(2, -2)}</u>
    }
    if (parte.startsWith('_') && parte.endsWith('_') && parte.length > 2) {
      return <u key={i}>{parte.slice(1, -1)}</u>
    }
    if (parte.startsWith('==') && parte.endsWith('==') && parte.length > 4) {
      return (
        <mark key={i} className="bg-transparent text-red-600 font-semibold">
          {parte.slice(2, -2)}
        </mark>
      )
    }
    return parte
  })
}

/** Una línea cuenta como viñeta con o sin espacio después del guion --
 *  "- Texto" y "-Texto" son el mismo caso real (apuntes tipeados rápido en
 *  clase mezclan los dos todo el tiempo, el propio ejemplo que copiaste
 *  tenía "-Teorias" sin espacio). "--" (un separador, no una viñeta) queda
 *  afuera a propósito. */
function esLineaVineta(l: string): boolean {
  const t = l.replace(/^[\t ]+/, '')
  return t.startsWith('-') && t.length > 1 && t[1] !== '-'
}

function textoDeVineta(l: string): string {
  return l.replace(/^[\t ]*-\s?/, '')
}

/** Cuántos tabs de indentación tiene la línea -- para distinguir viñeta de
 *  primer nivel ("- Elementos") de sub-viñeta ("\t- Competencia"). Un
 *  apunte real casi nunca pasa de 2 niveles, así que todo lo que tenga 1+
 *  tab de indentación se junta en un único sub-nivel (no se intenta
 *  reconstruir 3 o más niveles reales) -- mejor un sub-nivel correcto que
 *  una jerarquía profunda a medias. */
function indentDeLinea(l: string): number {
  const m = l.match(/^\t*/)
  return m ? m[0].length : 0
}

function renderListaVinetas(lineas: string[], key: string): ReactNode {
  const items: { texto: string; hijos: string[] }[] = []
  for (const l of lineas) {
    const texto = textoDeVineta(l)
    if (indentDeLinea(l) === 0 || items.length === 0) {
      items.push({ texto, hijos: [] })
    } else {
      items[items.length - 1].hijos.push(texto)
    }
  }
  return (
    <ul key={key} className="list-disc pl-5 space-y-1.5 mb-5">
      {items.map((it, i) => (
        <li key={i}>
          {renderEnriquecidoInline(it.texto)}
          {it.hijos.length > 0 && (
            <ul className="list-[circle] pl-5 mt-1.5 space-y-1.5">
              {it.hijos.map((h, j) => (
                <li key={j}>{renderEnriquecidoInline(h)}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Un "bloque" es un grupo de líneas separado del resto por una línea en
 *  blanco (el mismo criterio de párrafo que ya usa ArticuloTexto en el
 *  Explorador) -- pero DENTRO de un bloque puede haber una mezcla real,
 *  como un encabezado seguido de viñetas sin línea en blanco de por medio
 *  ("Elementos esenciales:\n- Consentimiento\n- La cosa\n- El precio"). Por
 *  eso no alcanza con mirar el bloque entero: se recorre línea por línea y
 *  cada tramo consecutivo de viñetas se agrupa en su propia lista, y cada
 *  tramo consecutivo de texto normal en su propio párrafo. */
function renderBloqueApunte(bloque: string, keyBase: string): ReactNode[] {
  const lineas = bloque.split('\n').filter((l) => l.trim() !== '')
  const salida: ReactNode[] = []
  let grupo: string[] = []
  let modo: 'vineta' | 'texto' | null = null

  const cerrarGrupo = () => {
    if (grupo.length === 0) return
    if (modo === 'vineta') {
      salida.push(renderListaVinetas(grupo, `${keyBase}-${salida.length}`))
    } else {
      salida.push(
        <p key={`${keyBase}-${salida.length}`} className="whitespace-pre-wrap mb-5 leading-relaxed">
          {renderEnriquecidoInline(grupo.join('\n'))}
        </p>
      )
    }
    grupo = []
  }

  for (const l of lineas) {
    const modoLinea: 'vineta' | 'texto' = esLineaVineta(l) ? 'vineta' : 'texto'
    if (modo !== null && modo !== modoLinea) cerrarGrupo()
    modo = modoLinea
    grupo.push(l)
  }
  cerrarGrupo()
  return salida
}

/** Exportada porque el formulario de edición (TabApuntes en
 *  ModuloDetalle.tsx) la reusa para la Vista previa -- mismo render que
 *  Modo Lectura, para que lo que el usuario ve al previsualizar sea
 *  exactamente lo que va a ver después al repasar, sin mantener dos
 *  implementaciones del mismo parser en paralelo. */
export function renderContenidoApunte(texto: string): ReactNode[] {
  return texto
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .flatMap((b, i) => renderBloqueApunte(b, `b${i}`))
}

interface Props {
  abierto: boolean
  apunte: ApunteModulo | null
  clase?: SesionClase
  cuaderno?: CuadernoApuntes
  onCerrar: () => void
  onEditar: () => void
}

/**
 * Modo lectura para un Apunte propio -- misma idea que ModoLecturaOverlay
 * del Explorador (pantalla completa, tema claro/oscuro/papel, letra
 * ajustable, lectura en voz alta, no deja apagarse la pantalla), pero SIN
 * reusar ese componente tal cual: está armado a medida para un artículo de
 * código (migas de Libro/Título/Capítulo, subrayado guardado por
 * codigo::articulo, notas legales tipo "NOTA:", vínculos entre artículos)
 * y nada de eso aplica a un apunte propio. Lo que sí se comparte de
 * verdad -- tema, tamaño de letra, voz, wake lock -- viene de
 * services/lecturaTema.ts y los hooks useLecturaVoz/useWakeLock, así que
 * es la MISMA función de fondo, con una cáscara más simple encima.
 */
export function ModoLecturaApunte({ abierto, apunte, clase, cuaderno, onCerrar, onEditar }: Props) {
  const [indiceTamano, setIndiceTamano] = useState(0)
  const temaLectura = useStore((s) => s.modoLecturaTema)
  const setTemaLectura = useStore((s) => s.setModoLecturaTema)
  const tema = TEMAS_LECTURA[temaLectura]

  const textoPlano = apunte?.contenido ?? ''
  const voz = useLecturaVoz(textoPlano)
  useWakeLock(abierto)

  useEffect(() => {
    if (!abierto) voz.detener()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, apunte?.id])

  useEffect(() => {
    if (!abierto) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abierto, onCerrar])

  const palabras = textoPlano.trim() ? textoPlano.trim().split(/\s+/).length : 0
  const minutosLectura = palabras > 0 ? Math.max(1, Math.round(palabras / PALABRAS_POR_MINUTO)) : 0
  const metaPartes = [cuaderno?.nombre, clase?.tema, minutosLectura > 0 ? `~${minutosLectura} min` : null].filter(
    (p): p is string => Boolean(p)
  )

  const contenidoRenderizado = useMemo(() => renderContenidoApunte(textoPlano), [textoPlano])

  return (
    <AnimatePresence>
      {abierto && apunte && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`fixed inset-0 z-[80] flex flex-col ${tema.bg}`}
        >
          <div className={`flex items-center gap-3 px-5 py-3 border-b flex-shrink-0 ${tema.border}`}>
            <button
              onClick={onCerrar}
              aria-label="Cerrar modo lectura"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${tema.textSoft} ${tema.hoverSuave}`}
            >
              <i className="ti ti-x text-lg" />
            </button>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${tema.text}`}>{apunte.titulo}</p>
              {metaPartes.length > 0 && <p className={`text-[11px] truncate ${tema.textSoft}`}>{metaPartes.join(' · ')}</p>}
            </div>

            <button
              onClick={onEditar}
              title="Editar este apunte"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${tema.chipBg} ${tema.text} ${tema.chipHover}`}
            >
              <i className="ti ti-pencil text-sm" />
              <span className="hidden sm:inline">Editar</span>
            </button>

            {/* Tema de lectura */}
            <button
              onClick={() => setTemaLectura(tema.siguienteTema)}
              title={tema.tituloBoton}
              aria-label={tema.tituloBoton}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${tema.textSoft} ${tema.hoverSuave}`}
            >
              <i className={`ti ${tema.icono} text-lg`} />
            </button>

            {/* Tamaño de letra */}
            <div className={`flex items-center gap-0.5 rounded-lg p-1 flex-shrink-0 ${tema.chipBg}`}>
              <button
                onClick={() => setIndiceTamano((i) => Math.max(0, i - 1))}
                disabled={indiceTamano === 0}
                aria-label="Letra más chica"
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-30 ${tema.text} ${tema.chipHover}`}
              >
                A-
              </button>
              <button
                onClick={() => setIndiceTamano((i) => Math.min(TAMANOS_FUENTE.length - 1, i + 1))}
                disabled={indiceTamano === TAMANOS_FUENTE.length - 1}
                aria-label="Letra más grande"
                className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30 ${tema.text} ${tema.chipHover}`}
              >
                A+
              </button>
            </div>

            {/* Voz */}
            {voz.soportado && (
              <div className={`flex items-center gap-0.5 rounded-lg p-1 flex-shrink-0 ${tema.chipBg}`}>
                {voz.estado === 'inactivo' && (
                  <button
                    onClick={voz.reproducir}
                    title="Escuchar el apunte"
                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${tema.text} ${tema.chipHover}`}
                  >
                    <i className="ti ti-volume text-base" />
                  </button>
                )}
                {voz.estado === 'reproduciendo' && (
                  <button onClick={voz.pausar} title="Pausar" className="w-8 h-8 rounded-md flex items-center justify-center" style={{ color: VERDE }}>
                    <i className="ti ti-player-pause-filled text-base" />
                  </button>
                )}
                {voz.estado === 'pausado' && (
                  <button onClick={voz.reanudar} title="Reanudar" className="w-8 h-8 rounded-md flex items-center justify-center" style={{ color: VERDE }}>
                    <i className="ti ti-player-play-filled text-base" />
                  </button>
                )}
                {voz.estado !== 'inactivo' && (
                  <button
                    onClick={voz.detener}
                    title="Detener"
                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${tema.text} ${tema.chipHover}`}
                  >
                    <i className="ti ti-player-stop-filled text-base" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-10">
              <h1 className={`text-3xl font-serif font-bold mb-6 ${tema.text}`}>{apunte.titulo}</h1>
              <div className={temaLectura === 'oscuro' ? 'text-zinc-200' : 'text-zinc-800'} style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: TAMANOS_FUENTE[indiceTamano] }}>
                {textoPlano.trim() ? (
                  contenidoRenderizado
                ) : (
                  <p className={`italic ${tema.textSoft}`}>Este apunte todavía no tiene contenido.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useLecturaVoz } from '../../hooks/useLecturaVoz'
import { useWakeLock } from '../../hooks/useWakeLock'
import { TAMANOS_FUENTE, TEMAS_LECTURA } from '../../services/lecturaTema'
import { encabezadosDe, parsearApunte, textoPlanoDe, tieneEstructuraAncha } from '../../services/apunteFormato'
import { ApunteContenido } from './ApunteContenido'
import type { ApunteModulo, SesionClase, CuadernoApuntes } from '../../types'

const VERDE = 'var(--accent-base)'
const PALABRAS_POR_MINUTO = 180
const CLAVE_FUENTE = 'prima-lex-apunte-fuente'
const CLAVE_SCROLL = 'prima-lex-apunte-scroll:'

function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function guardarLocal(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // sin almacenamiento (ventana privada, cuota) -- solo se pierde la preferencia
  }
}

function tamanoInicial(): number {
  const n = Number(leerLocal(CLAVE_FUENTE))
  return Number.isInteger(n) && n >= 0 && n < TAMANOS_FUENTE.length ? n : 0
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
 * services/lecturaTema.ts y los hooks useLecturaVoz/useWakeLock.
 *
 * Pensado también para apuntes LARGOS (un cuaderno entero pegado desde
 * Notion): índice de títulos para saltar de sección, barra de progreso, y
 * recuerda por apunte hasta dónde llegaste y qué tamaño de letra usás.
 */
export function ModoLecturaApunte({ abierto, apunte, clase, cuaderno, onCerrar, onEditar }: Props) {
  return (
    <AnimatePresence>
      {abierto && apunte && <LectorApunte key={apunte.id} apunte={apunte} clase={clase} cuaderno={cuaderno} onCerrar={onCerrar} onEditar={onEditar} />}
    </AnimatePresence>
  )
}

interface PropsLector {
  apunte: ApunteModulo
  clase?: SesionClase
  cuaderno?: CuadernoApuntes
  onCerrar: () => void
  onEditar: () => void
}

// Se monta al abrir y se desmonta al cerrar: así el índice, el progreso y la
// voz arrancan limpios en cada apunte sin tener que resetear estado a mano.
function LectorApunte({ apunte, clase, cuaderno, onCerrar, onEditar }: PropsLector) {
  const [indiceTamano, setIndiceTamano] = useState(tamanoInicial)
  const [indiceAbierto, setIndiceAbierto] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const temporizadorScroll = useRef<number | undefined>(undefined)
  const temaLectura = useStore((s) => s.modoLecturaTema)
  const setTemaLectura = useStore((s) => s.setModoLecturaTema)
  const tema = TEMAS_LECTURA[temaLectura]

  const contenido = apunte.contenido
  const bloques = useMemo(() => parsearApunte(contenido), [contenido])
  const encabezados = useMemo(() => encabezadosDe(bloques), [bloques])
  const nivelMin = useMemo(() => Math.min(3, ...encabezados.map((e) => e.n)), [encabezados])
  const ancho = useMemo(() => tieneEstructuraAncha(bloques), [bloques])
  const textoVoz = useMemo(() => textoPlanoDe(contenido), [contenido])
  const voz = useLecturaVoz(textoVoz)
  useWakeLock(true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (indiceAbierto) setIndiceAbierto(false)
      else onCerrar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCerrar, indiceAbierto])

  // Al abrir un apunte: volver a donde se había quedado leyendo.
  const id = apunte.id
  useEffect(() => {
    const guardado = Number(leerLocal(CLAVE_SCROLL + id))
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el || !Number.isFinite(guardado) || guardado <= 0) return
      el.scrollTop = guardado * (el.scrollHeight - el.clientHeight)
    })
    return () => cancelAnimationFrame(raf)
  }, [id])

  const alHacerScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    const ratio = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0
    setProgreso(ratio)
    window.clearTimeout(temporizadorScroll.current)
    temporizadorScroll.current = window.setTimeout(() => guardarLocal(CLAVE_SCROLL + id, ratio > 0.985 ? '0' : String(ratio)), 400)
  }, [id])

  useEffect(() => () => window.clearTimeout(temporizadorScroll.current), [])

  const cambiarTamano = (delta: number) => {
    setIndiceTamano((i) => {
      const nuevo = Math.min(TAMANOS_FUENTE.length - 1, Math.max(0, i + delta))
      guardarLocal(CLAVE_FUENTE, String(nuevo))
      return nuevo
    })
  }

  const irA = (idEncabezado: string) => {
    document.getElementById(`lec-${id}-${idEncabezado}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (window.matchMedia('(max-width: 1023px)').matches) setIndiceAbierto(false)
  }

  const descargar = () => {
    const blob = new Blob([`# ${apunte.titulo}\n\n${apunte.contenido}\n`], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${apunte.titulo.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'apunte'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const palabras = textoVoz.trim() ? textoVoz.trim().split(/\s+/).length : 0
  const minutosLectura = palabras > 0 ? Math.max(1, Math.round(palabras / PALABRAS_POR_MINUTO)) : 0
  const metaPartes = [cuaderno?.nombre, clase?.tema, minutosLectura > 0 ? `~${minutosLectura} min` : null].filter((p): p is string => Boolean(p))

  const colorTexto = temaLectura === 'oscuro' ? 'text-zinc-200' : temaLectura === 'papel' ? 'text-[#3a2c1a]' : 'text-zinc-800'
  const hayIndice = encabezados.length >= 3

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`fixed inset-0 z-[80] flex flex-col ${tema.bg}`}
    >
      <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 border-b flex-shrink-0 ${tema.border}`}>
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

        {hayIndice && (
          <button
            onClick={() => setIndiceAbierto((v) => !v)}
            title="Índice de títulos"
            aria-label="Índice de títulos"
            aria-expanded={indiceAbierto}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${indiceAbierto ? `${tema.chipBg} ${tema.text}` : `${tema.textSoft} ${tema.hoverSuave}`}`}
          >
            <i className="ti ti-list-details text-lg" />
          </button>
        )}

        <button
          onClick={onEditar}
          title="Editar este apunte"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${tema.chipBg} ${tema.text} ${tema.chipHover}`}
        >
          <i className="ti ti-pencil text-sm" />
          <span className="hidden sm:inline">Editar</span>
        </button>

        <button
          onClick={descargar}
          title="Descargar como archivo .md"
          aria-label="Descargar como archivo .md"
          className={`hidden sm:flex w-9 h-9 rounded-lg items-center justify-center transition-colors flex-shrink-0 ${tema.textSoft} ${tema.hoverSuave}`}
        >
          <i className="ti ti-download text-lg" />
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
            onClick={() => cambiarTamano(-1)}
            disabled={indiceTamano === 0}
            aria-label="Letra más chica"
            className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-30 ${tema.text} ${tema.chipHover}`}
          >
            A-
          </button>
          <button
            onClick={() => cambiarTamano(1)}
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

      <div className="h-0.5 flex-shrink-0" aria-hidden>
        <div className="h-full transition-[width] duration-150" style={{ width: `${progreso * 100}%`, background: VERDE }} />
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} onScroll={alHacerScroll} className="h-full overflow-y-auto">
          <div className={`${ancho ? 'max-w-4xl' : 'max-w-2xl'} mx-auto px-5 sm:px-8 py-10`}>
            <h1 className={`text-3xl font-serif font-bold mb-6 ${tema.text}`}>{apunte.titulo}</h1>
            <div className={colorTexto} style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: TAMANOS_FUENTE[indiceTamano] }}>
              {contenido.trim() ? (
                <ApunteContenido bloques={bloques} tema={temaLectura} idBase={`lec-${apunte.id}`} />
              ) : (
                <p className={`italic ${tema.textSoft}`}>Este apunte todavía no tiene contenido.</p>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {indiceAbierto && (
            <motion.nav
              aria-label="Índice de títulos"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className={`absolute inset-y-0 right-0 w-72 max-w-[85%] overflow-y-auto border-l shadow-xl ${tema.bg} ${tema.border}`}
            >
              <p className={`px-4 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wide ${tema.textSoft}`}>Índice</p>
              <ul className="pb-4">
                {encabezados.map((e) => (
                  <li key={e.id}>
                    <button
                      onClick={() => irA(e.id)}
                      className={`w-full text-left py-1.5 pr-4 text-sm transition-colors ${tema.hoverSuave} ${e.n - nivelMin >= 2 ? `${tema.textSoft} text-[13px]` : tema.text} ${e.n === nivelMin ? 'font-semibold' : ''}`}
                      style={{ paddingLeft: 16 + (e.n - nivelMin) * 14 }}
                    >
                      {e.texto}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

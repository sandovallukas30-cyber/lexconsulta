import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useLecturaVoz } from '../../hooks/useLecturaVoz'
import { useWakeLock } from '../../hooks/useWakeLock'
import { useProgresoScroll } from '../../hooks/useProgresoScroll'
import { TAMANOS_FUENTE, TEMAS_LECTURA } from '../../services/lecturaTema'
import { encabezadosDe, parsearApunte, textoPlanoDe, tieneEstructuraAncha } from '../../services/apunteFormato'
import { ApunteContenido } from './ApunteContenido'
import { normalizarConMapa, normalizarConsulta } from '../../services/buscarApuntes'
import { descargarApunteMd } from '../../services/apunteArchivo'
import { tarjetasDe } from '../../services/tarjetasApunte'
import { RepasoApunte } from './RepasoApunte'
import { NotasMargen } from './NotasMargen'
import type { ApunteModulo, SesionClase, CuadernoApuntes } from '../../types'

const EditorApunte = lazy(() => import('./editorApunte/EditorApunte'))

export type CambiosApunte = Partial<Pick<ApunteModulo, 'titulo' | 'contenido'>>

const VERDE = 'var(--accent-base)'
const PALABRAS_POR_MINUTO = 200
const CLAVE_FUENTE = 'prima-lex-apunte-fuente'
/** Desde cuántos px de scroll aparece "volver arriba". */
const UMBRAL_VOLVER_ARRIBA = 600

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
  onCambiar: (cambios: CambiosApunte) => void
  /** Abrir directo en el editor visual (el lápiz de la lista) en vez de en lectura. */
  editarAlAbrir?: boolean
  /** Texto buscado en el Omnibar: al abrir, saltar a su primera aparición. */
  resaltarAlAbrir?: string
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
export function ModoLecturaApunte({ abierto, apunte, clase, cuaderno, onCerrar, onEditar, onCambiar, editarAlAbrir = false, resaltarAlAbrir }: Props) {
  return (
    <AnimatePresence>
      {abierto && apunte && (
        <LectorApunte key={apunte.id} apunte={apunte} clase={clase} cuaderno={cuaderno} onCerrar={onCerrar} onEditar={onEditar} onCambiar={onCambiar} editarAlAbrir={editarAlAbrir} resaltar={resaltarAlAbrir} />
      )}
    </AnimatePresence>
  )
}

interface PropsLector {
  apunte: ApunteModulo
  clase?: SesionClase
  cuaderno?: CuadernoApuntes
  onCerrar: () => void
  onEditar: () => void
  onCambiar: (cambios: CambiosApunte) => void
  editarAlAbrir: boolean
  resaltar?: string
}

/** Primera aparición de `consulta` (sin tildes ni mayúsculas) dentro de
 *  `raiz`, como Range del DOM -- busca nodo de texto por nodo de texto. */
function rangoDeCoincidencia(raiz: HTMLElement, consulta: string): Range | null {
  const palabras = normalizarConsulta(consulta)
  if (palabras.length === 0) return null
  // primero la frase completa; si no está en un mismo nodo, la primera palabra
  const candidatos = palabras.length > 1 ? [palabras.join(' '), palabras[0]] : [palabras[0]]
  for (const buscado of candidatos) {
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const texto = n.textContent ?? ''
      const { norm, mapa } = normalizarConMapa(texto)
      const i = norm.indexOf(buscado)
      if (i < 0) continue
      const rango = document.createRange()
      rango.setStart(n, mapa[i])
      rango.setEnd(n, mapa[i + buscado.length - 1] + 1)
      return rango
    }
  }
  return null
}

// Se monta al abrir y se desmonta al cerrar: así el índice, el progreso y la
// voz arrancan limpios en cada apunte sin tener que resetear estado a mano.
function LectorApunte({ apunte, clase, cuaderno, onCerrar, onEditar, onCambiar, editarAlAbrir, resaltar }: PropsLector) {
  const [indiceTamano, setIndiceTamano] = useState(tamanoInicial)
  const [editando, setEditando] = useState(editarAlAbrir)
  const [columna, setColumna] = useState<HTMLElement | null>(null)
  const [raiz, setRaiz] = useState<HTMLElement | null>(null)
  const [indiceAbierto, setIndiceAbierto] = useState(false)
  const [repasando, setRepasando] = useState(false)
  const [seccionActual, setSeccionActual] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const guardarPosicion = useStore((s) => s.guardarPosicionLectura)
  // posición guardada al abrir (se lee una vez: la que se va guardando al
  // leer no debe volver a ofrecer "retomar")
  const [posicionInicial] = useState(() => useStore.getState().posicionLectura[apunte.id]?.ratio ?? 0)
  const [ofrecerRetomar, setOfrecerRetomar] = useState(() => !resaltar && !editarAlAbrir && posicionInicial > 0.02)
  const temaLectura = useStore((s) => s.modoLecturaTema)
  const setTemaLectura = useStore((s) => s.setModoLecturaTema)
  const tema = TEMAS_LECTURA[temaLectura]

  const contenido = apunte.contenido
  // Mientras se edita, el lector está oculto: no re-analizar el apunte en
  // cada autoguardado (cada ~700 ms) -- en uno de miles de palabras eso era
  // trabajo inútil en el hilo principal justo mientras se escribe.
  const bloques = useMemo(() => (editando ? [] : parsearApunte(contenido)), [contenido, editando])
  const encabezados = useMemo(() => encabezadosDe(bloques), [bloques])
  const nivelMin = useMemo(() => Math.min(3, ...encabezados.map((e) => e.n)), [encabezados])
  const ancho = useMemo(() => tieneEstructuraAncha(bloques), [bloques])
  const textoVoz = useMemo(() => (editando ? '' : textoPlanoDe(contenido)), [contenido, editando])
  const voz = useLecturaVoz(textoVoz)
  useWakeLock(true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || editando) return
      if (indiceAbierto) setIndiceAbierto(false)
      else onCerrar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCerrar, indiceAbierto, editando])

  const id = apunte.id
  const { ratio: progreso, scrollTop, desplazable } = useProgresoScroll(scrollRef, `${editando}-${indiceTamano}`)

  // Guardar hasta dónde se leyó (agrupado: no en cada evento de scroll)
  useEffect(() => {
    if (editando || !desplazable) return
    const t = window.setTimeout(() => guardarPosicion(id, progreso), 500)
    return () => window.clearTimeout(t)
  }, [progreso, id, editando, desplazable, guardarPosicion])

  // "Retomar donde quedaste" se ofrece al abrir y desaparece solo a los 8 s
  // o apenas el usuario empieza a leer por su cuenta
  useEffect(() => {
    if (!ofrecerRetomar) return
    const t = window.setTimeout(() => setOfrecerRetomar(false), 8000)
    return () => window.clearTimeout(t)
  }, [ofrecerRetomar])
  if (ofrecerRetomar && scrollTop > 200) setOfrecerRetomar(false)

  const retomar = () => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: posicionInicial * (el.scrollHeight - el.clientHeight), behavior: 'smooth' })
    setOfrecerRetomar(false)
  }

  // Scroll-spy: la sección visible es el último título que ya pasó el borde
  // superior del área de lectura
  useEffect(() => {
    const cont = scrollRef.current
    if (!cont || editando || encabezados.length === 0) return
    const titulos = encabezados
      .map((e) => document.getElementById(`lec-${id}-${e.id}`))
      .filter((el): el is HTMLElement => !!el)
    if (titulos.length === 0) return
    const visibles = new Map<Element, boolean>()
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const en of entradas) visibles.set(en.target, en.boundingClientRect.top < (en.rootBounds?.top ?? 0) + 120)
        let actual: string | null = null
        for (const t of titulos) {
          if (t.getBoundingClientRect().top - cont.getBoundingClientRect().top < 120) actual = t.id.slice(`lec-${id}-`.length)
        }
        setSeccionActual(actual)
      },
      { root: cont, rootMargin: '0px 0px -60% 0px', threshold: [0, 1] }
    )
    titulos.forEach((t) => obs.observe(t))
    return () => obs.disconnect()
  }, [encabezados, id, editando, indiceTamano])

  // Saltar a la primera coincidencia del texto buscado y marcarla (CSS
  // Custom Highlight API; si el navegador no la tiene, queda seleccionada).
  useEffect(() => {
    if (!resaltar || !raiz) return
    const raf = requestAnimationFrame(() => {
      const rango = rangoDeCoincidencia(raiz, resaltar)
      if (!rango) return
      ;(rango.startContainer.parentElement ?? raiz).scrollIntoView({ block: 'center' })
      const api = (globalThis as { CSS?: { highlights?: Map<string, unknown> } }).CSS?.highlights
      const Resaltado = (globalThis as { Highlight?: new (r: Range) => unknown }).Highlight
      if (api && Resaltado) api.set('prima-busqueda', new Resaltado(rango))
      else {
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(rango)
      }
    })
    return () => {
      cancelAnimationFrame(raf)
      ;(globalThis as { CSS?: { highlights?: Map<string, unknown> } }).CSS?.highlights?.delete('prima-busqueda')
    }
  }, [resaltar, raiz])


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

  const descargar = () => descargarApunteMd(apunte)

  const palabras = useMemo(() => (textoVoz.trim() ? textoVoz.trim().split(/\s+/).length : 0), [textoVoz])
  const minutosLectura = palabras > 0 ? Math.max(1, Math.round(palabras / PALABRAS_POR_MINUTO)) : 0
  const minutosRestantes = Math.ceil((palabras * (1 - progreso)) / PALABRAS_POR_MINUTO)
  const pct = Math.round(progreso * 100)
  const tituloSeccion = seccionActual ? encabezados.find((e) => e.id === seccionActual)?.texto : undefined
  // Antes de empezar: cuaderno · clase · duración. Leyendo: % · lo que falta · sección.
  const metaPartes = (
    desplazable && progreso > 0.01
      ? [`${pct}%`, minutosRestantes > 0 ? `${minutosRestantes} min restantes` : 'terminado', tituloSeccion]
      : [cuaderno?.nombre, clase?.tema, minutosLectura > 0 ? `~${minutosLectura} min` : null]
  ).filter((p): p is string => Boolean(p))

  const colorTexto = temaLectura === 'oscuro' ? 'text-zinc-200' : temaLectura === 'papel' ? 'text-[#3a2c1a]' : 'text-zinc-800'
  const hayIndice = encabezados.length >= 3
  const nTarjetas = useMemo(() => (editando ? 0 : tarjetasDe(apunte).length), [apunte, editando])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`fixed inset-0 h-[100dvh] z-[80] flex flex-col ${tema.bg}`}
    >
      <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 border-b flex-shrink-0 ${tema.border}`}>
        {!editando && (
          <button
            onClick={onCerrar}
            aria-label="Cerrar modo lectura"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${tema.textSoft} ${tema.hoverSuave}`}
          >
            <i className="ti ti-x text-lg" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${tema.text}`}>{editando ? `Editando · ${apunte.titulo}` : apunte.titulo}</p>
          {!editando && metaPartes.length > 0 && (
            <p className={`text-[11px] truncate ${tema.textSoft} ${desplazable && progreso > 0.01 ? 'hidden sm:block' : ''}`}>{metaPartes.join(' · ')}</p>
          )}
        </div>

        {hayIndice && !editando && (
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

        {!editando && (
          <>
            <button
              onClick={() => {
                voz.detener()
                setIndiceAbierto(false)
                setEditando(true)
              }}
              title="Editar aquí mismo: escribir, resaltar, agrandar, notas al margen…"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${tema.chipBg} ${tema.text} ${tema.chipHover}`}
            >
              <i className="ti ti-pencil text-sm" />
              <span className="hidden sm:inline">Editar</span>
            </button>

            {nTarjetas > 0 && (
              <button
                onClick={() => {
                  voz.detener()
                  setRepasando(true)
                }}
                title={`Repasar ${nTarjetas} tarjetas generadas desde este apunte`}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${tema.chipBg} ${tema.text} ${tema.chipHover}`}
              >
                <i className="ti ti-cards text-sm" />
                <span className="hidden sm:inline">Repasar</span>
              </button>
            )}

            <button
              onClick={onEditar}
              title="Propiedades: título, clase, cuaderno, artículo, editor de texto"
              aria-label="Propiedades del apunte"
              className={`hidden sm:flex w-9 h-9 rounded-lg items-center justify-center transition-colors flex-shrink-0 ${tema.textSoft} ${tema.hoverSuave}`}
            >
              <i className="ti ti-adjustments-horizontal text-lg" />
            </button>
          </>
        )}

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
        {/* voz: en móvil se oculta para dejarle espacio al título */}
        {voz.soportado && !editando && (
          <div className={`hidden sm:flex items-center gap-0.5 rounded-lg p-1 flex-shrink-0 ${tema.chipBg}`}>
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

      {editando ? (
        <Suspense fallback={<div className={`flex-1 flex items-center justify-center text-sm ${tema.textSoft}`}>Cargando el editor…</div>}>
          <EditorApunte
            titulo={apunte.titulo}
            contenido={apunte.contenido}
            tema={temaLectura}
            tamanoPx={TAMANOS_FUENTE[indiceTamano]}
            onTitulo={(t) => onCambiar({ titulo: t })}
            onContenido={(c) => onCambiar({ contenido: c })}
            onTerminar={() => setEditando(false)}
          />
        </Suspense>
      ) : (
        <>
          <div
            className={`h-[3px] flex-shrink-0 ${tema.chipBg}`}
            role="progressbar"
            aria-label="Progreso de lectura"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div className="h-full transition-[width] duration-150 ease-out" style={{ width: `${progreso * 100}%`, background: VERDE }} />
          </div>
          {/* En móvil el encabezado no deja lugar para "% · min restantes ·
              sección": va en una línea propia bajo la barra mientras se lee */}
          {desplazable && progreso > 0.01 && (
            <p className={`sm:hidden px-4 py-1 text-[11px] truncate border-b ${tema.border} ${tema.textSoft}`} aria-hidden>
              {metaPartes.join(' · ')}
            </p>
          )}

          <div className="relative flex-1 min-h-0">
            <div ref={scrollRef} className="h-full overflow-y-auto">
              <div ref={setColumna} className={`relative ${ancho ? 'max-w-4xl' : 'max-w-2xl'} mx-auto px-5 sm:px-8 py-10`}>
                <h1 className={`text-3xl font-serif font-bold mb-6 ${tema.text}`}>{apunte.titulo}</h1>
                <div ref={setRaiz} className={colorTexto} style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: TAMANOS_FUENTE[indiceTamano] }}>
                  {contenido.trim() ? (
                    <ApunteContenido bloques={bloques} tema={temaLectura} idBase={`lec-${apunte.id}`} />
                  ) : (
                    <p className={`italic ${tema.textSoft}`}>Este apunte todavía no tiene contenido.</p>
                  )}
                </div>
                <NotasMargen columna={columna} raiz={raiz} version={`${contenido.length}-${indiceTamano}`} tema={temaLectura} />
              </div>
            </div>

            {/* Retomar donde quedaste */}
            <AnimatePresence>
              {ofrecerRetomar && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 pl-4 pr-1 py-1 rounded-full border shadow-lg text-sm whitespace-nowrap ${tema.bg} ${tema.border} ${tema.text}`}
                  role="status"
                >
                  <span>Ibas en el {Math.round(posicionInicial * 100)}%</span>
                  <button onClick={retomar} className="px-3 min-h-[36px] rounded-full font-semibold" style={{ color: VERDE }}>
                    Retomar
                  </button>
                  <button onClick={() => setOfrecerRetomar(false)} aria-label="Empezar desde el inicio" className={`w-9 h-9 rounded-full flex items-center justify-center ${tema.textSoft} ${tema.hoverSuave}`}>
                    <i className="ti ti-x text-sm" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Volver arriba */}
            <AnimatePresence>
              {scrollTop > UMBRAL_VOLVER_ARRIBA && !indiceAbierto && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  aria-label="Volver arriba"
                  title="Volver arriba"
                  className={`absolute bottom-5 right-5 w-11 h-11 rounded-full border shadow-lg flex items-center justify-center print:hidden ${tema.bg} ${tema.border} ${tema.text}`}
                >
                  <i className="ti ti-arrow-up text-lg" />
                </motion.button>
              )}
            </AnimatePresence>

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
                    {encabezados.map((e) => {
                      const actual = e.id === seccionActual
                      return (
                        <li key={e.id}>
                          <button
                            onClick={() => irA(e.id)}
                            aria-current={actual ? 'location' : undefined}
                            className={`w-full text-left py-1.5 pr-4 text-sm transition-colors border-l-2 ${tema.hoverSuave} ${e.n - nivelMin >= 2 ? `${tema.textSoft} text-[13px]` : tema.text} ${e.n === nivelMin ? 'font-semibold' : ''} ${actual ? tema.chipBg : 'border-transparent'}`}
                            style={{ paddingLeft: 14 + (e.n - nivelMin) * 14, borderColor: actual ? VERDE : undefined }}
                          >
                            {e.texto}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </motion.nav>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
      <AnimatePresence>{repasando && <RepasoApunte apunte={apunte} onCerrar={() => setRepasando(false)} />}</AnimatePresence>
    </motion.div>
  )
}

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useEnfoque } from '../../store/useEnfoque'
import { useEnfoqueLocal, type DisposicionSala, type TamanoVideo } from '../../store/useEnfoqueLocal'
import { useSala, enlaceDeSala } from '../../store/useSala'
import { avisar } from '../../store/useAvisos'
import { useDialogo } from '../../hooks/useDialogo'
import { incrustar } from '../../services/video'
import { nombreRamo } from '../../services/tareasPlan'
import { PomodoroCompacto } from './PomodoroCompacto'
import { FondoEnfoque, useConFondo } from './FondoEnfoque'
import { parsearApunte } from '../../services/apunteFormato'
import { TEMAS_LECTURA } from '../../services/lecturaTema'
import { ApunteContenido } from '../ui/ApunteContenido'

const DISPOSICIONES: [DisposicionSala, string, string][] = [
  ['ventana', 'Ventana pequeña', 'ti-app-window'],
  ['lado', 'Al lado', 'ti-layout-sidebar-right'],
  ['abajo', 'Abajo', 'ti-layout-bottombar'],
  ['arriba', 'Arriba', 'ti-layout-navbar'],
  ['flotante', 'Flotante sobre el video', 'ti-picture-in-picture'],
  ['minimo', 'Solo una píldora', 'ti-minimize'],
]
const TAMANOS: [TamanoVideo, string][] = [
  ['ajustado', 'Todo el espacio disponible'],
  ['mediano', 'Mediano'],
  ['pequeno', 'Pequeño'],
]

/** Un apunte que se guarda solo, poco después de dejar de escribir. */
const EditorApunte = lazy(() => import('../ui/editorApunte/EditorApunte'))

function ApunteEditable({ ramoId, apunteId }: { ramoId: string; apunteId: string }) {
  const [editando, setEditando] = useState(false)
  const apunte = useStore((s) => s.academicoModulos[ramoId]?.apuntes.find((a) => a.id === apunteId))
  const temaLectura = useStore((s) => s.modoLecturaTema)
  const [texto, setTexto] = useState(apunte?.contenido ?? '')
  const pendiente = useRef<number | undefined>(undefined)
  const ultimo = useRef(texto)

  const guardar = (t: string) => {
    const st = useStore.getState()
    const lista = st.academicoModulos[ramoId]?.apuntes ?? []
    if (!lista.some((a) => a.id === apunteId)) return
    st.setApuntesModulo(ramoId, lista.map((a) => (a.id === apunteId ? { ...a, contenido: t, fechaModificacion: Date.now() } : a)))
  }
  const cambiar = (t: string) => {
    setTexto(t)
    ultimo.current = t
    window.clearTimeout(pendiente.current)
    pendiente.current = window.setTimeout(() => guardar(t), 600)
  }
  // al cerrar o cambiar de apunte, lo escrito se guarda de inmediato
  useEffect(
    () => () => {
      if (pendiente.current) {
        window.clearTimeout(pendiente.current)
        guardar(ultimo.current)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const bloques = useMemo(() => (editando ? [] : parsearApunte(apunte?.contenido ?? '')), [apunte?.contenido, editando])
  if (!apunte) return <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>Ese apunte ya no existe.</p>
  const tema = TEMAS_LECTURA[temaLectura]
  const colorTexto = temaLectura === 'oscuro' ? 'text-zinc-200' : temaLectura === 'papel' ? 'text-[#3a2c1a]' : 'text-zinc-800'
  const boton = (
    <button onClick={() => setEditando((v) => !v)} className="boton boton-suave boton-chico self-end" aria-pressed={editando}>
      <i className={`ti ${editando ? 'ti-check' : 'ti-pencil'}`} aria-hidden="true" /> {editando ? 'Listo' : 'Editar'}
    </button>
  )
  if (!editando) {
    return (
      <>
        {boton}
        <div className={`flex-1 min-h-[240px] rounded-tarjeta px-5 sm:px-8 py-6 ${tema.bg} ${colorTexto}`} style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 17 }}>
          <h3 className={`text-2xl font-serif font-bold mb-4 ${tema.text}`}>{apunte.titulo}</h3>
          {apunte.contenido.trim() ? (
            <ApunteContenido bloques={bloques} tema={temaLectura} idBase={`sala-${apunteId}`} />
          ) : (
            <p className={`italic ${tema.textSoft}`}>Este apunte todavía no tiene contenido. Toca «Editar» para escribir.</p>
          )}
        </div>
      </>
    )
  }
  return (
    <>
    {boton}
    <div className="flex-1 min-h-[320px] flex flex-col overflow-hidden rounded-tarjeta">
      <Suspense fallback={<p className="p-4 text-sm" style={{ color: 'var(--neu-ink2)' }}>Cargando el apunte…</p>}>
        <EditorApunte
          titulo={apunte.titulo}
          contenido={texto}
          tema={temaLectura}
          tamanoPx={16}
          onTitulo={(t) => {
            const st = useStore.getState()
            st.setApuntesModulo(ramoId, (st.academicoModulos[ramoId]?.apuntes ?? []).map((x) => (x.id === apunteId ? { ...x, titulo: t } : x)))
          }}
          onContenido={cambiar}
          onTerminar={() => {}}
        />
      </Suspense>
    </div>
    </>
  )
}

/** Con un fondo elegido en Enfoque, el temporizador de la sala lo lleva detrás (con los textos en claro). */
function CajaTemporizador({ className = '', style, children, caja, as: Tag = 'div' }: { className?: string; style?: React.CSSProperties; children: React.ReactNode; caja?: React.Ref<HTMLDivElement>; as?: 'div' | 'aside' }) {
  const conFondo = useConFondo()
  return (
    <Tag ref={caja as never} className={`${conFondo ? `enf-tarjeta enf-con-fondo ${className.includes('absolute') ? '' : 'relative'} overflow-hidden neu-raised` : 'neu-raised'} ${className}`} style={style}>
      {conFondo && <FondoEnfoque vivo={false} />}
      <div className="relative z-[1]">{children}</div>
    </Tag>
  )
}

/** Ventana del temporizador: píldora que se arrastra y se despliega. */
function VentanaTemporizador() {
  const guardada = useEnfoqueLocal((s) => s.sala.ventana)
  const set = useEnfoqueLocal((s) => s.set)
  const [abierta, setAbierta] = useState(false)
  const [pos, setPos] = useState(guardada ?? { r: 16, b: 16 })
  const caja = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{ x: number; y: number; r: number; b: number } | null>(null)

  const mover = (e: React.PointerEvent) => {
    const a = arrastre.current
    const padre = caja.current?.parentElement
    if (!a || !padre || !caja.current) return
    const maxR = Math.max(0, padre.clientWidth - caja.current.offsetWidth)
    const maxB = Math.max(0, padre.clientHeight - caja.current.offsetHeight)
    setPos({ r: Math.min(maxR, Math.max(0, a.r - (e.clientX - a.x))), b: Math.min(maxB, Math.max(0, a.b - (e.clientY - a.y))) })
  }
  const soltar = () => {
    if (!arrastre.current) return
    arrastre.current = null
    const sala = useEnfoqueLocal.getState().sala
    set({ sala: { ...sala, ventana: pos } })
  }

  return (
    <CajaTemporizador caja={caja} className="absolute z-10 p-2" style={{ right: pos.r, bottom: pos.b, maxWidth: 'calc(100% - 16px)', width: abierta ? 300 : undefined }}>
      <div className="flex items-center gap-1">
        <span
          onPointerDown={(e) => {
            arrastre.current = { x: e.clientX, y: e.clientY, r: pos.r, b: pos.b }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          title="Arrastra para mover el temporizador"
          aria-hidden="true"
          className="w-8 h-9 flex items-center justify-center cursor-grab touch-none select-none"
          style={{ color: 'var(--neu-ink3)' }}
        >
          <i className="ti ti-grip-vertical" />
        </span>
        <PomodoroCompacto variante="pildora" selectores={false} />
        <button
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          aria-label={abierta ? 'Contraer el temporizador' : 'Ver más opciones del temporizador'}
          title={abierta ? 'Contraer' : 'Ramo, tarea y más'}
          className="boton boton-fantasma boton-chico boton-icono"
        >
          <i className={`ti ${abierta ? 'ti-chevron-down' : 'ti-chevron-up'}`} aria-hidden="true" />
        </button>
      </div>
      {abierta && (
        <div className="pt-2 max-h-[60vh] overflow-y-auto">
          <PomodoroCompacto variante="vertical" />
        </div>
      )}
    </CajaTemporizador>
  )
}

/** Sala de estudio: el material (un video de YouTube/Vimeo/archivo, o uno de tus apuntes)
 *  y el temporizador siempre a la vista. Se puede compartir el enlace con el video. */
export function SalaEstudio() {
  const cerrar = useSala((s) => s.cerrar)
  const videoInicial = useSala((s) => s.videoInicial)
  const ramos = useStore((s) => s.ramos)
  const academico = useStore((s) => s.academicoModulos)
  const ramoId = useEnfoque((s) => s.ramoId)
  const sala = useEnfoqueLocal((s) => s.sala)
  const emisoras = useEnfoqueLocal((s) => s.emisoras)
  const set = useEnfoqueLocal((s) => s.set)
  const ref = useDialogo<HTMLDivElement>(true, cerrar)

  const cambiarSala = (p: Partial<typeof sala>) => set({ sala: { ...sala, ...p } })
  const [campo, setCampo] = useState(videoInicial ?? sala.video)
  const [video, setVideo] = useState(videoInicial ?? sala.video)
  const inc = useMemo(() => incrustar(video), [video])
  const guardada = emisoras.find((x) => x.url === campo.trim())

  // llegó por un enlace compartido: se recuerda ese video y se abre en «Video»
  useEffect(() => {
    if (videoInicial) cambiarSala({ material: 'video', video: videoInicial.slice(0, 500) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargar = (e: React.FormEvent) => {
    e.preventDefault()
    const v = campo.trim()
    setVideo(v)
    cambiarSala({ video: v.slice(0, 500) })
  }
  const abrirEmisora = (url: string) => {
    setCampo(url)
    setVideo(url)
    cambiarSala({ video: url.slice(0, 500) })
  }
  const guardarEmisora = () => {
    const url = campo.trim()
    if (!url) return
    const nombre = window.prompt('Nombre para este video o emisora', inc.tipo === 'iframe' ? inc.origen : 'Mi favorito')?.trim()
    if (nombre) set({ emisoras: [...emisoras.slice(-11), { id: crypto.randomUUID(), nombre: nombre.slice(0, 40), url: url.slice(0, 500) }] })
  }
  const copiarEnlace = async () => {
    const url = campo.trim()
    if (!url) return
    try {
      await navigator.clipboard.writeText(enlaceDeSala(url))
      avisar.exito('Enlace copiado: quien lo abra verá este video en su sala de estudio')
    } catch {
      avisar.error('No pude copiar el enlace. Cópialo a mano desde el campo del video.')
    }
  }

  // apuntes disponibles: los del ramo elegido en el temporizador primero
  const opciones = useMemo(() => {
    const lista: { valor: string; texto: string; primero: boolean }[] = []
    for (const [mid, datos] of Object.entries(academico)) {
      for (const a of datos.apuntes) {
        lista.push({ valor: `${mid}:${a.id}`, texto: `${nombreRamo(mid, ramos) ?? 'Módulo'} · ${a.titulo || 'Apunte sin título'}`, primero: mid === ramoId })
      }
    }
    return lista.sort((a, b) => Number(b.primero) - Number(a.primero))
  }, [academico, ramos, ramoId])
  const apunteSel = opciones.some((o) => o.valor === sala.apunte) ? sala.apunte : opciones[0]?.valor ?? ''
  const [apRamo, apId] = apunteSel.split(':')

  const d = sala.disposicion
  const clasesCuerpo =
    d === 'lado' ? 'lg:grid-cols-[1fr_320px]' : d === 'abajo' || d === 'arriba' ? 'grid-rows-[1fr_auto]' : ''
  const ancho = sala.tamano === 'pequeno' ? '45%' : sala.tamano === 'mediano' ? '70%' : '100%'

  const timer = d === 'ventana' ? <VentanaTemporizador /> : d !== 'minimo' && (
    <CajaTemporizador as="aside" className={`p-4 ${d === 'flotante' ? 'absolute right-4 bottom-4 w-[300px] z-10' : ''} ${d === 'arriba' ? 'order-first' : ''}`}>
      <PomodoroCompacto variante={d === 'lado' || d === 'flotante' ? 'vertical' : 'horizontal'} />
    </CajaTemporizador>
  )

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Sala de estudio"
      className="fixed inset-0 h-[100dvh] z-[85] flex flex-col"
      style={{ background: 'var(--neu-bg)' }}
    >
      <header className="flex items-center gap-3 flex-wrap px-4 sm:px-6 py-3">
        <h2 className="text-base font-extrabold" style={{ color: 'var(--neu-ink)' }}>
          Sala de estudio{ramoId ? ` · ${nombreRamo(ramoId, ramos) ?? ''}` : ''}
        </h2>
        <div className="neu-pressed inline-flex p-1 !rounded-full gap-1" role="tablist" aria-label="Material">
          {(['video', 'apunte'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={sala.material === m}
              onClick={() => cambiarSala({ material: m })}
              className={`sin-tactil px-4 h-8 rounded-full text-[13px] font-bold ${sala.material === m ? 'text-[var(--accent-texto)]' : 'text-[var(--neu-ink3)]'}`}
              style={sala.material === m ? { background: 'var(--neu-card)', boxShadow: 'var(--neu-chica)' } : undefined}
            >
              {m === 'video' ? 'Video' : 'Apunte'}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <div className="flex items-center gap-1" role="group" aria-label="Dónde va el temporizador">
          {DISPOSICIONES.map(([id, nombre, icono]) => (
            <button
              key={id}
              aria-pressed={d === id}
              title={`Temporizador: ${nombre}`}
              aria-label={`Temporizador: ${nombre}`}
              onClick={() => cambiarSala({ disposicion: id })}
              className={`boton boton-chico boton-icono ${d === id ? 'boton-primario' : 'boton-suave'}`}
            >
              <i className={`ti ${icono}`} aria-hidden="true" />
            </button>
          ))}
        </div>
        {sala.material === 'video' && (
          <select value={sala.tamano} onChange={(e) => cambiarSala({ tamano: e.target.value as TamanoVideo })} aria-label="Tamaño del video" className="h-control-sm px-3 text-xs">
            {TAMANOS.map(([t, n]) => (
              <option key={t} value={t}>Video: {n}</option>
            ))}
          </select>
        )}
        {d === 'minimo' && <PomodoroCompacto variante="pildora" selectores={false} />}
        <button onClick={cerrar} className="boton boton-suave boton-icono" aria-label="Cerrar la sala de estudio" title="Cerrar (Esc)">
          <i className="ti ti-x" aria-hidden="true" />
        </button>
      </header>

      <div className={`relative flex-1 min-h-0 grid gap-4 px-4 sm:px-6 pb-4 grid-cols-1 ${clasesCuerpo}`}>
        <section className="neu-raised p-4 sm:p-5 flex flex-col gap-3 min-h-0 min-w-0 overflow-y-auto">
          {sala.material === 'video' ? (
            <>
              <form onSubmit={cargar} className="flex gap-2 flex-wrap">
                <input
                  value={campo}
                  onChange={(e) => setCampo(e.target.value)}
                  placeholder="Enlace de YouTube, Vimeo o un video (.mp4)"
                  aria-label="Enlace del video"
                  className="flex-1 min-w-[200px] h-control px-3 text-sm"
                  data-autofocus
                />
                {campo.trim() && !guardada && (
                  <button type="button" className="boton boton-suave boton-icono" aria-label="Guardar como favorito" title="Guardar como favorito" onClick={guardarEmisora}>
                    <i className="ti ti-star" aria-hidden="true" />
                  </button>
                )}
                {campo.trim() && (
                  <button type="button" className="boton boton-suave boton-icono" aria-label="Copiar enlace de la sala para compartir" title="Copiar enlace para estudiar con alguien" onClick={copiarEnlace}>
                    <i className="ti ti-share-3" aria-hidden="true" />
                  </button>
                )}
                <button type="submit" className="boton boton-primario">Cargar</button>
              </form>
              {emisoras.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-label="Favoritos">
                  {emisoras.map((x) => (
                    <span key={x.id} className="neu-chip inline-flex items-center gap-1 pl-3 pr-1 py-1 text-xs font-bold" style={{ color: 'var(--neu-ink)' }}>
                      <button type="button" onClick={() => abrirEmisora(x.url)} title={x.url} className="sin-neu sin-tactil">{x.nombre}</button>
                      <button
                        type="button"
                        aria-label={`Quitar ${x.nombre} de favoritos`}
                        onClick={() => set({ emisoras: emisoras.filter((e) => e.id !== x.id) })}
                        className="sin-neu sin-tactil w-5 h-5 inline-flex items-center justify-center opacity-60 hover:opacity-100"
                      >
                        <i className="ti ti-x text-[11px]" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {(inc.tipo === 'iframe' || inc.tipo === 'video') && (
                <div className="flex-1 min-h-0 flex items-start justify-center">
                  <div className="aspect-video rounded-2xl overflow-hidden bg-black" style={{ width: ancho, maxHeight: '100%', boxShadow: 'var(--neu-plana)' }}>
                    {inc.tipo === 'iframe' ? (
                      <iframe
                        src={inc.src}
                        title={`Video de ${inc.origen}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="w-full h-full border-0"
                      />
                    ) : (
                      <video src={inc.src} controls className="w-full h-full" />
                    )}
                  </div>
                </div>
              )}
              {inc.tipo === 'ninguno' && (
                <div className="text-sm leading-relaxed" style={{ color: 'var(--neu-ink2)' }}>
                  <p>{inc.motivo}</p>
                  {video && /^https?:/i.test(video) && (
                    <a href={video} target="_blank" rel="noreferrer noopener" className="boton boton-suave boton-chico mt-2">
                      <i className="ti ti-external-link" aria-hidden="true" /> Abrir enlace en otra pestaña
                    </a>
                  )}
                  {!video && (
                    <p className="mt-2 text-xs">
                      Funciona con YouTube (videos, listas y clases en vivo), Vimeo y archivos de video directos. Si el sitio no se puede mostrar aquí, ábrelo en otra pestaña
                      y deja Prima Lex al lado con el temporizador.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : opciones.length > 0 ? (
            <>
              <select value={apunteSel} onChange={(e) => {
                cambiarSala({ apunte: e.target.value })
                useEnfoque.setState({ apunteId: e.target.value.split(':')[1] || null })
              }} aria-label="Apunte a mostrar" className="h-control px-3 text-sm">
                {opciones.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.texto}</option>
                ))}
              </select>
              <ApunteEditable key={apunteSel} ramoId={apRamo} apunteId={apId} />
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>
              Todavía no tienes apuntes. Crea uno en la pestaña Apuntes de un ramo y podrás escribirlo aquí mientras ves el video.
            </p>
          )}
        </section>
        {timer}
      </div>
    </div>
  )
}

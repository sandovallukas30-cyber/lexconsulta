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

const DISPOSICIONES: [DisposicionSala, string, string][] = [
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

  if (!apunte) return <p className="text-sm" style={{ color: 'var(--neu-ink2)' }}>Ese apunte ya no existe.</p>
  return (
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

  const timer = d !== 'minimo' && (
    <aside
      className={`neu-raised p-4 ${d === 'flotante' ? 'absolute right-4 bottom-4 w-[300px] z-10' : ''} ${d === 'arriba' ? 'order-first' : ''}`}
    >
      <PomodoroCompacto variante={d === 'lado' || d === 'flotante' ? 'vertical' : 'horizontal'} />
    </aside>
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

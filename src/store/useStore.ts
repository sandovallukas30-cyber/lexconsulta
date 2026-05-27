import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TemaColorId } from '../theme'

// Devuelve el índice de la próxima letra "pendiente" del rosco, partiendo desde
// la posición actual + 1 y volviendo al principio si es necesario (rosco
// circular). Si no quedan pendientes, devuelve -1.
function siguienteIdx(rosco: { estado: string }[], desde: number): number {
  const n = rosco.length
  for (let i = 1; i <= n; i++) {
    const idx = (desde + i) % n
    if (rosco[idx].estado === 'pendiente' || rosco[idx].estado === 'pasada') return idx
  }
  return -1
}
import type {
  PerfilUsuario,
  VistaId,
  CodigoActivo,
  EntradaJurisprudencia,
  ConsultaHistorial,
  Favorito,
  Mensaje,
  Canvas,
  PartidaPasapalabra,
} from '../types'

interface AppState {
  perfil: PerfilUsuario
  vistaActiva: VistaId
  codigos: CodigoActivo[]
  jurisprudencia: EntradaJurisprudencia[]
  historial: ConsultaHistorial[]
  favoritos: Favorito[]
  canvases: Canvas[]
  canvasActivoId: string | null
  modoOscuro: boolean
  sidebarColapsado: boolean
  modernizarLenguaje: boolean
  modalPerfilAbierto: boolean
  consultaActivaId: string | null
  codigoExploradorActivo: CodigoActivo['tipo'] | null
  codigoMapaActivo: CodigoActivo['tipo'] | null

  setPerfil: (perfil: PerfilUsuario) => void
  setVistaActiva: (vista: VistaId) => void
  toggleCodigo: (tipo: CodigoActivo['tipo']) => void
  agregarJurisprudencia: (entrada: EntradaJurisprudencia) => void
  actualizarJurisprudencia: (id: string, cambios: Partial<EntradaJurisprudencia>) => void
  eliminarJurisprudencia: (id: string) => void
  agregarConsulta: (consulta: ConsultaHistorial) => void
  actualizarConsulta: (id: string, mensajes: Mensaje[]) => void
  eliminarConsulta: (id: string) => void
  cargarConsulta: (id: string) => void
  nuevaConsulta: () => void
  valorarMensaje: (
    consultaId: string,
    mensajeId: string,
    valoracion: 'util' | 'no_util' | null,
    comentario?: string
  ) => void
  agregarFavorito: (favorito: Favorito) => void
  eliminarFavorito: (id: string) => void
  guardarCanvas: (canvas: Canvas) => void
  actualizarCanvas: (id: string, cambios: Partial<Canvas>) => void
  eliminarCanvas: (id: string) => void
  setCanvasActivo: (id: string | null) => void
  toggleModoOscuro: () => void
  toggleSidebar: () => void
  toggleModernizar: () => void
  setCodigoExplorador: (tipo: CodigoActivo['tipo'] | null) => void
  setCodigoMapa: (tipo: CodigoActivo['tipo'] | null) => void
  abrirModalPerfil: () => void
  cerrarModalPerfil: () => void
  acercaAbierto: boolean
  acercaPestana: 'acerca' | 'disclaimer' | 'privacidad' | 'terminos'
  abrirAcerca: (pestana?: 'acerca' | 'disclaimer' | 'privacidad' | 'terminos') => void
  cerrarAcerca: () => void
  partidaPasapalabra: PartidaPasapalabra | null
  iniciarPartidaPasapalabra: (partida: PartidaPasapalabra) => void
  responderLetraActual: (resp: string, correcta: boolean) => void
  pasarLetraActual: () => void
  pausarPartidaPasapalabra: () => void
  retomarPartidaPasapalabra: () => void
  finalizarPartidaPasapalabra: () => void
  abandonarPartidaPasapalabra: () => void
  decrementarTiempoPasapalabra: (segundos: number) => void
  temaColor: TemaColorId
  setTemaColor: (id: TemaColorId) => void
}

const codigosIniciales: CodigoActivo[] = [
  { tipo: 'con', nombre: 'Constitución Política', nombreCorto: 'Constitución', descripcion: 'Carta fundamental de la República', categoria: 'fundamentales', activo: true, cargado: true, bloqueado: true },
  { tipo: 'tra', nombre: 'Tratados Internacionales', nombreCorto: 'Tratados', descripcion: 'Convenios internacionales ratificados por Chile', categoria: 'fundamentales', activo: true, cargado: false, bloqueado: true },
  { tipo: 'civ', nombre: 'Código Civil', nombreCorto: 'Civil', descripcion: 'Relaciones civiles, contratos, propiedad y familia', categoria: 'sustantivos', activo: true, cargado: true },
  { tipo: 'pen', nombre: 'Código Penal', nombreCorto: 'Penal', descripcion: 'Delitos y penas correspondientes', categoria: 'sustantivos', activo: true, cargado: true },
  { tipo: 'lab', nombre: 'Código del Trabajo', nombreCorto: 'Trabajo', descripcion: 'Legislación laboral y derechos de los trabajadores', categoria: 'sustantivos', activo: true, cargado: true },
  { tipo: 'tri', nombre: 'Código Tributario', nombreCorto: 'Tributario', descripcion: 'Impuestos y obligaciones fiscales', categoria: 'sustantivos', activo: true, cargado: true },
  { tipo: 'com', nombre: 'Código de Comercio', nombreCorto: 'Comercio', descripcion: 'Actividades comerciales y sociedades', categoria: 'sustantivos', activo: true, cargado: true },
  { tipo: 'agu', nombre: 'Código de Aguas', nombreCorto: 'Aguas', descripcion: 'Uso y administración de recursos hídricos', categoria: 'sustantivos', activo: true, cargado: true },
  { tipo: 'san', nombre: 'Código Sanitario', nombreCorto: 'Sanitario', descripcion: 'Salud pública, productos farmacéuticos, ejercicio de profesiones de la salud y servicios sanitarios', categoria: 'sustantivos', activo: true, cargado: true },
  { tipo: 'min', nombre: 'Código de Minería', nombreCorto: 'Minería', descripcion: 'Explotación y regulación de recursos mineros', categoria: 'sustantivos', activo: true, cargado: true },
  { tipo: 'pci', nombre: 'Código de Procedimiento Civil', nombreCorto: 'Proc. Civil', descripcion: 'Normas sobre procesos judiciales civiles', categoria: 'procedimentales', activo: true, cargado: true },
  { tipo: 'ppe', nombre: 'Código Procesal Penal', nombreCorto: 'Proc. Penal', descripcion: 'Reglas de los procesos penales', categoria: 'procedimentales', activo: true, cargado: true },
  { tipo: 'pad', nombre: 'Ley 19.880 - Bases del Procedimiento Administrativo', nombreCorto: 'Proc. Admin.', descripcion: 'Reglas que rigen los actos de los órganos del Estado y su relación con los ciudadanos', categoria: 'especiales', activo: true, cargado: true },
  { tipo: 'cot', nombre: 'Código Orgánico de Tribunales', nombreCorto: 'Orgánico Tribunales', descripcion: 'Organización y atribuciones de los tribunales chilenos', categoria: 'procedimentales', activo: true, cargado: true },
  { tipo: 'mil', nombre: 'Código de Justicia Militar', nombreCorto: 'Justicia Militar', descripcion: 'Organización de los tribunales militares, delitos y procedimientos en las Fuerzas Armadas y de Orden', categoria: 'especiales', activo: true, cargado: true },
  { tipo: 'acc', nombre: 'Ley 16.744 - Accidentes del Trabajo y Enfermedades Profesionales', nombreCorto: 'Accidentes del Trabajo', descripcion: 'Seguro social obligatorio: mutuales, prestaciones, prevención e indemnizaciones', categoria: 'especiales', activo: true, cargado: true },
  { tipo: 'dro', nombre: 'Ley 20.000 - Sanciona el Tráfico Ilícito de Estupefacientes', nombreCorto: 'Ley de Drogas', descripcion: 'Tipifica y sanciona delitos sobre estupefacientes y sustancias sicotrópicas', categoria: 'especiales', activo: true, cargado: true },
  { tipo: 'kar', nombre: 'Ley 21.643 - Ley Karin (acoso y violencia laboral)', nombreCorto: 'Ley Karin', descripcion: 'Modifica el Código del Trabajo y estatutos administrativos para prevenir y sancionar acoso laboral, sexual y violencia en el trabajo', categoria: 'especiales', activo: true, cargado: true },
]

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      perfil: null,
      vistaActiva: 'consultar',
      codigos: codigosIniciales,
      jurisprudencia: [],
      historial: [],
      favoritos: [],
      canvases: [],
      canvasActivoId: null,
      modoOscuro: false,
      sidebarColapsado: false,
      modernizarLenguaje: false,
      modalPerfilAbierto: false,
      acercaAbierto: false,
      acercaPestana: 'acerca',
      partidaPasapalabra: null,
      temaColor: 'esmeralda' as TemaColorId,
      consultaActivaId: null,
      codigoExploradorActivo: null,
      codigoMapaActivo: null,

      setPerfil: (perfil) => set({ perfil, modalPerfilAbierto: false }),
      setVistaActiva: (vistaActiva) =>
        set((s) => {
          // Si hay una partida de Pasapalabra en curso y el usuario sale de
          // Práctica, pausarla automáticamente para preservar el tiempo restante.
          const p = s.partidaPasapalabra
          const debePausar =
            vistaActiva !== 'practica' && p && !p.pausadaEn && !p.finalizada
          return debePausar
            ? { vistaActiva, partidaPasapalabra: { ...p!, pausadaEn: Date.now() } }
            : { vistaActiva }
        }),
      toggleCodigo: (tipo) =>
        set((s) => ({
          codigos: s.codigos.map((c) =>
            c.tipo === tipo && !c.bloqueado ? { ...c, activo: !c.activo } : c
          ),
        })),
      agregarJurisprudencia: (entrada) =>
        set((s) => ({ jurisprudencia: [entrada, ...s.jurisprudencia] })),
      actualizarJurisprudencia: (id, cambios) =>
        set((s) => ({
          jurisprudencia: s.jurisprudencia.map((j) => (j.id === id ? { ...j, ...cambios } : j)),
        })),
      eliminarJurisprudencia: (id) =>
        set((s) => ({ jurisprudencia: s.jurisprudencia.filter((j) => j.id !== id) })),
      agregarConsulta: (consulta) =>
        set((s) => ({
          historial: [consulta, ...s.historial].slice(0, 200),
          consultaActivaId: consulta.id,
        })),
      actualizarConsulta: (id, mensajes) =>
        set((s) => ({
          historial: s.historial.map((h) => (h.id === id ? { ...h, mensajes } : h)),
        })),
      eliminarConsulta: (id) =>
        set((s) => ({
          historial: s.historial.filter((h) => h.id !== id),
          consultaActivaId: s.consultaActivaId === id ? null : s.consultaActivaId,
        })),
      cargarConsulta: (id) => set({ consultaActivaId: id, vistaActiva: 'consultar' }),
      nuevaConsulta: () => set({ consultaActivaId: null }),
      valorarMensaje: (consultaId, mensajeId, valoracion, comentario) =>
        set((s) => ({
          historial: s.historial.map((h) => {
            if (h.id !== consultaId) return h
            return {
              ...h,
              mensajes: h.mensajes.map((m) => {
                if (m.id !== mensajeId) return m
                if (valoracion === null) {
                  // Quitar valoración previa
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { valoracion: _v, comentarioValoracion: _c, ...resto } = m
                  return resto
                }
                return {
                  ...m,
                  valoracion,
                  comentarioValoracion: valoracion === 'no_util' ? comentario : undefined,
                }
              }),
            }
          }),
        })),
      agregarFavorito: (favorito) =>
        set((s) => ({ favoritos: [favorito, ...s.favoritos] })),
      eliminarFavorito: (id) =>
        set((s) => ({ favoritos: s.favoritos.filter((f) => f.id !== id) })),
      guardarCanvas: (canvas) =>
        set((s) => ({
          canvases: [canvas, ...s.canvases.filter((c) => c.id !== canvas.id)].slice(0, 50),
          canvasActivoId: canvas.id,
        })),
      actualizarCanvas: (id, cambios) =>
        set((s) => ({
          canvases: s.canvases.map((c) =>
            c.id === id ? { ...c, ...cambios, fechaModificacion: new Date() } : c
          ),
        })),
      eliminarCanvas: (id) =>
        set((s) => ({
          canvases: s.canvases.filter((c) => c.id !== id),
          canvasActivoId: s.canvasActivoId === id ? null : s.canvasActivoId,
        })),
      setCanvasActivo: (id) => set({ canvasActivoId: id }),
      toggleModoOscuro: () => set((s) => ({ modoOscuro: !s.modoOscuro })),
      toggleSidebar: () => set((s) => ({ sidebarColapsado: !s.sidebarColapsado })),
      toggleModernizar: () => set((s) => ({ modernizarLenguaje: !s.modernizarLenguaje })),
      setCodigoExplorador: (tipo) => set({ codigoExploradorActivo: tipo }),
      setCodigoMapa: (tipo) => set({ codigoMapaActivo: tipo }),
      abrirModalPerfil: () => set({ modalPerfilAbierto: true }),
      cerrarModalPerfil: () => set({ modalPerfilAbierto: false }),
      abrirAcerca: (pestana = 'acerca') => set({ acercaAbierto: true, acercaPestana: pestana }),
      cerrarAcerca: () => set({ acercaAbierto: false }),

      iniciarPartidaPasapalabra: (partida) => set({ partidaPasapalabra: partida }),
      responderLetraActual: (resp, correcta) =>
        set((s) => {
          const p = s.partidaPasapalabra
          if (!p) return {}
          const rosco = p.rosco.map((r, i) =>
            i === p.letraActualIdx
              ? { ...r, estado: (correcta ? 'acertada' : 'fallada') as 'acertada' | 'fallada', respuestaUsuario: resp }
              : r
          )
          return { partidaPasapalabra: { ...p, rosco, letraActualIdx: siguienteIdx(rosco, p.letraActualIdx) } }
        }),
      pasarLetraActual: () =>
        set((s) => {
          const p = s.partidaPasapalabra
          if (!p) return {}
          const rosco = p.rosco.map((r, i) =>
            i === p.letraActualIdx && r.estado === 'pendiente' ? { ...r, estado: 'pasada' as const } : r
          )
          return { partidaPasapalabra: { ...p, rosco, letraActualIdx: siguienteIdx(rosco, p.letraActualIdx) } }
        }),
      pausarPartidaPasapalabra: () =>
        set((s) => {
          if (!s.partidaPasapalabra || s.partidaPasapalabra.pausadaEn || s.partidaPasapalabra.finalizada) return {}
          return { partidaPasapalabra: { ...s.partidaPasapalabra, pausadaEn: Date.now() } }
        }),
      retomarPartidaPasapalabra: () =>
        set((s) => {
          if (!s.partidaPasapalabra) return {}
          return { partidaPasapalabra: { ...s.partidaPasapalabra, pausadaEn: null } }
        }),
      finalizarPartidaPasapalabra: () =>
        set((s) => {
          if (!s.partidaPasapalabra) return {}
          return { partidaPasapalabra: { ...s.partidaPasapalabra, finalizada: Date.now(), pausadaEn: null } }
        }),
      abandonarPartidaPasapalabra: () => set({ partidaPasapalabra: null }),
      setTemaColor: (id) => set({ temaColor: id }),
      decrementarTiempoPasapalabra: (segundos) =>
        set((s) => {
          const p = s.partidaPasapalabra
          if (!p || p.pausadaEn || p.finalizada) return {}
          const nuevo = Math.max(0, p.segundosRestantes - segundos)
          return {
            partidaPasapalabra: {
              ...p,
              segundosRestantes: nuevo,
              finalizada: nuevo === 0 ? Date.now() : null,
            },
          }
        }),
    }),
    {
      name: 'prima-lex-storage-v3',
      version: 16,
      partialize: (s) => ({
        perfil: s.perfil,
        codigos: s.codigos,
        jurisprudencia: s.jurisprudencia,
        historial: s.historial,
        favoritos: s.favoritos,
        canvases: s.canvases,
        modoOscuro: s.modoOscuro,
        sidebarColapsado: s.sidebarColapsado,
        modernizarLenguaje: s.modernizarLenguaje,
        partidaPasapalabra: s.partidaPasapalabra,
        temaColor: s.temaColor,
      }),
      migrate: (persisted: unknown, version: number) => {
        if (version < 3) {
          const state = persisted as { codigos?: unknown }
          return { ...(state ?? {}), codigos: codigosIniciales }
        }
        if (version < 16) {
          // v11-15: refrescar metadatos. v16: cargar Código Sanitario (san) y Justicia Militar (mil).
          const state = persisted as { codigos?: CodigoActivo[] }
          const prefs = new Map<string, boolean>()
          if (Array.isArray(state.codigos)) {
            for (const c of state.codigos) prefs.set(c.tipo, c.activo)
          }
          return {
            ...state,
            codigos: codigosIniciales.map((c) => ({
              ...c,
              activo: c.bloqueado ? true : prefs.get(c.tipo) ?? c.activo,
            })),
          }
        }
        return persisted as never
      },
    }
  )
)

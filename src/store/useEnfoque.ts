import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useStore } from './useStore'
import { avisar } from './useAvisos'
import { agregarActividadHoy } from '../services/actividadEstudio'
import { useEnfoqueLocal } from './useEnfoqueLocal'
import { celebrar } from '../services/celebrar'
import { descansoSugerido, fechaDeMs, horasMin, NOMBRE_MODO, type Modo, type SesionFoco, type Tecnica } from '../services/enfoque'

/** Estado del Pomodoro/Flowtime. Store propio y persistido aparte (no infla el
 *  store principal ni sus migraciones). El reloj NO cuenta segundos en el
 *  estado: guarda cuándo termina (`finAt`) o cuándo arrancó, y la hora restante
 *  se calcula contra el reloj; por eso sobrevive a recargar la página, a que la
 *  pestaña esté en segundo plano y a cambiar de vista. */

export interface AjustesEnfoque {
  foco: number
  corto: number
  largo: number
  /** Enfoques antes de un descanso largo. */
  cada: number
  /** Meta diaria de minutos enfocados. */
  metaDia: number
  sonido: boolean
  /** Al terminar un tramo, arranca solo el siguiente. */
  autoSiguiente: boolean
}

export const AJUSTES_DEFECTO: AjustesEnfoque = { foco: 25, corto: 5, largo: 15, cada: 4, metaDia: 120, sonido: true, autoSiguiente: false }

interface Reloj {
  modo: Modo
  tecnica: Tecnica
  estado: 'detenido' | 'corriendo' | 'pausado'
  /** Pomodoro y descansos: cuándo termina (solo corriendo). */
  finAt: number | null
  /** Pomodoro y descansos: lo que falta (válido detenido y pausado). */
  restanteMs: number
  /** Duración total del tramo actual (para dibujar el anillo). */
  totalMs: number
  /** Flowtime enfocando: cuándo arrancó el tramo que corre y lo acumulado antes. */
  inicioRun: number | null
  acumuladoMs: number
  /** Cuándo empezó la sesión de enfoque en curso. */
  inicioSesion: number | null
  ramoId: string | null
  tareaId: string | null
  /** Apunte con el que se estudia (se guarda en cada sesión). */
  apunteId: string | null
  /** Enfoques completados en el ciclo actual. */
  ciclo: number
  /** Veces que apretaste «Me distraje» en la sesión en curso. */
  distracciones: number
}

interface EstadoEnfoque extends Reloj {
  ajustes: AjustesEnfoque
  sesiones: SesionFoco[]
  /** Sesión recién guardada que espera que le pongas una calificación. */
  calificar: { id: string; minutos: number } | null
  distraje: () => void
  calificarSesion: (valor: number, nota: string) => void
  omitirCalificacion: () => void
  iniciar: () => void
  pausar: () => void
  reiniciar: () => void
  /** Enfoque: guarda lo avanzado (si fue ≥ 1 min) y pasa al descanso. */
  terminar: () => void
  /** Descanso: pasa directo al siguiente enfoque. */
  saltarDescanso: () => void
  setModo: (m: Modo) => void
  setTecnica: (t: Tecnica) => void
  setObjetivo: (ramoId: string | null, tareaId: string | null, apunteId?: string | null) => void
  ajustar: (cambios: Partial<AjustesEnfoque>) => void
  tick: () => void
  eliminarSesion: (id: string) => void
  registrarManual: (minutos: number) => void
  /** Sesión que no se hizo con el temporizador (con día, hora y datos a elección). */
  agregarSesion: (d: DatosSesion) => void
  editarSesion: (id: string, d: DatosSesion) => void
}

export interface DatosSesion {
  fecha: string
  /** milisegundos desde 1970; sin hora = se pone al mediodía del día elegido */
  inicio?: number
  minutos: number
  ramoId: string | null
  tareaId: string | null
  calidad?: number
  nota?: string
}

const MIN = 60_000
const MAX_SESIONES = 2000

const durMs = (a: AjustesEnfoque, m: Modo) => (m === 'foco' ? a.foco : m === 'corto' ? a.corto : a.largo) * MIN

function relojInicial(a: AjustesEnfoque): Reloj {
  return {
    modo: 'foco', tecnica: 'pomodoro', estado: 'detenido', finAt: null, restanteMs: durMs(a, 'foco'), totalMs: durMs(a, 'foco'),
    inicioRun: null, acumuladoMs: 0, inicioSesion: null, ramoId: null, tareaId: null, apunteId: null, ciclo: 0, distracciones: 0,
  }
}

export const esFlow = (s: Pick<Reloj, 'tecnica' | 'modo'>) => s.tecnica === 'flowtime' && s.modo === 'foco'

/** Milisegundos enfocados en la sesión en curso (0 en descansos). */
export function msEnfocados(s: Reloj, ahora = Date.now()): number {
  if (s.modo !== 'foco') return 0
  if (esFlow(s)) return s.acumuladoMs + (s.estado === 'corriendo' && s.inicioRun ? ahora - s.inicioRun : 0)
  const restante = s.estado === 'corriendo' && s.finAt ? Math.max(0, s.finAt - ahora) : s.restanteMs
  return s.estado === 'detenido' ? 0 : Math.max(0, s.totalMs - restante)
}

/** Milisegundos que muestra el reloj: lo que falta, o lo transcurrido en Flowtime. */
export function msMostrados(s: Reloj, ahora = Date.now()): number {
  if (esFlow(s)) return msEnfocados(s, ahora)
  return s.estado === 'corriendo' && s.finAt ? Math.max(0, s.finAt - ahora) : s.restanteMs
}

function sonar(a: AjustesEnfoque) {
  if (!a.sonido) return
  try {
    const ctx = new AudioContext()
    const nota = (f: number, inicio: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicio)
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + inicio + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + 0.45)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + inicio)
      osc.stop(ctx.currentTime + inicio + 0.5)
    }
    nota(660, 0)
    nota(880, 0.22)
    nota(1100, 0.44)
  } catch {
    /* sin audio disponible */
  }
}

function notificar(titulo: string, cuerpo: string) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      new Notification(titulo, { body: cuerpo, icon: '/favicon.svg', tag: 'prima-lex-enfoque' })
    }
  } catch {
    /* sin notificaciones */
  }
}

export const useEnfoque = create<EstadoEnfoque>()(
  persist(
    (set, get) => {
      /** Guarda la sesión de enfoque en curso con `minutos` y suma el tiempo a la tarea. */
      const guardarSesion = (minutos: number): SesionFoco | null => {
        const s = get()
        const m = Math.round(minutos)
        if (m < 1) return null
        const inicio = s.inicioSesion ?? Date.now() - m * MIN
        const ambiente = useEnfoqueLocal.getState()
        const sesion: SesionFoco = {
          id: `ses-${inicio}`, inicio, minutos: m, ramoId: s.ramoId, tareaId: s.tareaId, tipo: s.tecnica, fecha: fechaDeMs(inicio),
          ...(s.apunteId ? { apunteId: s.apunteId } : {}),
          ...(s.distracciones ? { distracciones: s.distracciones } : {}),
          ...(ambiente.fondo !== 'ninguno' ? { fondo: ambiente.fondo } : {}),
          ...(ambiente.sonido !== 'apagado' ? { sonido: ambiente.sonido } : {}),
        }
        if (s.sesiones.some((x) => x.id === sesion.id)) return sesion
        // queda pendiente de calificar: «¿cómo te fue?» alimenta los patrones de Estadísticas
        set({ sesiones: [sesion, ...s.sesiones].slice(0, MAX_SESIONES), calificar: { id: sesion.id, minutos: sesion.minutos } })
        // el tiempo cuenta como un día de estudio y como tiempo de la tarea
        const principal = useStore.getState()
        useStore.setState({ diasActividadEstudio: agregarActividadHoy(principal.diasActividadEstudio) })
        if (s.tareaId) {
          const t = principal.tareasPlan.find((x) => x.id === s.tareaId)
          if (t) principal.actualizarTareaPlan(t.id, { minutosEnfocados: (t.minutosEnfocados ?? 0) + m })
        }
        return sesion
      }

      /** Pasa al siguiente tramo tras un enfoque. `minutos` = lo enfocado. */
      const alDescanso = (minutos: number, sonarAviso: boolean) => {
        const s = get()
        const nuevoCiclo = s.ciclo + 1
        const largo = nuevoCiclo % s.ajustes.cada === 0
        const modo: Modo = largo ? 'largo' : 'corto'
        // Flowtime sugiere el descanso según lo que enfocaste
        const total = s.tecnica === 'flowtime' ? descansoSugerido(minutos) * MIN : durMs(s.ajustes, modo)
        const auto = s.ajustes.autoSiguiente
        set({
          modo, ciclo: nuevoCiclo, totalMs: total, restanteMs: total, acumuladoMs: 0, inicioRun: null, inicioSesion: null, distracciones: 0,
          estado: auto ? 'corriendo' : 'detenido', finAt: auto ? Date.now() + total : null,
        })
        if (sonarAviso) {
          sonar(s.ajustes)
          const texto = `Descansa ${horasMin(total / MIN)}: ${largo ? 'descanso largo' : 'descanso corto'}.`
          notificar('Enfoque terminado', texto)
        }
      }

      const alEnfoque = (sonarAviso: boolean) => {
        const s = get()
        const total = durMs(s.ajustes, 'foco')
        const auto = s.ajustes.autoSiguiente
        const flow = s.tecnica === 'flowtime'
        const ahora = Date.now()
        set({
          modo: 'foco', totalMs: total, restanteMs: total, acumuladoMs: 0,
          estado: auto ? 'corriendo' : 'detenido',
          finAt: auto && !flow ? ahora + total : null,
          inicioRun: auto && flow ? ahora : null,
          inicioSesion: auto ? ahora : null,
        })
        if (sonarAviso) {
          sonar(s.ajustes)
          notificar('Descanso terminado', 'Vuelve al enfoque.')
        }
      }

      return {
        ...relojInicial(AJUSTES_DEFECTO),
        ajustes: AJUSTES_DEFECTO,
        sesiones: [],
        calificar: null,

        distraje: () => {
          const s = get()
          if (s.modo !== 'foco' || s.inicioSesion === null) return
          set({ distracciones: s.distracciones + 1 })
        },

        calificarSesion: (valor, nota) => {
          const s = get()
          if (!s.calificar) return
          const id = s.calificar.id
          const n = nota.trim().slice(0, 200)
          set({
            calificar: null,
            sesiones: s.sesiones.map((x) => (x.id === id ? { ...x, calidad: valor, ...(n ? { nota: n } : {}) } : x)),
          })
        },

        omitirCalificacion: () => set({ calificar: null }),

        iniciar: () => {
          const s = get()
          if (s.estado === 'corriendo') return
          const ahora = Date.now()
          const flow = esFlow(s)
          set({
            estado: 'corriendo',
            finAt: flow ? null : ahora + s.restanteMs,
            inicioRun: flow ? ahora : null,
            inicioSesion: s.modo === 'foco' ? s.inicioSesion ?? ahora : null,
          })
        },

        pausar: () => {
          const s = get()
          if (s.estado !== 'corriendo') return
          const ahora = Date.now()
          if (esFlow(s)) set({ estado: 'pausado', acumuladoMs: s.acumuladoMs + (s.inicioRun ? ahora - s.inicioRun : 0), inicioRun: null })
          else set({ estado: 'pausado', restanteMs: Math.max(0, (s.finAt ?? ahora) - ahora), finAt: null })
        },

        reiniciar: () => {
          const s = get()
          const total = durMs(s.ajustes, s.modo)
          set({ estado: 'detenido', finAt: null, restanteMs: total, totalMs: total, inicioRun: null, acumuladoMs: 0, inicioSesion: null, distracciones: 0 })
        },

        terminar: () => {
          const s = get()
          if (s.modo !== 'foco') return
          const minutos = msEnfocados(s) / MIN
          const guardada = guardarSesion(minutos)
          if (guardada) avisar.exito(`Sesión guardada: ${horasMin(guardada.minutos)}`)
          else avisar.info('Muy corta para guardarla (menos de 1 min)')
          alDescanso(minutos, false)
        },

        saltarDescanso: () => {
          if (get().modo === 'foco') return
          alEnfoque(false)
        },

        setModo: (m) => {
          const s = get()
          if (s.estado === 'corriendo') return
          const total = durMs(s.ajustes, m)
          set({ modo: m, estado: 'detenido', finAt: null, restanteMs: total, totalMs: total, inicioRun: null, acumuladoMs: 0, inicioSesion: null })
        },

        setTecnica: (t) => {
          const s = get()
          if (s.estado === 'corriendo') return
          set({ tecnica: t, estado: 'detenido', finAt: null, restanteMs: s.totalMs, inicioRun: null, acumuladoMs: 0, inicioSesion: null })
        },

        setObjetivo: (ramoId, tareaId, apunteId = null) => set({ ramoId, tareaId, apunteId }),

        ajustar: (cambios) => {
          const s = get()
          const ajustes = { ...s.ajustes, ...cambios }
          // si el reloj está detenido, la duración nueva se ve al tiro
          if (s.estado === 'detenido' && !(esFlow(s))) {
            const total = durMs(ajustes, s.modo)
            set({ ajustes, totalMs: total, restanteMs: total })
          } else set({ ajustes })
        },

        tick: () => {
          const s = get()
          if (s.estado !== 'corriendo' || s.finAt === null) return
          if (Date.now() < s.finAt) return
          // llegó a cero
          if (s.modo === 'foco') {
            const m = s.totalMs / MIN
            const guardada = guardarSesion(m)
            avisar.exito(guardada ? `¡Enfoque listo! ${horasMin(guardada.minutos)} guardados.` : '¡Enfoque listo!')
            celebrar(null, true)
            alDescanso(m, true)
          } else {
            avisar.info(`${NOMBRE_MODO[s.modo]} terminado`)
            alEnfoque(true)
          }
        },

        eliminarSesion: (id) => {
          const s = get()
          const sesion = s.sesiones.find((x) => x.id === id)
          if (!sesion) return
          set({ sesiones: s.sesiones.filter((x) => x.id !== id) })
          avisar.conDeshacer('Sesión eliminada', () => set((e) => ({ sesiones: e.sesiones.some((x) => x.id === id) ? e.sesiones : [sesion, ...e.sesiones].sort((a, b) => b.inicio - a.inicio) })))
        },

        agregarSesion: (d) => {
          const s = get()
          const m = Math.round(d.minutos)
          if (m < 1) return
          const [a, mes, dia] = d.fecha.split('-').map(Number)
          const inicio = d.inicio ?? new Date(a, mes - 1, dia, 12, 0).getTime()
          let id = `ses-${inicio}`
          while (s.sesiones.some((x) => x.id === id)) id += 'b'
          const sesion: SesionFoco = {
            id, inicio, minutos: m, ramoId: d.ramoId, tareaId: d.tareaId, tipo: 'pomodoro', fecha: d.fecha,
            ...(d.calidad ? { calidad: d.calidad } : {}), ...(d.nota ? { nota: d.nota } : {}),
          }
          set({ sesiones: [sesion, ...s.sesiones].sort((x, y) => y.inicio - x.inicio).slice(0, MAX_SESIONES) })
          const principal = useStore.getState()
          useStore.setState({ diasActividadEstudio: agregarActividadHoy(principal.diasActividadEstudio) })
          if (d.tareaId) {
            const t = principal.tareasPlan.find((x) => x.id === d.tareaId)
            if (t) principal.actualizarTareaPlan(t.id, { minutosEnfocados: (t.minutosEnfocados ?? 0) + m })
          }
          avisar.exito(`Sesión registrada: ${horasMin(m)}`)
        },

        editarSesion: (id, d) => {
          const s = get()
          const m = Math.round(d.minutos)
          if (m < 1) return
          const [a, mes, dia] = d.fecha.split('-').map(Number)
          set({
            sesiones: s.sesiones.map((x) =>
              x.id !== id
                ? x
                : {
                    ...x,
                    minutos: m, ramoId: d.ramoId, tareaId: d.tareaId, fecha: d.fecha,
                    inicio: d.inicio ?? (d.fecha === x.fecha ? x.inicio : new Date(a, mes - 1, dia, 12, 0).getTime()),
                    calidad: d.calidad || undefined, nota: d.nota || undefined,
                  }
            ),
          })
        },

        registrarManual: (minutos) => {
          const s = get()
          const m = Math.round(minutos)
          if (m < 1) return
          const inicio = Date.now() - m * MIN
          const sesion: SesionFoco = { id: `ses-${inicio}`, inicio, minutos: m, ramoId: s.ramoId, tareaId: s.tareaId, tipo: 'pomodoro', fecha: fechaDeMs(inicio), ...(s.apunteId ? { apunteId: s.apunteId } : {}) }
          set({ sesiones: [sesion, ...s.sesiones].slice(0, MAX_SESIONES) })
          const principal = useStore.getState()
          useStore.setState({ diasActividadEstudio: agregarActividadHoy(principal.diasActividadEstudio) })
          avisar.exito(`Registrado: ${horasMin(m)}`)
        },
      }
    },
    {
      name: 'prima-lex-enfoque-v1',
      version: 1,
      partialize: (s) => ({
        modo: s.modo, tecnica: s.tecnica, estado: s.estado, finAt: s.finAt, restanteMs: s.restanteMs, totalMs: s.totalMs,
        inicioRun: s.inicioRun, acumuladoMs: s.acumuladoMs, inicioSesion: s.inicioSesion, ramoId: s.ramoId, tareaId: s.tareaId, apunteId: s.apunteId,
        ciclo: s.ciclo, distracciones: s.distracciones, ajustes: s.ajustes, sesiones: s.sesiones, calificar: s.calificar,
      }),
      // un reloj que quedó corriendo hace mucho (cerraron el navegador) se
      // descarta sin guardar nada; uno que terminó hace poco lo cierra el motor
      merge: (guardado, actual) => {
        const g = { ...actual, ...(guardado as Partial<EstadoEnfoque>) }
        const ahora = Date.now()
        const abandonado =
          (g.estado === 'corriendo' && g.finAt !== null && g.finAt < ahora - 5 * MIN) ||
          (g.estado === 'corriendo' && g.inicioRun !== null && g.inicioRun < ahora - 8 * 3_600_000)
        if (abandonado) return { ...g, ...relojInicial(g.ajustes), tecnica: g.tecnica, ramoId: g.ramoId, tareaId: g.tareaId, apunteId: g.apunteId ?? null }
        return g
      },
    }
  )
)

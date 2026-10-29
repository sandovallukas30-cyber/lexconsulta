import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { nombreRamo } from '../../services/tareasPlan'
import { registrarUso } from '../../services/uso'
import {
  contarPorEstado,
  FILTROS_INICIALES,
  filtrarMazo,
  NOMBRES_ESTADO,
  seccionesDe,
  tarjetasDeAsignaturas,
  tituloMazo,
  type FiltroEstado,
  type FiltrosMazo,
  type TarjetaDeMazo,
} from '../../services/mazoRepaso'
import { RepasoApunte } from './RepasoApunte'

const ESTADOS: FiltroEstado[] = ['pendientes', 'dificiles', 'nuevas', 'todas']

/** Repaso con filtros: arma un mazo con las tarjetas de tus apuntes (varias asignaturas a la vez), acotado por
 *  estado y por sección, y lo repasa con el mismo repaso espaciado de siempre. */
export function MazoRepaso({ onVolver }: { onVolver: () => void }) {
  const academico = useStore((s) => s.academicoModulos)
  const ramos = useStore((s) => s.ramos)
  const estados = useStore((s) => s.repasoApuntes)
  const [filtros, setFiltros] = useState<FiltrosMazo>(FILTROS_INICIALES)
  const [mazo, setMazo] = useState<{ titulo: string; tarjetas: TarjetaDeMazo[] } | null>(null)

  const todas = useMemo(() => tarjetasDeAsignaturas(academico), [academico])
  const asignaturas = useMemo(() => {
    const cuenta = new Map<string, number>()
    for (const t of todas) cuenta.set(t.ramoId, (cuenta.get(t.ramoId) ?? 0) + 1)
    return Array.from(cuenta, ([id, n]) => ({ id, n, nombre: nombreRamo(id, ramos) ?? id })).sort((a, b) => b.n - a.n)
  }, [todas, ramos])
  const secciones = useMemo(() => seccionesDe(todas, filtros.ramos), [todas, filtros.ramos])
  const conteos = useMemo(() => contarPorEstado(todas, estados, filtros), [todas, estados, filtros])
  const coinciden = conteos[filtros.estado]

  const alternarRamo = (id: string) =>
    setFiltros((f) => {
      const ramosNuevos = f.ramos.includes(id) ? f.ramos.filter((x) => x !== id) : [...f.ramos, id]
      // si la sección elegida ya no existe en las asignaturas marcadas, se suelta
      const quedan = seccionesDe(todas, ramosNuevos).some((s) => s.seccion === f.seccion)
      return { ...f, ramos: ramosNuevos, seccion: quedan ? f.seccion : '' }
    })

  const repasar = () => {
    const tarjetas = filtrarMazo(todas, estados, filtros)
    if (tarjetas.length === 0) return
    registrarUso('practica.mazo')
    setMazo({ titulo: tituloMazo(filtros, filtros.ramos.map((id) => nombreRamo(id, ramos) ?? id)), tarjetas })
  }

  const suave = { color: 'var(--neu-ink2)' }
  const etiqueta = 'block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5'

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <header className="flex items-center gap-3">
          <button onClick={onVolver} className="boton boton-chico boton-suave" aria-label="Volver a Práctica">
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </button>
          <h1 className="titulo-pagina titulo-visible flex-1 min-w-0 truncate">Repaso con filtros</h1>
        </header>

        {todas.length === 0 ? (
          <section className="neu-raised p-5" aria-label="Sin tarjetas">
            <p className="text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>Todavía no hay tarjetas</p>
            <p className="text-sm mt-1" style={suave}>
              Se crean solas desde tus apuntes: cada viñeta «- **Término:** definición» y cada recuadro 🎯 o 💡. También puedes importar un mazo de Anki o Quizlet desde la pestaña Apuntes de una asignatura.
            </p>
          </section>
        ) : (
          <section className="neu-raised p-5 space-y-5" aria-label="Armar mazo">
            <div>
              <span className={etiqueta} style={{ color: 'var(--neu-ink3)' }}>Qué repasar</span>
              <div className="flex gap-2 flex-wrap" role="group" aria-label="Estado de las tarjetas">
                {ESTADOS.map((e) => (
                  <button key={e} onClick={() => setFiltros((f) => ({ ...f, estado: e }))} aria-pressed={filtros.estado === e} className={`boton boton-chico ${filtros.estado === e ? 'boton-primario' : 'boton-suave'}`}>
                    {NOMBRES_ESTADO[e]} <span className="opacity-70 tabular-nums">{conteos[e]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={etiqueta} style={{ color: 'var(--neu-ink3)' }}>
                Asignaturas {filtros.ramos.length === 0 && <span className="normal-case tracking-normal font-medium">· todas</span>}
              </span>
              <div className="flex gap-2 flex-wrap" role="group" aria-label="Asignaturas">
                {asignaturas.map((a) => (
                  <button key={a.id} onClick={() => alternarRamo(a.id)} aria-pressed={filtros.ramos.includes(a.id)} className={`boton boton-chico ${filtros.ramos.includes(a.id) ? 'boton-primario' : 'boton-suave'}`}>
                    {a.nombre} <span className="opacity-70 tabular-nums">{a.n}</span>
                  </button>
                ))}
              </div>
            </div>

            {secciones.length > 1 && (
              <label className="block">
                <span className={etiqueta} style={{ color: 'var(--neu-ink3)' }}>Sección del apunte</span>
                <select value={filtros.seccion} onChange={(e) => setFiltros((f) => ({ ...f, seccion: e.target.value }))} className="w-full h-control px-3 rounded-control border text-sm bg-[var(--neu-bg)] border-zinc-200 text-[var(--neu-ink)]">
                  <option value="">Todas las secciones</option>
                  {secciones.map((s) => (
                    <option key={s.seccion} value={s.seccion}>
                      {s.seccion} ({s.n})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div aria-live="polite">
              <p className="text-sm font-semibold" style={{ color: 'var(--neu-ink)' }}>
                {coinciden === 0 ? 'Ninguna tarjeta coincide' : `${coinciden} ${coinciden === 1 ? 'tarjeta coincide' : 'tarjetas coinciden'}`}
              </p>
              {coinciden > 20 && (
                <p className="text-xs mt-0.5" style={suave}>
                  Se repasan de a 20 por sesión, primero las que más cuestan.
                </p>
              )}
              {coinciden === 0 && filtros.estado === 'pendientes' && (
                <p className="text-xs mt-0.5" style={suave}>
                  No te toca nada hoy con estos filtros. Prueba con «Todas» o «Nuevas».
                </p>
              )}
            </div>
            <button onClick={repasar} disabled={coinciden === 0} className="boton boton-primario w-full">
              Repasar
            </button>
          </section>
        )}
      </div>
      <AnimatePresence>{mazo && <RepasoApunte mazo={mazo} onCerrar={() => setMazo(null)} />}</AnimatePresence>
    </div>
  )
}

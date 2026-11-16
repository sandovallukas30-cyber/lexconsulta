import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { avisar } from '../../store/useAvisos'
import { useDialogo } from '../../hooks/useDialogo'
import { mapaAApunte } from '../../services/mapaApunte'
import { mapaATarjetas } from '../../services/mapaTarjetas'
import { registrarUso } from '../../services/uso'
import { SelectorRamo } from './SelectorRamo'
import type { ApunteModulo, MapaMental } from '../../types'

/** «Crear apunte desde el mapa»: elige la asignatura y el mapa se vuelve un apunte (ramas = secciones).
 *  Con `modo="tarjetas"`, el apunte es una lista de tarjetas de repaso (cada idea al frente, sus ramas atrás). */
export function ModalApunteDesdeMapa({ mapa, onCerrar, modo = 'apunte' }: { mapa: MapaMental; onCerrar: () => void; modo?: 'apunte' | 'tarjetas' }) {
  const esTarjetas = modo === 'tarjetas'
  const ramos = useStore((s) => s.ramos)
  const ref = useDialogo<HTMLDivElement>(true, onCerrar)
  const [moduloId, setModuloId] = useState<string | null>(mapa.moduloId ?? ramos[0]?.id ?? null)
  const resultado = useMemo(() => (esTarjetas ? mapaATarjetas(mapa) : mapaAApunte(mapa)), [mapa, esTarjetas])
  const secciones = resultado.contenido.split('\n').filter((l) => l.startsWith('#')).length
  const tarjetas = resultado.contenido.split('\n').filter((l) => /^\t*- \*\*[^*]+:\*\*/.test(l)).length
  const vacio = resultado.contenido.trim() === ''

  const crear = () => {
    if (!moduloId || vacio) return
    const ahora = Date.now()
    const apunte: ApunteModulo = { id: crypto.randomUUID(), titulo: resultado.titulo, contenido: resultado.contenido, fechaCreacion: ahora, fechaModificacion: ahora }
    const s = useStore.getState()
    s.setApuntesModulo(moduloId, [...(s.academicoModulos[moduloId]?.apuntes ?? []), apunte])
    registrarUso(esTarjetas ? 'mapa.tarjetas' : 'mapa.apunte')
    avisar.exito(esTarjetas ? `${tarjetas} ${tarjetas === 1 ? 'tarjeta creada' : 'tarjetas creadas'}: ya están en tu repaso` : `Apunte "${apunte.titulo}" creado`)
    onCerrar()
    useStore.getState().abrirApunte(moduloId, apunte.id)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onCerrar}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-apunte-desde-mapa"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--neu-card)' }}
      >
        <div className="px-5 py-4">
          <h2 id="titulo-apunte-desde-mapa" className="text-base font-bold" style={{ color: 'var(--neu-ink)' }}>
            {esTarjetas ? 'Crear tarjetas de repaso' : 'Crear apunte desde el mapa'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--neu-ink2)' }}>
            {esTarjetas
              ? 'Cada idea con ramas pasa a ser una tarjeta: al frente la idea, atrás sus ramas. Se guardan como un apunte de la asignatura y entran al repaso espaciado y al simulacro. El mapa no cambia.'
              : 'Cada rama del mapa pasa a ser una sección y lo de más adentro, viñetas. El mapa no cambia.'}
          </p>
          {vacio ? (
            <p className="text-sm mt-3" style={{ color: 'var(--neu-danger)' }}>
              {esTarjetas ? 'Para crear tarjetas, el mapa necesita ideas con ramas (nodos conectados).' : 'Este mapa no tiene nodos todavía.'}
            </p>
          ) : (
            <p className="text-xs mt-3" style={{ color: 'var(--neu-ink3)' }}>
              «{resultado.titulo}»{esTarjetas ? '' : ` · ${secciones} ${secciones === 1 ? 'sección' : 'secciones'}`}
              {tarjetas > 0 ? ` · ${tarjetas} ${tarjetas === 1 ? 'tarjeta de repaso' : 'tarjetas de repaso'}` : ''}
            </p>
          )}
          <label className="block mt-4">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--neu-ink3)' }}>
              Guardar en
            </span>
            <SelectorRamo valor={moduloId} onChange={setModuloId} textoVacio="Elige la asignatura" className="w-full h-control px-3 rounded-control border text-sm bg-[var(--neu-bg)] border-zinc-200 text-[var(--neu-ink)]" />
          </label>
        </div>
        <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--neu-line)' }}>
          <button onClick={onCerrar} className="boton boton-suave">
            Cancelar
          </button>
          <button onClick={crear} disabled={!moduloId || vacio} className="boton boton-primario">
            {esTarjetas ? 'Crear tarjetas' : 'Crear apunte'}
          </button>
        </div>
      </div>
    </div>
  )
}

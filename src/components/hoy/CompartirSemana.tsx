import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fondoModal, panelModal } from '../ui/animacionModal'
import { useStore } from '../../store/useStore'
import { useEnfoque } from '../../store/useEnfoque'
import { avisar } from '../../store/useAvisos'
import { useDialogo } from '../../hooks/useDialogo'
import { calcularRachaEstudio } from '../../services/actividadEstudio'
import { resumenSemana } from '../../services/resumenSemanal'
import { compartirImagen, dibujarSemana } from '../../services/tarjetaSemana'
import { hoyISO, nombreRamo } from '../../services/tareasPlan'

/** Botón «Compartir mi semana»: arma una imagen con tus cifras de la semana
 *  (sin datos personales), la muestra para revisarla y la comparte o descarga. */
export function CompartirSemana() {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button onClick={() => setAbierto(true)} className="boton boton-suave boton-chico mt-3">
        <i className="ti ti-share-3" aria-hidden="true" /> Compartir mi semana
      </button>
      <AnimatePresence>{abierto && <VistaPrevia onCerrar={() => setAbierto(false)} />}</AnimatePresence>
    </>
  )
}

function VistaPrevia({ onCerrar }: { onCerrar: () => void }) {
  const sesiones = useEnfoque((s) => s.sesiones)
  const tareas = useStore((s) => s.tareasPlan)
  const dias = useStore((s) => s.diasActividadEstudio)
  const ramos = useStore((s) => s.ramos)
  const ref = useDialogo<HTMLDivElement>(true, onCerrar)
  const [conRamo, setConRamo] = useState(true)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    const resumen = resumenSemana({ sesiones, tareas, diasActividad: dias, hoy: hoyISO(), racha: calcularRachaEstudio(dias) })
    const ramoTop = conRamo && resumen.ramoTop ? nombreRamo(resumen.ramoTop.ramoId, ramos) : null
    dibujarSemana(resumen, { ramoTop })
      .then((b) => {
        if (!vivo) return
        setBlob(b)
        setUrl((previa) => {
          if (previa) URL.revokeObjectURL(previa)
          return URL.createObjectURL(b)
        })
        setError(null)
      })
      .catch((e) => vivo && setError(e instanceof Error ? e.message : 'No se pudo crear la imagen'))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conRamo])

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  const compartir = async () => {
    if (!blob) return
    const r = await compartirImagen(blob)
    avisar.exito(r === 'descargada' ? 'Imagen descargada: súbela a tus redes o mándala por WhatsApp' : 'Listo, a compartir')
  }

  return (
    <motion.div {...fondoModal} className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onCerrar}>
      <motion.div
        {...panelModal}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Compartir mi semana"
        onClick={(e) => e.stopPropagation()}
        className="max-w-sm w-full max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl p-5"
        style={{ background: 'var(--neu-card)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold" style={{ color: 'var(--neu-ink)' }}>Mi semana</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="boton boton-fantasma boton-chico boton-icono">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        <div className="rounded-xl overflow-hidden mb-3" style={{ background: 'var(--neu-bg3)', aspectRatio: '1080 / 1350' }}>
          {url ? <img src={url} alt="Resumen de tu semana de estudio" className="w-full h-full object-contain" /> : <p className="p-6 text-sm text-center" style={{ color: 'var(--neu-ink2)' }}>{error ?? 'Armando tu imagen…'}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--neu-ink2)' }}>
          <input type="checkbox" checked={conRamo} onChange={(e) => setConRamo(e.target.checked)} />
          Mostrar la asignatura que más estudié
        </label>
        <p className="text-xs mb-3" style={{ color: 'var(--neu-ink3)' }}>La imagen solo lleva cifras de la semana: sin tu nombre ni tu correo.</p>
        <div className="flex gap-2">
          <button onClick={() => void compartir()} disabled={!blob} className="boton boton-primario flex-1">
            <i className="ti ti-share-3" aria-hidden="true" /> Compartir
          </button>
          <button onClick={onCerrar} className="boton boton-suave">Cerrar</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { avisar } from '../../store/useAvisos'
import {
  aplicarRespaldo,
  descargarRespaldo,
  fechaUltimoRespaldo,
  resumenActual,
  validarRespaldo,
  type ArchivoRespaldo,
  type ModoImportacion,
  type ResumenRespaldo,
} from '../../services/respaldo'

const VERDE = 'var(--accent-base)'
const MAX_BYTES = 25 * 1024 * 1024

interface Props {
  onCerrar: () => void
}

/** Solo los contadores > 0: "0 casos · 0 subrayados" es ruido. */
function textoResumen(r: ResumenRespaldo): string {
  const n = (v: number, uno: string, varios: string) => (v > 0 ? `${v} ${v === 1 ? uno : varios}` : '')
  const partes = [
    n(r.ramos, 'ramo', 'ramos'),
    n(r.apuntes, 'apunte', 'apuntes'),
    n(r.clases, 'clase', 'clases'),
    n(r.evaluaciones, 'evaluación', 'evaluaciones'),
    n(r.casos, 'caso', 'casos'),
    n(r.colecciones, 'colección', 'colecciones'),
    n(r.mapasMentales, 'mapa mental', 'mapas mentales'),
    n(r.subrayados, 'subrayado', 'subrayados'),
  ].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : 'nada todavía'
}

function haceCuanto(ms: number, ahora: number): string {
  const dias = Math.floor((ahora - ms) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}

/** Exportar / importar respaldo (B1). Nunca aplica nada sin que el usuario
 *  vea primero qué trae el archivo y elija explícitamente cómo aplicarlo. */
export function ModalRespaldo({ onCerrar }: Props) {
  const modoOscuro = useStore((s) => s.modoOscuro)
  const refArchivo = useRef<HTMLInputElement>(null)
  const [actual] = useState(resumenActual)
  const [archivo, setArchivo] = useState<{ nombre: string; respaldo: ArchivoRespaldo; resumen: ResumenRespaldo } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modo, setModo] = useState<ModoImportacion>('combinar')
  const [copiaPrevia, setCopiaPrevia] = useState(true)
  const [ultimo, setUltimo] = useState(fechaUltimoRespaldo)
  const [ahora] = useState(() => Date.now())
  const [arrastrando, setArrastrando] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCerrar])

  const exportar = () => {
    try {
      descargarRespaldo()
      setUltimo(Date.now())
      avisar.exito('Respaldo descargado')
    } catch {
      avisar.error('No se pudo generar el respaldo.')
    }
  }

  const elegirArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    void leerArchivo(f)
  }

  const leerArchivo = async (f: File | undefined) => {
    setArchivo(null)
    setError(null)
    if (!f) return
    if (f.size > MAX_BYTES) {
      setError('El archivo pesa demasiado para ser un respaldo de Prima Lex.')
      return
    }
    const r = validarRespaldo(await f.text())
    if (!r.ok) {
      setError(r.error)
      return
    }
    setArchivo({ nombre: f.name, respaldo: r.respaldo, resumen: r.resumen })
    setModo('combinar')
  }

  const importar = () => {
    if (!archivo) return
    try {
      if (modo === 'reemplazar' && copiaPrevia) descargarRespaldo()
      aplicarRespaldo(archivo.respaldo, modo)
      avisar.exito(modo === 'reemplazar' ? 'Datos reemplazados por el respaldo' : 'Respaldo combinado con tus datos')
      onCerrar()
    } catch {
      avisar.error('No se pudo importar: no hay espacio suficiente en el navegador. Tus datos no cambiaron.')
    }
  }

  const fechaArchivo = archivo?.respaldo.fecha ? new Date(archivo.respaldo.fecha) : null
  const texto = modoOscuro ? 'text-zinc-100' : 'text-zinc-900'
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-500'
  const tarjeta = modoOscuro ? 'bg-zinc-800/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCerrar}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-respaldo"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          void leerArchivo(e.dataTransfer.files?.[0])
        }}
        className={`max-w-lg w-full max-h-[88vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${modoOscuro ? 'bg-zinc-900' : 'bg-white'} ${
          arrastrando ? 'ring-2 ring-[var(--accent-base)]' : ''
        }`}
      >
        <div className={`px-5 sm:px-6 py-4 border-b flex items-center justify-between ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <h2 id="titulo-respaldo" className={`text-lg font-serif font-bold ${texto}`}>
            Respaldo de tus datos
          </h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            <i className="ti ti-x text-lg" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-5">
          <p className={`text-xs leading-relaxed ${suave}`}>
            Tus ramos, apuntes, colecciones y mapas se guardan solo en este navegador. Si borras los datos del navegador o
            cambias de equipo, se pierden: descarga un respaldo de vez en cuando.
          </p>

          <section>
            <h3 className={`text-sm font-semibold mb-2 ${texto}`}>Exportar</h3>
            <div className={`rounded-xl border p-3 ${tarjeta}`}>
              <p className={`text-xs ${suave}`}>Tienes ahora: {textoResumen(actual)}.</p>
              <p className={`text-xs mt-1 ${ultimo && ahora - ultimo < 14 * 86_400_000 ? suave : 'text-amber-600'}`}>
                {ultimo ? `Último respaldo desde este navegador: ${haceCuanto(ultimo, Math.max(ahora, ultimo))}.` : 'Nunca has descargado un respaldo desde este navegador.'}
              </p>
              <button
                onClick={exportar}
                className="mt-3 inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-sm font-medium text-white"
                style={{ background: VERDE }}
              >
                <i className="ti ti-download text-base" />
                Descargar respaldo (.json)
              </button>
            </div>
          </section>

          <section>
            <h3 className={`text-sm font-semibold mb-2 ${texto}`}>Importar</h3>
            <p className={`text-xs mb-2 ${suave}`}>Elige el archivo .json o arrástralo a esta ventana.</p>
            <input ref={refArchivo} type="file" accept=".json,application/json" className="hidden" onChange={elegirArchivo} />
            <button
              onClick={() => refArchivo.current?.click()}
              className={`inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-sm font-medium border transition-colors ${
                modoOscuro ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <i className="ti ti-file-upload text-base" />
              {archivo ? 'Elegir otro archivo' : 'Elegir archivo de respaldo'}
            </button>

            {error && (
              <p role="alert" className="mt-3 text-xs text-red-600">
                {error}
              </p>
            )}

            {archivo && (
              <div className={`mt-3 rounded-xl border p-3 space-y-3 ${tarjeta}`}>
                <div>
                  <p className={`text-sm font-medium break-all ${texto}`}>{archivo.nombre}</p>
                  <p className={`text-xs ${suave}`}>
                    {fechaArchivo && !isNaN(fechaArchivo.getTime())
                      ? `Creado el ${fechaArchivo.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}. `
                      : ''}
                    Contiene: {textoResumen(archivo.resumen)}.
                  </p>
                </div>

                <fieldset className="space-y-2">
                  <legend className={`text-xs font-medium mb-1 ${suave}`}>¿Cómo aplicarlo?</legend>
                  {(
                    [
                      ['combinar', 'Combinar (recomendado)', 'Agrega lo que no tienes. No borra ni modifica nada de lo que ya hay en este navegador.'],
                      ['reemplazar', 'Reemplazar', 'Borra tus datos actuales de estudio y deja solo los del respaldo.'],
                    ] as const
                  ).map(([valor, titulo, detalle]) => (
                    <label
                      key={valor}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer ${
                        modo === valor ? '' : modoOscuro ? 'border-zinc-700' : 'border-zinc-200'
                      }`}
                      style={modo === valor ? { borderColor: valor === 'reemplazar' ? '#dc2626' : VERDE } : undefined}
                    >
                      <input
                        type="radio"
                        name="modo-respaldo"
                        value={valor}
                        checked={modo === valor}
                        onChange={() => setModo(valor)}
                        className="mt-1"
                        style={{ accentColor: valor === 'reemplazar' ? '#dc2626' : VERDE }}
                      />
                      <span>
                        <span className={`block text-sm font-medium ${texto}`}>{titulo}</span>
                        <span className={`block text-xs ${suave}`}>{detalle}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>

                {modo === 'reemplazar' && (
                  <label className={`flex items-center gap-2 text-xs ${suave}`}>
                    <input type="checkbox" checked={copiaPrevia} onChange={(e) => setCopiaPrevia(e.target.checked)} style={{ accentColor: VERDE }} />
                    Descargar antes una copia de mis datos actuales
                  </label>
                )}
              </div>
            )}
          </section>
        </div>

        <div className={`px-5 sm:px-6 py-4 border-t flex justify-end gap-2 ${modoOscuro ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            onClick={onCerrar}
            className={`px-3 min-h-[40px] rounded-lg text-sm ${modoOscuro ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            Cerrar
          </button>
          {archivo && (
            <button
              onClick={importar}
              className="px-3 min-h-[40px] rounded-lg text-sm font-medium text-white"
              style={{ background: modo === 'reemplazar' ? '#dc2626' : VERDE }}
            >
              {modo === 'reemplazar' ? 'Reemplazar mis datos' : 'Combinar con mis datos'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

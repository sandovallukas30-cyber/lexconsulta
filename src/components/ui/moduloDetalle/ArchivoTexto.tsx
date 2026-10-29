import { useEffect, useRef, useState } from 'react'
import type { ArchivoTexto } from '../../../types'
import { esPdf, formatoTamano, leerArchivo } from '../../../services/almacenArchivos'

/** Enlace que abre el archivo adjunto de un texto. Se prepara al mostrarse (el navegador solo deja abrir una pestaña
 *  desde un toque directo, no después de leer el archivo). Si el archivo no está en este dispositivo, lo dice. */
export function EnlaceArchivo({ archivo, modoOscuro }: { archivo: ArchivoTexto; modoOscuro: boolean }) {
  const [estado, setEstado] = useState<{ id: string; url: string | null } | null>(null)

  useEffect(() => {
    let cancelado = false
    let url: string | null = null
    void leerArchivo(archivo.id).then((blob) => {
      if (cancelado) return
      if (blob) url = URL.createObjectURL(new Blob([blob], { type: archivo.tipo || blob.type }))
      setEstado({ id: archivo.id, url })
    })
    return () => {
      cancelado = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [archivo.id, archivo.tipo])

  const pdf = esPdf(archivo.nombre, archivo.tipo)
  const etiqueta = `${archivo.nombre} · ${formatoTamano(archivo.tamano)}`
  if (!estado || estado.id !== archivo.id) return null
  if (!estado.url) {
    return (
      <p className={`text-xs mt-0.5 ${modoOscuro ? 'text-zinc-500' : 'text-zinc-500'}`}>
        <i className="ti ti-file-text mr-1" aria-hidden="true" />
        «{archivo.nombre}» está en otro dispositivo. Edita el texto para adjuntarlo de nuevo aquí.
      </p>
    )
  }
  return (
    <a
      href={estado.url}
      target="_blank"
      rel="noopener noreferrer"
      {...(pdf ? {} : { download: archivo.nombre })}
      className="text-xs inline-flex items-center gap-1 mt-0.5 hover:underline"
      style={{ color: 'var(--accent-texto)' }}
      aria-label={`${pdf ? 'Abrir' : 'Descargar'} ${etiqueta}`}
    >
      <i className="ti ti-file-text" aria-hidden="true" />
      {pdf ? 'Abrir' : 'Descargar'} {etiqueta}
    </a>
  )
}

/** Campo del formulario para adjuntar (o cambiar, o quitar) el archivo de un texto. */
export function CampoArchivo({
  actual,
  nuevo,
  quitado,
  error,
  onElegir,
  onQuitar,
  modoOscuro,
}: {
  actual?: ArchivoTexto
  nuevo: File | null
  quitado: boolean
  error: string | null
  onElegir: (f: File) => void
  onQuitar: () => void
  modoOscuro: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const nombre = nuevo ? `${nuevo.name} · ${formatoTamano(nuevo.size)}` : actual && !quitado ? `${actual.nombre} · ${formatoTamano(actual.tamano)}` : null
  const suave = modoOscuro ? 'text-zinc-400' : 'text-zinc-600'
  return (
    <div>
      <span className={`block text-xs font-medium mb-1 ${suave}`}>Archivo (opcional)</span>
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => ref.current?.click()} className="boton boton-suave boton-chico">
          <i className="ti ti-file-text" aria-hidden="true" /> {nombre ? 'Cambiar archivo' : 'Adjuntar un PDF u otro archivo'}
        </button>
        {nombre && (
          <>
            <span className={`text-xs min-w-0 truncate ${modoOscuro ? 'text-zinc-300' : 'text-zinc-700'}`}>{nombre}</span>
            <button type="button" onClick={onQuitar} className="boton boton-fantasma boton-chico" aria-label="Quitar el archivo">
              <i className="ti ti-x" aria-hidden="true" /> Quitar
            </button>
          </>
        )}
        <input
          ref={ref}
          type="file"
          className="hidden"
          accept="application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) onElegir(f)
          }}
        />
      </div>
      {error ? (
        <p className="text-xs mt-1 text-red-600" role="alert">{error}</p>
      ) : (
        <p className={`text-[11px] mt-1 ${suave}`}>Se guarda solo en este dispositivo: no va en el respaldo ni en tu cuenta.</p>
      )}
    </div>
  )
}

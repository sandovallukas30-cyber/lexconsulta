import { createPortal } from 'react-dom'
import { ApunteContenido } from './ApunteContenido'
import { obtenerMetadata } from '../../data/codigosMetadata'
import { citaArticulo } from '../../services/citas'
import type { Bloque } from '../../services/apunteFormato'
import type { ApunteModulo, Articulo, CodigoTipo, CuadernoApuntes, SesionClase } from '../../types'

/** Vistas para imprimir un apunte o un artículo solos (C9). Viven fuera de
 *  #root (portal) y solo se muestran al imprimir con el modo que les toca
 *  (ver services/impresion.ts e index.css). Siempre en claro, con tipografía
 *  de texto largo y sin nada interactivo. */

const hoy = () => new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })

const ESTILO_COMUN = `
  @page { margin: 2cm; }
  .imprimir-apunte, .imprimir-articulo { color: #111; background: #fff; font-family: Georgia, 'Times New Roman', serif; }
  .imp-cabecera { border-bottom: 1px solid #999; padding-bottom: 8px; margin-bottom: 18px; }
  .imp-cabecera h1 { font-size: 20px; line-height: 1.25; margin: 0 0 4px; font-family: inherit; font-weight: bold; }
  .imp-meta { font-size: 10.5px; color: #555; font-family: system-ui, sans-serif; }
  .imp-pie { margin-top: 24px; padding-top: 6px; border-top: 1px solid #ccc; font-size: 9.5px; color: #666; font-family: system-ui, sans-serif; }
`

export function VistaImprimibleApunte({
  apunte, bloques, clase, cuaderno,
}: {
  apunte: ApunteModulo
  bloques: Bloque[]
  clase?: SesionClase
  cuaderno?: CuadernoApuntes
}) {
  const meta = [cuaderno?.nombre, clase?.tema, apunte.articuloRelacionado].filter(Boolean).join(' · ')
  return createPortal(
    <div className="imprimir-apunte">
      <style>{ESTILO_COMUN + `
        .imprimir-apunte .imp-cuerpo { font-size: 12.5px; line-height: 1.6; }
      `}</style>
      <header className="imp-cabecera">
        <h1>{apunte.titulo || 'Apunte'}</h1>
        <p className="imp-meta">
          {meta ? `${meta} · ` : ''}modificado el {new Date(apunte.fechaModificacion).toLocaleDateString('es-CL')} · impreso el {hoy()}
        </p>
      </header>
      <div className="imp-cuerpo">
        <ApunteContenido bloques={bloques} tema="claro" idBase={`imp-${apunte.id}`} />
      </div>
      <p className="imp-pie">Prima Lex · apunte personal</p>
    </div>,
    document.body
  )
}

export function VistaImprimibleArticulo({
  tipo, articulo, texto, rutaSeccion,
}: {
  tipo: CodigoTipo
  articulo: Articulo
  /** El texto tal como se ve (modernizado o no). */
  texto: string
  /** "Libro IV · Título II" -- dónde está el artículo. */
  rutaSeccion?: string
}) {
  const meta = obtenerMetadata(tipo)
  const modernizado = texto !== articulo.t
  return createPortal(
    <div className="imprimir-articulo">
      <style>{ESTILO_COMUN + `
        .imprimir-articulo .imp-texto { font-size: 13px; line-height: 1.65; white-space: pre-wrap; }
        .imprimir-articulo .imp-aviso { font-size: 10.5px; margin-top: 12px; padding: 6px 8px; background: #f3f3f3; border-left: 3px solid #999; font-family: system-ui, sans-serif; }
      `}</style>
      <header className="imp-cabecera">
        <h1>{citaArticulo(tipo, articulo.a)}</h1>
        <p className="imp-meta">
          {meta?.nombreOficial ?? tipo}
          {rutaSeccion ? ` · ${rutaSeccion}` : ''}
        </p>
      </header>
      <p className="imp-texto">{texto}</p>
      {modernizado && <p className="imp-aviso">Texto con lenguaje modernizado por Prima Lex para facilitar la lectura; no es el texto oficial.</p>}
      <p className="imp-pie">
        Fuente: {meta ? `${meta.nombreOficial} — ${meta.norma}. ${meta.fuenteUrl}` : 'BCN'} · impreso el {hoy()} · Prima Lex
      </p>
    </div>,
    document.body
  )
}

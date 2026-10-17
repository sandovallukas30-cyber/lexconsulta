import { Disclaimer, Privacidad, Terminos } from '../ui/ModalAcercaDe'
import type { DocumentoLegal } from '../../services/rutasLegales'

type Documento = DocumentoLegal

const DOCUMENTOS: Record<Documento, { titulo: string; Cuerpo: typeof Privacidad }> = {
  privacidad: { titulo: 'Política de privacidad', Cuerpo: Privacidad },
  terminos: { titulo: 'Términos de uso', Cuerpo: Terminos },
  'aviso-legal': { titulo: 'Aviso legal', Cuerpo: Disclaimer },
}

/** Páginas públicas con los textos legales (para enlazar desde Google, Microsoft, etc.). */
export function PaginaLegal({ documento }: { documento: Documento }) {
  const { titulo, Cuerpo } = DOCUMENTOS[documento]
  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--neu-bg)' }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <a href="/" className="inline-flex items-center gap-3 mb-8" style={{ color: 'var(--neu-ink)' }}>
          <span className="w-11 h-11 rounded-[14px] flex items-center justify-center" style={{ background: 'var(--accent-base)', boxShadow: 'var(--neu-plana)' }}>
            <i className="ti ti-scale text-lg text-white" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-extrabold leading-tight">Prima Lex</span>
            <span className="block text-xs" style={{ color: 'var(--neu-ink3)' }}>Tu cuaderno de Derecho</span>
          </span>
        </a>
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--neu-ink)' }}>{titulo}</h1>
        <nav className="flex flex-wrap gap-4 text-sm mb-6" aria-label="Documentos legales">
          {(Object.keys(DOCUMENTOS) as Documento[]).map((d) => (
            <a key={d} href={`/${d}`} aria-current={d === documento ? 'page' : undefined} style={{ color: d === documento ? 'var(--neu-ink)' : 'var(--accent-texto)', fontWeight: d === documento ? 700 : 500 }}>
              {DOCUMENTOS[d].titulo}
            </a>
          ))}
        </nav>
        <div className="neu-raised p-6 sm:p-8">
          <Cuerpo modoOscuro={false} />
        </div>
        <p className="text-sm mt-8">
          <a href="/" style={{ color: 'var(--accent-texto)' }}>← Volver a Prima Lex</a>
        </p>
      </div>
    </div>
  )
}

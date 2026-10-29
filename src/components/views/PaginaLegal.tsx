import { LogoPrimaLex } from '../ui/LogoPrimaLex'
import { useEffect } from 'react'
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
  // cada documento con su propio título de pestaña (navegación, favoritos, buscadores)
  useEffect(() => {
    const antes = document.title
    document.title = `${titulo} — Prima Lex`
    return () => {
      document.title = antes
    }
  }, [titulo])
  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--neu-bg)' }}>
      <main className="max-w-2xl mx-auto px-5 py-10">
        <a href="/" className="inline-flex items-center gap-3 mb-8" style={{ color: 'var(--neu-ink)' }}>
          <LogoPrimaLex size={44} />
          <span>
            <span className="block text-lg font-extrabold leading-tight">Prima Lex</span>
            <span className="block text-xs" style={{ color: 'var(--neu-ink3)' }}>Tu cuaderno de Derecho</span>
          </span>
        </a>
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--neu-ink)' }}>{titulo}</h1>
        <nav className="flex flex-wrap gap-x-4 text-sm mb-6" aria-label="Documentos legales">
          {(Object.keys(DOCUMENTOS) as Documento[]).map((d) => (
            <a key={d} href={`/${d}`} className="inline-flex items-center min-h-11" aria-current={d === documento ? 'page' : undefined} style={{ color: d === documento ? 'var(--neu-ink)' : 'var(--accent-texto)', fontWeight: d === documento ? 700 : 500 }}>
              {DOCUMENTOS[d].titulo}
            </a>
          ))}
        </nav>
        <div className="neu-raised p-6 sm:p-8">
          <Cuerpo modoOscuro={false} />
        </div>
        <p className="text-sm mt-8">
          <a href="/" className="inline-flex items-center min-h-11" style={{ color: 'var(--accent-texto)' }}>← Volver a Prima Lex</a>
        </p>
      </main>
    </div>
  )
}

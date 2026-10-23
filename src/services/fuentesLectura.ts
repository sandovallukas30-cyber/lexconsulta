/** Letra para leer artículos (Explorador, Colecciones) y apuntes. Es un ajuste de cada dispositivo. La interfaz y los
 *  títulos de las demás pantallas no cambian. Las fuentes viajan con la propia app (nada se pide a servicios externos) y
 *  solo se descargan cuando hacen falta. */
export type FuenteLectura = 'clasica' | 'literata' | 'moderna' | 'legible'

export interface OpcionFuente {
  id: FuenteLectura
  nombre: string
  descripcion: string
  /** `font-family` con la que se muestra la muestra de la opción (igual a la de base.css). */
  familia: string
}

export const FUENTES_LECTURA: OpcionFuente[] = [
  { id: 'clasica', nombre: 'Clásica', descripcion: 'Serifa de libro (Georgia). La de siempre.', familia: "Georgia, Cambria, 'Times New Roman', Times, serif" },
  { id: 'literata', nombre: 'Literata', descripcion: 'Serifa pensada para leer mucho rato en pantalla.', familia: "'Literata Variable', Georgia, serif" },
  { id: 'moderna', nombre: 'Moderna', descripcion: 'Sin serifa, la misma letra de la interfaz.', familia: 'var(--font-sans)' },
  { id: 'legible', nombre: 'Muy legible', descripcion: 'Atkinson Hyperlegible: letras que no se confunden entre sí.', familia: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif" },
]

export const FUENTE_LECTURA_DEFECTO: FuenteLectura = 'clasica'

export const esFuenteLectura = (v: unknown): v is FuenteLectura => FUENTES_LECTURA.some((f) => f.id === v)

const cargadas = new Set<FuenteLectura>()

/** Descarga la fuente la primera vez que se usa (las otras dos ya están en la app o en el sistema). */
export async function cargarFuenteLectura(id: FuenteLectura): Promise<void> {
  if (cargadas.has(id)) return
  cargadas.add(id)
  try {
    if (id === 'literata') await import('@fontsource-variable/literata')
    else if (id === 'legible') await import('@fontsource-variable/atkinson-hyperlegible-next')
  } catch {
    cargadas.delete(id) // sin red o sin caché: se vuelve a intentar la próxima vez; mientras tanto se ve la de respaldo
  }
}

// Utilidades para mostrar la numeración de incisos en los artículos.
// "Inciso" en la técnica legislativa chilena: cada párrafo separado por punto
// y aparte dentro de un mismo artículo. La cita formal usa ordinales:
// "Art. 161 inciso primero" o, abreviado, "Art. 161 inc. 1°".

const ORDINALES = [
  '1°',
  '2°',
  '3°',
  '4°',
  '5°',
  '6°',
  '7°',
  '8°',
  '9°',
  '10°',
  '11°',
  '12°',
  '13°',
  '14°',
  '15°',
  '16°',
  '17°',
  '18°',
  '19°',
  '20°',
]

/** Etiqueta para el inciso de índice `i` (0 → "1°"). */
export function etiquetaInciso(i: number): string {
  return ORDINALES[i] ?? `${i + 1}°`
}

/** Divide el texto de un artículo en incisos (párrafos). */
export function dividirIncisos(texto: string): string[] {
  if (!texto || !texto.trim()) return []
  return texto.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0)
}

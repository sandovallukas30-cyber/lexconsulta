export interface PeticionPdf {
  pdf: ArrayBuffer
}

export type RespuestaPdf =
  | { t: 'estado'; texto: string }
  | { t: 'progreso'; pagina: number; total: number }
  | { t: 'listo'; titulo: string | null; md: string; avisos: string[] }
  | { t: 'error'; mensaje: string }

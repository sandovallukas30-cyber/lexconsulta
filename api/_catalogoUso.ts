// Catálogo y validación de las ESTADÍSTICAS DE USO anónimas (qué pantallas se usan, cuánto tiempo y qué funciones se tocan).
//
// Lo comparten el navegador (src/services/uso.ts), el servidor (api/uso.ts) y el panel (src/components/ui/PanelUso.tsx): así lo que
// se envía, lo que se acepta y lo que se muestra son siempre la misma lista. El guion bajo inicial hace que Vercel NO lo trate
// como un endpoint. No lleva dependencias.
//
// Qué NO se recolecta jamás: texto de apuntes, títulos, búsquedas, nombres, correos ni ningún identificador de persona o de
// dispositivo. Solo CONTADORES: «esta función se usó N veces» y «en esta pantalla hubo N segundos de uso activo».

/** Pantallas de la app (coinciden con VistaId). */
export const VISTAS_USO = ['hoy', 'tareas', 'enfoque', 'calendario', 'modulos', 'explorador', 'colecciones', 'mapasmentales', 'practica'] as const
export type VistaUso = (typeof VISTAS_USO)[number]

export const DISPOSITIVOS_USO = ['movil', 'tablet', 'escritorio'] as const
export type DispositivoUso = (typeof DISPOSITIVOS_USO)[number]

/** Funciones que se cuentan. La clave es estable (no se cambia después de publicar); el texto es el que se ve en el panel. */
export const FUNCIONES_USO = {
  // Apuntes
  'apunte.nuevo': 'Crear un apunte',
  'apunte.importar': 'Importar un apunte (.md, .txt o PDF)',
  'apunte.abrir': 'Abrir un apunte para leerlo',
  'apunte.editar': 'Editar un apunte',
  'apunte.articulos': 'Consultar artículos al lado del apunte',
  'apunte.buscar': 'Buscar una palabra dentro del apunte',
  'apunte.repasar': 'Repasar un apunte con tarjetas',
  'apunte.exportar': 'Compartir o exportar un apunte',
  // Repaso con tarjetas
  'repaso.respuesta': 'Responder una tarjeta de repaso',
  'repaso.pista': 'Pedir una pista en una tarjeta',
  'repaso.cuatroBotones': 'Activar los 4 botones de repaso',
  // Explorador de códigos
  'explorador.articulo': 'Leer un artículo en el Explorador',
  'explorador.buscar': 'Buscar o ir a un artículo',
  'explorador.indice': 'Abrir el índice de un código',
  'explorador.lectura': 'Abrir el modo lectura de un código',
  'explorador.copiarCita': 'Copiar un artículo con su cita',
  'explorador.guardar': 'Guardar un artículo en una colección',
  // Colecciones y mapas
  'coleccion.crear': 'Crear una colección',
  'coleccion.repaso': 'Usar el modo repaso de una colección',
  'coleccion.compartir': 'Compartir una colección',
  'mapa.crear': 'Crear un mapa mental',
  'mapa.organizar': 'Organizar un mapa mental automáticamente',
  // Planificar y enfocarse
  'ramo.crear': 'Crear un ramo',
  'tarea.crear': 'Crear una tarea',
  'evaluacion.crear': 'Agregar una evaluación',
  'enfoque.iniciar': 'Iniciar un bloque de enfoque',
  'enfoque.sala': 'Abrir la sala de estudio',
  'enfoque.concentracion': 'Abrir el modo concentración',
  // Práctica
  'practica.jugar': 'Empezar un juego de práctica',
  'practica.simulacro': 'Hacer un simulacro con tus apuntes',
} as const
export type FuncionUso = keyof typeof FUNCIONES_USO
export const CLAVES_FUNCIONES = Object.keys(FUNCIONES_USO) as FuncionUso[]

/** Topes por envío: lo que pase de aquí es un error o un abuso, no uso normal. */
export const MAX_VECES_POR_FUNCION = 500
export const MAX_SEGUNDOS_POR_VISTA = 3600

/** Lo que viaja del navegador al servidor. */
export interface EnvioUso {
  /** versión del formato */
  v: 1
  /** tipo de pantalla */
  d: DispositivoUso
  /** true si es la primera vez que este navegador entra */
  nueva: boolean
  /** true en el primer envío de cada visita (así se cuentan las visitas) */
  ses: boolean
  /** veces que se usó cada función */
  e: Partial<Record<FuncionUso, number>>
  /** segundos de uso activo por pantalla */
  t: Partial<Record<VistaUso, number>>
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Valida un envío que llegó de afuera y lo deja limpio, o devuelve null si no es uno válido. Descarta en silencio lo desconocido. */
export function sanearUso(d: unknown): EnvioUso | null {
  if (!esObjeto(d) || d.v !== 1) return null
  const dispositivo = DISPOSITIVOS_USO.find((x) => x === d.d)
  if (!dispositivo) return null

  const e: EnvioUso['e'] = {}
  if (esObjeto(d.e)) {
    for (const clave of CLAVES_FUNCIONES) {
      const n = d.e[clave]
      if (typeof n === 'number' && Number.isFinite(n) && n >= 1) e[clave] = Math.min(Math.floor(n), MAX_VECES_POR_FUNCION)
    }
  }
  const t: EnvioUso['t'] = {}
  if (esObjeto(d.t)) {
    for (const vista of VISTAS_USO) {
      const s = d.t[vista]
      if (typeof s === 'number' && Number.isFinite(s) && s >= 1) t[vista] = Math.min(Math.floor(s), MAX_SEGUNDOS_POR_VISTA)
    }
  }
  const ses = d.ses === true
  // un envío sin nada que contar no se guarda
  if (!ses && Object.keys(e).length === 0 && Object.keys(t).length === 0) return null
  return { v: 1, d: dispositivo, nueva: d.nueva === true, ses, e, t }
}

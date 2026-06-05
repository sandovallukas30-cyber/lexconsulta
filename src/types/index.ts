export type PerfilUsuario = 'ciudadano' | 'profesional' | null

export type CodigoTipo =
  | 'con'
  | 'tra'
  | 'civ'
  | 'pen'
  | 'lab'
  | 'tri'
  | 'com'
  | 'agu'
  | 'san'
  | 'min'
  | 'pci'
  | 'ppe'
  | 'pad'
  | 'mil'
  | 'cot'
  | 'acc'
  | 'dro'
  | 'kar'
  | 'ins'
  | 'fam'
  | 'trn'
  | 'rpa'
  | 'pdc'
  | 'pde'

export type CategoriaCodigo =
  | 'fundamentales'
  | 'sustantivos'
  | 'procedimentales'
  | 'especiales'
  | 'tratados'

export type VistaId =
  | 'consultar'
  | 'situacion'
  | 'canvas'
  | 'comparar'
  | 'mapa'
  | 'explorador'
  | 'historial'
  | 'admin'
  | 'practica'

export type AreaPractica = 'general' | 'civil' | 'penal' | 'laboral' | 'procesal' | 'constitucional'

export type ModoLetra = 'empieza' | 'contiene'
export type EstadoLetra = 'pendiente' | 'acertada' | 'fallada' | 'pasada'

export interface EntradaRosco {
  letra: string // 'A' .. 'Z' incluyendo 'Ñ'
  modo: ModoLetra
  palabra: string // respuesta correcta (sin tildes ni mayúsculas para comparar)
  palabraVisible: string // forma "bonita" para mostrar en el resumen
  definicion: string
  codigoOrigen?: CodigoTipo
  articulo?: string
  estado: EstadoLetra
  respuestaUsuario?: string
}

export interface PartidaPasapalabra {
  id: string
  area: AreaPractica
  rosco: EntradaRosco[]
  letraActualIdx: number // posición en el rosco
  segundosRestantes: number
  pausadaEn: number | null // timestamp en que se pausó (null si corriendo o terminada)
  iniciada: number
  finalizada: number | null
  duracionTotalSeg: number // duración originalmente otorgada (default 300)
  /** Modo estudio: sin cronómetro, no cuenta para récords. */
  modoEstudio?: boolean
  /** Pistas usadas en la partida (máx 3). Cada pista cuesta 15 segundos. */
  pistasUsadas?: number
}

/** Mejor marca registrada por el usuario para un área. */
export interface RecordPasapalabra {
  aciertos: number
  fallos: number
  tiempoUsadoSeg: number
  fecha: number
}

// ============ DESTELLO LEGAL ============

export interface PreguntaDestello {
  id: string
  articulo: string // "Art. 19 CPR"
  pregunta: string
  descripcionBreve?: string
  opciones: string[]
  respuestaCorrecta: number // índice de la opción correcta
  codigo: CodigoTipo
  dificultad: 'facil' | 'normal' | 'dificil'
  explicacion: string // explicación de la respuesta correcta
}

export interface EstadisticasDestello {
  codigoAcumulado: number // puntos totales
  rachaActual: number // aciertos consecutivos actuales
  rachaMaxima: number // racha más alta ever
  ultimaPartida: number | null // timestamp última partida
  dominioPorCodigo: Record<CodigoTipo, number> // % dominio por código (0-100)
  preguntasRespondidas: number
  tasaAcierto: number // porcentaje de aciertos históricos
  nivelActual: number // 1-5 basado en dominio general
}

export type TipoNodoCanvas = 'definicion' | 'articulos' | 'caso' | 'libre' | 'concepto'

export interface ArticuloRelevante {
  numero: string
  relevancia: string
  codigo?: string
}

export interface NodoCanvas {
  id: string
  tipo: TipoNodoCanvas
  posicion: { x: number; y: number }
  titulo: string
  contenido: string
  articulos?: ArticuloRelevante[]
  color?: string
  ancho?: number
  altura?: number
  colapsado?: boolean
}

export interface ConexionCanvas {
  id: string
  desde: string
  hasta: string
  etiqueta?: string
}

export interface Canvas {
  id: string
  nombre: string
  concepto: string
  nodos: NodoCanvas[]
  conexiones: ConexionCanvas[]
  fechaCreacion: Date
  fechaModificacion: Date
}

export interface ConsultaHistorial {
  id: string
  titulo: string
  modulo: VistaId
  fecha: Date
  mensajes: Mensaje[]
}

export interface Favorito {
  id: string
  tipo: 'articulo' | 'consulta'
  titulo: string
  contenido: string
  fecha: Date
}

export interface Articulo {
  a: string
  t: string
  libro?: string | null
  titulo?: string | null
  capitulo?: string | null
  parrafo?: string | null
}

export interface CodigoData {
  codigo: string
  tipo: CodigoTipo
  fuente: string
  total_articulos: number
  total_transitorios?: number
  articulos: Articulo[]
}

export interface Cita {
  articulo: string
  titulo: string
  texto_original: string
  relevancia: string
  tipo?: CodigoTipo
}

export interface Jurisprudencia {
  organo: string
  referencia: string
  resumen: string
}

export interface Mensaje {
  id: string
  rol: 'user' | 'assistant'
  contenido: string
  citas?: Cita[]
  /** Etiquetas "Art. N" mencionadas pero no presentes en el contexto: la UI las marca. */
  citasNoVerificadas?: string[]
  jurisprudencia?: Jurisprudencia[]
  /** Valoración del usuario sobre esta respuesta (solo aplica a rol 'assistant'). */
  valoracion?: 'util' | 'no_util'
  /** Comentario opcional cuando la valoración es negativa. */
  comentarioValoracion?: string
  timestamp: Date
}

export interface EntradaJurisprudencia {
  id: string
  organo: string
  referencia: string
  fecha: string
  codigo: CodigoTipo
  materia: string
  resumen: string
  texto_completo?: string
  articulosRelacionados?: string[]
  url?: string
  fechaCarga?: string
}

export const ORGANISMOS_CHILE = [
  'Dirección del Trabajo',
  'Servicio de Impuestos Internos',
  'Corte Suprema',
  'Corte de Apelaciones',
  'Tribunal del Trabajo',
  'Tribunal Tributario y Aduanero',
  'Tribunal Constitucional',
  'Contraloría General de la República',
  'Superintendencia de Pensiones',
  'Superintendencia de Seguridad Social',
] as const

export type OrganismoChile = (typeof ORGANISMOS_CHILE)[number]

export interface CodigoActivo {
  tipo: CodigoTipo
  nombre: string
  nombreCorto: string
  descripcion: string
  categoria: CategoriaCodigo
  activo: boolean
  cargado: boolean
  bloqueado?: boolean
}

export interface PasoSituacion {
  id: string
  pregunta: string
  preguntaSimple: string
  tipo: 'opciones' | 'texto' | 'numero'
  opciones?: string[]
  respuesta?: string
}

export type TipoPregunta = 'opciones' | 'texto' | 'numero' | 'fecha'

export interface PreguntaSituacion {
  id: string
  pregunta: string
  preguntaSimple: string
  tipo: TipoPregunta
  opciones?: string[]
  placeholder?: string
  obligatoria?: boolean
}

export interface AreaSituacion {
  id: string
  titulo: string
  icono: string
  descripcion: string
  codigo: CodigoTipo
  preguntas: PreguntaSituacion[]
}

export interface RespuestaSituacion {
  preguntaId: string
  valor: string
}

export interface PasoAccion {
  titulo: string
  detalle: string
  plazo?: string
  urgente?: boolean
}

export interface ResultadoSituacion {
  diagnostico: string
  marcoLegal: Cita[]
  pasos: PasoAccion[]
  plazosCriticos: string[]
  dondeAcudir: string[]
  modeloUsado: string
}

export interface RelacionNorma {
  desde: string
  hasta: string
  tipo: 'complementa' | 'modifica' | 'deroga' | 'remite'
}

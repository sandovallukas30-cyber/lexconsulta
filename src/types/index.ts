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

export type CategoriaCodigo =
  | 'fundamentales'
  | 'sustantivos'
  | 'procedimentales'
  | 'especiales'

export type VistaId =
  | 'consultar'
  | 'situacion'
  | 'canvas'
  | 'comparar'
  | 'mapa'
  | 'explorador'
  | 'historial'
  | 'admin'

export type TipoNodoCanvas = 'definicion' | 'articulos' | 'caso' | 'libre' | 'concepto'

export interface ArticuloRelevante {
  numero: string
  relevancia: string
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
  jurisprudencia?: Jurisprudencia[]
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

export interface RelacionNorma {
  desde: string
  hasta: string
  tipo: 'complementa' | 'modifica' | 'deroga' | 'remite'
}

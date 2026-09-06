// Plantillas de ejemplo para "Mapas mentales" — igual que
// coleccionesPlantilla.ts, pero acá el contenido es solo un punto de partida
// editable (una clasificación doctrinal de estudio, no una cita textual de
// artículo que deba verificarse contra un JSON oficial). El usuario la
// ajusta con su propio apunte de clase.
//
// Las plantillas NO traen posición fija: se posicionan solas con el mismo
// auto-organizador por capas que el botón "Organizar" (ver
// calcularLayoutMapaMental en MapasMentalesView.tsx), apenas se crean.

import type { FormaNodoMental, TamanoTextoMental } from '../types'

export interface NodoPlantillaMental {
  id: string
  texto: string
  forma: FormaNodoMental
  tamanoTexto: TamanoTextoMental
  /** Opcional y con significado fijo (ver PALETA_SEMANTICA en
   * MapasMentalesView.tsx): azul = concepto/clasificación, rojo =
   * excepción/prohibición, ámbar = punto clave, etc. Sin este campo el nodo
   * queda "neutro" (color por defecto). */
  color?: string
  /** Nota al margen opcional — mismo campo que NodoMapaMental. */
  nota?: string
}

export interface ConexionPlantillaMental {
  desde: string
  hasta: string
  etiqueta?: string
}

export interface MapaMentalPlantilla {
  id: string
  titulo: string
  descripcion: string
  nodos: NodoPlantillaMental[]
  conexiones: ConexionPlantillaMental[]
}

export const MAPAS_MENTALES_PLANTILLA: MapaMentalPlantilla[] = [
  {
    id: 'plantilla-atribuciones-presidente',
    titulo: 'Atribuciones del Presidente (Art. 32 CPR)',
    descripcion: 'Clasificación doctrinal clásica: gubernativas, legislativas, judiciales, militares y de relaciones exteriores.',
    nodos: [
      { id: 'raiz', texto: 'Atribuciones del Presidente\n(Art. 32 CPR)', forma: 'nube', tamanoTexto: 'titulo' },

      { id: 'gubernativas', texto: 'Gubernativas y administrativas', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'gub-1', texto: 'Nombrar y remover *ministros de Estado*', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'gub-2', texto: 'Nombrar funcionarios públicos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'gub-3', texto: 'Dictar reglamentos, decretos e instrucciones', forma: 'ovalo', tamanoTexto: 'texto' },

      { id: 'legislativas', texto: 'Legislativas (colegislador)', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'leg-1', texto: 'Iniciativa _exclusiva_ de ley', forma: 'ovalo', tamanoTexto: 'texto', nota: 'Ej: leyes que irrogan gasto fiscal' },
      { id: 'leg-2', texto: 'Convocar a legislatura extraordinaria', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'leg-3', texto: 'Sanción y promulgación de leyes', forma: 'ovalo', tamanoTexto: 'texto' },

      { id: 'judiciales', texto: 'Judiciales', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'jud-1', texto: 'Nombrar jueces y ministros de tribunales superiores', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'jud-2', texto: 'Indulto particular', forma: 'ovalo', tamanoTexto: 'texto', color: '#b91c1c', nota: 'Excepción: no procede en juicio político' },

      { id: 'militares', texto: 'Militares y de relaciones exteriores', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'mil-1', texto: 'Jefe supremo de las Fuerzas Armadas', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'mil-2', texto: 'Declarar la guerra *(con autorización legal previa)*', forma: 'ovalo', tamanoTexto: 'texto', color: '#b45309' },
      { id: 'mil-3', texto: 'Conducir las relaciones internacionales', forma: 'ovalo', tamanoTexto: 'texto' },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'gubernativas' },
      { desde: 'raiz', hasta: 'legislativas' },
      { desde: 'raiz', hasta: 'judiciales' },
      { desde: 'raiz', hasta: 'militares' },
      { desde: 'gubernativas', hasta: 'gub-1' },
      { desde: 'gubernativas', hasta: 'gub-2' },
      { desde: 'gubernativas', hasta: 'gub-3' },
      { desde: 'legislativas', hasta: 'leg-1' },
      { desde: 'legislativas', hasta: 'leg-2' },
      { desde: 'legislativas', hasta: 'leg-3' },
      { desde: 'judiciales', hasta: 'jud-1' },
      { desde: 'judiciales', hasta: 'jud-2' },
      { desde: 'militares', hasta: 'mil-1' },
      { desde: 'militares', hasta: 'mil-2' },
      { desde: 'militares', hasta: 'mil-3' },
    ],
  },
  {
    id: 'plantilla-omision-penal',
    titulo: 'La omisión en Derecho Penal',
    descripcion: 'Réplica de estructura: pura/propia vs. comisión por omisión, cada una con sus elementos objetivos y subjetivos.',
    nodos: [
      { id: 'raiz', texto: 'Omisión\n(no hacer lo debido)', forma: 'nube', tamanoTexto: 'titulo' },
      { id: 'clases', texto: 'Clases de omisión', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },

      { id: 'pura', texto: 'Omisión pura o propia', forma: 'ovalo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'pura-def', texto: 'Omisión del deber de socorro — infringe directamente la norma imperativa', forma: 'rectangulo', tamanoTexto: 'texto', nota: 'Ej: art. 494 N°14 CP' },
      { id: 'pura-elem', texto: 'Elementos', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'pura-obj', texto: 'Objetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'pura-obj-1', texto: 'Situación típica', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'pura-obj-2', texto: 'Omisión de la acción debida', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'pura-obj-3', texto: 'Capacidad de realizar la acción (sin riesgo propio ni de terceros)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'pura-subj', texto: 'Subjetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'pura-subj-1', texto: 'Dolo: saber y querer no ayudar *(no admite modalidad imprudente)*', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b91c1c' },
      { id: 'pura-subj-2', texto: 'Condiciones especiales de autoría', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'comision', texto: 'Comisión por omisión', forma: 'ovalo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'comision-def', texto: 'No evitar un resultado lesivo que el sujeto debía impedir', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'garante', texto: 'Posición de garante', forma: 'rombo', tamanoTexto: 'texto', color: '#b45309', nota: 'Ej: madre que no alimenta a su hijo' },
      { id: 'equiparacion', texto: 'Equiparación con la acción: deber legal o contractual de actuar, o haber creado el riesgo previamente', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comision-elem', texto: 'Elementos', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'comision-obj', texto: 'Objetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'comision-obj-1', texto: 'Posición de garante + producción del resultado', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comision-obj-2', texto: 'Equivalencia material con la comisión activa', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comision-obj-3', texto: 'Imputación objetiva: crear o aumentar un peligro evitable', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comision-subj', texto: 'Subjetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'comision-subj-1', texto: 'Dolo: conciencia de la posición de garante + voluntad de incumplir', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comision-subj-2', texto: 'Imprudencia, *solo si está tipificada expresamente*', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b91c1c' },
      { id: 'comision-subj-3', texto: 'Iter criminis y autoría/participación', forma: 'rectangulo', tamanoTexto: 'texto' },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'clases' },
      { desde: 'clases', hasta: 'pura' },
      { desde: 'clases', hasta: 'comision' },

      { desde: 'pura', hasta: 'pura-def' },
      { desde: 'pura', hasta: 'pura-elem' },
      { desde: 'pura-elem', hasta: 'pura-obj' },
      { desde: 'pura-elem', hasta: 'pura-subj' },
      { desde: 'pura-obj', hasta: 'pura-obj-1' },
      { desde: 'pura-obj', hasta: 'pura-obj-2' },
      { desde: 'pura-obj', hasta: 'pura-obj-3' },
      { desde: 'pura-subj', hasta: 'pura-subj-1' },
      { desde: 'pura-subj', hasta: 'pura-subj-2' },

      { desde: 'comision', hasta: 'comision-def' },
      { desde: 'comision', hasta: 'garante' },
      { desde: 'garante', hasta: 'equiparacion' },
      { desde: 'comision', hasta: 'comision-elem' },
      { desde: 'comision-elem', hasta: 'comision-obj' },
      { desde: 'comision-elem', hasta: 'comision-subj' },
      { desde: 'comision-obj', hasta: 'comision-obj-1' },
      { desde: 'comision-obj', hasta: 'comision-obj-2' },
      { desde: 'comision-obj', hasta: 'comision-obj-3' },
      { desde: 'comision-subj', hasta: 'comision-subj-1' },
      { desde: 'comision-subj', hasta: 'comision-subj-2' },
      { desde: 'comision-subj', hasta: 'comision-subj-3' },
    ],
  },
]

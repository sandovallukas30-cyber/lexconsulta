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

      { id: 'gubernativas', texto: 'Gubernativas y administrativas', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'gub-1', texto: 'Nombrar y remover ministros de Estado', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'gub-2', texto: 'Nombrar funcionarios públicos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'gub-3', texto: 'Dictar reglamentos, decretos e instrucciones', forma: 'ovalo', tamanoTexto: 'texto' },

      { id: 'legislativas', texto: 'Legislativas (colegislador)', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'leg-1', texto: 'Iniciativa exclusiva de ley', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'leg-2', texto: 'Convocar a legislatura extraordinaria', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'leg-3', texto: 'Sanción y promulgación de leyes', forma: 'ovalo', tamanoTexto: 'texto' },

      { id: 'judiciales', texto: 'Judiciales', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'jud-1', texto: 'Nombrar jueces y ministros de tribunales superiores', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'jud-2', texto: 'Indulto particular', forma: 'ovalo', tamanoTexto: 'texto' },

      { id: 'militares', texto: 'Militares y de relaciones exteriores', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'mil-1', texto: 'Jefe supremo de las Fuerzas Armadas', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'mil-2', texto: 'Declarar la guerra (con autorización legal previa)', forma: 'ovalo', tamanoTexto: 'texto' },
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
]

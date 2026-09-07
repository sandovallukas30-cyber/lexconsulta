// Plantillas de ejemplo para "Mapas mentales" — igual que
// coleccionesPlantilla.ts, pero acá el contenido es solo un punto de partida
// editable (una clasificación doctrinal de estudio, no una cita textual de
// artículo que deba verificarse contra un JSON oficial). El usuario la
// ajusta con su propio apunte de clase.
//
// Las plantillas NO traen posición fija: se posicionan solas con el mismo
// auto-organizador de árbol prolijo que el botón "Organizar" (ver
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
      { id: 'raiz', texto: 'Atribuciones del Presidente\n(Art. 32 CPR)', forma: 'ovalo', tamanoTexto: 'titulo' },

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
    // Réplica DIRECTA de un apunte de mano fotografiado (ver conversación) —
    // a diferencia de la plantilla de arriba, acá el objetivo no es dar un
    // punto de partida genérico sino calcar la estructura EXACTA de ese
    // apunte en particular: mismas etiquetas (incluida la raíz repitiendo el
    // nombre de una de sus propias ramas, tal como está escrito a mano),
    // mismo árbol de conexiones, mismos colores/subrayados/notas al margen
    // donde el original usaba color o una cita chica. Dos cosas del original
    // no se pueden replicar con nodos+figuras: el trazo curvo hecho a pulso
    // (acá las conexiones son rectas/calculadas) y el tono exacto de tinta
    // (acá los colores son la paleta semántica fija de la app, no un color
    // libre calcado pixel a pixel).
    id: 'plantilla-omision-penal',
    titulo: 'La omisión en Derecho Penal',
    descripcion: 'Réplica exacta de un apunte de mano: pura/propia vs. comisión por omisión, con la misma jerarquía, colores y notas del original.',
    nodos: [
      { id: 'raiz', texto: 'Comisión por omisión', forma: 'ovalo', tamanoTexto: 'titulo' },
      {
        id: 'raiz-def',
        texto:
          'No realizar algo que debemos hacer y que normativamente se espera de nosotros, pudiendo cumplirlo materialmente. Solo omitimos cuando no hacemos algo a lo que estamos obligados.',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      {
        id: 'raiz-combinacion',
        texto: 'Puede haber combinación de delito omisivo y comisivo. Hay acción: omitir es no hacer una acción debida *(infringe una norma imperativa)*.',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'clases', texto: 'CLASES DE OMISIÓN', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },

      // ---- Omisión pura o propia (subrayada, sin figura — igual que en el apunte) ----
      { id: 'pura', texto: 'Omisión pura o propia', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      {
        id: 'pura-def',
        texto: 'Omisión del deber de socorro (de la norma imperativa) — deben estar tipificadas expresamente',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        nota: 'ej: art. 195 CP',
      },
      { id: 'pura-elem', texto: 'ELEMENTOS', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'pura-obj', texto: 'Objetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'pura-obj-1', texto: 'Situación típica', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'pura-obj-2', texto: 'Omisión de la acción debida', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'pura-obj-3',
        texto: "Capacidad de realizar la acción debida — \"poder hacerlo\" sin riesgo personal ni para un tercero (lesión ⇒ persona concreta)",
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      // Nota al margen VERDE en el original (con una palabra tachada e ilegible que no se replica): matiz doctrinal real —
      // a diferencia de la comisión por omisión, acá no hace falta que el resultado se produzca.
      { id: 'pura-obj-nota', texto: 'No hace falta que se produzca el resultado', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'pura-subj', texto: 'Subjetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      {
        id: 'pura-subj-1',
        texto: 'Dolo: conocimiento y voluntad de no ayudar a una persona en peligro y desamparada *(no admite modalidad imprudente)*',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b91c1c',
      },
      { id: 'pura-subj-2', texto: 'Condiciones especiales de autoría', forma: 'rectangulo', tamanoTexto: 'texto' },

      // ---- Comisión por omisión (subrayada, sin figura) — el apunte repite
      // literalmente el mismo nombre de la raíz para esta rama; se replica
      // tal cual, ver aviso en la descripción de arriba. ----
      { id: 'comision', texto: 'Comisión por omisión', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'comision-def', texto: 'No evitación por el sujeto de un resultado lesivo determinado', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'comision-infringe',
        texto:
          'Infringe una norma imperativa (obliga a hacer algo), y esa infracción supone también la infracción de una norma prohibitiva *(como si hubiera producido el resultado ⇒ se responde por el resultado)*',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'comision-pueden-ser', texto: 'Pueden ser', forma: 'ninguna', tamanoTexto: 'texto' },
      { id: 'comision-delitos-1', texto: 'Delitos recogidos por el legislador', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comision-delitos-2', texto: 'Delitos de resultado (sin un delito omisivo creado específicamente)', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'comision-equiparacion', texto: 'Equiparación omisión y acción (art. 11 CP)', forma: 'rectangulo', tamanoTexto: 'texto', color: '#1d4ed8' },
      { id: 'comision-equip-1', texto: 'Obligación legal o contractual de actuar', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'comision-equip-2',
        texto: 'El omitente ha creado una ocasión de riesgo para el bien jurídico protegido mediante una acción u omisión anterior',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },

      { id: 'comision-elem', texto: 'ELEMENTOS', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      // "(4)" tal cual lo anotó al lado el apunte — igual dibuja 6 flechas
      // saliendo de "Objetivos", no 4 (se lo señalo a el usuario aparte).
      { id: 'comision-obj', texto: 'Objetivos', forma: 'ovalo', tamanoTexto: 'texto', nota: '(4)' },
      {
        id: 'garante',
        texto: 'Posición de garante ⇒ deber especial de actuar para evitar el resultado',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b45309',
      },
      {
        id: 'comision-obj-2',
        texto: 'Omisión de la acción debida ⇒ surge de la posición de garante + la producción del resultado',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      {
        id: 'comision-obj-3',
        texto:
          'Capacidad de realizar la acción debida + equivalencia material con la comisión activa — el garante infringió su deber de evitar el resultado, equivalente a causarlo activamente. *Si falla la equivalencia material → omisión de socorro.*',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'comision-obj-4', texto: 'No hay relación de causalidad en los delitos omisivos', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comision-obj-5', texto: 'Posibilidad de evitar el resultado', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'comision-obj-6',
        texto:
          'Imputación objetiva: el sujeto, con su omisión, crea o aumenta un peligro que no existía —o existía pero estaba controlado—, pudiendo haber evitado el resultado',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'comision-subj', texto: 'Subjetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      {
        id: 'comision-subj-1',
        texto: 'Dolo ⇒ si es consciente de su posición de garante (incumpliendo el deber de actuar) + voluntad',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'comision-subj-2', texto: 'Imprudencia ⇒ *solo si se ha tipificado expresamente*', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b91c1c' },
      { id: 'comision-subj-3', texto: 'Iter criminis ⇒ tentativa acabada e inacabada', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comision-subj-4', texto: 'Autoría ⇒ autor / partícipe', forma: 'rectangulo', tamanoTexto: 'texto' },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'raiz-def' },
      { desde: 'raiz-def', hasta: 'raiz-combinacion' },
      { desde: 'raiz', hasta: 'clases' },

      { desde: 'clases', hasta: 'pura' },
      { desde: 'pura', hasta: 'pura-def' },
      { desde: 'pura', hasta: 'pura-elem' },
      { desde: 'pura-elem', hasta: 'pura-obj' },
      { desde: 'pura-elem', hasta: 'pura-subj' },
      { desde: 'pura-obj', hasta: 'pura-obj-1' },
      { desde: 'pura-obj', hasta: 'pura-obj-2' },
      { desde: 'pura-obj', hasta: 'pura-obj-3' },
      { desde: 'pura-obj-3', hasta: 'pura-obj-nota' },
      { desde: 'pura-subj', hasta: 'pura-subj-1' },
      { desde: 'pura-subj', hasta: 'pura-subj-2' },

      { desde: 'clases', hasta: 'comision' },
      { desde: 'comision', hasta: 'comision-def' },
      { desde: 'comision-def', hasta: 'comision-infringe' },
      { desde: 'comision-infringe', hasta: 'comision-pueden-ser' },
      { desde: 'comision-pueden-ser', hasta: 'comision-delitos-1' },
      { desde: 'comision-pueden-ser', hasta: 'comision-delitos-2' },
      { desde: 'comision', hasta: 'comision-equiparacion' },
      { desde: 'comision-equiparacion', hasta: 'comision-equip-1' },
      { desde: 'comision-equiparacion', hasta: 'comision-equip-2' },
      { desde: 'comision', hasta: 'comision-elem' },
      { desde: 'comision-elem', hasta: 'comision-obj' },
      { desde: 'comision-elem', hasta: 'comision-subj' },
      { desde: 'comision-obj', hasta: 'garante' },
      { desde: 'comision-obj', hasta: 'comision-obj-2' },
      { desde: 'comision-obj', hasta: 'comision-obj-3' },
      { desde: 'comision-obj', hasta: 'comision-obj-4' },
      { desde: 'comision-obj', hasta: 'comision-obj-5' },
      { desde: 'comision-obj', hasta: 'comision-obj-6' },
      { desde: 'comision-subj', hasta: 'comision-subj-1' },
      { desde: 'comision-subj', hasta: 'comision-subj-2' },
      { desde: 'comision-subj', hasta: 'comision-subj-3' },
      { desde: 'comision-subj', hasta: 'comision-subj-4' },
    ],
  },

  // Mismo contenido doctrinal que la plantilla de arriba, organizado
  // distinto a propósito: acá la pregunta que DISTINGUE ambas figuras es
  // la raíz, y las dos categorías cuelgan como respuesta sí/no en vez de
  // ser dos ramas más de una clasificación. Sirve para repasar lo mismo
  // por "qué las diferencia" en vez de por "cómo se clasifican".
  {
    id: 'plantilla-omision-comparacion',
    titulo: 'Omisión: pura vs. comisión (comparación)',
    descripcion: 'Mismo contenido que "La omisión en Derecho Penal", organizado como comparación lado a lado a partir de la pregunta que distingue ambas figuras.',
    nodos: [
      {
        id: 'raiz',
        texto: '¿Existe posición de garante (deber especial de actuar), más allá del deber general de socorro?',
        forma: 'rectangulo',
        tamanoTexto: 'titulo',
      },

      { id: 'rama-no', texto: 'NO → Omisión pura o propia', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      {
        id: 'pura-def',
        texto: 'Omitir lo que la norma imperativa exige, pudiendo cumplirlo materialmente sin riesgo',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        nota: 'ej: art. 195 CP',
      },
      { id: 'pura-obj', texto: 'Elementos objetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'pura-obj-1', texto: 'Situación típica que exige actuar', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'pura-obj-2', texto: 'No realización de la acción debida', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'pura-obj-3', texto: 'Capacidad de actuar sin riesgo propio ni de terceros', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'pura-subj', texto: 'Elementos subjetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'pura-subj-1', texto: 'Dolo *(no admite forma imprudente)*', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b91c1c' },
      { id: 'pura-subj-2', texto: 'Condiciones especiales de autoría, si la norma las exige', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'rama-si', texto: 'SÍ → Comisión por omisión', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      {
        id: 'comision-def',
        texto: 'No evitar un resultado que el garante tenía el deber especial de impedir',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'comision-obj', texto: 'Elementos objetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      {
        id: 'comision-obj-1',
        texto: 'Posición de garante — deber legal, contractual o de injerencia (riesgo creado antes)',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b45309',
      },
      {
        id: 'comision-obj-2',
        texto: 'Equivalencia material — omitir equivale a causar el resultado activamente',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'comision-obj-3', texto: 'Imputación objetiva del resultado a la omisión', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comision-subj', texto: 'Elementos subjetivos', forma: 'ovalo', tamanoTexto: 'texto' },
      {
        id: 'comision-subj-1',
        texto: 'Dolo — consciencia de la posición de garante + voluntad de no actuar',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      {
        id: 'comision-subj-2',
        texto: 'Imprudencia *(solo si está tipificada expresamente)*',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b91c1c',
      },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'rama-no' },
      { desde: 'raiz', hasta: 'rama-si' },

      { desde: 'rama-no', hasta: 'pura-def' },
      { desde: 'rama-no', hasta: 'pura-obj' },
      { desde: 'rama-no', hasta: 'pura-subj' },
      { desde: 'pura-obj', hasta: 'pura-obj-1' },
      { desde: 'pura-obj', hasta: 'pura-obj-2' },
      { desde: 'pura-obj', hasta: 'pura-obj-3' },
      { desde: 'pura-subj', hasta: 'pura-subj-1' },
      { desde: 'pura-subj', hasta: 'pura-subj-2' },

      { desde: 'rama-si', hasta: 'comision-def' },
      { desde: 'rama-si', hasta: 'comision-obj' },
      { desde: 'rama-si', hasta: 'comision-subj' },
      { desde: 'comision-obj', hasta: 'comision-obj-1' },
      { desde: 'comision-obj', hasta: 'comision-obj-2' },
      { desde: 'comision-obj', hasta: 'comision-obj-3' },
      { desde: 'comision-subj', hasta: 'comision-subj-1' },
      { desde: 'comision-subj', hasta: 'comision-subj-2' },
    ],
  },

  // Tercera estructura sobre el mismo contenido: un checklist secuencial
  // (cómo se resolvería un caso real, paso a paso) en vez de una
  // clasificación o una comparación — acá SÍ hay dos caminos que
  // CONVERGEN en un mismo nodo final ("conclusion" tiene 2 padres), algo
  // que ninguna de las otras dos plantillas usa: no todo mapa mental tiene
  // que ser un árbol puro.
  {
    id: 'plantilla-omision-checklist',
    titulo: 'Omisión: checklist de análisis de caso',
    descripcion: 'Mismo contenido, organizado como una guía paso a paso para resolver un caso — las dos categorías son ramas de una decisión, no una clasificación.',
    nodos: [
      { id: 'raiz', texto: 'Checklist: ¿hay responsabilidad por omisión?', forma: 'ovalo', tamanoTexto: 'titulo' },
      {
        id: 'paso1',
        texto: 'Paso 1 — ¿El sujeto no hizo algo que debía hacer, pudiendo hacerlo materialmente?',
        forma: 'rectangulo',
        tamanoTexto: 'subtitulo',
      },
      { id: 'paso1-no', texto: 'NO → no hay omisión relevante, no se sigue analizando', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b91c1c' },
      { id: 'paso1-si', texto: 'SÍ →', forma: 'ninguna', tamanoTexto: 'texto' },
      {
        id: 'paso2',
        texto: '¿Existe una posición de garante (deber especial), más allá del deber general de socorro?',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'paso2-no', texto: 'NO → Omisión pura o propia', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      {
        id: 'paso2-no-1',
        texto: 'Verificar que exista un tipo penal que sancione la omisión expresamente',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        nota: 'ej: art. 195 CP',
      },
      { id: 'paso2-no-2', texto: 'Verificar dolo *(sin modalidad imprudente)*', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'paso2-si', texto: 'SÍ → Comisión por omisión', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      {
        id: 'paso2-si-1',
        texto: 'Identificar la fuente de la posición de garante (ley, contrato o injerencia)',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b45309',
      },
      { id: 'paso2-si-2', texto: 'Verificar equivalencia material con la comisión activa', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'paso2-si-3', texto: 'Verificar imputación objetiva del resultado', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'paso2-si-4',
        texto: 'Verificar dolo o imprudencia *(la imprudencia, solo si está tipificada expresamente)*',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'conclusion', texto: 'Conclusión: calificar la conducta y fundamentar con el artículo aplicable', forma: 'ovalo', tamanoTexto: 'subtitulo' },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'paso1' },
      { desde: 'paso1', hasta: 'paso1-no' },
      { desde: 'paso1', hasta: 'paso1-si' },
      { desde: 'paso1-si', hasta: 'paso2' },
      { desde: 'paso2', hasta: 'paso2-no' },
      { desde: 'paso2', hasta: 'paso2-si' },
      { desde: 'paso2-no', hasta: 'paso2-no-1' },
      { desde: 'paso2-no', hasta: 'paso2-no-2' },
      { desde: 'paso2-si', hasta: 'paso2-si-1' },
      { desde: 'paso2-si', hasta: 'paso2-si-2' },
      { desde: 'paso2-si', hasta: 'paso2-si-3' },
      { desde: 'paso2-si', hasta: 'paso2-si-4' },
      // Convergen acá: sea cual sea la rama, el análisis termina en la
      // misma conclusión — por eso "conclusion" es el único nodo de las 3
      // plantillas con más de un padre.
      { desde: 'paso2-no-2', hasta: 'conclusion' },
      { desde: 'paso2-si-4', hasta: 'conclusion' },
    ],
  },

  // Basada en el apunte de clase del usuario (Derecho Constitucional
  // Orgánico) — resume la teoría del órgano: sus elementos, para qué
  // sirve, y las clasificaciones de Jellinek + otras clasificaciones
  // adicionales que agrupa la propia clase.
  {
    id: 'plantilla-teoria-organo',
    titulo: 'Teoría del Órgano',
    descripcion: 'Elementos, utilidad, límites y clasificaciones (Jellinek y otras) del órgano estatal.',
    nodos: [
      { id: 'raiz', texto: 'Teoría del Órgano', forma: 'ovalo', tamanoTexto: 'titulo' },
      {
        id: 'metafora',
        texto: 'La metáfora orgánica — respuesta al problema de la representación/mandato',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        nota: 'Crítica normativista: Kelsen',
      },

      { id: 'elementos', texto: 'Elementos', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'competencia', texto: 'Competencia (objetivo)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'titular', texto: 'Titular (subjetivo)', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'utilidad', texto: 'Utilidad: ¿cuándo una conducta cuenta como actividad estatal?', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'dualidad', texto: 'Dualidad ciudadanía / órgano', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'continuidad', texto: 'Continuidad de la función estatal', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'personalidad', texto: 'Órganos y personalidad jurídica (Estado-Fisco)', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'limites', texto: 'Límites', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'legitimidad', texto: 'Legitimidad — democracia', forma: 'rectangulo', tamanoTexto: 'texto', color: '#1d4ed8' },
      { id: 'equilibrio', texto: 'Equilibrio de poder — Estado de Derecho', forma: 'rectangulo', tamanoTexto: 'texto', color: '#1d4ed8' },

      { id: 'clasificacion', texto: 'Clasificación (Jellinek)', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      {
        id: 'inmediatos',
        texto: 'Inmediatos (PdR) / mediatos (DPR) — según si la Constitución los establece independientes de otros órganos',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      {
        id: 'primarios',
        texto: 'Primarios (pueblo) / secundarios (PdR, CN) — según si expresan su voluntad por sí mismos',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      {
        id: 'simples',
        texto: 'Simples (PdR) / potenciados (PdR en Consejo) — según si se asumen por titularidad en otro órgano',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      {
        id: 'independientes',
        texto: 'Independientes (PdR) / dependientes (Consejo) — según expresan la voluntad estatal',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'normales', texto: 'Normales (PdR) / extraordinarios (Consejo) — según cuándo se activan', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'otras-clasif', texto: 'Otras clasificaciones', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'const-legal', texto: 'Constitucionales / legales — según su norma de creación', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'uni-colegiado', texto: 'Unipersonales / colegiados — según el número de titulares', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'activo-consultivo', texto: 'Activos, consultivos y de control — según su función', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'territorial', texto: 'Nacionales, regionales, provinciales y comunales — según su ámbito territorial', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'ideas', texto: 'Ideas principales', forma: 'ovalo', tamanoTexto: 'subtitulo' },
      {
        id: 'idea1',
        texto: 'Más complejo que las teorías de representación política y competencia normativa',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#15803d',
      },
      {
        id: 'idea2',
        texto: 'Explica la continuidad de la función estatal y la imputación de consecuencias a la agencia estatal',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#15803d',
      },
      { id: 'idea3', texto: 'Existen múltiples clasificaciones de los órganos estatales', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'metafora' },

      { desde: 'raiz', hasta: 'elementos' },
      { desde: 'elementos', hasta: 'competencia' },
      { desde: 'elementos', hasta: 'titular' },

      { desde: 'raiz', hasta: 'utilidad' },
      { desde: 'utilidad', hasta: 'dualidad' },
      { desde: 'utilidad', hasta: 'continuidad' },
      { desde: 'utilidad', hasta: 'personalidad' },

      { desde: 'raiz', hasta: 'limites' },
      { desde: 'limites', hasta: 'legitimidad' },
      { desde: 'limites', hasta: 'equilibrio' },

      { desde: 'raiz', hasta: 'clasificacion' },
      { desde: 'clasificacion', hasta: 'inmediatos' },
      { desde: 'clasificacion', hasta: 'primarios' },
      { desde: 'clasificacion', hasta: 'simples' },
      { desde: 'clasificacion', hasta: 'independientes' },
      { desde: 'clasificacion', hasta: 'normales' },

      { desde: 'raiz', hasta: 'otras-clasif' },
      { desde: 'otras-clasif', hasta: 'const-legal' },
      { desde: 'otras-clasif', hasta: 'uni-colegiado' },
      { desde: 'otras-clasif', hasta: 'activo-consultivo' },
      { desde: 'otras-clasif', hasta: 'territorial' },

      { desde: 'raiz', hasta: 'ideas' },
      { desde: 'ideas', hasta: 'idea1' },
      { desde: 'ideas', hasta: 'idea2' },
      { desde: 'ideas', hasta: 'idea3' },
    ],
  },

  // Segunda plantilla de las clases del usuario — combina "04. Separación
  // de poderes: Teoría" (los 3 modelos clásicos + las 3 funciones y su
  // propia legitimidad) con "05. Separación de poderes: manifestación
  // constitucional en Chile" (reconocimiento indirecto, distribución de
  // competencias, art. 7, y dos casos de aplicación).
  {
    id: 'plantilla-separacion-poderes',
    titulo: 'Separación de Poderes',
    descripcion: 'Los 3 modelos clásicos, las 3 funciones y su legitimidad, y cómo se manifiesta (indirectamente) en la Constitución chilena.',
    nodos: [
      { id: 'raiz', texto: 'Separación de Poderes', forma: 'ovalo', tamanoTexto: 'titulo' },
      {
        id: 'problema',
        texto: 'El problema: concentración del poder, ambición de facciones (Madison) o restricción de la libertad (Montesquieu)',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },

      { id: 'modelos', texto: 'Modelos teóricos', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'modelo1', texto: 'Modelo 1: separación de órganos y funciones (Montesquieu, 1748)', forma: 'rectangulo', tamanoTexto: 'texto', color: '#1d4ed8' },
      { id: 'modelo1-a', texto: 'Tres poderes: legislativo, ejecutivo y judicial', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'modelo1-b',
        texto: 'Unir dos poderes en la misma persona o cuerpo *elimina la libertad* (riesgo de tiranía)',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b91c1c',
      },
      { id: 'modelo2', texto: 'Modelo 2: distribución y cooperación de funciones (Carré de Malberg, 1920)', forma: 'rectangulo', tamanoTexto: 'texto', color: '#1d4ed8' },
      { id: 'modelo2-a', texto: 'Indivisibilidad del poder del Estado — primacía del Legislativo', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'modelo2-b', texto: 'Coordinación y cooperación institucional, no independencia estricta', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'modelo2-c', texto: 'Separación orgánica / incompatibilidad personal — reglamentación flexible', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'modelo3', texto: 'Modelo 3: frenos y contrapesos (Madison, El Federalista, 1788)', forma: 'rectangulo', tamanoTexto: 'texto', color: '#1d4ed8' },
      { id: 'modelo3-a', texto: 'Independencia política de cada órgano — control recíproco', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'modelo3-b', texto: 'Equilibrio de poder y protección de la libertad individual', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'modelo3-c',
        texto: '"La ambición debe hacerse para contrarrestar la ambición" (Madison)',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b45309',
      },

      { id: 'funciones', texto: 'Tres funciones y su legitimidad', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'f-legislativa', texto: 'Función legislativa — legitimidad por representación y deliberación', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'fl-1', texto: 'Congreso electo por votación popular', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'fl-2', texto: 'Proceso público de formación de la ley (arts. 65-75)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'f-jurisdiccional', texto: 'Función jurisdiccional — legitimidad por independencia y sumisión a la ley', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'fj-1', texto: 'Inamovilidad, inavocabilidad e inexcusabilidad de los jueces', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'f-administrativa', texto: 'Función administrativa — legitimidad por mandato jerárquico (principio comisarial)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'fa-1', texto: 'Estructura jerárquica hacia el Presidente, con potestad de instrucción', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'chile', texto: 'En la Constitución chilena', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      {
        id: 'chile-reconocimiento',
        texto: 'No hay reconocimiento explícito — ¿principio descriptivo (régimen de gobierno) o normativo (poder judicial)?',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'chile-manifestaciones', texto: 'Manifestaciones clave', forma: 'ninguna', tamanoTexto: 'texto' },
      { id: 'cm-1', texto: 'Frenos y contrapesos', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cm-2', texto: 'Funciones materiales y formales', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cm-3', texto: 'Independencia de los tribunales de justicia', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cm-4', texto: 'Otros órganos que desafían la tríada clásica', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'chile-competencias', texto: 'Distribución de competencias', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comp-material', texto: 'Competencia material (contenido positivo y negativo) y formal (titular y procedimiento)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'comp-clasif', texto: 'Discrecional/reglada, originaria/delegada, centralizada/descentralizada', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'chile-art7', texto: 'Requisitos del art. 7 para actuar válidamente', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b45309' },
      { id: 'art7-1', texto: 'Investidura previa y regular', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'art7-2', texto: 'Órgano con competencia', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'art7-3', texto: 'Actuación en la forma que prescribe la ley', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'chile-casos', texto: 'Casos para discutir', forma: 'ninguna', tamanoTexto: 'texto' },
      {
        id: 'caso1',
        texto: '¿Es válido un contrato firmado antes de que se tramite el decreto de nombramiento del funcionario?',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      {
        id: 'caso2',
        texto: '¿Puede un decreto ministerial prohibir algo que la Constitución reserva a la ley (art. 63)?',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },

      { id: 'ideas', texto: 'Ideas principales', forma: 'ovalo', tamanoTexto: 'subtitulo' },
      { id: 'idea1', texto: 'La separación de poderes es orgánica y funcional', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'idea2', texto: 'Existen 3 modelos: separación estricta, colaboración, y frenos y contrapesos', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'idea3', texto: 'Cada órgano tiene su propia relación con el principio democrático', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'problema' },

      { desde: 'raiz', hasta: 'modelos' },
      { desde: 'modelos', hasta: 'modelo1' },
      { desde: 'modelo1', hasta: 'modelo1-a' },
      { desde: 'modelo1', hasta: 'modelo1-b' },
      { desde: 'modelos', hasta: 'modelo2' },
      { desde: 'modelo2', hasta: 'modelo2-a' },
      { desde: 'modelo2', hasta: 'modelo2-b' },
      { desde: 'modelo2', hasta: 'modelo2-c' },
      { desde: 'modelos', hasta: 'modelo3' },
      { desde: 'modelo3', hasta: 'modelo3-a' },
      { desde: 'modelo3', hasta: 'modelo3-b' },
      { desde: 'modelo3', hasta: 'modelo3-c' },

      { desde: 'raiz', hasta: 'funciones' },
      { desde: 'funciones', hasta: 'f-legislativa' },
      { desde: 'f-legislativa', hasta: 'fl-1' },
      { desde: 'f-legislativa', hasta: 'fl-2' },
      { desde: 'funciones', hasta: 'f-jurisdiccional' },
      { desde: 'f-jurisdiccional', hasta: 'fj-1' },
      { desde: 'funciones', hasta: 'f-administrativa' },
      { desde: 'f-administrativa', hasta: 'fa-1' },

      { desde: 'raiz', hasta: 'chile' },
      { desde: 'chile', hasta: 'chile-reconocimiento' },
      { desde: 'chile', hasta: 'chile-manifestaciones' },
      { desde: 'chile-manifestaciones', hasta: 'cm-1' },
      { desde: 'chile-manifestaciones', hasta: 'cm-2' },
      { desde: 'chile-manifestaciones', hasta: 'cm-3' },
      { desde: 'chile-manifestaciones', hasta: 'cm-4' },
      { desde: 'chile', hasta: 'chile-competencias' },
      { desde: 'chile-competencias', hasta: 'comp-material' },
      { desde: 'chile-competencias', hasta: 'comp-clasif' },
      { desde: 'chile', hasta: 'chile-art7' },
      { desde: 'chile-art7', hasta: 'art7-1' },
      { desde: 'chile-art7', hasta: 'art7-2' },
      { desde: 'chile-art7', hasta: 'art7-3' },
      { desde: 'chile', hasta: 'chile-casos' },
      { desde: 'chile-casos', hasta: 'caso1' },
      { desde: 'chile-casos', hasta: 'caso2' },

      { desde: 'raiz', hasta: 'ideas' },
      { desde: 'ideas', hasta: 'idea1' },
      { desde: 'ideas', hasta: 'idea2' },
      { desde: 'ideas', hasta: 'idea3' },
    ],
  },

  // Tercera plantilla de las clases del usuario — combina "06. Régimen de
  // Gobierno: Teoría" (democracia/jefatura de Estado, los 3 tipos de
  // régimen, su relación con el desarrollo humano) con "07. Régimen de
  // Gobierno: características del Presidencialismo Chileno" (antecedentes,
  // clases de poderes, las 6 categorías de potestades presidenciales,
  // funcionamiento práctico y correctores).
  {
    id: 'plantilla-regimen-gobierno',
    titulo: 'Régimen de Gobierno',
    descripcion: 'Los 3 tipos de régimen (presidencial, parlamentario, semi-presidencial) y por qué el chileno es un presidencialismo "reforzado".',
    nodos: [
      { id: 'raiz', texto: 'Régimen de Gobierno', forma: 'ovalo', tamanoTexto: 'titulo' },

      { id: 'democracia', texto: 'Democracia y jefatura de Estado', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'matriz-dem', texto: 'República Democrática (jefatura electiva) vs. Autocrática (elecciones no libres)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'matriz-mon', texto: 'Monarquía Constitucional (el rey reina, no gobierna) vs. Absoluta', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'objetivos', texto: 'Objetivos de un sistema de gobierno: efectividad y estabilidad (Sartori, 1991)', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'tipos', texto: 'Tres tipos de régimen', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'presidencial', texto: 'Presidencial', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'pres-1', texto: 'Ejecutivo elegido separado del Congreso — legitimidad dual', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'pres-2', texto: 'Presidente con período fijo + gabinete de confianza exclusiva', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'pres-3', texto: 'Crítica: tendencia a la parálisis, inestabilidad y crisis', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b91c1c' },
      { id: 'parlamentario', texto: 'Parlamentario', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'parl-1', texto: 'Gobierno designado, apoyado y destituido por el Parlamento (Sartori)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'parl-2', texto: 'Para ser estable, depende de un sistema de partidos sólido', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'parl-3',
        texto: 'El remedio alemán a la inestabilidad: voto de censura *constructivo* (art. 67 Ley Fundamental de 1949)',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b45309',
      },
      { id: 'semipresidencial', texto: 'Semi-presidencial', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'semi-1', texto: 'Autoridad dual: Presidente (jefe de Estado) + Primer Ministro (jefe de gobierno)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'semi-2', texto: 'Premier-presidencial (Austria, Finlandia, Portugal) — solo el parlamento destituye al Primer Ministro', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'semi-3', texto: 'Premier-parlamentario (Francia, 1958) — el problema de la "cohabitación"', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'comparacion',
        texto: 'Se comparan por: elección, duración, cabezas del ejecutivo, y el problema típico de cada uno',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },

      {
        id: 'desarrollo',
        texto: '¿Correlación con el desarrollo? 80% de los países más desarrollados (IDH) son parlamentarios; en los menos desarrollados predomina el presidencialismo',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },

      { id: 'ideas1', texto: 'Ideas principales', forma: 'ovalo', tamanoTexto: 'subtitulo' },
      { id: 'idea1', texto: 'El régimen de gobierno define cómo se elige a quien encabeza el ejecutivo', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'idea2', texto: 'Los criterios clave son elección, duración e integración del gobierno', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },

      { id: 'chile', texto: 'El presidencialismo chileno', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'reforzado', texto: 'Presidencialismo "reforzado" o hiperpresidencialismo', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b45309' },

      { id: 'antecedentes', texto: 'Antecedentes históricos', forma: 'ninguna', tamanoTexto: 'texto' },
      { id: 'ant-1', texto: '1833: período parlamentario', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'ant-2', texto: '1925: organiza el poder ya en clave presidencial', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'ant-3', texto: '1943 y 1970: reformas que delimitan y luego amplían la iniciativa exclusiva', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'ant-4', texto: '1980: recoge todo y agrega nuevos mecanismos', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'clases-poderes', texto: 'Clases de poderes presidenciales', forma: 'ninguna', tamanoTexto: 'texto' },
      {
        id: 'constitucionales',
        texto: 'Constitucionales — proactivos (iniciativa exclusiva, potestad reglamentaria) y reactivos (veto, presupuesto)',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'partidarios', texto: 'Partidarios — dependen del resultado electoral; en Chile, débiles y variables', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'seis-categorias', texto: 'Seis categorías de potestades', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'cat-1', texto: '(1) Proceso legislativo — iniciativa exclusiva (art. 65), urgencias (art. 74), veto (art. 73)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cat-2', texto: '(2) Presupuesto — rige el del Presidente si el Congreso no despacha en 60 días (art. 67)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cat-3', texto: '(3) Jefatura del Ejecutivo — jefe de Estado y de Gobierno a la vez (arts. 24 y 32)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cat-4', texto: '(4) Integración de otros órganos — Tribunal Constitucional, tribunales superiores, Fiscal Nacional, Contralor', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cat-5', texto: '(5) Estados de excepción (arts. 39 a 45)', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'cat-6',
        texto: '(6) Ausencia de responsabilidad política — no existen la censura ni la disolución del Congreso',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b91c1c',
      },

      { id: 'funcionamiento', texto: 'En la práctica: el sistema proporcional produce Congresos sin mayoría, sin árbitro político', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'correctores', texto: 'Correctores del modelo', forma: 'ninguna', tamanoTexto: 'texto' },
      { id: 'corr-1', texto: 'Presidencialismo de coalición: cargos a cambio de apoyo parlamentario', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'corr-2', texto: 'El Tribunal Constitucional arbitra los conflictos de competencia', forma: 'rectangulo', tamanoTexto: 'texto' },

      {
        id: 'discutir',
        texto: 'Para discutir: ¿reformar? — presidencial no reforzado / semi-presidencial / parlamentario',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },

      { id: 'ideas-chile', texto: 'Ideas principales (Chile)', forma: 'ovalo', tamanoTexto: 'subtitulo' },
      { id: 'idea-chile-1', texto: 'El régimen chileno es presidencial "reforzado"', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'idea-chile-2', texto: 'Lo distintivo es la acumulación de potestades, no una en particular', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'idea-chile-3', texto: 'Potestades constitucionales máximas conviven con gobiernos políticamente débiles', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'democracia' },
      { desde: 'democracia', hasta: 'matriz-dem' },
      { desde: 'democracia', hasta: 'matriz-mon' },

      { desde: 'raiz', hasta: 'objetivos' },

      { desde: 'raiz', hasta: 'tipos' },
      { desde: 'tipos', hasta: 'presidencial' },
      { desde: 'presidencial', hasta: 'pres-1' },
      { desde: 'presidencial', hasta: 'pres-2' },
      { desde: 'presidencial', hasta: 'pres-3' },
      { desde: 'tipos', hasta: 'parlamentario' },
      { desde: 'parlamentario', hasta: 'parl-1' },
      { desde: 'parlamentario', hasta: 'parl-2' },
      { desde: 'parlamentario', hasta: 'parl-3' },
      { desde: 'tipos', hasta: 'semipresidencial' },
      { desde: 'semipresidencial', hasta: 'semi-1' },
      { desde: 'semipresidencial', hasta: 'semi-2' },
      { desde: 'semipresidencial', hasta: 'semi-3' },
      { desde: 'tipos', hasta: 'comparacion' },

      { desde: 'raiz', hasta: 'desarrollo' },

      { desde: 'raiz', hasta: 'ideas1' },
      { desde: 'ideas1', hasta: 'idea1' },
      { desde: 'ideas1', hasta: 'idea2' },

      { desde: 'raiz', hasta: 'chile' },
      { desde: 'chile', hasta: 'reforzado' },
      { desde: 'chile', hasta: 'antecedentes' },
      { desde: 'antecedentes', hasta: 'ant-1' },
      { desde: 'antecedentes', hasta: 'ant-2' },
      { desde: 'antecedentes', hasta: 'ant-3' },
      { desde: 'antecedentes', hasta: 'ant-4' },
      { desde: 'chile', hasta: 'clases-poderes' },
      { desde: 'clases-poderes', hasta: 'constitucionales' },
      { desde: 'clases-poderes', hasta: 'partidarios' },
      { desde: 'chile', hasta: 'seis-categorias' },
      { desde: 'seis-categorias', hasta: 'cat-1' },
      { desde: 'seis-categorias', hasta: 'cat-2' },
      { desde: 'seis-categorias', hasta: 'cat-3' },
      { desde: 'seis-categorias', hasta: 'cat-4' },
      { desde: 'seis-categorias', hasta: 'cat-5' },
      { desde: 'seis-categorias', hasta: 'cat-6' },
      { desde: 'chile', hasta: 'funcionamiento' },
      { desde: 'chile', hasta: 'correctores' },
      { desde: 'correctores', hasta: 'corr-1' },
      { desde: 'correctores', hasta: 'corr-2' },
      { desde: 'chile', hasta: 'discutir' },

      { desde: 'raiz', hasta: 'ideas-chile' },
      { desde: 'ideas-chile', hasta: 'idea-chile-1' },
      { desde: 'ideas-chile', hasta: 'idea-chile-2' },
      { desde: 'ideas-chile', hasta: 'idea-chile-3' },
    ],
  },
]

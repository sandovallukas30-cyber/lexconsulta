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
  /** Cómo se auto-organiza la plantilla la primera vez que se usa (ver
   * usarPlantilla en MapasMentalesView.tsx). Sin valor = 'arbol' (el árbol
   * prolijo izquierda-derecha de siempre). 'radial' reparte las ramas
   * principales alrededor del título, como un mapa mental dibujado a mano
   * — pensado para un árbol ancho y poco profundo (pocas ramas, cada una
   * con sus propias hojas), no para uno angosto y profundo. */
  layoutInicial?: 'arbol' | 'radial'
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

  // Cuarta plantilla de las clases del usuario — "08. Gobierno y
  // Administración": la distinción entre ambas funciones (que el
  // Presidente reúne en su persona), competencias regladas/discrecionales,
  // actos de gobierno/actos administrativos, y cómo se ordenan los
  // órganos administrativos chilenos.
  {
    id: 'plantilla-gobierno-administracion',
    titulo: 'Gobierno y Administración',
    descripcion: 'La distinción gobierno/administración, competencias regladas vs. discrecionales, y cómo se organizan los órganos del Estado.',
    nodos: [
      { id: 'raiz', texto: 'Gobierno y Administración', forma: 'ovalo', tamanoTexto: 'titulo' },

      {
        id: 'ubicacion',
        texto: 'El Ejecutivo está en el Cap. IV — el orden con el Congreso (Cap. V) se invirtió respecto de la Constitución de 1925',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },
      { id: 'capitulo', texto: 'Contenido del capítulo', forma: 'ninguna', tamanoTexto: 'texto' },
      { id: 'cap-1', texto: '§1 Presidente de la República', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cap-2', texto: '§2 Ministros de Estado', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cap-3', texto: '§3 Bases Generales de la Administración del Estado', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cap-4', texto: '§4 Estados de Excepción Constitucional', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'distincion', texto: 'Gobierno vs. Administración (Huneeus, 1891)', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'gob-vol', texto: 'Gobierno: dirección política, voluntad, inteligencia y deliberación', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'admin-acc', texto: 'Administración: ejecución de los servicios públicos, acción, actividad', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'art24', texto: 'Art. 24: el Presidente reúne ambas funciones, que se entrelazan', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b45309' },

      {
        id: 'comisarial',
        texto: 'Principio comisarial: la legitimidad democrática desciende desde el Presidente electo hacia toda la administración',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },

      { id: 'competencias', texto: 'Competencias regladas y discrecionales', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'regladas', texto: 'Regladas: la norma agota la conducta autorizada (ej. promulgar en 10 días, art. 75)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'discrecionales', texto: 'Discrecionales: el órgano aprecia y dispone de alternativas (ej. celebrar tratados, art. 32 N°15)', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'actos', texto: 'Actos de gobierno y actos administrativos', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'actos-gob', texto: 'De gobierno: nacen de la Constitución, sin ley previa, no reclamables por ilegalidad', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'actos-admin', texto: 'Administrativos: ejecutan la ley, requieren habilitación legal previa', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'actos-criterio', texto: 'Ningún criterio formal distingue unos de otros (Carré de Malberg)', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b91c1c' },

      { id: 'organos', texto: 'Órganos centralizados y descentralizados', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'centralizados', texto: 'Centralizados: sin personalidad jurídica propia, dependen jerárquicamente del Presidente', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'descentralizados', texto: 'Descentralizados: personalidad jurídica propia, se vinculan por supervigilancia, no jerarquía', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'categorias', texto: 'Categorías en el derecho chileno', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'cat-func', texto: 'Ministerios y servicios públicos = desconcentración funcional', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cat-terr', texto: 'Delegaciones presidenciales = desconcentración territorial', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cat-descent', texto: 'Gobiernos regionales y municipalidades = órganos descentralizados', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'cat-auton', texto: 'Contraloría y Banco Central = órganos autónomos de rango constitucional', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b45309' },

      { id: 'discutir', texto: 'Para discutir: ¿cuánta autonomía admite una administración democrática?', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'ideas', texto: 'Ideas principales', forma: 'ovalo', tamanoTexto: 'subtitulo' },
      { id: 'idea1', texto: 'El Presidente concentra dos funciones distintas: dirección política y gestión administrativa', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'idea2', texto: 'El principio comisarial enlaza a toda la administración con la voluntad popular', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'idea3', texto: 'Los actos de gobierno se fundan en la Constitución; los administrativos, en la ley', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'ubicacion' },
      { desde: 'raiz', hasta: 'capitulo' },
      { desde: 'capitulo', hasta: 'cap-1' },
      { desde: 'capitulo', hasta: 'cap-2' },
      { desde: 'capitulo', hasta: 'cap-3' },
      { desde: 'capitulo', hasta: 'cap-4' },

      { desde: 'raiz', hasta: 'distincion' },
      { desde: 'distincion', hasta: 'gob-vol' },
      { desde: 'distincion', hasta: 'admin-acc' },

      { desde: 'raiz', hasta: 'art24' },
      { desde: 'raiz', hasta: 'comisarial' },

      { desde: 'raiz', hasta: 'competencias' },
      { desde: 'competencias', hasta: 'regladas' },
      { desde: 'competencias', hasta: 'discrecionales' },

      { desde: 'raiz', hasta: 'actos' },
      { desde: 'actos', hasta: 'actos-gob' },
      { desde: 'actos', hasta: 'actos-admin' },
      { desde: 'actos', hasta: 'actos-criterio' },

      { desde: 'raiz', hasta: 'organos' },
      { desde: 'organos', hasta: 'centralizados' },
      { desde: 'organos', hasta: 'descentralizados' },

      { desde: 'raiz', hasta: 'categorias' },
      { desde: 'categorias', hasta: 'cat-func' },
      { desde: 'categorias', hasta: 'cat-terr' },
      { desde: 'categorias', hasta: 'cat-descent' },
      { desde: 'categorias', hasta: 'cat-auton' },

      { desde: 'raiz', hasta: 'discutir' },

      { desde: 'raiz', hasta: 'ideas' },
      { desde: 'ideas', hasta: 'idea1' },
      { desde: 'ideas', hasta: 'idea2' },
      { desde: 'ideas', hasta: 'idea3' },
    ],
  },

  // Quinta plantilla de las clases del usuario — combina "09. Presidente
  // de la República: elección" y "10. ...cesación (subrogación, vacancia y
  // reemplazo)": todo lo que da continuidad al cargo presidencial, desde
  // por qué existe un Ejecutivo unipersonal hasta cómo termina el mandato.
  {
    id: 'plantilla-presidente-eleccion-cesacion',
    titulo: 'Presidente: Elección, Subrogación y Cesación',
    descripcion: 'Por qué un Ejecutivo unipersonal, cómo se elige, y las 3 vías de continuidad del cargo: subrogación, vacancia y cesación.',
    nodos: [
      { id: 'raiz', texto: 'Presidente: Elección, Subrogación y Cesación', forma: 'ovalo', tamanoTexto: 'titulo' },

      { id: 'justificacion', texto: '¿Por qué un Ejecutivo unipersonal? (Hamilton, El Federalista LXX, 1788)', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'just-1', texto: 'Energía en la defensa exterior y en la administración interior', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'just-2', texto: 'Unidad de acción — un ejecutivo único, no multiplicidad de opiniones', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'just-3', texto: 'Mayor capacidad de decisión y rapidez de reacción', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'just-4', texto: 'Mayor responsabilidad frente a la opinión pública', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'eleccion', texto: 'Elección', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'requisitos', texto: 'Requisitos de elegibilidad (art. 25): chileno, 35 años, ciudadano con derecho a sufragio', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'votacion', texto: 'Votación (art. 26): directa, simultánea con parlamentarios; mayoría absoluta o segunda vuelta', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'investidura', texto: 'Investidura (art. 27): escrutinio del TCE, comunicación al Senado, juramento ante el Congreso Pleno', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'duracion',
        texto: 'Duración (arts. 25/30): 4 años sin reelección inmediata — sí se puede volver a postular después (ej. Piñera, Bachelet)',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b45309',
      },

      { id: 'subrogacion', texto: 'Subrogación (art. 29) — impedimento *temporal*', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'sub-causales', texto: 'Enfermedad, ausencia del territorio, u otro grave motivo', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'sub-orden',
        texto: 'Orden de precedencia: ministro titular → Presidente del Senado → de la Cámara → de la Corte Suprema',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },

      { id: 'cesacion', texto: 'Causales de cesación', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'ces-1', texto: 'Cumplimiento del período', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'ces-2', texto: 'Destitución por acusación constitucional (art. 53 N°1)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'ces-3', texto: 'Inhabilidad declarada por el Senado (art. 53 N°7)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'ces-4', texto: 'Dimisión, calificada por el Senado (art. 53 N°7)', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'ces-5',
        texto: 'Responsabilidad por contravenir el régimen democrático (art. 19 N°15) — declaración del TC + mayoría calificada del Senado',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b91c1c',
      },

      { id: 'vacancia', texto: 'Vacancia y reemplazo — impedimento *definitivo*', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'vac-1', texto: 'Si faltan menos de 2 años para el término: elige el Congreso Pleno, asume en 30 días', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'vac-2', texto: 'Si faltan 2 años o más: el Vicepresidente convoca a elecciones 60 días después', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'sub-vs-sup', texto: 'Subrogante (temporal, automático) vs. Suplente (definitivo, discrecional)', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b45309' },

      {
        id: 'exPresidente',
        texto: 'Estatuto del Ex-Presidente (art. 30): fuero judicial y dieta — no aplica si asumió en vacancia o fue condenado en juicio político',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
      },

      { id: 'ideas', texto: 'Ideas principales', forma: 'ovalo', tamanoTexto: 'subtitulo' },
      { id: 'idea1', texto: 'Subrogación, vacancia y reemplazo dan continuidad a la función presidencial', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'idea2', texto: 'El principio de continuidad de la función pública exige que siempre haya un titular', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'idea3', texto: 'Los expresidentes cuentan con un estatuto especial', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'justificacion' },
      { desde: 'justificacion', hasta: 'just-1' },
      { desde: 'justificacion', hasta: 'just-2' },
      { desde: 'justificacion', hasta: 'just-3' },
      { desde: 'justificacion', hasta: 'just-4' },

      { desde: 'raiz', hasta: 'eleccion' },
      { desde: 'eleccion', hasta: 'requisitos' },
      { desde: 'eleccion', hasta: 'votacion' },
      { desde: 'eleccion', hasta: 'investidura' },
      { desde: 'eleccion', hasta: 'duracion' },

      { desde: 'raiz', hasta: 'subrogacion' },
      { desde: 'subrogacion', hasta: 'sub-causales' },
      { desde: 'subrogacion', hasta: 'sub-orden' },

      { desde: 'raiz', hasta: 'cesacion' },
      { desde: 'cesacion', hasta: 'ces-1' },
      { desde: 'cesacion', hasta: 'ces-2' },
      { desde: 'cesacion', hasta: 'ces-3' },
      { desde: 'cesacion', hasta: 'ces-4' },
      { desde: 'cesacion', hasta: 'ces-5' },

      { desde: 'raiz', hasta: 'vacancia' },
      { desde: 'vacancia', hasta: 'vac-1' },
      { desde: 'vacancia', hasta: 'vac-2' },

      { desde: 'raiz', hasta: 'sub-vs-sup' },
      { desde: 'raiz', hasta: 'exPresidente' },

      { desde: 'raiz', hasta: 'ideas' },
      { desde: 'ideas', hasta: 'idea1' },
      { desde: 'ideas', hasta: 'idea2' },
      { desde: 'ideas', hasta: 'idea3' },
    ],
  },

  // Sexta y última plantilla de las clases del usuario — combina "12.
  // Presidente de la Republica: panorama de sus funciones y atribuciones"
  // (la vista general de las 4 categorías) con "13. Atribuciones de
  // Gobierno" (el desarrollo completo de la categoría I). Reemplaza en
  // profundidad a "plantilla-atribuciones-presidente" (la primera
  // plantilla de ejemplo de esta función, que usaba una clasificación más
  // simple e inventada por esta app, no la del curso real del usuario) —
  // se deja esa igual, por si sirve como ejemplo genérico, pero esta es la
  // que corresponde a SU curso.
  {
    id: 'plantilla-atribuciones-presidente-completo',
    titulo: 'Atribuciones del Presidente — Completo',
    descripcion: 'Las 4 categorías reales del curso (gubernativas, administrativas, nomogenéticas, control), con el desarrollo completo de las gubernativas.',
    nodos: [
      { id: 'raiz', texto: 'Atribuciones del Presidente', forma: 'ovalo', tamanoTexto: 'titulo' },

      { id: 'trifuncion', texto: 'Triple función (art. 24 inc. 1)', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'tf-1', texto: 'Jefe de Gobierno — función política', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'tf-2', texto: 'Jefe de la Administración — función ejecutiva y burocrática', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'tf-3', texto: 'Jefe de Estado — función simbólica y representativa', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'autoridad', texto: 'Amplia autoridad interna y externa (art. 24 inc. 2); la lista del art. 32 no es exhaustiva', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'categorias', texto: 'Cuatro tipos de atribuciones', forma: 'ninguna', tamanoTexto: 'subtitulo' },

      { id: 'gubernativas', texto: 'I. Gubernativas', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'g1', texto: '1. Proteger el orden constitucional', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'g1-a', texto: 'Declarar estados de excepción (art. 32 N°5): asamblea, sitio, catástrofe, emergencia', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g1-b', texto: 'Declarar la guerra — previa autorización legal y oír al COSENA (art. 32 N°19)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g1-c', texto: 'Asumir la jefatura de las FF.AA. en caso de guerra (art. 32 N°18)', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'g1-d',
        texto: 'Enfrentar emergencias económicas: gasto no autorizado hasta el 2% del presupuesto (art. 32 N°20)',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b45309',
      },
      { id: 'g2', texto: '2. Conducir la política exterior', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'g2-a', texto: 'Relaciones internacionales y designaciones diplomáticas (art. 32 N°8 y 15)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g2-tratados', texto: 'Facultades sobre tratados internacionales', forma: 'ninguna', tamanoTexto: 'texto' },
      { id: 'g2-t1', texto: 'Concluir, firmar y ratificar — con aprobación de ambas Cámaras (art. 32 N°15 / art. 54 N°1)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g2-t2', texto: 'Formular reservas y declaraciones interpretativas', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g2-t3', texto: 'Denunciar el tratado o retirarse — facultad exclusiva del Presidente', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g2-b', texto: 'Defensa exterior: declarar la guerra y asumir la jefatura de las FF.AA.', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g3', texto: '3. Nombrar autoridades', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'g3-a', texto: 'De exclusiva confianza: ministros, subsecretarios, delegados, embajadores (art. 32 N°7, 8 y 10)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g3-b', texto: 'Militares: Comandantes en Jefe y Director de Carabineros (art. 32 N°16)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g3-c', texto: 'Otras: Contralor, Consejeros del Banco Central, autoridades judiciales, Fiscal Nacional (art. 32 N°12)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g4', texto: '4. Conducir la política fiscal (art. 32 N°20)', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'g4-a', texto: 'Iniciativa exclusiva de la Ley de Presupuestos, siempre por mensaje presidencial (art. 67)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g4-b', texto: 'El Congreso solo puede *reducir* gastos — no los de una ley permanente', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b45309' },
      { id: 'g5', texto: '5. Otorgar gracias', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'g5-a', texto: 'Pensiones de gracia (art. 32 N°11) — requieren una ley que las regule', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'g5-b',
        texto: 'Indultos particulares (art. 32 N°14) — *no proceden* en delitos terroristas ni en acusación constitucional',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b91c1c',
      },
      { id: 'g6', texto: '6. Requerir la función consultiva', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'g6-a', texto: 'Citar a sesión a cualquiera de las Cámaras (art. 32 N°2)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'g6-b', texto: 'Convocar al Consejo de Seguridad Nacional (art. 107)', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'administrativas', texto: 'II. Administrativas', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'a1', texto: 'Nombrar funcionarios públicos', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'a2', texto: 'Dictar decretos con fuerza de ley refundidos', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'a3', texto: 'Recaudar las rentas públicas y ejecutar el presupuesto', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'nomogeneticas', texto: 'III. Nomogenéticas (creación de normas)', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'n1', texto: 'Formación de la ley (iniciativa, veto, promulgación)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'n2', texto: 'Decretos con Fuerza de Ley', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'n3', texto: 'Potestad reglamentaria', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'n4', texto: 'Iniciativa, veto y plebiscito en la reforma constitucional (art. 128)', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'control', texto: 'IV. Control', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'c1', texto: 'Controlar la conducta de los jueces (art. 32 N°13) — requerir a la Corte Suprema', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'c2', texto: 'Controlar la conducta del Fiscal Nacional (art. 89) — requerir su remoción a la Corte Suprema', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'c3', texto: 'Activar el control de constitucionalidad (art. 93)', forma: 'rectangulo', tamanoTexto: 'subtitulo' },
      { id: 'c3-a', texto: 'Autos acordados (N°2)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'c3-b', texto: 'Proyectos de ley, reforma constitucional o tratados (N°3)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'c3-c', texto: 'DFL rechazados por la Contraloría (N°4)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'c3-d', texto: 'Inhabilidades e incompatibilidades de parlamentarios (N°14)', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'ideas', texto: 'Ideas principales', forma: 'ovalo', tamanoTexto: 'subtitulo' },
      { id: 'idea1', texto: 'El Presidente tiene funciones, obligaciones y atribuciones especiales', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      { id: 'idea2', texto: 'Se separan en gubernativas, administrativas, nomogenéticas y de control', forma: 'rectangulo', tamanoTexto: 'texto', color: '#15803d' },
      {
        id: 'idea3',
        texto: 'El control es la regla general sobre la administración, y la excepción respecto de los demás órganos',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#15803d',
      },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'trifuncion' },
      { desde: 'trifuncion', hasta: 'tf-1' },
      { desde: 'trifuncion', hasta: 'tf-2' },
      { desde: 'trifuncion', hasta: 'tf-3' },

      { desde: 'raiz', hasta: 'autoridad' },
      { desde: 'raiz', hasta: 'categorias' },

      { desde: 'categorias', hasta: 'gubernativas' },
      { desde: 'gubernativas', hasta: 'g1' },
      { desde: 'g1', hasta: 'g1-a' },
      { desde: 'g1', hasta: 'g1-b' },
      { desde: 'g1', hasta: 'g1-c' },
      { desde: 'g1', hasta: 'g1-d' },
      { desde: 'gubernativas', hasta: 'g2' },
      { desde: 'g2', hasta: 'g2-a' },
      { desde: 'g2', hasta: 'g2-tratados' },
      { desde: 'g2-tratados', hasta: 'g2-t1' },
      { desde: 'g2-tratados', hasta: 'g2-t2' },
      { desde: 'g2-tratados', hasta: 'g2-t3' },
      { desde: 'g2', hasta: 'g2-b' },
      { desde: 'gubernativas', hasta: 'g3' },
      { desde: 'g3', hasta: 'g3-a' },
      { desde: 'g3', hasta: 'g3-b' },
      { desde: 'g3', hasta: 'g3-c' },
      { desde: 'gubernativas', hasta: 'g4' },
      { desde: 'g4', hasta: 'g4-a' },
      { desde: 'g4', hasta: 'g4-b' },
      { desde: 'gubernativas', hasta: 'g5' },
      { desde: 'g5', hasta: 'g5-a' },
      { desde: 'g5', hasta: 'g5-b' },
      { desde: 'gubernativas', hasta: 'g6' },
      { desde: 'g6', hasta: 'g6-a' },
      { desde: 'g6', hasta: 'g6-b' },

      { desde: 'categorias', hasta: 'administrativas' },
      { desde: 'administrativas', hasta: 'a1' },
      { desde: 'administrativas', hasta: 'a2' },
      { desde: 'administrativas', hasta: 'a3' },

      { desde: 'categorias', hasta: 'nomogeneticas' },
      { desde: 'nomogeneticas', hasta: 'n1' },
      { desde: 'nomogeneticas', hasta: 'n2' },
      { desde: 'nomogeneticas', hasta: 'n3' },
      { desde: 'nomogeneticas', hasta: 'n4' },

      { desde: 'categorias', hasta: 'control' },
      { desde: 'control', hasta: 'c1' },
      { desde: 'control', hasta: 'c2' },
      { desde: 'control', hasta: 'c3' },
      { desde: 'c3', hasta: 'c3-a' },
      { desde: 'c3', hasta: 'c3-b' },
      { desde: 'c3', hasta: 'c3-c' },
      { desde: 'c3', hasta: 'c3-d' },

      { desde: 'raiz', hasta: 'ideas' },
      { desde: 'ideas', hasta: 'idea1' },
      { desde: 'ideas', hasta: 'idea2' },
      { desde: 'ideas', hasta: 'idea3' },
    ],
  },

  // Mapa mental para "Introducción a la Profesión Jurídica" (E01, recurso
  // de protección) — mismo contenido que la plantilla de Colecciones
  // "Recurso de protección (art. 20)", pero organizado DISTINTO a
  // propósito: acá no es por artículo (eso ya lo cubre Colecciones), es por
  // el PROCESO real de escribir el recurso — el test del art. 20, la
  // estructura del escrito, las 4 operaciones de escritura, plazo y
  // tribunal, qué sigue después de presentado, y la tabla hecho→derecho —
  // que es lo que hace falta tener a mano bajo presión de examen (escrito a
  // mano, en clase, con la Constitución y el Auto Acordado impresos).
  // Fuente: RP.pptx (clase preparatoria) + el resumen ya verificado en
  // src/data/autoAcordadoProteccion.json para los numerales del Auto
  // Acordado que se citan acá.
  {
    id: 'plantilla-recurso-proteccion-escritura',
    titulo: 'Recurso de Protección — Cómo redactarlo',
    descripcion: 'El proceso de escribir el recurso: el test del art. 20, la estructura del escrito, y qué sigue después de presentado.',
    nodos: [
      { id: 'raiz', texto: 'Recurso de Protección\nCómo redactarlo', forma: 'ovalo', tamanoTexto: 'titulo' },

      { id: 'filtros', texto: 'El test del art. 20 (5 filtros)', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'filtro-1', texto: '1. Acto u omisión — ¿qué hizo o dejó de hacer alguien, y quién exactamente?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'filtro-2', texto: '2. Ilegal o arbitrario — ¿contradice el Derecho, o carece de razón?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'filtro-3', texto: '3. Afectación — ¿privación, perturbación o amenaza?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'filtro-4', texto: '4. Derecho protegido — ¿está entre los que ampara el art. 20?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'filtro-5', texto: '5. Medida útil — ¿qué puede ordenar concretamente la Corte?', forma: 'rectangulo', tamanoTexto: 'texto', color: '#b45309' },

      { id: 'estructura', texto: 'Estructura del escrito (7 partes)', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'parte-1', texto: '1. Tribunal — ¿a quién se dirige?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'parte-2', texto: '2. Comparecencia — ¿quién recurre, con qué domicilio, por quién?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'parte-3', texto: '3. Objeto — ¿qué acción se interpone y contra quién?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'parte-4', texto: '4. Hechos — ordenados, sin valoraciones', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'parte-5', texto: '5. Fundamentos — por qué es ilegal/arbitrario y qué derecho afecta', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'parte-6', texto: '6. Petitorio — medida concreta y ejecutable', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'parte-7', texto: '7. Otrosíes — documentos, patrocinio, orden de no innovar', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'operaciones', texto: 'Las 4 operaciones de escritura', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'op-narrar', texto: 'Narrar — qué ocurrió y en qué secuencia', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'op-describir', texto: 'Describir — cómo era algo relevante', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'op-argumentar',
        texto: 'Argumentar — por qué esos hechos justifican una conclusión *(no es lo mismo que narrar)*',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b91c1c',
      },
      { id: 'op-pedir', texto: 'Pedir — qué quiero que haga el tribunal', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'plazo-tribunal', texto: 'Plazo y tribunal', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#b45309' },
      { id: 'plazo', texto: '30 días corridos y fatales, desde el acto/omisión o desde que se supo (Auto Ac. N° 1)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'tribunal', texto: 'Corte de Apelaciones del lugar del acto o de sus efectos, a elección del recurrente (Auto Ac. N° 1)', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'siguiente', texto: 'Qué sigue después de presentado', forma: 'ninguna', tamanoTexto: 'subtitulo' },
      { id: 'sig-admisibilidad', texto: 'Admisibilidad — plazo + hechos que vulneren el art. 20 (Auto Ac. N° 2)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'sig-informe', texto: 'Informe del recurrido (sesión 2 de la evaluación) — Auto Ac. N° 3', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'sig-fallo', texto: 'Fallo — 5° día hábil, o 2° para ciertas garantías (Auto Ac. N° 10)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'sig-apelacion', texto: 'Apelación ante la Corte Suprema — 5 días hábiles (Auto Ac. N° 6)', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'derechos', texto: 'Derechos frecuentes: hecho → derecho', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#15803d' },
      { id: 'd-1', texto: 'Trato desigual sin razón → Igualdad ante la ley', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'd-2', texto: 'Riesgo serio para una persona → Vida / integridad física o psíquica', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'd-3', texto: 'Difusión injustificada de datos personales → Vida privada / honra', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'd-4', texto: 'Impedimento para usar o disponer de un bien → Propiedad', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'd-5', texto: 'Obstáculo injustificado a actividad económica lícita → Libertad económica', forma: 'rectangulo', tamanoTexto: 'texto' },
      {
        id: 'd-6',
        texto: 'Afectación ambiental imputable a alguien determinado → Medio ambiente *(regla especial, art. 19 N°8)*',
        forma: 'rectangulo',
        tamanoTexto: 'texto',
        color: '#b45309',
      },

      { id: 'preguntas', texto: 'Antes de escribir, 6 preguntas', forma: 'ovalo', tamanoTexto: 'subtitulo' },
      { id: 'q-1', texto: '¿Qué ocurrió?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'q-2', texto: '¿Quién actuó u omitió actuar?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'q-3', texto: '¿Por qué podría ser ilegal o arbitrario?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'q-4', texto: '¿Qué derecho protegido está afectado?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'q-5', texto: '¿En qué consiste la privación, perturbación o amenaza?', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'q-6', texto: '¿Qué medida concreta debe pedirse a la Corte?', forma: 'rectangulo', tamanoTexto: 'texto' },
    ],
    conexiones: [
      { desde: 'raiz', hasta: 'filtros' },
      { desde: 'filtros', hasta: 'filtro-1' },
      { desde: 'filtros', hasta: 'filtro-2' },
      { desde: 'filtros', hasta: 'filtro-3' },
      { desde: 'filtros', hasta: 'filtro-4' },
      { desde: 'filtros', hasta: 'filtro-5' },

      { desde: 'raiz', hasta: 'estructura' },
      { desde: 'estructura', hasta: 'parte-1' },
      { desde: 'estructura', hasta: 'parte-2' },
      { desde: 'estructura', hasta: 'parte-3' },
      { desde: 'estructura', hasta: 'parte-4' },
      { desde: 'estructura', hasta: 'parte-5' },
      { desde: 'estructura', hasta: 'parte-6' },
      { desde: 'estructura', hasta: 'parte-7' },

      { desde: 'raiz', hasta: 'operaciones' },
      { desde: 'operaciones', hasta: 'op-narrar' },
      { desde: 'operaciones', hasta: 'op-describir' },
      { desde: 'operaciones', hasta: 'op-argumentar' },
      { desde: 'operaciones', hasta: 'op-pedir' },

      { desde: 'raiz', hasta: 'plazo-tribunal' },
      { desde: 'plazo-tribunal', hasta: 'plazo' },
      { desde: 'plazo-tribunal', hasta: 'tribunal' },

      { desde: 'raiz', hasta: 'siguiente' },
      { desde: 'siguiente', hasta: 'sig-admisibilidad' },
      { desde: 'siguiente', hasta: 'sig-informe' },
      { desde: 'siguiente', hasta: 'sig-fallo' },
      { desde: 'siguiente', hasta: 'sig-apelacion' },

      { desde: 'raiz', hasta: 'derechos' },
      { desde: 'derechos', hasta: 'd-1' },
      { desde: 'derechos', hasta: 'd-2' },
      { desde: 'derechos', hasta: 'd-3' },
      { desde: 'derechos', hasta: 'd-4' },
      { desde: 'derechos', hasta: 'd-5' },
      { desde: 'derechos', hasta: 'd-6' },

      { desde: 'raiz', hasta: 'preguntas' },
      { desde: 'preguntas', hasta: 'q-1' },
      { desde: 'preguntas', hasta: 'q-2' },
      { desde: 'preguntas', hasta: 'q-3' },
      { desde: 'preguntas', hasta: 'q-4' },
      { desde: 'preguntas', hasta: 'q-5' },
      { desde: 'preguntas', hasta: 'q-6' },
    ],
  },
  {
    id: 'plantilla-dco-esquema-general',
    titulo: 'Derecho Constitucional Orgánico — Esquema general',
    // Radial en vez de árbol izquierda-derecha (ver layoutInicial más abajo
    // y calcularLayoutRadial en MapasMentalesView.tsx): con 5 ramas de
    // tamaño parejo, quedan repartidas alrededor del título como un mapa
    // mental dibujado a mano, en vez de una columna larga.
    descripcion: 'Panorama del curso en 5 bloques repartidos alrededor del título — lo fundamental de cada bloque, con referencias directas a los ppts, para repasar de un vistazo antes de entrar al detalle de cada plantilla del curso.',
    layoutInicial: 'radial',
    nodos: [
      { id: 'dco-raiz', texto: 'Derecho Constitucional\nOrgánico', forma: 'ovalo', tamanoTexto: 'titulo' },

      { id: 'dco-b1', texto: 'I. Fundamentos y\nTeoría del Órgano', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'dco-b1-1', texto: 'Relaciones entre órganos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b1-1-n', texto: 'separación/frenos · cooperación · jerarquía-tutela-autonomía', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b1-2', texto: 'Sustituye la representación/mandato', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b1-2-n', texto: 'crítica normativista de Kelsen', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b1-3', texto: 'Órgano = Competencia + Titular', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b1-3-n', texto: 'competencia = objetivo · titular = subjetivo', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b1-4', texto: 'Utilidad: continuidad de la función estatal', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b1-5', texto: 'Dualidad ciudadano / órgano', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b1-5-n', texto: 'órgano y personalidad jurídica: Estado Fisco', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b1-6', texto: 'Límites de la teoría', forma: 'ovalo', tamanoTexto: 'texto', color: '#b45309' },
      { id: 'dco-b1-6-n', texto: 'legitimidad democrática + equilibrio de poder (Estado de Derecho)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b1-7', texto: 'Clasificaciones de órganos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b1-7-n', texto: 'Jellinek: inmediatos/mediatos · primarios/secundarios · simples/potenciados · independientes/dependientes · normales/extraordinarios — Otras: constitucionales/legales · unipersonales/colegiados · activos/consultivos/de control · territoriales', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'dco-b2', texto: 'II. Separación\nde Poderes', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'dco-b2-1', texto: 'Montesquieu: separación estricta', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b2-1-n', texto: 'El espíritu de las leyes, 1748 — separación de órganos y funciones', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b2-2', texto: 'Carré de Malberg: distribución y cooperación', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b2-2-n', texto: 'Teoría General del Estado, 1920 — la voluntad del Estado es una sola', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b2-3', texto: 'Madison: frenos y contrapesos', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b2-3-n', texto: 'El Federalista, 1788 — "la ambición debe hacerse para contrarrestar la ambición"', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b2-4', texto: 'Legitimidad Legislativa', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b2-4-n', texto: 'representación y deliberación (arts. 65-75)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b2-5', texto: 'Legitimidad Jurisdiccional', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b2-5-n', texto: 'independencia: inamovilidad · inavocabilidad · inexcusabilidad', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b2-6', texto: 'Legitimidad Administrativa', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b2-6-n', texto: 'mandato jerárquico: principio comisarial', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b2-7', texto: 'Chile: art. 7', forma: 'ovalo', tamanoTexto: 'texto', color: '#b45309' },
      { id: 'dco-b2-7-n', texto: 'sin reconocimiento explícito — investidura regular + competencia + forma legal de actuación', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'dco-b3', texto: 'III. Régimen\nde Gobierno', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'dco-b3-1', texto: 'Presidencial / Parlamentario / Semipresidencial', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b3-1-n', texto: 'criterios: elección, duración, integración del gobierno', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b3-2', texto: 'Alemania: censura constructiva', forma: 'ovalo', tamanoTexto: 'texto', color: '#7e22ce' },
      { id: 'dco-b3-2-n', texto: 'art. 67 Ley Fundamental, 1949 — exige elegir sucesor antes de derribar al Canciller', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b3-3', texto: 'Francia: premier-parlamentario', forma: 'ovalo', tamanoTexto: 'texto', color: '#7e22ce' },
      { id: 'dco-b3-3-n', texto: 'Constitución de 1958 — problema de la "cohabitación"', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b3-4', texto: 'Chile: presidencialismo reforzado', forma: 'ovalo', tamanoTexto: 'texto', color: '#b45309' },
      { id: 'dco-b3-4-n', texto: 'hiperpresidencialismo', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b3-5', texto: 'Poderes constitucionales (altos) vs. partidarios (débiles)', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b3-5-n', texto: 'proactivos: iniciativa exclusiva, potestad reglamentaria, delegación — reactivos: veto, control del presupuesto', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b3-6', texto: '6 frentes de acumulación', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b3-6-n', texto: 'proceso legislativo · presupuesto · jefatura del Ejecutivo · integración de otros órganos · estados de excepción · sin responsabilidad política', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b3-7', texto: 'Correctores del modelo', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b3-7-n', texto: 'presidencialismo de coalición · Tribunal Constitucional', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'dco-b4', texto: 'IV. Gobierno y\nAdministración', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'dco-b4-1', texto: 'Gobierno = voluntad · Administración = acción', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b4-1-n', texto: 'art. 24 / Huneeus, 1891', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b4-2', texto: 'Principio comisarial', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b4-2-n', texto: 'la legitimidad desciende del Presidente electo', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b4-3', texto: 'Competencias regladas', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b4-3-n', texto: 'ej: promulgar la ley en 10 días (art. 75)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b4-4', texto: 'Competencias discrecionales', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b4-4-n', texto: 'ej: celebrar los tratados que estime convenientes (art. 32 N°15)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b4-5', texto: 'Actos de gobierno vs. administrativos', forma: 'ovalo', tamanoTexto: 'texto', color: '#b45309' },
      { id: 'dco-b4-5-n', texto: 'los de gobierno no son reclamables por ilegalidad ante tribunales', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b4-6', texto: 'Centralizados', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b4-6-n', texto: 'personalidad jurídica del Fisco · jerarquía — ej: ministerios, servicios públicos', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b4-7', texto: 'Descentralizados', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b4-7-n', texto: 'personalidad propia · supervigilancia — ej: gob. regionales, municipalidades, Contraloría, Banco Central', forma: 'rectangulo', tamanoTexto: 'texto' },

      { id: 'dco-b5', texto: 'V. El Presidente\nde la República', forma: 'rectangulo', tamanoTexto: 'subtitulo', color: '#1d4ed8' },
      { id: 'dco-b5-1', texto: 'Requisitos de elegibilidad', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b5-1-n', texto: 'chileno, 35 años, ciudadano con derecho a sufragio (art. 25)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b5-2', texto: 'Elección y segunda vuelta', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b5-2-n', texto: 'arts. 26-27 · 4 años, sin reelección inmediata', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b5-3', texto: 'Subrogación (temporal)', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b5-3-n', texto: 'art. 29 — enfermedad, ausencia del país, otro grave motivo', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b5-4', texto: 'Vacancia (definitiva)', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b5-4-n', texto: '< 2 años restantes: elige el Congreso Pleno — ≥ 2 años: nueva elección popular', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b5-5', texto: 'Triple función', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b5-5-n', texto: 'Gobierno · Administración · Jefe de Estado (art. 24)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b5-6', texto: 'Atribuciones gubernativas', forma: 'ovalo', tamanoTexto: 'texto', color: '#b45309' },
      { id: 'dco-b5-6-n', texto: 'proteger el orden constitucional · política exterior · nombrar autoridades · política fiscal · gracias · función consultiva (art. 32)', forma: 'rectangulo', tamanoTexto: 'texto' },
      { id: 'dco-b5-7', texto: 'Administrativas, nomogenéticas y de control', forma: 'ovalo', tamanoTexto: 'texto' },
      { id: 'dco-b5-7-n', texto: 'nomogenéticas: ley, DFL, tratados, potestad reglamentaria, reforma constitucional — control: jueces, Fiscal Nacional, TC', forma: 'rectangulo', tamanoTexto: 'texto' },
    ],
    conexiones: [
      { desde: 'dco-raiz', hasta: 'dco-b1' },
      { desde: 'dco-b1', hasta: 'dco-b1-1' },
      { desde: 'dco-b1-1', hasta: 'dco-b1-1-n' },
      { desde: 'dco-b1', hasta: 'dco-b1-2' },
      { desde: 'dco-b1-2', hasta: 'dco-b1-2-n' },
      { desde: 'dco-b1', hasta: 'dco-b1-3' },
      { desde: 'dco-b1-3', hasta: 'dco-b1-3-n' },
      { desde: 'dco-b1', hasta: 'dco-b1-4' },
      { desde: 'dco-b1', hasta: 'dco-b1-5' },
      { desde: 'dco-b1-5', hasta: 'dco-b1-5-n' },
      { desde: 'dco-b1', hasta: 'dco-b1-6' },
      { desde: 'dco-b1-6', hasta: 'dco-b1-6-n' },
      { desde: 'dco-b1', hasta: 'dco-b1-7' },
      { desde: 'dco-b1-7', hasta: 'dco-b1-7-n' },

      { desde: 'dco-raiz', hasta: 'dco-b2' },
      { desde: 'dco-b2', hasta: 'dco-b2-1' },
      { desde: 'dco-b2-1', hasta: 'dco-b2-1-n' },
      { desde: 'dco-b2', hasta: 'dco-b2-2' },
      { desde: 'dco-b2-2', hasta: 'dco-b2-2-n' },
      { desde: 'dco-b2', hasta: 'dco-b2-3' },
      { desde: 'dco-b2-3', hasta: 'dco-b2-3-n' },
      { desde: 'dco-b2', hasta: 'dco-b2-4' },
      { desde: 'dco-b2-4', hasta: 'dco-b2-4-n' },
      { desde: 'dco-b2', hasta: 'dco-b2-5' },
      { desde: 'dco-b2-5', hasta: 'dco-b2-5-n' },
      { desde: 'dco-b2', hasta: 'dco-b2-6' },
      { desde: 'dco-b2-6', hasta: 'dco-b2-6-n' },
      { desde: 'dco-b2', hasta: 'dco-b2-7' },
      { desde: 'dco-b2-7', hasta: 'dco-b2-7-n' },

      { desde: 'dco-raiz', hasta: 'dco-b3' },
      { desde: 'dco-b3', hasta: 'dco-b3-1' },
      { desde: 'dco-b3-1', hasta: 'dco-b3-1-n' },
      { desde: 'dco-b3', hasta: 'dco-b3-2' },
      { desde: 'dco-b3-2', hasta: 'dco-b3-2-n' },
      { desde: 'dco-b3', hasta: 'dco-b3-3' },
      { desde: 'dco-b3-3', hasta: 'dco-b3-3-n' },
      { desde: 'dco-b3', hasta: 'dco-b3-4' },
      { desde: 'dco-b3-4', hasta: 'dco-b3-4-n' },
      { desde: 'dco-b3', hasta: 'dco-b3-5' },
      { desde: 'dco-b3-5', hasta: 'dco-b3-5-n' },
      { desde: 'dco-b3', hasta: 'dco-b3-6' },
      { desde: 'dco-b3-6', hasta: 'dco-b3-6-n' },
      { desde: 'dco-b3', hasta: 'dco-b3-7' },
      { desde: 'dco-b3-7', hasta: 'dco-b3-7-n' },

      { desde: 'dco-raiz', hasta: 'dco-b4' },
      { desde: 'dco-b4', hasta: 'dco-b4-1' },
      { desde: 'dco-b4-1', hasta: 'dco-b4-1-n' },
      { desde: 'dco-b4', hasta: 'dco-b4-2' },
      { desde: 'dco-b4-2', hasta: 'dco-b4-2-n' },
      { desde: 'dco-b4', hasta: 'dco-b4-3' },
      { desde: 'dco-b4-3', hasta: 'dco-b4-3-n' },
      { desde: 'dco-b4', hasta: 'dco-b4-4' },
      { desde: 'dco-b4-4', hasta: 'dco-b4-4-n' },
      { desde: 'dco-b4', hasta: 'dco-b4-5' },
      { desde: 'dco-b4-5', hasta: 'dco-b4-5-n' },
      { desde: 'dco-b4', hasta: 'dco-b4-6' },
      { desde: 'dco-b4-6', hasta: 'dco-b4-6-n' },
      { desde: 'dco-b4', hasta: 'dco-b4-7' },
      { desde: 'dco-b4-7', hasta: 'dco-b4-7-n' },

      { desde: 'dco-raiz', hasta: 'dco-b5' },
      { desde: 'dco-b5', hasta: 'dco-b5-1' },
      { desde: 'dco-b5-1', hasta: 'dco-b5-1-n' },
      { desde: 'dco-b5', hasta: 'dco-b5-2' },
      { desde: 'dco-b5-2', hasta: 'dco-b5-2-n' },
      { desde: 'dco-b5', hasta: 'dco-b5-3' },
      { desde: 'dco-b5-3', hasta: 'dco-b5-3-n' },
      { desde: 'dco-b5', hasta: 'dco-b5-4' },
      { desde: 'dco-b5-4', hasta: 'dco-b5-4-n' },
      { desde: 'dco-b5', hasta: 'dco-b5-5' },
      { desde: 'dco-b5-5', hasta: 'dco-b5-5-n' },
      { desde: 'dco-b5', hasta: 'dco-b5-6' },
      { desde: 'dco-b5-6', hasta: 'dco-b5-6-n' },
      { desde: 'dco-b5', hasta: 'dco-b5-7' },
      { desde: 'dco-b5-7', hasta: 'dco-b5-7-n' },
    ],
  },
]

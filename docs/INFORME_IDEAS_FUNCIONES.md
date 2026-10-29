# Informe de ideas: qué hacen otras apps que Prima Lex aún no tiene

Fecha: 2026-10-28. Alcance: todas las funciones de Prima Lex menos los apuntes (ya cubiertos en la conversación anterior; aquí solo se enlazan donde cruzan con otra función).

## Cómo leer este informe (y sus límites)

- **Lo nuestro** lo verifiqué en el código (vistas, servicios y datos). Donde escribo «no encontré» significa que busqué en `src/` y no apareció; no es una prueba de que no exista.
- **Lo de las otras apps** sale de búsquedas web. Casi todo son blogs, páginas comparativas y notas de prensa, no documentación oficial, y varias son de empresas que venden algo. Úsenlo como pistas, no como especificaciones. Cuando una búsqueda no encontró nada, lo digo en vez de rellenar con memoria.
- **Cosas que sé por conocimiento general** (no verificadas en esta búsqueda) van marcadas como «conocimiento general».
- No hay datos de usuarios reales. Las prioridades son mi criterio con la estrategia de venta vigente (estudiante de Derecho chileno, mucho iPad, sin IA en los apuntes), no una medición.

## 1. Mapa de lo que ya tenemos

| Función | Qué hay hoy (verificado en código) |
|---|---|
| **Hoy** | «Lo que sigue» (próxima clase o evaluación con cuenta regresiva y modo clase), solemnes con plan de estudio día por día, resumen semanal compartible. |
| **Mis ramos** | Ficha por ramo; pestañas Resumen, Clases, Apuntes, Textos, Casos, Exámenes; horario estructurado y «Generar semestre»; asistencia con margen de faltas; resumen de notas y simulador «¿y si saco…?». |
| **Tareas / Calendario** | Tareas integradas a los ramos; calendario mes y semana; exportar `.ics`. |
| **Enfoque** | Pomodoro y Flowtime, estadísticas e historial, calificación de la sesión, respiración guiada, ambientes y escenas, Sala de estudio con apunte editable, notificaciones, rachas. |
| **Explorador** | Más de 50 normas, búsqueda (Ctrl+K), índice, esquema del código (lista y diagrama), copiar cita, resaltado de coincidencias, guardar en colección, imprimir un artículo, panel de consulta de artículos junto al apunte. |
| **Colecciones** | Colecciones de artículos, compartir por link o archivo (con confirmación al importar), repaso. |
| **Mapas mentales** | Editor con teclado, formas, colores con significado, nota al margen, organizar automático, exportar PDF, vínculo a colección y ramo. |
| **Práctica** | Pasapalabra, Quiz jurídico (Destello), Ahorcado, Repaso con FSRS (Error/Acierto, pista). |
| **Cuenta y datos** | Respaldo manual, cuentas (Supabase, invisibles hasta configurar), PWA, estadísticas de uso (apagadas). |

## 2. Hallazgos por función

Cada idea lleva: **origen** (dónde la vi), **valor** para un estudiante de Derecho, **esfuerzo** (Bajo = días; Medio = una a dos semanas; Alto = más) y **riesgo/nota**.

### 2.1 Hoy y planificación

1. **Vista «Mi semana» de un solo vistazo**: clases, evaluaciones, tareas y bloques de estudio sugeridos en una sola línea de tiempo.
   - Origen: MyStudyLife (horario y exámenes en un solo lugar, según reseñas) y Todoist.
   - Valor: alto, porque hoy Hoy, Calendario y Tareas viven separados.
   - Esfuerzo: Medio. Nota: parte ya existe en `LoQueSigue` y `Solemnes`.
2. **Recordatorios con aviso real (push)** antes de una evaluación o entrega.
   - Origen: MyStudyLife y Todoist (recordatorios). Ya existe `useRecordatorios`, pero solo funciona con la app abierta.
   - Valor: alto si se usa en iPad. Esfuerzo: Medio a Alto (push web en iOS exige PWA instalada y servidor).
   - Riesgo: depende de iOS y no pude verificarlo desde aquí; hay que probar en un iPad real.
3. **Widget / acceso rápido «tarea hecha»**: MyStudyLife tiene un widget para marcar tareas desde el teléfono. En PWA no se puede hacer un widget real; lo más cercano es un acceso directo en el manifest. Prioridad baja.

### 2.2 Mis ramos, notas y asistencia

4. **Promedio ponderado y escenario de aprobación** ya existe como simulador. Falta lo que ofrecen las apps de promedio (Power Planner, citado en reseñas por proyección de GPA): **nota mínima necesaria en lo que queda** con un solo toque, y mostrar la **escala chilena 1,0 a 7,0 con exigencia del 60 %** como opción. Esfuerzo: Bajo. Valor: medio-alto (es lo que más se calcula a mano).
5. **Banco de pruebas pasadas por ramo** (subir fotos o PDF de solemnes anteriores y marcar «cayó esto»). No lo vi en ninguna reseña; sale de cómo estudian en la práctica. Esfuerzo: Alto (archivos), pero sería un diferencial. Antes de construir habría que validar con 5 estudiantes.
6. **Plan por profesor**: guardar el estilo de evaluación («toma jurisprudencia», «pregunta casos») y mostrarlo antes de estudiar. Esfuerzo: Bajo. Valor: medio.

### 2.3 Enfoque

7. **Estudiar acompañado**: salas con otras personas, sesiones compartidas. Flora permite plantar árboles con amigos (según la reseña); no encontré datos sobre Forest ni sobre Study Together en esa búsqueda.
   - Valor: potencialmente alto para retención, y encaja con el canal de «centros de alumnos».
   - Esfuerzo: Alto (tiempo real, moderación, privacidad). Hay una `Sala de estudio` local: la base existe, la parte social no.
8. **Gamificación suave tipo Forest** (un árbol por sesión que muere si se abandona). Forest y Flora lo usan, pero ambas son apps de teléfono. Para iPad/PWA no se puede bloquear otras apps, así que la presión de «no salir» no funciona. Ya hay rachas. Recomendación: **no copiar**; mejor mostrar el jardín de sesiones completadas como calendario.
9. **Bloqueo de distracciones**: imposible en una PWA. Lo dejaría fuera.

### 2.4 Explorador (nuestro diferencial)

No hay competidor directo de estudiante en Chile; las apps jurídicas que aparecen en las búsquedas apuntan a abogados y a precios de empresa (por ejemplo, listados desde US$89 a US$200 por usuario al mes para vLex Fastcase y Westlaw Precision, cifras de agregadores y por puesto, no de estudiante).

10. **Qué dicen los citadores** (Westlaw KeyCite y similares): para cada artículo, mostrar **si fue modificado y por qué ley**, con fecha. Es lo que los citadores valoran más (una guía lo dice así: un citador puede salvar un escrito). Hoy tenemos el texto vigente; si los datos de la BCN traen historial de modificaciones, se puede mostrar. Esfuerzo: Medio. Riesgo: depende de la fuente; **no inventar historial**.
11. **Concordancias entre normas**: de un artículo del Código Civil, saltar a los artículos relacionados de otras normas (matriz de relaciones ya prevista en metadatos). Se quitó la vista Mapa; esto sería una lista corta «ver también», sin grafo. Esfuerzo: Medio.
12. **Anotar sobre el artículo**: subrayar un trozo y escribir una nota que quede pegada al artículo, visible la próxima vez que lo abras (parecido a lo que hacen las apps de PDF para sentencias). Hoy se puede copiar la cita y guardar en colección, pero no anotar encima. Esfuerzo: Medio. **Valor alto**: es la función por la que más se vuelve a abrir un código.
13. **Comparar versiones**: el artículo antes y después de una reforma. Depende del dato (ver 10).

### 2.5 Colecciones

14. **Colecciones plantilla por ramo** («artículos que más caen en Civil I»): ya hay `coleccionesPlantilla`. Falta un lugar para que **un delegado o ayudante publique una colección oficial del curso** y los compañeros la importen con un link. El mecanismo de link existe. Esfuerzo: Bajo. Valor: alto para el canal de difusión (los centros de alumnos).
15. **Orden manual y secciones dentro de una colección**: no vi evidencia de que existan. Esfuerzo: Bajo a Medio.

### 2.6 Mapas mentales

16. **Mapa → apunte** y **apunte → mapa**: generar el esqueleto de un mapa desde los títulos de un apunte (por reglas, sin IA) y al revés. Origen: Obsidian/Excalidraw conectan texto y dibujo (Excalidraw es el plugin más descargado de Obsidian según un ranking). Esfuerzo: Medio. Valor: alto, porque ahorra rehacer lo mismo en dos sitios.
17. **Plantillas de mapa para derecho**: «requisitos y efectos», «clasificación», «procedimiento paso a paso». Esfuerzo: Bajo.

### 2.7 Práctica y repaso

18. **Modos de práctica estilo Quizlet/Kahoot/Quizizz.** Lo que pude confirmar: Kahoot es marcado por el profesor y suma puntos por rapidez; Quizizz permite ir a tu ritmo y tiene modo tarea; Blooket usa minijuegos. De Quizlet (Learn, Test, Match) **no obtuve confirmación en esta búsqueda**; lo cito solo como conocimiento general.
    - Valor: medio. El Pasapalabra ya es el gancho; añadir más juegos sin mejorar el aprendizaje es entretenimiento.
19. **Etiquetas, ordenar por dificultad y mazos filtrados** (Anki, conocimiento general): estudiar «solo lo que fallé esta semana» o «solo Penal parte especial». Esfuerzo: Bajo a Medio. **Valor alto** si el repaso crece en volumen.
20. **Duelos o ligas entre compañeros** (estilo Duolingo, conocimiento general; en las búsquedas no hallé datos de ligas). Se podría hacer un ranking por curso opt-in. Riesgo: presión social y privacidad. Dejar para después de tener cuentas.

### 2.8 Cuenta, datos y entrega

21. **Importar desde Anki / Quizlet** (CSV) para que alguien que ya estudió con otra app no empiece de cero. Esfuerzo: Bajo. Valor: alto para la conversión de estudiantes que ya tienen mazos.
22. **Uso sin conexión explícito**: el service worker existe; faltaría un aviso claro «tus apuntes funcionan sin internet». Esfuerzo: Bajo. Hay que verificarlo en iPad.

## 3. Propuesta de función nueva: **Modo examen (simulacro)**

**Qué es:** una pantalla donde eliges ramo(s) y materia (apuntes, colecciones o todo el ramo), cantidad de preguntas y tiempo, y la app arma un simulacro con **preguntas generadas por reglas** a partir de lo que ya está escrito, sin IA:

- **Completar el hueco** (cloze) desde frases del apunte.
- **Definición ↔ término** de opción múltiple, con distractores tomados de otros términos del mismo ramo.
- **Verdadero o falso** alterando un dato o plazo de un artículo.
- **Artículo ↔ contenido**: «¿Qué artículo del Código Civil dice…?».
- **Caso corto** que se autocorrige con una rúbrica IRAC que tú escribiste en un apunte.

Al terminar: puntaje, tiempo por pregunta, **qué temas fallaste**, y un botón para pasar lo fallado al repaso FSRS y al plan de estudio del solemne (`planEstudio.ts`).

**Por qué esta y no otra:**

- Está en el plan de la estrategia de venta (modo examen, cloze, plan de estudio) y es lo que más se parece a lo que el estudiante necesita antes de una solemne.
- Reutiliza piezas ya construidas: generador de tarjetas, FSRS, plan de estudio, evaluaciones por ramo, Pasapalabra y Quiz.
- No cuesta servir (todo local), así que respeta la regla de «apuntes sin IA».
- Es una buena candidata a **Pro**: nada de esto lo da gratis un lector de códigos.

**Riesgos:**

- La calidad de los distractores y de los falsos depende de que los apuntes estén bien escritos; con apuntes pobres saldrán preguntas pobres. Hay que mostrar «no alcanza material para N preguntas» en vez de rellenar.
- Las preguntas de verdadero/falso alteradas por regla deben revisarse con cuidado: un dato alterado mal puede enseñar algo falso. Propongo empezar solo con cloze y definición ↔ término, y sumar lo demás tras probarlo con contenido real.

**Esfuerzo:** Medio a Alto (2 a 3 semanas con pruebas). Se puede entregar por etapas: (1) cloze y opción múltiple, (2) informe de resultados y envío al repaso, (3) simulacro con tiempo y mezcla de ramos.

## 4. Lo que descartaría

- Bloqueo de apps y de sitios (imposible en PWA).
- Grafos de conexiones y vistas tipo base de datos de Notion u Obsidian (poco valor con pocos apuntes).
- Cualquier resumen o respuesta con IA dentro de los apuntes.
- Escáner de documentos y escritura a mano: proyectos grandes, mejor después de validar demanda.
- Grabación y transcripción de clase: descartada por el usuario.

## 5. Orden sugerido

| Orden | Ítem | Esfuerzo | Por qué |
|---|---|---|---|
| 1 | Modo examen, etapa 1 (cloze + opción múltiple) | Medio | Mayor valor y encaja con Pro |
| 2 | Anotar sobre el artículo (12) | Medio | Razón para volver al Explorador |
| 3 | Colecciones oficiales del curso por link (14) | Bajo | Canal con centros de alumnos |
| 4 | Importar desde Anki/Quizlet (21) | Bajo | Entrada fácil para quien ya estudia con otra app |
| 5 | Nota mínima necesaria y escala chilena (4) | Bajo | Se usa cada semestre |
| 6 | Mazos filtrados y etiquetas en el repaso (19) | Bajo a Medio | Escala con el uso |
| 7 | Mapa ↔ apunte (16) | Medio | Evita duplicar trabajo |
| 8 | Qué cambió en un artículo (10), si el dato existe | Medio | Diferencial frente a lectores simples |

Los ítems 5 y 6 se pueden hacer en paralelo con el 1. Cualquiera de estos se empieza revisando primero el código que ya existe, para no duplicarlo.

## Fuentes consultadas (orientativas)

- OneNote: <https://support.microsoft.com/en-us/education/comparing-educational-features-of-onenote-and-class-notebook-across-platforms-and-devices>
- Comparativas de apuntes: <https://yourlegalladder.com/resources/guides/best-note-taking-apps-law-students>, <https://www.goodnotes.com/blog/goodnotes-vs-notability>
- Obsidian, plugins más descargados: <https://www.obsidianstats.com/most-downloaded>
- Planificadores (MyStudyLife, Notion, Todoist): <https://cal.com/blog/planner-apps-for-students>, <https://www.savemyexams.com/learning-hub/useful-resources/best-productivity-apps-for-students/>
- Apps de enfoque (Forest, Flora, Pomofocus): <https://colabear-pomodoro.pages.dev/en/blog/pomodoro-app-comparison>, <https://nerdynav.com/forest-vs-flora-pomodoro>
- Juegos de práctica (Kahoot, Quizizz, Blooket): <https://ditchthattextbook.com/gameshow>, <https://nibble-app.com/blog/kahoot-vs-quizizz>
- Investigación jurídica (Westlaw, Lexis, vLex): <https://softwarefinder.com/resources/westlaw-vs-lexis>, <https://otio.ai/blog/best-legal-research-databases-tools>
- Estudio en Derecho: <https://studycardsai.com/blog/best-study-techniques-for-law-students>
- Anki, Quizlet y RemNote: <https://www.remnote.com/blog/anki-vs-quizlet-vs-remnote> (sitio de un competidor)

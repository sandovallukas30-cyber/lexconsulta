# Prima Lex — todos los paneles (brief para Claude Design)

Documento para rediseñar la interfaz completa. Describe qué existe hoy, qué hace cada pantalla, qué problemas encontró la auditoría del 21-oct-2026 y qué no se puede romper. Código: `C:\Users\sando\lexconsulta` (React 19 + TypeScript + Tailwind 4). Producción: https://primalex.vercel.app

---

## 1. Producto en una página

- **Qué es:** cuaderno de estudio para estudiantes de Derecho en Chile. Organiza el semestre (ramos, tareas, calendario, evaluaciones), ayuda a concentrarse (Enfoque, Sala de estudio), guarda apuntes y trae 54 códigos y leyes chilenas para leer y buscar (Explorador).
- **Quién la usa:** estudiantes de 18 a 30 años; muchos en **iPad** (a veces dividido con otra app) y en celular; también laptop. A veces antes de una solemne, con estrés y poco tiempo.
- **Tono:** cercano, en español de Chile, tuteo, sin jerga. Serio pero no frío: es una herramienta por la que alguien podría pagar.
- **Modelo:** gratis hoy; plan Pro más adelante (sincronización y repaso). Sin cuenta todo queda en el dispositivo. Con cuenta (Google, Microsoft o enlace por correo) hay copia en la nube.
- **Meta de diseño:** que se vea como un producto serio y confiable, que un estudiante nuevo entienda cómo empezar en un minuto, y que funcione bien con el dedo en iPad.

## 2. Reglas que el diseño debe respetar

1. **iPad primero.** Objetivos táctiles ≥ 44 px, campos de 16 px (si no, iOS hace zoom), nada que exista solo al pasar el mouse, funciona en vertical, horizontal y en Split View.
2. **Accesibilidad AA:** contraste de texto ≥ 4,5:1 (3:1 en componentes y foco), foco visible, todo operable con teclado, `prefers-reduced-motion` y modo «animaciones: no». Hoy el contraste pasa en claro y oscuro; no empeorarlo.
3. **Claro y oscuro** en todas las pantallas, más 8 colores de acento a elegir (Prima Lex es el verde por defecto). Los textos que usan el acento deben seguir cumpliendo contraste en ambos modos.
4. **Tamaño de interfaz** ajustable por la persona (Muy pequeño … Muy grande); el diseño debe resistir 125 % y 150 %.
5. **Sin mascotas ni logos de universidades** (se quitaron a propósito). Tampoco colores inventados de instituciones.
6. **Sin IA en los apuntes** (solo reglas); la IA solo se usa en un juego de práctica.
7. **Textos legales** (códigos y leyes) no se modifican: se muestran tal cual con su fuente (BCN).
8. **Rendimiento:** en celular y iPad hubo fps bajos; evitar sombras pesadas, `backdrop-filter`, animaciones infinitas y listas con miles de nodos.
9. **Íconos:** Tabler Icons recortados (hoy ~190). Un ícono nuevo hay que agregarlo al recorte (`node scripts/subset_iconos.mjs`).
10. **Fuentes:** Plus Jakarta Sans (texto) y Sora (títulos; los títulos de código van en serif). Se sirven desde el propio sitio, sin Google Fonts.

## 3. Sistema visual actual (punto de partida, no sagrado)

- **Estilo:** plano, tarjetas con borde de 1 px (se retiró el neumorfismo). Variables `--neu-*` (el prefijo es histórico).
- **Colores claros:** fondo `#f4f6fa`, tarjeta `#ffffff`, línea `#e0e5ed`, texto `#1f2344` / `#4b5373` / `#565e7e`; ok `#1f9d61`, aviso `#d98a1a`, peligro `#e4504f`.
- **Colores oscuros:** fondo `#14172a`, tarjeta `#1c2032`, hundido `#0f1120`, línea `#2d3356`, texto `#eef0fb` / `#a7afcc` / `#8a93b6`; ok `#4bcf92`, aviso `#f2bd5c`, peligro `#f3807f`.
- **Tipografía observada:** 13, 14, 15, 16, 18, 24 y 28 px; título de página 28 px / 700 (`.titulo-pagina`); lectura de artículos 17 px; texto de apoyo mínimo 13 px.
- **Botones:** `.boton` + variante (primario, suave, borde, fantasma) y tamaños; alto 44 px en táctil, 32–40 px en escritorio.
- **Problemas conocidos del sistema (para que el diseño nuevo los resuelva):** no hay una escala de espaciado ni de radios única; hay variantes de botones, campos y chips que no deberían existir; el banner de un ramo en oscuro es un bloque lila muy claro que desentona; la prioridad de una tarea solo se distingue por color.

## 4. Mapa de navegación

Escritorio ancho (≥ ~1180 px): **menú lateral fijo de ~296 px** + contenido. En pantallas menores: barra superior con «Abrir menú» y, en celular, **barra inferior** de 5 ítems (Hoy, Tareas, Enfoque, Explorar, Más). El menú se abre como panel que se superpone (en iPad vertical tapa ~40 % de la pantalla).

Secciones y direcciones:

| Sección | Dirección | Ícono / nombre en el menú |
|---|---|---|
| Hoy | `/hoy` | Hoy |
| Tareas | `/tareas` | Tareas |
| Calendario | `/calendario` | Calendario |
| Enfoque | `/enfoque` | Enfoque |
| Mis ramos | `/mis-ramos` (alias `/modulos`) | Mis ramos |
| Explorador de códigos | `/explorador` | Explorador (en la barra móvil: «Explorar») |
| Colecciones | `/colecciones` | Colecciones |
| Mapas mentales | `/mapas-mentales` | Mapas mentales |
| Práctica | `/practica` | Práctica (el título dice «Área de práctica») |
| Páginas legales | `/privacidad`, `/terminos`, `/aviso-legal` | pie del menú / Acerca de |
| No encontrada | cualquier otra | página 404 |

Pie del menú: **Códigos (54 activos)**, **Configuración**, cuenta («Entrar»), modo oscuro, colapsar menú (solo horizontal), «Gratis por ahora · Privacidad · Términos» (se oculta en pantallas de menos de 880 px de alto).

**Inconsistencia de nombres a resolver:** la misma sección se llama «Explorador», «Explorar» y «Explorador de códigos»; Práctica aparece como «Práctica» y «Área de práctica».

---

## 5. Pantallas (una por una)

Para cada una: **para qué sirve**, **qué contiene hoy**, **estados**, **problemas de la auditoría** y **qué pedirle al diseño**.

### 5.1 Hoy (`/hoy`)

- **Para qué:** responder «¿qué hago ahora y cuánto me falta para lo importante?».
- **Contiene:** saludo; guía «Empieza en tres pasos» (ramo → tarea → apunte) cuando no hay datos; **solemnes próximas** con cuenta regresiva («Solemne 1 en 3 días»); «Lo que sigue»; tareas de hoy; clases de hoy (se pueden marcar con asistencia); evaluaciones próximas; racha de estudio; tarjetas de repaso vencidas; botón **Enfocar 25 min** / «Ver temporizador · mm:ss»; **Armar plan de estudio** (crea pasos y una tarea); **Compartir mi semana** (imagen para compartir).
- **Estados:** vacío (guía de tres pasos), con datos, con temporizador en marcha.
- **Problemas:** el aviso «Plan listo» tapa «Compartir mi semana»; «No hay clases con fecha de hoy» confunde porque el horario del ramo no alimenta Hoy (solo las clases con fecha); el título de pestaña de Hoy es la frase de marca y el resto «X · Prima Lex».
- **Pedir al diseño:** jerarquía clara con **una acción principal** según el momento (antes de una solemne: plan y enfoque; sin datos: crear el primer ramo); estados vacíos que enseñen.

### 5.2 Tareas (`/tareas`)

- **Contiene:** formulario «Nueva tarea» (título, ramo, fecha con atajos Hoy / Mañana / Viernes / Lunes, prioridad); pestañas **Hoy · Próximas · Todas · Hechas**; filtro por ramo; fila de tarea con check, ramo, fecha, prioridad, subtareas y editor.
- **Problemas:** el check dibujado mide 26 px (el área de toque es 46 px); la prioridad es solo un punto de color de 8 px; el selector de ramo mezcla «Mis ramos» y «Áreas del derecho» del catálogo (parece duplicado: «Derecho Civil I» y «Derecho Civil»); los campos tienen etiqueta solo en `aria-label`, sin etiqueta visible.
- **Pedir al diseño:** formulario de captura rápida (un campo + opciones plegadas), prioridad con forma y texto además de color, y distinguir visualmente ramos propios de áreas.

### 5.3 Calendario (`/calendario`)

- **Contiene:** vista Mes / Semana con clases, evaluaciones y tareas con fecha; navegación por periodo; exportación de calendario (ICS).
- **Problemas:** pestañas «Mes / Semana» de 32 px en iPad; el estilo del calendario espera el diseño nuevo.

### 5.4 Enfoque (`/enfoque`)

- **Contiene:** pestañas **Temporizador · Estadísticas · Historial**; selector **Pomodoro / Flowtime**; anillo de progreso con el tiempo; ramo y tarea asociados; botones Iniciar/Pausar, «Me distraje», «Terminar y guardar» (desde 1 minuto); ajustes de duraciones; **Modo concentración** (pantalla completa con fondo, escenas, respiración y sonido ambiente); **Sala de estudio**; calificar la sesión (estrellas); estadísticas por ramo y patrones; historial editable.
- **Estados:** detenido, corriendo, pausado, descanso; el reloj sigue aunque cambies de sección y se ve junto a «Enfoque» en el menú y en el título de la pestaña.
- **Problemas:** las pestañas y los modos medían 36 px (ya 44 px en táctil); en pantallas bajas (640×400) el botón «Iniciar» queda fuera de vista; el orden de Tab no sigue el orden visual («Me distraje» antes de los selectores); una sesión de menos de 1 minuto no se guarda y solo lo avisa un texto pequeño.
- **Pedir al diseño:** el temporizador como protagonista, controles grandes, y ajustes/ambiente en un segundo nivel que no compita.

### 5.5 Sala de estudio (diálogo grande sobre Enfoque)

- **Contiene:** material **Video** (YouTube/Vimeo) o **Apunte** (leer o editar un apunte del ramo al lado del reloj), **ventana del temporizador arrastrable** con disposición elegible, fondo detrás del temporizador (no del apunte), cerrar con X.
- **Problemas:** el botón de detener/pausar; al cerrar la sala con el reloj pausado no hay confirmación (sí hay un aviso); la dirección queda en `/mis-ramos`.

### 5.6 Mis ramos (`/mis-ramos`)

- **Lista:** tarjetas de los ramos del semestre con banda de color, profesor, próxima evaluación y progreso; «Agregar ramo» (nombre obligatorio; profesor, horario, sala, código y semestre opcionales bajo «Horario de clases y más detalles»). Estado vacío: «Agrega los ramos que cursas…».
- **Ficha de un ramo** (pestañas **Resumen · Clases y apuntes · Evaluaciones · Biblioteca**):
  - *Resumen:* tres paneles («Lo que viene», notas, tareas del ramo con creación rápida).
  - *Clases y apuntes:* lista de clases con fecha y asistencia (se pueden generar desde el horario), lista de **apuntes**, **editor de apuntes** a pantalla completa (formato con comandos, recuadros, tablas, citas de artículos) y **Modo lectura** (con tema de lectura, resaltado y notas al margen), repaso de apuntes, «Enfocar con este apunte».
  - *Evaluaciones:* lista de pruebas con ponderación y fecha, **calculadora de nota necesaria**, simulador «¿y si saco…?».
  - *Biblioteca:* textos obligatorios y casos (briefs).
- **Problemas:** las pestañas se cortan a la derecha en celular («Evalu…») sin indicar que se desplazan; en la ficha no se entiende la diferencia entre **horario** (semanal) y **clases** (con fecha); la calculadora mostraba «100 % que falta» con 30 % cargado (texto ya corregido); «Agregar evaluación» desde Resumen necesita dos clics; el editor tiene ~15 íconos sin etiqueta; el banner del ramo en oscuro es demasiado claro; la URL no cambia al entrar a un ramo, apunte o editor.
- **Pedir al diseño:** que la ficha de un ramo sea el centro de la app (todo lo del ramo en un lugar), y un editor de apuntes limpio y cómodo con el dedo.

### 5.7 Explorador de códigos (`/explorador`)

- **Selector de normas:** 54 tarjetas (14 códigos y leyes principales y el resto leyes especiales) con nombre, categoría (sustantivos / procedimentales / especiales), descripción y número de norma; filtro por nombre o número («Nombre o número (ej. 18.290)»). Hoy es una lista de una columna con tarjetas de 124 a 344 px de alto: muy larga en celular y sin distinguir grupos.
- **Lector:** barra superior (Cambiar código, Índice, Modo lectura, **Buscar o ir a artículo** con Ctrl+K, Más opciones: tamaño del texto, imprimir el código completo), artículo en tipografía serif de 17 px con el número como título, acciones **Imprimir · Copiar con cita · Guardar en colección**, vínculos a otros artículos y a ramos, subrayados y notas, y barra inferior **Anterior / vecinos / Siguiente**.
- **Otros paneles:** **Índice / esquema** jerárquico (Libro → Título → Capítulo), **Ficha del código** (norma de origen, fuente BCN, fecha de indexación, aviso de posibles reformas), **Modo lectura** a pantalla completa, **búsqueda** (por número tolerante: «183-A», «4 bis»; por texto sin tildes), **Códigos activos** (modal para elegir cuáles aparecen).
- **Problemas:** no se puede saltar al **numeral** dentro de un artículo largo (el n°4 del art. 19 queda a 1.650 px); cambiar de norma exige 3 pasos y abre el Código Civil; el filtro de 375 px corta el placeholder; la tarjeta del DFL 725 pegaba la fecha con «Abrir»; la lectura de ancho completo en escritorio da líneas muy largas (conviene ~62–68 caracteres); la dirección ahora guarda código y artículo (`?codigo=civ&art=Art.+1545`).
- **Pedir al diseño:** un selector en secciones plegables o filas compactas, un lector tipo libro con índice de numerales dentro del artículo, y la acción **Guardar** muy visible.

### 5.8 Colecciones (`/colecciones`)

- **Para qué:** agrupar artículos por tema para estudiar (p. ej. «Recurso de protección»).
- **Contiene:** lista de colecciones; detalle con artículos ordenables, autoevaluación por artículo (pendiente / dominado…), nota propia, repaso con tarjetas, **pizarra libre** donde se mueven y conectan artículos (conexiones tipadas, grupos), compartir/importar una colección, vínculo a un mapa mental, impresión.
- **Problemas:** la pizarra y las conexiones **solo se pueden manejar arrastrando** (sin alternativa de teclado); agregar un artículo desde Colecciones es un camino poco descubrible (ahora también se guarda desde el Explorador).

### 5.9 Mapas mentales (`/mapas-mentales`)

- **Contiene:** lista de mapas; lienzo con nodos y conexiones, edición, atajos de teclado (panel de atajos), exportar a PDF/imagen. Pantalla pesada (≈ 280 KB de JS).
- **Problemas:** edición solo con arrastre; verificar rendimiento en iPad.

### 5.10 Práctica (`/practica`)

- **Contiene:** juegos de repaso — **Pasapalabra** (rosco por áreas), **Ahorcado**, **Quiz Jurídico**, **Destello** — con puntos, rachas y records. Pasapalabra y Ahorcado usan IA de texto (límite diario: 10 partidas sin cuenta, 30 con cuenta verificada).
- **Problemas:** aterrizaje: en algunas aperturas en frío caía aquí en vez de Hoy; pantalla pesada (70 KB).

### 5.11 Páginas legales y 404

- `/privacidad`, `/terminos`, `/aviso-legal`: documentos largos, ahora con `<main>`, navegación entre documentos y enlaces de 44 px; ignoran el modo oscuro.
- 404: «página no encontrada» con salida a Hoy.

---

## 6. Diálogos y paneles transversales

| Panel | Para qué | Notas para el diseño |
|---|---|---|
| **Entrar / Tu cuenta** | Ingreso con Google, Microsoft o enlace por correo; ver sincronización; cerrar sesión (y borrar de este equipo); eliminar cuenta | Ahora enlaza Términos y Privacidad. Si el equipo tiene datos de otra cuenta, muestra «Este dispositivo tiene datos de otra cuenta» con dos opciones. Estado de sincronización claro. |
| **Acerca de Prima Lex** | Pestañas Acerca de · Apariencia · Aviso legal · Privacidad · Términos | Apariencia incluye tamaño de interfaz y 8 colores de acento. Hay un bloque «Datos técnicos» (versión, pantalla, escala). |
| **Configuración / Ajustes** | Tamaño de interfaz, animaciones, respaldo | Texto de apoyo de 13 px. |
| **Códigos activos** | Elegir qué normas aparecen en el Explorador y la búsqueda | Contador «54 activos». |
| **Respaldo** | Descargar/restaurar un archivo `.json`; recordatorio | Aviso si el almacenamiento está lleno. |
| **Búsqueda global (Ctrl+K)** | Buscar artículos, apuntes y secciones | Resultados mezclados con ruido para «19»; hoy no salta a numerales. |
| **Panel de atajos** | Lista de atajos de teclado | Solo con teclado físico. |
| **Avisos (toasts)** | «Ramo creado · Deshacer», «Hay una versión nueva», errores | Algunos persisten al cambiar de pantalla; el de «Plan listo» tapa contenido. |
| **Barra lateral derecha (accesos rápidos)** | Atajos a Hoy/Tareas/Calendario en pantallas grandes | En pantallas menores se cierra. |
| **Barra inferior (móvil)** | Hoy · Tareas · Enfoque · Explorar · Más | «Más» abre el menú con el mismo ícono que la hamburguesa; en iPad vertical los ítems se estiran a 164 px. |
| **Compartir mi semana** | Genera una imagen del plan para compartir | Sin logos de terceros. |
| **Vista de impresión** | Artículo, código completo, colección, mapa, apunte | Se monta solo al imprimir. |

## 7. Comportamiento responsive (hoy)

- **375 × 812 (celular):** barra inferior de 57 px, menú como diálogo con foco atrapado, una columna, ficha de ramo con pestañas que se cortan.
- **820 × 1180 (iPad vertical):** usa el diseño de celular (barra inferior, tarjetas de 772 px de ancho, menú de 312 px superpuesto). **Es la principal oportunidad de diseño**: aprovechar el ancho con dos columnas o menú lateral.
- **1180 × 820 (iPad horizontal) y escritorio:** menú lateral fijo, sin barra inferior; el menú se compacta en pantallas bajas.
- **640 × 400 (zoom 200 %):** no hay desbordes, pero el área de lectura queda en ~200 px de alto.

## 8. Los 10 problemas de diseño que más conviene resolver

1. iPad vertical con diseño de celular (columna única de 772 px).
2. Selector de normas: 54 tarjetas en una columna, sin grupos.
3. Un lector de artículos con índice de numerales y guardar a colección siempre a la vista.
4. Jerarquía de **Hoy** con una acción principal según el momento.
5. Ficha de ramo como centro de la app; explicar horario vs. clases.
6. Escala única de espaciado, radios y tipografía; reducir variantes de botones y campos.
7. Estados vacíos que enseñen (qué hacer primero) en cada pantalla.
8. Prioridad, estado y selección con forma/texto además de color.
9. Nombres consistentes (Explorador / Explorar, Práctica / Área de práctica, Mis ramos).
10. Pizarra y mapas mentales con alternativa al arrastre.

## 9. Qué NO cambiar

- Las direcciones de cada sección ni el parámetro `?codigo=…&art=…` del Explorador.
- El contenido de los textos legales y sus fuentes.
- El comportamiento «sin cuenta, todo local» y la sincronización cifrada en tránsito con Supabase.
- Objetivos táctiles de 44 px, campos de 16 px y el contraste AA.
- La ausencia de mascotas, logos y colores de universidades.

## 10. Cómo probar el resultado

Después de implementar un diseño: `npx tsc --noEmit -p tsconfig.app.json`, `npx vitest run`, `npm run build`; revisar en 375, 820×1180, 1180×820 y 1440×900, claro y oscuro; y **probar en el iPad real** (minimizar y volver, Split View, tamaño de interfaz «Pequeño»).

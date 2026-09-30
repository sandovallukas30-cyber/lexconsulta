# Auditoría del área académica (B0)

Fecha: 2026-09-30 · Rama: `claude/hopeful-clarke-sg3odq` (partiendo de `main` @ 2454808)

Archivos revisados: `ModulosView.tsx`, `ModuloDetalle.tsx`, `ModalRamo.tsx`, `RamoCard.tsx`,
`editorApunte/EditorApunte.tsx`, `ModoLecturaApunte.tsx`, `CampoContenidoApunte.tsx`,
`services/modulosAcademico.ts`, `progresoModulos.ts`, `actividadEstudio.ts`, `apunteFormato.ts`,
`apunteDoc.ts`, `Omnibar.tsx`, `store/useStore.ts` y tipos en `types/index.ts`.

## 1. Funciones que ya existen

| Área | Qué hay hoy |
|---|---|
| Módulos (catálogo) | Grid de módulos fijos (`data/modulos.ts`) con % de dominio calculado desde Práctica/Quiz (`progresoModulos.ts`). |
| Ramos propios | CRUD de ramos (`ModalRamo`), con icono/color, profesor, horario, módulos vinculados. Un ramo se abre como "módulo virtual" (`moduloDesdeRamo`) y reutiliza `academicoModulos[ramo.id]`. |
| Dashboard "Hoy" | Racha de días con actividad (`diasActividadEstudio`) y tarjetas de Colecciones vencidas (Leitner). |
| Próximos eventos | `ProximosEventos` en ModulosView: clases no completadas y evaluaciones sin nota de todos los módulos, con cuenta regresiva y color por urgencia. |
| Detalle de módulo | Pestañas Resumen / Clases / Exámenes / Textos / Apuntes / Casos (brief IRAC) en un solo archivo de 1.499 líneas. |
| Exámenes | Ponderaciones con validación de 100 %, calculadora de nota necesaria. |
| Apuntes | Cuadernos, filtro por cuaderno, importar `.md`/`.txt`/PDF de Notion, Modo Lectura a pantalla completa (tema, tamaño de letra, voz, wake lock, índice de títulos, barra de progreso fina, restauración automática del scroll en `localStorage`), editor visual TipTap con autoguardado cada 700 ms, descarga `.md` desde el Modo Lectura. |
| Formato de apuntes | Parser por reglas (`apunteFormato.ts`): títulos, listas, recuadros `> 🎯`, tablas, columnas, marcas en línea. Sin IA. |

## 2. Bugs e inconsistencias reales encontrados

| # | Archivo:línea | Problema | Severidad |
|---|---|---|---|
| 1 | `store/useStore.ts:1020-1101` | `migrate` retorna dentro de cada `if (version < N)`: un usuario que viene de una versión antigua solo recibe **la primera** migración aplicable y se salta las siguientes (p. ej. desde v25 con `academicoModulos` se aplica v26 y se salta la resincronización de `codigos` de v27/v28). Es el origen probable de "los usuarios no ven los cambios". | Alta |
| 2 | `ModulosView.tsx:35-36` | `ProximosEventos` busca el módulo solo en `MODULOS`; las clases/evaluaciones de un **Ramo propio** (id de ramo) se descartan con `return null`. Un estudiante que usa Ramos no ve nunca sus próximas evaluaciones. | Alta |
| 3 | `ModalRamo.tsx:114-116` | "Eliminar ramo" borra al instante, sin confirmación ni deshacer, y deja huérfanos en `academicoModulos[ramo.id]` (apuntes, clases…) que ya no son accesibles desde la UI. | Alta |
| 4 | `ModuloDetalle.tsx:318-330` y usos | `BotonEliminar` borra clases, evaluaciones, textos, apuntes y casos sin confirmación ni deshacer. Un clic accidental pierde un apunte largo. | Alta |
| 5 | `Omnibar.tsx:64` | El título del resultado se arma como `` `Art. ${r.articulo.a}` `` pero `a` ya viene como `"Art. 1545"` → se muestra "Art. Art. 1545". | Media |
| 6 | `Omnibar.tsx:128-133` | Al elegir un artículo solo se abre el código en el Explorador, no el artículo elegido (no usa `abrirArticuloEnExplorador`). | Media |
| 7 | `Omnibar.tsx` | No busca en apuntes (B2 no existe). | — |
| 8 | `modulosAcademico.ts:42-47` | `urgenciaDe` marca "urgente" hasta 2 días; el criterio pedido es ≤ 3 días (urgente), ≤ 7 (próximo). | Baja |
| 9 | `ModuloDetalle.tsx:702` | La nota de una evaluación no se valida (acepta 70, -3, 0): rompe promedio y calculadora. | Media |
| 10 | `ModuloDetalle.tsx:158-178` | La fila de 6 pestañas no tiene `overflow-x-auto`: a 375 px desborda horizontalmente. | Media |
| 11 | `ModuloDetalle.tsx:594, 746, 914, 1430` | Formularios con `grid-cols-2` fijo: a 375 px los campos (fecha, ponderación) quedan de ~150 px, ilegibles. | Baja |
| 12 | `ModoLecturaApunte.tsx:104-109` | Mientras se edita (TipTap guarda cada 700 ms) el lector oculto re-parsea el apunte completo (`parsearApunte`, `textoPlanoDe`) en cada guardado: trabajo inútil en apuntes largos. | Media (rendimiento) |
| 13 | `EditorApunte.tsx:139-144` | No hay indicador "Guardando… / Guardado" ni atajo Ctrl+S; tampoco aviso al cerrar la pestaña con cambios pendientes (solo `pagehide`, que no puede advertir). | Media |
| 14 | `ModoLecturaApunte.tsx:125-133` | La posición de lectura se restaura automáticamente desde `localStorage` (se pierde al limpiar datos y no se respalda); no hay "Retomar donde quedaste" ni % / tiempo restante ni resaltado de sección actual. | Baja |
| 15 | `ModoLecturaApunte.tsx:160-168` | "Descargar .md" usa `# título` + contenido, pero al importarlo el título pasa por `quitarMarcas`: un título con `*`, `_`, `=` o `~` no vuelve idéntico. No hay "Duplicar" ni "Mover a otro ramo/cuaderno". | Baja |
| 16 | `ModuloDetalle.tsx:211-220` | Los estados vacíos explican pero no ofrecen la acción (no hay botón "Crear"/"Importar" dentro). | Baja |

## 3. Estado de B1–B6 antes de empezar

| Ítem | ¿Existe? | Decisión |
|---|---|---|
| B1 Respaldo exportar/importar | No existe (solo compartir colecciones individuales). | Construir desde cero (`services/respaldo.ts` + modal). |
| B2 Buscador de apuntes | No existe. El Omnibar busca artículos, historial y favoritos. | Agregar apuntes al Omnibar + corregir bugs 5 y 6. |
| B3 Próximas evaluaciones | **Parcial**: `ProximosEventos` mezcla clases y evaluaciones, con cuenta regresiva y color, pero ignora los Ramos (bug 2), no separa vencidas y el umbral es 2 días. | Mejorar el existente: solo evaluaciones, Ramos incluidos, vencidas aparte, umbrales 3/7. |
| B4 Duplicar / mover / exportar .md | **Parcial**: existe "Descargar .md" en Modo Lectura. No hay duplicar ni mover. | Agregar menú de acciones por apunte; reutilizar y endurecer la exportación para que sea reversible. |
| B5 Repaso por reglas | No existe para apuntes (sí hay Leitner para Colecciones). | Construir `services/tarjetasApunte.ts` + modo repaso con estado en el store (migración). |
| B6 Rendimiento / mantenibilidad | `ModuloDetalle.tsx` = 1.499 líneas. | Extraer pestañas a `components/ui/moduloDetalle/*`, memoizar el lector durante la edición. |

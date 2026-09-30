# Auto-revisión — B3 Próximas evaluaciones

## Prompt de revisión

Revisa "Próximas evaluaciones" como un estudiante con 6 ramos propios y 20 evaluaciones, una semana antes de solemnes:

1. ¿Aparecen las evaluaciones de los Ramos propios (no solo de los módulos del catálogo)?
2. ¿"En 3 días" es rojo y "en 6 días" ámbar? ¿Se lee el color en modo oscuro?
3. ¿Qué pasa con una evaluación de hoy, una sin fecha, una ya calificada, una vencida sin nota?
4. ¿Con 20 evaluaciones la lista se vuelve un muro? ¿Y a 375 px?
5. ¿Al tocar una vencida, llego a donde puedo resolverla (anotar la nota)?
6. ¿Se puede guardar una nota absurda (70, -3) que rompa el promedio y la calculadora?
7. ¿Qué pasa si un Ramo se eliminó y quedaron sus evaluaciones?
8. ¿Se perdió algo que existía antes (las próximas clases)?

## Casos límite probados

- Ramo propio "Derecho Civil I" + módulo "Derecho Civil": aparecen ambos (antes el Ramo se descartaba). ✔
- En 2 días / 3 días → rojo; 6 días → ámbar; 20 días → "En 3 semanas" gris; −3 días → en "Vencidas sin nota (1)". ✔ (modo oscuro verificado en captura)
- Evaluación con nota → no aparece. Sin fecha → se omite. ✔
- 375 px: sin desborde horizontal; filas de 56 px de alto mínimo. ✔

## Hallazgos reales

1. Tocar una evaluación abría la pestaña Exámenes pero había que volver a buscarla y abrirla: para una vencida la acción obvia (anotar la nota) quedaba a 2 toques más.
2. La nota no se validaba (`TabExamenes`): 70 o -3 se guardaban y rompían promedio y calculadora.
3. En modo oscuro la cuenta regresiva dentro de Clases/Exámenes usaba `text-red-600`/`text-amber-600` sobre fondo zinc-800: contraste bajo.
4. Las próximas clases (que antes se mezclaban en la misma lista) no decían de qué ramo eran salvo por el color del ícono.
5. Dos efectos nuevos hacían `setState` sincrónico (lint `react-hooks/set-state-in-effect`): render extra. Se pasaron al patrón de ajuste durante el render / `useMemo` (incluido el efecto de búsqueda del Omnibar, que ya tenía el problema).

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Abrir directo la evaluación en edición (con scroll al formulario) | medio | Implementada |
| Validar nota 1,0–7,0 con mensaje claro | bajo | Implementada |
| Exportar las evaluaciones a calendario (.ics) | medio | Propuesta |
| Notificaciones del navegador el día anterior a una evaluación (requiere permiso y service worker) | alto | Propuesta |

Segunda pasada (5 hallazgos): tocar "Control 1" (vencida) abre el formulario con nombre, fecha y ponderación cargados; nota 70 → "La nota debe estar entre 1,0 y 7,0"; lint de los archivos tocados sin errores nuevos (63 problemas en todo el repo vs 64 al empezar).

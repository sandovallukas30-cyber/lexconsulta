# Auto-revisión — C3 Editor: guardado, Ctrl+S y cambios sin guardar

## Prompt de revisión

Revisa el guardado de apuntes como alguien que escribe 40 minutos seguidos y al final cierra la pestaña o se le cae el navegador:

1. ¿El indicador dice la verdad? ¿"Guardado" significa escrito en `localStorage` o solo en memoria?
2. ¿Qué pasa si se cierra la pestaña 300 ms después de la última tecla (dentro de la espera de 700 ms del editor + 400 ms del store)?
3. ¿Ctrl+S hace algo útil o abre "Guardar página" del navegador?
4. ¿En el formulario (sin autoguardado), cambiar de pestaña/vista/módulo o Cancelar descarta sin preguntar?
5. ¿Y si el navegador se cae (no hay oportunidad de preguntar)?
6. ¿Se ve el estado de guardado en el celular?
7. ¿Qué pasa si `localStorage` está lleno?

## Casos límite probados

- Editor visual: tipear → "Guardando…" → 1,5 s después "Guardado"; Ctrl+S → aviso "Apunte guardado" y el texto ya está en `localStorage` en ese mismo instante. ✔
- Formulario con título escrito: cambiar a la pestaña Clases y a la vista Explorador → 2 confirmaciones; al cancelarlas se queda en el formulario con el texto intacto. Ctrl+S desde el campo título guarda. ✔
- Recarga con el formulario a medio escribir → al volver, "Tienes un borrador sin guardar de «Se me cortó la luz»" → Recuperar → título y contenido intactos. ✔ (375 px)
- Cuota llena: el indicador muestra "No se pudo guardar" (error de `useEstadoGuardado`) y aparece el aviso de error. ✔ (por el mismo camino probado en B1)

## Hallazgos reales

1. **Pérdida posible al cerrar la página**: el `pagehide` del almacenamiento (registrado al cargar) corría ANTES que el del editor; el editor volcaba sus últimos cambios al store, pero esa escritura quedaba en la espera de 400 ms y la página ya se cerraba. Ahora el editor vacía también la escritura del store.
2. En móvil el indicador no existía (`hidden sm:inline-flex`).
3. El formulario no autoguarda: una caída del navegador perdía todo lo escrito, y el aviso de "cambios sin guardar" no puede actuar si no hay evento de cierre.

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Indicador visible en móvil (solo ícono; el texto para lectores de pantalla) | bajo | Implementada |
| Borrador de respaldo del formulario con "Recuperar / Descartar" | medio | Implementada |
| Diálogo de confirmación propio (no `window.confirm`) con "Guardar y salir" | medio | Propuesta |
| Historial de versiones de un apunte (volver a la de ayer) | alto | Propuesta |

Segunda pasada (3 hallazgos): recarga con cambios a medio escribir → borrador recuperado; indicador visible a 375 px.

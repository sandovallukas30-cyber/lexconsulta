# Auto-revisión — C2 Avisos y Deshacer

## Prompt de revisión

Revisa el sistema de avisos como alguien que borra un apunte sin querer desde el celular y como alguien que usa solo teclado:

1. ¿Queda algún `alert()`/`confirm()` bloqueante en los flujos de eliminar, copiar e importar?
2. ¿"Deshacer" restaura exactamente lo borrado (apunte, ramo con sus clases y apuntes, colección, mapa)? ¿En la misma posición?
3. ¿Qué pasa si se borran tres cosas seguidas? ¿Se pierden los "Deshacer" anteriores?
4. ¿Los 8 s alcanzan si el usuario está leyendo el aviso? ¿Y en táctil, donde no hay hover para pausar?
5. ¿Se puede descartar un aviso sin apuntar a la "x" de 36 px?
6. ¿Hay acciones que se completan sin ningún aviso (importar, crear, copiar)?
7. ¿Un lector de pantalla anuncia los avisos? ¿Los errores con más urgencia?

## Casos límite probados

- Eliminar la colección → 0 colecciones → "Deshacer" → 1. ✔ (375 px)
- Ramo eliminado con sus apuntes y clases → Deshacer los restaura (servicio `restaurarRamo`). ✔
- Apunte eliminado en la mitad de la lista → vuelve a su posición original sobre la lista vigente. ✔
- Hasta 4 avisos simultáneos (los más antiguos salen primero). ✔
- `aria-live="polite"`; errores con `role="alert"`, resto `role="status"`. ✔

## Hallazgos reales

1. Quedaban 5 `alert()` bloqueantes: Canvas (2 errores de IA + 1 info), Colecciones (archivo inválido) y App (link compartido inválido).
2. Importar una colección, importar un apunte y crear/editar un ramo terminaban sin ningún aviso; copiar el link solo cambiaba el texto del botón.
3. En táctil la pausa por hover no existe: un "Deshacer" podía desaparecer mientras el dedo iba hacia él, y solo se podía cerrar con la "x".

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Pausar al tocar y descartar deslizando | bajo | Implementada |
| Avisos de éxito en importar/crear/copiar | bajo | Implementada (commit C2) |
| Historial de las últimas 10 acciones deshacibles (Ctrl+Z global) | medio | Propuesta |

Segunda pasada: deslizar el aviso 200 px lo descarta; tocarlo pausa la cuenta regresiva.

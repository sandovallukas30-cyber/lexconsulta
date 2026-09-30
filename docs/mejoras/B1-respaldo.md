# Auto-revisión — B1 Respaldo de datos

## Prompt de revisión (meta-prompt)

Revisa "Exportar/Importar respaldo" como si fueras otro desarrollador que no lo escribió y como un estudiante de derecho que perdió sus apuntes una vez:

1. ¿Qué pasa si el archivo está vacío, no es JSON, es de otra app, es de una versión futura o trae un ramo sin `id`?
2. ¿Qué ve el usuario a 375 px con el modal abierto y un aviso encima?
3. ¿Qué pasa si al importar/combinar se excede la cuota de `localStorage` (~5 MB)? ¿Queda la memoria distinta de lo guardado?
4. ¿"Combinar" puede pisar algo local? ¿Y si el mismo id existe con contenido distinto?
5. ¿Hay datos persistidos viejos (sin `cuadernos`/`briefs`) que rompan la validación?
6. ¿El resumen es legible o es un muro de "0 casos · 0 subrayados"?
7. ¿Qué haría que un estudiante no lo use nunca? (no se acuerda de respaldar)
8. ¿Se puede reemplazar por error? ¿Hay salida si se arrepiente?

## Casos límite probados

- Archivo con `{"app":"prima-lex","version":1,"datos":{"ramos":[{"x":1}]}}` → error "dañado o incompleto (ramos)", nada se aplica. ✔
- Exportar → borrar un apunte → importar "Combinar" → vuelve el apunte (2 apuntes). ✔
- Respaldo de versión 2 (futura) → mensaje "versión más nueva". ✔ (lectura del código)
- `academicoModulos` sin `cuadernos`/`briefs` (datos v24) → aceptado, se completan vacíos. ✔
- 375 px oscuro: el modal cabe, pero el aviso "Respaldo descargado" tapa los botones del pie del modal. ✘

## Hallazgos reales

1. **Cuota llena deja la memoria desincronizada**: el middleware `persist` de zustand escribe en `localStorage` DESPUÉS de cambiar el estado en memoria y no captura el error (ver `node_modules/zustand/esm/middleware.mjs:366-369`). Si al importar se excede la cuota, el catch mostraba "Tus datos no cambiaron", pero en memoria sí cambiaron (y se perderían al recargar). Esto además afecta a toda la app (un apunte largo que no cabe se "guarda" solo en memoria).
2. En móvil los avisos aparecen abajo y tapan los botones de acción de modales y del editor.
3. El resumen lista contadores en cero ("0 casos · 0 subrayados"): ruido.
4. No hay ningún recordatorio: el usuario no sabe cuándo respaldó por última vez.
5. Solo se puede elegir archivo con el botón; arrastrar el `.json` al modal no hace nada.

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Mostrar "Último respaldo: hace N días" y avisar si pasaron > 14 días | bajo | Implementada |
| Arrastrar y soltar el archivo de respaldo en el modal | bajo | Implementada |
| Respaldo automático semanal a una carpeta (File System Access API, solo Chromium) | alto | Propuesta |

## Correcciones aplicadas (commit "Mejora: B1 respaldo")

- `store/almacenamiento.ts`: `localStorage` envuelto para `persist`; si `setItem` falla (cuota), se avisa una vez con un error claro y se expone el estado para el indicador de guardado (C3). `aplicarRespaldo` toma una foto previa y la restaura si la escritura falla.
- Avisos arriba en móvil (< 640 px), abajo al centro en escritorio.
- Resumen solo con contadores > 0 ("nada todavía" si está vacío).
- Recordatorio de último respaldo + arrastrar y soltar.

Segunda pasada: 5 hallazgos ≥ 3 → se revisó de nuevo tras corregir: el aviso de cuota se probó forzando `QuotaExceededError` con un `setItem` parcheado (ver informe); sin hallazgos nuevos.

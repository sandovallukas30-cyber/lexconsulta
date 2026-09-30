# Auto-revisión — C6 Móvil

## Prompt de revisión

Revisa la app en un teléfono de 375 px (y en una tablet de 768 px) como un estudiante que la abre en la micro camino a clases:

1. ¿Cuánto ancho útil queda para el contenido? ¿Hay scroll horizontal o contenido recortado en alguna vista, subvista o modal?
2. ¿Se puede navegar entre vistas sin un mouse? ¿Se cierra el menú al elegir, con Esc, tocando fuera, deslizando?
3. ¿Los botones miden al menos 40–44 px en táctil?
4. ¿Las acciones que aparecen "al pasar el mouse" existen en táctil?
5. ¿El teclado virtual tapa el editor o el campo de consulta?
6. ¿Con teclado, el menú cerrado roba el foco (Tab entra a un panel invisible)?
7. ¿El detector automático de desborde es confiable o deja pasar recortes?

## Casos límite probados

- 11 vistas + colección abierta, mapa mental abierto, Plazos, detalle de módulo, modales de ramo, códigos, respaldo y "Acerca de", a 375, 768 y 1280 px, claro y oscuro. ✔ (0 desbordes con el detector final)
- Menú: abre con el botón, cierra al elegir vista, con Esc, tocando el fondo y deslizando a la izquierda; cerrado es `inert`. ✔
- Puntero táctil emulado (`hasTouch`): 0 botones de menos de 36 px en Consultar, Módulos, Canvas, Colecciones y Explorador. ✔

## Hallazgos reales

1. **El detector original daba falsos "ok"**: solo miraba elementos que salían de la ventana; no veía contenido recortado por `overflow: hidden` ni el scroll horizontal que se crea sin querer en un contenedor con `overflow-y: auto`. Con el detector corregido aparecieron desbordes reales en el Explorador (528 px), Consultar (386), módulo (551), colección abierta (475), mapa mental (434) y pestañas de "Acerca de".
2. Todas esas barras tenían anchos fijos (`min-w-[220px]`, `px-6`, 5-7 botones sin `flex-wrap`).
3. Carrusel del Explorador cortado a la mitad ("rt. 1").
4. Chips y conmutadores de 25–31 px de alto en Consultar y Canvas; "Importar" de 20 px en Colecciones.
5. Botones de eliminar que solo aparecen con hover (Mapas mentales, Colecciones, Historial, Canvas, Admin): inexistentes en táctil e invisibles con foco de teclado.

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Cerrar el menú deslizando hacia la izquierda | bajo | Implementada |
| Mínimo de 40 px para botones con puntero táctil (regla CSS `pointer: coarse`, excepción `.sin-tactil`) | bajo | Implementada |
| Barra de navegación inferior en móvil con las 4 vistas más usadas | alto | Propuesta |

Segunda pasada (5 hallazgos): tras corregir, detector en 11 vistas × 3 anchos = 0 desbordes; 8 subvistas/modales a 375 = 0; táctil = 0 botones bajo 36 px; Tab no entra al menú cerrado.

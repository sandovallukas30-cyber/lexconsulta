# Auto-revisión — C9 Impresión de apuntes y artículos

## Qué se hizo

- `services/impresion.ts`:
  - `imprimir(modo)` marca `body[data-imprimir="apunte"|"articulo"]`, llama a `window.print()` y limpia la marca en `afterprint`.
  - `useImprimirConCtrlP(modo, activo)` hace lo mismo cuando la impresión la inicia el navegador (Ctrl+P, menú Archivo), vía `beforeprint`.
- `components/ui/VistasImprimibles.tsx`: dos vistas que se montan con portal fuera de `#root`, igual que las ya existentes (código completo, colección y mapa mental).
  - **Apunte**: título; cuaderno, clase y artículo; fechas de modificación e impresión; el contenido con el mismo formato de pantalla en tema claro.
  - **Artículo**: la cita ("Art. 1545 CC"), la ubicación (libro, título y capítulo), el texto y la fuente con la URL de la BCN. Si el texto está modernizado, lleva un aviso de que no es el oficial.
- `index.css`:
  - Las vistas nuevas solo aparecen con su modo, y ese modo oculta las antiguas. Así "Imprimir artículo" no imprime también el código entero que el Explorador tiene montado.
  - Colores exactos (`print-color-adjust`).
  - Recuadros, tablas, filas y viñetas sin cortarse (`break-inside: avoid`); títulos que no quedan solos al pie (`break-after: avoid`); `orphans`/`widows` 3.
- Botones:
  - Impresora en la barra del Modo Lectura del apunte.
  - Impresora junto a "Copiar con cita" en el artículo.
  - El ícono de la barra del Explorador sigue imprimiendo el código completo; su título ahora lo dice.

## Prompt de revisión

1. ¿Ctrl+P con un apunte abierto imprime el apunte o una hoja en blanco?
2. ¿Un recuadro 🎯/💡 o una tabla quedan partidos entre dos páginas?
3. ¿Un título queda solo al pie de una página?
4. En modo oscuro, ¿se imprime fondo negro o texto blanco?
5. ¿"Imprimir artículo" imprime también el código completo que ya estaba montado?
6. ¿Qué pasa con Ctrl+P en una pantalla que no tiene versión imprimible?
7. ¿Se puede confundir un texto modernizado con el oficial en el papel?

## Casos probados (Playwright `emulateMedia('print')` + `page.pdf`, revisado con PyMuPDF)

- Artículo 1545 del Civil: solo `.imprimir-articulo` visible (`.imprimir-codigo` oculto); 1 página, con cita, ubicación, texto y fuente. ✔
- Sin modo (Ctrl+P en la vista normal del Explorador): se imprime el código completo, como antes. ✔
- Apunte corto: título, meta, viñetas con negrita, recuadro 💡 con su color y pie. ✔
- Apunte largo (40 secciones): 13 páginas A4.
  - Ningún recuadro partido: todos miden ~35 pt, y los que caen al comienzo de una página traen su contenido completo.
  - Ningún título queda solo al pie: "Sección 7" baja con su primer punto. ✔
- `beforeprint` con el lector abierto marca `apunte` y `afterprint` lo limpia. ✔
- Siempre en tema claro, aunque la app esté en oscuro: la vista usa `tema="claro"` y color #111 sobre blanco. ✔

## Hallazgos

1. **Ctrl+P en el Modo Lectura de un apunte imprimía una hoja en blanco** (`#root` oculto y ninguna vista imprimible). Ahora imprime el apunte.
2. **Ctrl+P en cualquier otra pantalla** (Módulos, Consultar…) también daba una hoja en blanco. Ahora imprime una indicación de cómo imprimir apuntes, artículos, colecciones o mapas (`body:not(:has(…))::after`).
3. **Ctrl+P en el Modo Lectura de artículos** imprimía el código completo. Ahora imprime el artículo que se está leyendo.
4. Riesgo evitado: imprimir un artículo modernizado sin avisar. El papel lleva la nota "no es el texto oficial".

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Ctrl+P útil en el Modo Lectura de artículos y aviso en pantallas sin vista imprimible | bajo | Implementada |
| Imprimir una sección del índice del apunte (desde el índice lateral) | medio | Propuesta |
| Imprimir las notas al margen como notas al pie | medio | Propuesta |
| Imprimir varios artículos seleccionados (p. ej. los de una clase) | medio | Propuesta |

Segunda pasada (4 hallazgos): repetidas las pruebas de artículo, apunte, Ctrl+P en el Modo Lectura de artículos y Ctrl+P en Módulos; todas pasan.

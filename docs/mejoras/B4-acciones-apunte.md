# Auto-revisión — B4 Duplicar, mover y exportar apuntes

## Prompt de revisión

Revisa las acciones sobre apuntes como alguien que reorganiza 40 apuntes al final del semestre, desde el celular:

1. ¿Exportar → importar deja el apunte **idéntico**? ¿Con títulos que tienen `*`, `_`, `=`, `~`, `&#42;`? ¿Con tablas, columnas, notas `{{a|b}}`, listas anidadas con tab, recuadros `> 🎯`?
2. ¿Y con contenido pegado de Word/Notion (`\r\n`, espacios duros, sangría con espacios)?
3. ¿Mover a otro ramo pierde algo? ¿La clase vinculada queda apuntando a una clase de otro ramo?
4. ¿Se puede deshacer un movimiento?
5. ¿El menú "⋯" cabe en pantalla si el apunte es el último de la lista a 375 px? ¿Se usa con teclado?
6. ¿Los botones de la fila miden al menos 44 px en táctil?
7. ¿El nombre del archivo exportado conserva tildes y rayas?

## Prueba manual de reversibilidad (descrita para el informe)

1. En un ramo, abrir Apuntes → "⋯" del apunte → **Exportar a .md** (se descarga `Obligaciones — clase 3.md`).
2. **Importar** ese mismo archivo en el mismo ramo.
3. Abrir ambos apuntes: título y contenido son iguales. Automatizado en `/tmp/pw/t_b4.mjs`: `contenido === contenido` y `titulo === titulo` → `true`.

Además, 6 casos sintéticos por la función pura (`apunteAMarkdown` → `markdownAApunte`): los 6 vuelven con título y contenido idénticos al contenido normalizado; en 4 de ellos idénticos también al original byte a byte. Los 2 restantes traían `\r\n`/espacios duros/espacios al final: vuelven normalizados (se ven igual).

## Hallazgos reales

1. El menú "⋯" se abría siempre hacia abajo: en el último apunte de la lista, en móvil, quedaba cortado por el borde inferior.
2. El menú no era usable con teclado (sin foco inicial ni flechas).
3. Los botones de la fila (editar 28 px, eliminar 28 px, "⋯" 36 px) eran menores a 44 px en táctil y los de solo ícono no tenían `aria-label`.
4. El Modo Lectura tenía su propia "Descargar .md" con otro formato (sin normalizar ni escapar el título): no era reversible. Ahora usa la misma función.
5. (Falso positivo descartado) En la prueba automatizada los archivos con tildes se descargaban como "download": era el Chromium headless sin locale UTF-8; con `LANG=C.UTF-8` el nombre se conserva.

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Menú que se abre hacia arriba si no cabe; foco y flechas | bajo | Implementada |
| Botones de fila de 40 px en móvil con `aria-label` | bajo | Implementada |
| Selección múltiple de apuntes para mover/exportar varios a la vez (.zip) | alto | Propuesta |
| Incluir cuaderno/clase/artículo en un bloque opcional al final del .md (sin romper la sintaxis de importar) | medio | Propuesta |

Segunda pasada: a 375 px el menú del último apunte abre hacia arriba (y=579, alto 130, ventana 800) sin desborde horizontal; foco en "Duplicar" y ↓ pasa a "Mover a…".

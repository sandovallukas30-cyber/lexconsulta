# Auto-revisión — B2 Buscador de apuntes

## Prompt de revisión

Revisa el buscador de apuntes del Omnibar como un estudiante con 80 apuntes (algunos de 20.000 palabras pegados de Notion) que busca "idea clave" desde el celular:

1. ¿Qué pasa con 1 letra, con una frase de varias palabras, con tildes y mayúsculas mezcladas?
2. ¿El fragmento muestra la parte relevante o solo la primera aparición de la primera palabra?
3. ¿Al abrir el resultado se llega a la coincidencia o al inicio del apunte (o a la última posición leída)?
4. ¿Se recalcula todo en cada tecla? ¿Cuánto cuesta con apuntes enormes?
5. ¿Qué ve a 375 px? ¿El modal toca los bordes?
6. ¿Con flechas, el resultado elegido queda fuera de la vista?
7. ¿Hay datos huérfanos (apuntes de un ramo eliminado) que aparezcan y lleven a ninguna parte?
8. ¿Los errores previos del Omnibar (artículos) siguen?

## Casos límite probados

- "prescripcion" (sin tilde) → encuentra "prescripción extintiva" con fragmento resaltado; Enter abre el Modo Lectura con la coincidencia marcada. ✔
- "1545" con el Código Civil cargado → "Art. 1545 — Código Civil" (antes "Art. Art. 1545") y abre ese artículo (antes solo el código). ✔
- 1 carácter → no busca en apuntes (mínimo 2). ✔
- Apuntes de un id de ramo inexistente → se omiten. ✔

## Hallazgos reales

1. Consulta de varias palabras ("Idea clave 37") saltaba a la primera aparición de "Idea" (sección 1), no a la frase de la sección 37.
2. Se buscaba en cada tecla sobre todos los apuntes (y `textoPlanoDe` de cada uno).
3. A 375 px el Omnibar tocaba los bordes de la pantalla (sin margen lateral) y usaba `pt-[20vh]`, dejando poco espacio para resultados sobre el teclado.
4. Con flechas, el resultado elegido podía quedar fuera del área visible de la lista.

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Priorizar la frase completa en el fragmento y al saltar dentro del apunte | bajo | Implementada |
| Esperar 120 ms sin teclear antes de buscar (debounce) | bajo | Implementada |
| Filtros por tipo (solo apuntes / solo artículos) y "ver todos los resultados" | medio | Propuesta |
| Índice invertido en un Web Worker para bibliotecas de apuntes muy grandes | alto | Propuesta |

Correcciones aplicadas en "Mejora: B2 buscador de apuntes": 1–4. Segunda pasada: "Idea clave 37" → la coincidencia queda en la sección 37 (y=454 px, dentro de la vista); sin hallazgos nuevos.

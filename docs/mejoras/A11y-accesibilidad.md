# Auto-revisión — Accesibilidad básica

Se revisaron con **axe-core 4** (reglas WCAG 2 A y AA) las 12 pantallas principales, en claro y en oscuro: Consultar, Situación, Plazos, Historial, Módulos, un módulo abierto, Explorador con el Código Civil, Colecciones, Mapas mentales, Práctica, Canvas y Mapa.

## Resultado

| | Antes | Después |
|---|---|---|
| Claro: problemas de contraste | 20 | 2 |
| Oscuro: problemas de contraste | 97 | 5 |
| Campos sin etiqueta (`label`, `select-name`) | 5 | 0 |
| Botones sin nombre | 1 | 0 |
| Interactivos anidados | 1 | 0 |
| Lighthouse Accesibilidad (Consultar) | 95 | 100 |

Lo que queda (7 nodos) son contadores y chips decorativos con `text-zinc-600` en oscuro, y un chip con el color propio de un módulo.

## Qué se corrigió

1. **Texto secundario en claro**: `text-zinc-400` sobre blanco da 2,6:1 y aparecía en ~20 lugares. Con `data-tema="claro"`, esa clase pasa a zinc-500 (4,8:1). Es una sola regla en `index.css`, no 20 ediciones.
2. **Acento como texto en oscuro**: el verde base (#0F6E56) sobre zinc-900 da 2,85:1; afectaba a títulos, "Lex", artículos e íconos.
   - Nuevo token `--accent-texto`: el acento de base en claro, `--accent-400` en oscuro y siempre el de base al imprimir.
   - 118 usos de `style={{ color: VERDE }}` pasan al token. Los fondos de botón siguen con `--accent-base`, con texto blanco encima a 6:1.
   - Se dejaron fuera los Modos Lectura, que tienen su propio tema (claro, papel u oscuro) independiente del de la app.
3. **Texto secundario en oscuro**: `text-zinc-500` sobre zinc-800/900 da 3,3–3,7:1; pasa a zinc-400.
4. **Etiquetas**:
   - Calculadora de plazos: `htmlFor`/`id` en fecha, cantidad, unidad y fecha del hecho.
   - Selects de cuaderno y "vincular" en el módulo: `aria-label`.
5. **Botón sin nombre**: eliminar un mapa mental ahora tiene `aria-label` con el título del mapa.
6. **Interactivo anidado**: el lápiz de "Editar ramo" era un `role="button"` dentro del `<button>` de la tarjeta. Ahora son botones hermanos y el lápiz aparece también con el foco del teclado.
7. `lang="es-CL"` (C8), anillo de foco común y foco en campos (C5), pestañas con flechas (C5), avisos con `role="status"`/`alert` (C2) y diálogos con `aria-modal` y foco inicial (panel de atajos, C7).

## No verificado

- Lector de pantalla real (NVDA/VoiceOver): no hay uno disponible en este entorno; solo reglas automáticas.
- Los íconos de la CDN no cargan aquí, así que no se revisó su contraste.

## Propuestas

| Mejora | Costo |
|---|---|
| Revisar a mano los 7 nodos restantes (contadores en zinc-600) | bajo |
| Trampa de foco en todos los modales (hoy solo foco inicial y Esc) | medio |
| "Saltar al contenido" al inicio de la página | bajo |
| Contraste del acento dentro de los Modos Lectura por tema | bajo |

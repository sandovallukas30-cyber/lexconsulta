# Auto-revisión — B6 Rendimiento y mantenibilidad del área académica

## Prompt de revisión

Revisa el refactor de `ModuloDetalle` y el rendimiento del editor como alguien que escribe un apunte de 7.000 palabras en un ramo con otros 20 apuntes igual de largos, en un notebook modesto:

1. ¿La división en archivos cambió algún comportamiento (pestañas, formularios, Deshacer, Modo Lectura)?
2. ¿Hay lag al escribir en el formulario (textarea) y en el editor visual? Medirlo, no suponerlo.
3. ¿Qué se recalcula en cada tecla y qué en cada autoguardado (~700 ms)?
4. ¿Los `memo` sirven de verdad o las props cambian de identidad en cada render?
5. ¿El lector oculto trabaja mientras se edita?
6. ¿Algo nuevo de B1–B5 (tarjetas, búsqueda) agregó costo por tecla?
7. ¿Qué pasa con el guardado en `localStorage` de un estado grande?

## Medición (Chromium headless, dev server, 22 apuntes de ~7.200 palabras)

Script: escribir 31 caracteres con 30 ms entre teclas y medir `PerformanceObserver` (eventos > 16 ms y *long tasks*).

| Escenario | Antes | Después |
|---|---|---|
| Formulario (textarea): latencia por evento p50 / p95 | 64 / 72 ms | 16 / 24 ms |
| Formulario: long tasks durante el tipeo | 26 (1.691 ms en total, máx. 196) | 1 (128 ms) |
| Formulario: tiempo total del tipeo (31 teclas) | 2.744 ms | 1.290 ms |
| Editor visual: long tasks | 3 (236 ms, máx. 91) | 1 (81 ms) |

## Hallazgos reales

1. **Formulario con lag**: cada tecla re-renderizaba `TabApuntes` completo y con él la lista, que recalculaba `resumenDe` (texto plano) de TODOS los apuntes.
2. B5 agregó `generarTarjetas` para todos los apuntes en cada autoguardado (el array de apuntes cambia de identidad).
3. El Modo Lectura, oculto durante la edición, re-analizaba el apunte completo (`parsearApunte`, `textoPlanoDe`) en cada autoguardado.
4. `ModuloDetalle.tsx` tenía 1.499 líneas con 6 pestañas y 12 piezas compartidas en un solo archivo.

## Cambios

- Extracción (commit "Refactor: dividir ModuloDetalle"): `moduloDetalle/TabResumen`, `TabClases`, `TabExamenes`, `TabTextos`, `TabApuntes`, `TabCasos`, `comunes.tsx` y `utilidades.ts`. `ModuloDetalle.tsx` queda en ~180 líneas.
- `ListaApuntes` + `FilaApunte` con `React.memo`; resumen con `useMemo` por contenido; acciones con identidad estable (`useMemo([moduloId])`) y `filtrados` memoizado.
- `tarjetasDe()` con caché `WeakMap` por objeto apunte.
- `LectorApunte` no analiza el apunte mientras `editando`.

## Mejoras propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Memo de la lista y caché de tarjetas | bajo | Implementada |
| No analizar el lector oculto durante la edición | bajo | Implementada |
| Escribir en `localStorage` con *debounce* (y *flush* en `pagehide`): hoy cada autoguardado serializa TODO el estado persistido | medio | Propuesta |
| Guardar los apuntes en IndexedDB en vez de `localStorage` (sin límite de ~5 MB) | alto | Propuesta |

Segunda pasada (4 hallazgos): se repitió la medición tras los cambios (tabla de arriba) y se probaron de nuevo Deshacer, mover, duplicar, repasar y abrir desde el buscador (scripts `t_b4`, `t_b5`, `t_buscar`): sin regresiones.

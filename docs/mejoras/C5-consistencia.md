# Auto-revisión — C5 Tokens de diseño y consistencia visual

## Qué se hizo

- **Tokens** en `src/index.css` (`@theme`, así Tailwind genera las utilidades):
  - Radios: `rounded-control` 8 px, `rounded-tarjeta` 12 px y `rounded-panel` 16 px.
  - Sombras: `shadow-tarjeta` y `shadow-flotante`.
  - Alturas: `h-control` 40 px y `control-sm` 32 px; márgenes `gutter` 16/24 px.
  - Duraciones: `--dur-rapida` 150 ms, `--dur-media` 200 ms y `--dur-lenta` 250 ms (`transition-colors` sin duración explícita pasa a 180 ms). Easing: `--ease-estandar`.
- **Botones comunes**:
  - Base `.boton` con variantes `.boton-suave`, `.boton-fantasma`, `.boton-borde` y `.boton-primario` (o `aria-pressed="true"`). Tamaños: `.boton-chico` y `boton-icono`, este último como utilidad para usarlo con variantes, p. ej. `max-sm:boton-icono`.
  - Mismo hover (solo con `hover: hover`, para que no quede "pegado" en el celular), el mismo `:active` (escala 0,97), el mismo estado deshabilitado y el mismo radio en claro y oscuro.
  - El tema sale de `data-tema` en `<html>`, que ahora pone `App.tsx`. Así también lo leen los modales y avisos, que se montan con portal fuera del `div.dark`.
- **Foco visible común**:
  - `:focus-visible` con anillo de 2 px del acento (`--accent-400` en oscuro) en botones, enlaces, pestañas, ítems de menú, casillas y `[tabindex]`. Va sin `@layer`, así gana a cualquier `outline-none`.
  - Los 17 campos con `outline-none border` reciben `campo-foco`: el borde toma el acento y se suma un halo.
- **Las 3 pantallas más inconsistentes** (según C0):
  - Explorador: barra, navegación, carrusel, índice, ficha, tarjeta del artículo y estados de error.
  - Módulo detalle: cabecera, acciones de sección, filas de apuntes y casos, formularios, borrador y "Mover a…".
  - Topbar/Sidebar: menú, tema, perfil, colapsar, ítems de navegación, Códigos y Configuración, todos con `min-h-control` y el mismo hover.
- **Movimiento**:
  - Las animaciones de framer con 300–600 ms pasan a 250 ms (13 casos). `MotionConfig` define 200 ms por defecto.
  - `prefers-reduced-motion` ya cubría las transiciones CSS y framer (`reducedMotion="user"`); comprobado: `.boton` queda en 0,01 ms.

## Prompt de revisión

1. ¿Los botones de la misma barra miden lo mismo? ¿Y en táctil llegan a 40 px, también los "chicos"?
2. ¿Se ve el foco con teclado en claro Y en oscuro? ¿Tiene contraste suficiente sobre zinc-900?
3. ¿Los campos de texto muestran foco (antes: `outline-none` sin reemplazo)?
4. ¿El hover queda "pegado" después de tocar un botón en el celular?
5. ¿Los modales abiertos por portal respetan el tema oscuro en los botones nuevos?
6. ¿Las pestañas del módulo se manejan con el teclado como pestañas (flechas) o como 6 paradas de Tab?
7. Con "reducir movimiento" del sistema, ¿queda alguna animación larga?

## Casos probados (Playwright, claro/oscuro, 375 y 1280 px; táctil emulado)

- Barra del Explorador: Índice, Modo lectura, Buscar e Imprimir miden 40 px; en 375 px, Índice y Modo lectura quedan solo con ícono (40×40) y Buscar también. ✔
- Foco con teclado en "Índice": `outline 2px solid rgb(15,110,86)` en claro y `rgb(52,211,153)` en oscuro. ✔
- Campo "Título" enfocado: borde del acento y halo (captura en oscuro). ✔
- Táctil 375: todos los `.boton-chico` del módulo miden 40 px de alto. ✔ (tras la corrección 1)
- Reducir movimiento: `transition-duration` de `.boton` = 0,01 ms. ✔
- Sin desbordes en Explorador ni en Módulo a 375 px; `tsc -b`, build y lint sin errores nuevos.

## Hallazgos reales

1. El botón **Repasar** (ícono + número) medía 30 px de ancho en táctil: un blanco angosto. `.boton` ahora tiene `min-width` igual a su alto.
2. **Pestañas del módulo sin flechas**: tenían `role="tab"` pero cada una era una parada de Tab y las flechas no hacían nada. Ahora siguen el patrón ARIA: una parada (`tabIndex` 0 solo en la activa) y ←/→/Inicio/Fin cambian de pestaña, respetando el aviso de cambios sin guardar.
3. **Campos sin foco visible**: 17 campos con `outline-none` no mostraban ningún foco con teclado; ahora usan `campo-foco`.
4. Los modales por portal no heredaban el tema desde el `div.dark` (solo importaba para los tokens nuevos); por eso se agregó `data-tema` en `<html>`.

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| `min-width` = alto en todo `.boton` (blancos táctiles cuadrados como mínimo) | bajo | Implementada |
| Flechas en las pestañas del módulo (patrón ARIA) | bajo | Implementada |
| Llevar `.boton` al resto de las vistas (Colecciones, Práctica, Canvas, Mapas) | medio | Propuesta (se hizo en las 3 pantallas pedidas) |
| Mismo patrón de flechas en las otras filas de pestañas (Acerca de, Colecciones) | bajo | Propuesta |
| Modo de alto contraste (tokens de borde y texto más fuertes) | medio | Propuesta |

Segunda pasada (4 hallazgos): se repitieron las mediciones táctiles (todos los botones chicos a 40×40 como mínimo) y la navegación de pestañas con flechas (de Apuntes → Casos con →; foco visible en la pestaña nueva).

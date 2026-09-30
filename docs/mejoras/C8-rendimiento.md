# Auto-revisión — C8 Rendimiento percibido: precarga, saltos de layout y Lighthouse

## Qué se hizo

- **Vistas bajo demanda** (`src/vistas.ts`): cada una de las 12 vistas es un chunk con `React.lazy`, dentro de `Suspense` (fondo del mismo color, sin saltos) y de un límite de error por vista (`LimiteError`).
- **Precarga al pasar**: el chunk se descarga con `pointerenter` o `focus` sobre el ítem del menú (probado: tras pasar el cursor por "Canvas" su chunk ya está bajado y la vista aparece en ~340 ms tras el clic). El selector de códigos ya precargaba el JSON al pasar el cursor (C6).
- **SDK de Anthropic solo en desarrollo**: se importa dinámicamente; en el build de producción, que usa `/api/anthropic`, ya no viaja (~144 KB).
- **CSS sin bloqueo**:
  - Los íconos de Tabler y la fuente Inter eran `@import` dentro del CSS de la app: el navegador los descubría recién al bajar ese CSS y bloqueaban el primer pintado.
  - Ahora los íconos se piden por `<link rel="preload" … onload>` en `index.html`, con `preconnect`.
  - Inter se pide al abrir Mapas mentales, la única vista que la usa.
- `lang="es-CL"` (decía `en`: los lectores de pantalla leían el español con voz inglesa) y contraste AA en el pie de Consultar.

## Lighthouse antes/después

Build de producción servido con `vite preview`, emulación móvil de Lighthouse 13.5, mediana de 3 corridas. "Antes" = `main` al empezar el lote; "después" = esta rama.

| Métrica | main | rama | |
|---|---|---|---|
| Rendimiento | 79 | **93** | +14 |
| Accesibilidad | 95 | **100** | +5 |
| Buenas prácticas | 96 | 96 | = (*) |
| First Contentful Paint | 3,76 s | **2,15 s** | −43 % |
| Largest Contentful Paint | 3,79 s | **2,94 s** | −22 % |
| Speed Index | 4,72 s | **2,15 s** | −54 % |
| Total Blocking Time | 80 ms | 17 ms | |
| Cumulative Layout Shift | 0 | 0 | |
| JS inicial (comprimido) | 434 KB | **208 KB** | −52 % |

(*) El único punto que falta en buenas prácticas es un error de consola del entorno de pruebas: la CDN de íconos no es alcanzable desde el contenedor (`ERR_TUNNEL_CONNECTION_FAILED`). En producción no ocurre. Por lo mismo, estas cifras no incluyen la descarga real de la fuente de íconos (**no verificado** con la CDN real).

**CLS al navegar** (PerformanceObserver `layout-shift`, build de producción): carga, Módulos, Explorador, Mapas mentales, Práctica, Colecciones, abrir el Código Civil y pasar al artículo siguiente → **0** en todos los casos. El skeleton del Explorador (C4) tiene la misma estructura que la pantalla final.

## Prompt de revisión

1. Con las vistas separadas, ¿qué pasa si la red se corta justo al abrir una?
2. ¿Y después de un deploy nuevo, cuando los chunks con el hash viejo ya no existen en el servidor?
3. ¿La precarga gasta datos de más en el celular?
4. ¿Los íconos "saltan" al llegar tarde ahora que no bloquean?
5. ¿Hay algún `@import` o script de terceros que siga bloqueando?
6. ¿La primera vista (la recordada por C7) también se carga rápido?

## Hallazgos

1. **Pantalla en blanco si falla el chunk de una vista**: no había ningún límite de error en la app. Ahora cada vista tiene uno, con "No se pudo abrir esta sección" y el botón Recargar (probado abortando `CanvasView`; las demás vistas siguen funcionando).
2. **Deploy nuevo**: un usuario con la app abierta pide chunks que ya no existen (404). Si hay conexión, el límite de error **recarga solo una vez** (máximo una vez por minuto, nunca sin conexión). Probado: el chunk responde 404 → 1 recarga → vuelve a Canvas (la vista se recuerda desde C7).
3. Contraste del pie de Consultar: 2,6:1 → texto zinc-500/zinc-400 (AA) y enlaces subrayados (no solo por color).
4. `lang="en"` en `index.html`.

## Decisiones

- Precarga solo con intención (cursor, foco, dedo), no de todas las vistas en segundo plano: en el celular no se gastan datos en vistas que nunca se abren.
- Los íconos dejan de bloquear: si la CDN tarda, la app se ve y se usa antes y los íconos aparecen después. Reservarles 1 em para que no empujen el texto sería más seguro, pero no se pudo verificar visualmente aquí, porque la CDN no está alcanzable. Queda como propuesta.

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Recarga automática (una vez) ante chunks de un deploy anterior | bajo | Implementada |
| Servir los íconos desde el propio sitio (paquete npm, sin CDN ni `@latest`) | bajo | Propuesta |
| Reservar el ancho de los íconos (`.ti { min-width: 1em }`) | bajo | Propuesta (no verificable aquí) |
| Service Worker con los chunks y los códigos más usados (offline) | alto | Propuesta |
| Índice de búsqueda de Consultar en un Web Worker (primera búsqueda ~1,3 s, ver B6) | medio | Propuesta |

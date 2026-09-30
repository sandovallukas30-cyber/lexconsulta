# Auto-revisión — C4 Estados de carga, vacíos y error

## Prompt de revisión

Revisa los estados "intermedios" de la app como alguien que estudia en el metro, con la señal que va y viene:

1. Si se cae la red justo al abrir un código del Explorador, ¿qué ve? ¿Puede salir de ahí sin recargar?
2. ¿"Reintentar" de verdad vuelve a pedir el archivo, o falla al instante?
3. ¿Qué pasa si vuelve la conexión y el usuario no toca nada?
4. En Consultar, si la consulta falla, ¿puede reintentar sin volver a escribir? ¿Se duplica la pregunta en el historial?
5. ¿Los mensajes de error están en español o aparece "Failed to fetch"?
6. Mientras carga el Código Civil (1,5 MB), ¿la pantalla salta cuando aparece el artículo?
7. En un módulo nuevo (sin nada), ¿el estado vacío dice qué hacer y deja hacerlo ahí mismo?

## Casos límite probados (Playwright, claro/oscuro, 375 y 1280 px)

- Descarga de `leyArrendamientoUrbano.json` abortada (sin red): "No se pudo abrir este código" con **Reintentar** y **Elegir otro código**. Con la red de vuelta, Reintentar muestra el Art. 1. ✔
- Código Civil con 2,5 s de latencia: skeleton con `aria-busy` y la misma estructura (barra, miga, tarjeta, navegación); sin desborde a 375 px. ✔
- Módulo "Derecho Penal" vacío: Clases → "Agregar clase", Exámenes → "Agregar evaluación", Textos → "Agregar texto", Casos → "Agregar caso", Apuntes → "Crear apunte" + "Importar". ✔
- Consultar con un código que no baja: "⚠️ Sin conexión: no se pudieron descargar los códigos…" + Reintentar; tras reintentar, el historial tiene 1 pregunta y 1 respuesta (sin duplicar). ✔
- Red caída → vuelve (`offline`/`online`): el Explorador reintenta solo y muestra el artículo. ✔
- Consola: solo los errores esperados (la descarga abortada a propósito y las fuentes/íconos externos que el entorno de pruebas no alcanza).

## Hallazgos reales

1. **Reintentar no funcionaba**: los códigos se cargaban con `import()` dinámico y Chromium deja en caché el módulo fallido; un nuevo `import()` de la misma URL fallaba al instante sin pedir el archivo (comprobado: 1 sola petición tras dos intentos). Afectaba también a producción: un corte breve al abrir un código lo dejaba roto hasta recargar la página. Ahora los loaders hacen `fetch` a la URL del JSON (`import.meta.glob(..., { query: '?url', eager: true })`).
2. **Mensaje en inglés**: con `fetch`, una caída de red rechaza con "Failed to fetch", que Consultar mostraba tal cual. Ahora: "Sin conexión: no se pudieron descargar los códigos. Revisa tu internet y reintenta."
3. **Consultar sin salida**: un error dejaba "⚠️ …" sin forma de repetir la pregunta; reescribirla la duplicaba en el historial. `reintentar()` reenvía la última pregunta sobre la conversación SIN la pregunta fallida ni su error.
4. Efecto secundario del cambio 1: los JSON se publican tal cual (con sangría), ~14 % más pesados en bruto que los antiguos chunks JS (1,49 MB vs 1,30 MB el Civil). Con la compresión gzip/brotli de Vercel la diferencia es mínima; queda como propuesta minificarlos.

## Mejoras UX propuestas

| Mejora | Costo | Estado |
|---|---|---|
| Reintento automático al volver la conexión (evento `online`) | bajo | Implementada |
| Acción dentro de cada estado vacío (Crear / Importar / Agregar) | bajo | Implementada |
| Minificar los JSON de `src/data` al compilar (plugin de Vite de ~15 líneas) | medio | Propuesta |
| Cachear los códigos en un Service Worker para usar el Explorador sin conexión | alto | Propuesta |

Segunda pasada (4 hallazgos): se repitieron las pruebas tras los cambios 1–3: Reintentar y `online` recuperan el código; Consultar muestra el mensaje en español y no duplica la pregunta; `tsc -b` y `npm run build` pasan; sin errores de lint nuevos en los archivos tocados.

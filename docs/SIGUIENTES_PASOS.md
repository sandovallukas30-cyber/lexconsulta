# Siguientes pasos — Prima Lex

Estado al 30-09-2026: el lote 1 está completo (ver `docs/INFORME_NUBE_LOTE1.md`). Lo pendiente sale de las propuestas "Propuesta" de `docs/mejoras/*.md` y de lo que quedó sin verificar. Abajo va un prompt listo para pegar en una sesión nueva.

## Pendientes, por prioridad

**A — Datos y rendimiento de búsqueda**
1. **Ley 19.913** (Unidad de Análisis Financiero): `obtxml?opt=7&idNorma=219119` devuelve HTML. Reintentar más tarde o buscar el `idNorma` del texto vigente. Si no hay XML, dejarla pendiente: **no inventar texto**. La reserva cargada fue la 18.918.
2. **Índices de búsqueda de Consultar en un Web Worker**, construidos por demanda. Hoy, con 53 normas activas, la primera consulta tarda ~1,3 s en dev.
3. **Íconos desde el propio sitio**: usar el paquete npm `@tabler/icons-webfont` en vez de la CDN con `@latest`, que cambia sola y es un punto de falla. Después, reservar 1 em por ícono (`.ti { min-width: 1em }`) y verificar visualmente.
4. **Minificar los JSON de `src/data` al compilar** (plugin de Vite): hoy se publican con sangría, ~14 % más pesados en bruto.

**B — Área académica**
5. **Apuntes en IndexedDB** en lugar de `localStorage`, que tiene un límite de ~5 MB. Hay que migrar desde el store y mantener el respaldo.
6. **Repaso por ramo**: todas las tarjetas pendientes de varios apuntes a la vez, desde "Hoy".
7. **Exportar evaluaciones a .ics.**
8. **Selección múltiple de apuntes** (mover o exportar varios).

**C — Interfaz**
9. Llevar los botones comunes (`.boton…`) y los tokens a las vistas que faltan: Colecciones, Práctica, Canvas, Mapas mentales, Consultar y Plazos.
10. Trampa de foco en todos los modales y enlace "Saltar al contenido".
11. Integrar "Volver" con el botón Atrás del navegador y del celular (`history.pushState`).
12. Contraste del acento dentro de los Modos Lectura, según su tema (claro, papel u oscuro).
13. Barra de navegación inferior en móvil con las 4 vistas más usadas.

**Verificaciones que no se pudieron hacer en la nube**
- Una respuesta real de Consultar en un deploy de preview de Vercel (no había clave de API en la sesión).
- Íconos y fuente Inter desde la CDN (inalcanzable desde el contenedor).
- Lector de pantalla (NVDA/VoiceOver) y teléfonos reales (iOS Safari, Android Chrome).

---

## Prompt para la próxima sesión (copiar y pegar)

```
Trabajas en "Prima Lex", una SPA de consulta jurídica chilena: React 19 + TypeScript + Zustand (persist) + Tailwind 4 + Vite, sin backend propio (solo la función /api/anthropic de Vercel), desplegada en Vercel. Repo: sandovallukas30-cyber/lexconsulta. No puedes hacerme preguntas: decide con buen criterio y deja las decisiones escritas.

ANTES DE EMPEZAR lee: CONTEXTO.md (sección 0 primero), docs/INFORME_NUBE_LOTE1.md y docs/SIGUIENTES_PASOS.md.

REGLAS
- Trabaja en la rama nube/lote-2 (créala desde main; si el entorno te fuerza otra, usa esa y dilo en el informe). Commits pequeños en español y `git push` después de cada bloque.
- NO hagas merge a main, NO fuerces push, NO toques .env, la configuración de Vercel ni secretos. Al final abre un PR en borrador hacia main.
- Antes de cada commit deben pasar `npx tsc -b` y `npm run build`. No agregues problemas de lint en los archivos que toques: compáralos contra main con `npx eslint <archivos> -f json` (el formateador "unix" ya no existe en ESLint 9).
- UI en español de Chile. Usa los tokens y clases existentes: .boton + variante, rounded-control/tarjeta/panel, shadow-tarjeta/flotante, --accent-texto para texto de acento, --accent-base para fondos, data-tema en <html>. Debe verse bien en claro y oscuro y a 375 px sin scroll horizontal.
- No agregues backend ni APIs de pago. No agregues IA a los Apuntes: el formato, el repaso y la búsqueda de apuntes son por reglas/regex.
- Persistencia: store "prima-lex-storage-v3", hoy en versión 32. Por cada cambio de lo persistido, sube la versión UNA vez (33, 34…) y agrega un bloque `if (version < N)` al FINAL de migrate (las migraciones se encadenan; nunca reutilices un número).
- Leyes: solo desde el XML oficial de la BCN (scripts/bcn_xml_a_json.mjs y scripts/verificar_leyes.mjs). Si la BCN no entrega el texto, NO lo inventes: déjalo pendiente. No copies PDFs al repo.

TAREAS (prioridad A > B > C)
A1. Ley 19.913: intenta obtener su XML vigente; si no se puede, documenta por qué.
A2. Índices de búsqueda de Consultar en un Web Worker y por demanda; mide la primera consulta antes y después.
A3. Íconos Tabler desde el paquete npm (sin CDN ni @latest); reserva el ancho de los íconos y verifica visualmente.
A4. Minificar los JSON de src/data en el build.
B1. Apuntes en IndexedDB con migración desde el store y respaldo compatible.
B2. Repaso por ramo desde "Hoy".
B3. Exportar evaluaciones a .ics.
C1. Llevar .boton y los tokens a Colecciones, Práctica, Canvas, Mapas mentales, Consultar y Plazos.
C2. Trampa de foco en los modales + "Saltar al contenido".
C3. "Volver" integrado con el Atrás del navegador (history.pushState/popstate).
C4. Contraste del acento en los Modos Lectura según su tema.

CICLO POR ÍTEM
1) Construir. 2) Escribir docs/mejoras/<ítem>.md con 5–8 preguntas críticas, casos límite y 3 mejoras de UX con su costo. 3) Revisar en el navegador (Playwright + Chromium; claro y oscuro; 375 y 1280 px). 4) Corregir y aplicar las mejoras de costo bajo y medio; commit "Mejora: <ítem>". 5) Si hubo 3 o más hallazgos, segunda pasada.

"HECHO" = compila, funciona en claro/oscuro y a 375 px, sin errores nuevos en consola, descrito en el informe. Lo que no se pudo probar se marca "no verificado".

AL TERMINAR
- docs/INFORME_NUBE_LOTE2.md: qué se hizo y qué no, decisiones, migraciones, y por ítem qué encontró la auto-revisión, qué se corrigió y qué propuestas quedan.
- Actualiza CONTEXTO.md (sección 0) y docs/SIGUIENTES_PASOS.md con el próximo prompt.
- PR en borrador hacia main.
```

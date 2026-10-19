# Prima Lex

App web para estudiantes de Derecho en Chile (React 19 + TS + Vite + Tailwind 4 + Zustand). Producción: https://primalex.vercel.app (Vercel despliega solo al hacer push a `main`). El panorama completo está en `CONTEXTO.md`; aquí solo lo que no se deduce del código.

## Comandos
- `npm test` (Vitest, 155 tests) · `npx tsc -b` · `npm run lint` · `npm run build`
- Antes de un push corren tsc, tests y build solos (hook en `.claude/settings.json`); si fallan, el push se bloquea.
- Servidor de desarrollo: `npm run dev`. En dev existen `window.__store`, `__enfoque` y `__cuenta` para sembrar datos en pruebas visuales.

## Reglas del producto
- **Tablet primero.** La mayoría de los estudiantes usa iPad. Menú lateral fijo solo desde 1100 px (`hooks/useEsMovil.ts` y la variante `escritorio` de `index.css` deben coincidir). Campos de 16 px en táctil, objetivos de toque ≥ 40 px.
- **Apuntes sin IA:** reglas y regex, nunca un modelo. Probar con contenido real de Notion.
- **Datos mínimos y privados.** No mandar datos personales a terceros; las imágenes para compartir llevan solo cifras.
- **No inventar** mascotas, colores ni logos oficiales de universidades; solo datos verificados.
- Textos en español de Chile, tono cercano, frases neutras en género.

## Trampas conocidas
- Los estilos de `src/neumorfismo.css` van **sin capa** y le ganan a las utilidades de Tailwind; usa `sin-neu` o `sin-tactil` para salirte.
- Las vistas pesadas son `React.lazy` (`src/vistas.ts`); un deploy cambia los nombres de los chunks.
- El service worker (`public/sw.js`) no debe cachear HTML; si se toca, recordar al usuario recargar dos veces.
- El store persistido (`prima-lex-storage-v3`) migra encadenado: para cambiar la forma de los datos, sumar un bloque `if (version < N)` y subir `version`.
- **Íconos Tabler recortados** (`src/assets/iconos/`, 24 KB en vez de 495). Si usas un `ti-…` nuevo: `npm i --no-save subset-font && node scripts/subset_iconos.mjs`; un test avisa si falta uno.
- **CSP estricta** en `vercel.json`: si agregas una fuente, API o iframe de otro dominio, hay que permitirlo ahí (connect-src, frame-src, img-src…) o el navegador lo bloquea. Prueba con la app compilada. Nada de Google Fonts: las fuentes van con la app (@fontsource).
- **Avisos técnicos anónimos** (`services/reporteTecnico.ts` → `api/reportar.ts`): errores y Core Web Vitals, sin datos personales; se leen en los logs de Vercel (`[reporte]`). Si cambia lo que se envía, actualizar la sección 7 de Privacidad.
- **Ramos**: pueden tener varios profesores (`Ramo.profesores`; `profesor` se mantiene como el primero por compatibilidad con respaldos antiguos: usa siempre `profesoresDe(ramo)`) y un diseño de franja (`Ramo.diseno`, `BandaRamo`). Las fichas de Módulos son `RamoFicha`; el interior del ramo agrupa las 6 pantallas en 4 secciones (`ModuloDetalle`), pero `Tab` sigue teniendo las 6.
- Zustand: no suscribirse a todo el store en componentes; selectores finos.
- PowerShell, no Bash, para npm/docker; el puerto 5432 lo ocupa un Postgres nativo.

## Verificación
- Cambios visuales: captura con Playwright + Edge (`playwright-core`) y comparar; para tablet, viewports 744×1133, 820×1180, 1180×820 y 1024×1366 con `hasTouch` e `isMobile`.
- Accesibilidad: la app pasó axe-core (WCAG 2.1 AA) en las 9 vistas, claro y oscuro. Los colores de texto del sistema tienen un test de contraste (`neumorfismo.contraste.test.ts`): no bajar `--neu-ink2/ink3`. Para volver a auditar: `npm i --no-save axe-core` y correr axe con Playwright sobre cada vista.
- Hooks del proyecto (`.claude/settings.json`): tras editar `src/` o `api/` se corre eslint sobre ese archivo (solo errores); antes de `git push` se corren tsc, tests y build.
- Revisores en `.claude/agents/`: `revisor-seguridad` (antes de tocar cuentas, `api/` o datos personales) y `revisor-tablet` (después de cambios de interfaz).
- No declarar algo listo sin haber visto pasar tests y build.

## Deploy y datos
- Commit + push a `main` después de cada cambio terminado, tras verificar y revisar divergencia con el remoto.
- Cuentas con Supabase (Google y enlace por correo): ver `docs/CUENTAS.md`. Nunca poner claves (service_role, secretos) en el repo.

# Seguridad de Prima Lex: qué se revisa y cómo repetirlo

Última revisión: 26-oct-2026. Esta guía deja por escrito las comprobaciones, para repetirlas cuando cambie algo importante (cuentas, pagos, la carpeta `api/`).

## Modelo de cuentas

- **Ingreso:** Google, Microsoft o enlace por correo, con Supabase. No hay contraseñas propias.
- **Un solo rol real: el plan** (`gratis` o `pro`), en la tabla `perfiles`. Lo escribe únicamente el servidor (clave `service_role`, que nunca está en el navegador, el código ni el repositorio).
- **Aislamiento:** cada cuenta solo puede leer, crear, modificar y borrar sus propias filas (políticas de seguridad por fila, ver `docs/supabase/esquema.sql`).
- **Administración:** no hay roles de desarrollador o moderador; la administración se hace en los paneles de Supabase y Vercel. La única excepción es el **panel de estadísticas de uso** (opcional y apagado por defecto, ver `docs/ANALITICA_USO.md`): quién puede verlo se guarda en la tabla `administradores`, que está cerrada a todo menos al servidor y a quien tenga acceso al SQL Editor, y **la base lo vuelve a comprobar en cada lectura** (`uso_resumen`), no solo la pantalla. Esa función necesita la clave `service_role` como variable del servidor en Vercel (`SUPABASE_SERVICE_ROLE_KEY`, nunca con prefijo `VITE_`).

## Comprobaciones y cómo repetirlas

| # | Qué | Comando o lugar | Estado (26-oct-2026) |
|---|---|---|---|
| 1 | Configuración de Supabase desde fuera (proveedores, confirmación de correo, tablas cerradas a visitantes, función de eliminar cuenta, CSP, HSTS) | `node scripts/verificar_supabase.mjs` (también corre cada día en GitHub) | 14 correctas, 1 aviso (puntos a revisar a mano en el panel), 0 fallas |
| 2 | Ataques de un visitante sin sesión (leer, escribir y borrar datos y perfiles, llamar a `eliminar_mi_cuenta`, listar el esquema, buckets de Storage, API de administración) | Pruebas con la clave pública del sitio | Todos rechazados o sin filas |
| 3 | Aislamiento entre dos cuentas (B contra los datos y el plan de A) | `node scripts/probar_aislamiento.mjs --cuentas-de-prueba` (ver instrucciones al inicio del archivo; necesita dos cuentas **de prueba**) | **Pendiente**: necesita las dos cuentas |
| 4 | Secretos en el repositorio (todo el historial, 388 commits) y en el sitio publicado | Búsqueda de patrones de claves con `git grep` sobre todos los commits, y sobre los archivos JS del sitio | Limpio: sin claves reales |
| 5 | Dependencias con avisos de seguridad | `npm audit` | 0 vulnerabilidades (antes 39) |
| 6 | Análisis de código | CodeQL (`.github/workflows/codeql.yml`, corre en cada cambio y cada lunes) | Activado; los resultados salen en GitHub → Security → Code scanning |
| 7 | Avisos y actualizaciones de dependencias | Dependabot (`.github/dependabot.yml`) | Activado |
| 8 | Estadísticas de uso (si se activan): solo el servidor escribe, solo un administrador lee, entradas hostiles acotadas | `npm install @electric-sql/pglite --no-save` y `node scripts/probar_uso_sql.mjs` (Postgres local, 28 comprobaciones); `npm test` (endpoint y validación) | 28 + 7 correctas (28-oct-2026). **Falta repetirlo contra tu Supabase real** al activarlo |

## Hallazgos y decisiones

1. **El asistente de IA (`api/anthropic.ts`) acepta peticiones sin sesión** (hasta 10 por día por IP, y un techo global de 400 diarias). Es intencional, para que se pueda jugar sin cuenta, pero cada petición cuesta una fracción de centavo. Los contadores viven en la memoria de cada instancia de Vercel, así que el límite es aproximado. **Medida recomendada:** poner un tope de gasto mensual en la consola de Anthropic.
2. **Un correo personal aparece en un documento público del repositorio** (`PRIMA_LEX_INFORME.md`). Riesgo bajo; conviene quitarlo si ese informe se publica.
3. **Dependencias de desarrollo:** se quitaron `@vercel/node` y la CLI `vercel` de `devDependencies` (solo aportaban tipos y traían unos 38 avisos). Los tipos de las funciones están ahora en `api/_tipos.ts`. Para usar la CLI: `npx vercel`.
4. **Puntos que solo se ven en los paneles** (los marca el script como «aviso»): restricción de 5 MB en `datos_usuario` (volver a correr `esquema.sql`), SMTP propio, vencimiento del secreto de Microsoft Azure, y las URL permitidas en Authentication.

## Pendientes de configuración en GitHub (Settings → Code security)

Activar **Secret scanning** y **Push protection** (avisan o bloquean si alguien sube una clave) y **Dependabot alerts**.

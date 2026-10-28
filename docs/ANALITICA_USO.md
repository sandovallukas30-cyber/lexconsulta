# Estadísticas de uso (panel de administrador)

**Estado: construido y APAGADO.** No recolecta ni envía nada hasta que sigas los pasos de «Cómo activarlo».

## Qué responde

- **Cuántos entran:** visitas por día, cuántas son de primera vez y cuántas regresan, y desde qué tipo de pantalla (celular, tablet, computador).
- **En qué pantallas pasan el tiempo:** segundos de uso activo en Hoy, Tareas, Mis ramos, Explorador, Colecciones, Mapas mentales, Enfoque, Práctica y Calendario.
- **Qué funciones se usan y cuáles no:** 29 funciones contadas (crear un apunte, consultar artículos al lado del apunte, pedir una pista, exportar, etc.) y la lista de las que nadie tocó en el período.

## Qué se recolecta y qué no

| Se recolecta | NUNCA se recolecta |
|---|---|
| «La función X se usó N veces» | Texto de apuntes, títulos, búsquedas |
| «Hubo N segundos de uso activo en la pantalla Y» | Nombre, correo, cuenta |
| Tipo de pantalla (celular / tablet / computador) | Identificador de persona o de dispositivo |
| Si es la primera vez que ese navegador entra | Dirección IP (el servidor la usa un minuto en memoria para frenar abusos y no la guarda) |

- **Una «visita» no es una persona.** No hay identificadores, así que quien entra tres veces cuenta tres visitas.
- **Tiempo activo:** cuenta solo si la pestaña está a la vista y hubo uso (clic, teclado, scroll) en el último minuto.
- **Quién puede apagarlo:** cada persona, con el interruptor «Compartir estadísticas de uso anónimas» (Configuración → Datos y contenido). También se respeta la señal «No rastrear» del navegador.
- **Todo sale en una sola forma fija** (`api/_catalogoUso.ts`): el servidor descarta cualquier clave que no esté en el catálogo, así que no se puede colar texto libre.

## Cómo funciona

```
navegador (src/services/uso.ts)         servidor (api/uso.ts)               Supabase (docs/supabase/uso.sql)
 contadores en memoria ──envío──►  valida con el catálogo ──registrar_uso──►  tabla uso_diario (contadores por día)
 (al cerrar, al cambiar de pestaña,   (origen propio, tope de tamaño,           ▲
  o cada 5 min)                        freno por IP, clave service_role)         │ uso_resumen (solo administradores)
                                                                       panel «Estadísticas de uso» (Configuración)
```

## Cómo activarlo (una sola vez)

1. **Crear las tablas.** Supabase → SQL Editor → New query → pega todo `docs/supabase/uso.sql` → Run. Se puede volver a ejecutar sin problema.
2. **Hacerte administrador.** Supabase → Authentication → Users → copia el *User UID* de tu cuenta y ejecuta en el SQL Editor:
   ```sql
   insert into public.administradores (user_id) values ('PEGA-AQUÍ-TU-USER-UID');
   ```
   Solo tú puedes agregar administradores (desde el navegador nadie puede, ni con la clave pública).
3. **Dar la clave al servidor.** Vercel → proyecto → Settings → Environment Variables:
   - `SUPABASE_SERVICE_ROLE_KEY` = la clave *service_role* (Supabase → Project Settings → API). Solo entorno **Production** y márcala como *Sensitive*. **Nunca** va con prefijo `VITE_` (eso la mandaría al navegador).
   - `VITE_USO_ACTIVO` = `1`.
4. **Volver a desplegar** (Deployments → Redeploy, o cualquier push a `main`).
5. **Revisar la política de privacidad.** Al activarse, la sección 7 de la política y el interruptor de Configuración aparecen solos. Conviene que lo revise el agente de cumplimiento (o un abogado) antes de dar el paso 3, sobre todo con la Ley 21.719 que la política menciona.
6. **Ver los datos.** Entra con tu cuenta → Configuración → **Estadísticas de uso** (solo aparece si eres administrador).

## Cómo apagarlo

- Borra `VITE_USO_ACTIVO` en Vercel y vuelve a desplegar: la app deja de recolectar y el interruptor y el texto de privacidad desaparecen.
- Para borrar lo ya guardado: `truncate public.uso_diario;` en el SQL Editor.
- Para quitar un administrador: `delete from public.administradores where user_id = '…';`

## Cómo leer los números

- Con pocas visitas son una **pista**, no una prueba. Si 8 de 10 no usan una función, pregúntales por qué antes de quitarla: puede que no la encuentren.
- «Funciones que nadie usó» incluye las que aún no se ven porque hay pocos usuarios.
- Los datos llegan cuando alguien cierra o cambia de pestaña, o cada 5 minutos: un uso muy reciente puede tardar en aparecer.
- Los días se agrupan por hora de Chile.

## Agregar una función nueva al catálogo

1. Agrega la clave y su texto en `FUNCIONES_USO` (`api/_catalogoUso.ts`). La clave no se cambia después de publicar.
2. Llama `registrarUso('mi.funcion')` donde ocurre (importa de `src/services/uso.ts`).
3. Corre `npm test`: hay una prueba que falla si una función del catálogo no se registra en ningún lugar, o si se registra una que no está en el catálogo.

## Seguridad y pruebas

- **La clave service_role** solo existe en el servidor (Vercel). Si falta, `api/uso.ts` responde 204 y no guarda nada.
- **Permisos de la base** (probados, `node scripts/probar_uso_sql.mjs`, 28 comprobaciones en un Postgres local): un visitante o una cuenta común no pueden escribir, leer ni agregarse como administrador; solo el servidor escribe y solo un administrador lee. Los valores exagerados se acotan.
- **De punta a punta** (probado en un navegador con Supabase simulado): el administrador ve el panel y la cuenta común no; el primer envío es una visita nueva sin ningún dato personal; con el interruptor apagado o con «No rastrear» no se envía nada.
- **Pendiente de probar con tu Supabase real:** las comprobaciones anteriores usan un Postgres local (PGlite) con roles simulados al estilo Supabase y no tu proyecto. Tras el paso 1, abre el panel una vez y confirma que carga.

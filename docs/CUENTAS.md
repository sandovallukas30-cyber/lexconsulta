# Cuentas de Prima Lex: guía de configuración

Esta guía deja funcionando el ingreso con **Google**, **Microsoft** y **enlace por correo**, y la sincronización entre dispositivos. Todo se hace en paneles web; no hay que escribir código. Hasta que termines el paso 6, la app funciona como siempre y no muestra nada de cuentas.

> **Seguridad:** los *secretos de cliente* de Google y Microsoft se pegan **solo** en el panel de Supabase. La clave `service_role` de Supabase **nunca** se pega en el chat, en el código ni en Vercel como variable `VITE_…`. A la app solo le entran la URL del proyecto y la clave pública `anon`.

## 1. Proyecto en Supabase

1. Entra a <https://supabase.com> y crea una cuenta (puedes usar GitHub o Google).
2. **New project**: nombre `prima-lex`, región **South America (São Paulo)** (la más cercana a Chile), una contraseña de base de datos larga (guárdala en tu gestor de contraseñas; no se usa en la app).
3. Cuando termine de crearse, ve a **Project Settings → API** y anota:
   - **Project URL** (algo como `https://abcd1234.supabase.co`).
   - **anon public key** (la clave larga que dice `anon`).
4. Ve a **SQL Editor → New query**, pega todo el contenido de `docs/supabase/esquema.sql` y presiona **Run**. Debe decir *Success*.

## 2. Direcciones permitidas

En **Authentication → URL Configuration**:

- **Site URL:** `https://primalex.vercel.app`
- **Redirect URLs** (agrega cada una): 
  - `https://primalex.vercel.app/**`
  - `http://localhost:5199/**`

## 3. Google

1. Entra a <https://console.cloud.google.com>, crea un proyecto `Prima Lex`.
2. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo**.
   - Nombre de la app: `Prima Lex`; correo de asistencia: el tuyo.
   - Página principal: `https://primalex.vercel.app`
   - Política de privacidad: `https://primalex.vercel.app/privacidad`
   - Términos del servicio: `https://primalex.vercel.app/terminos`
   - Dominios autorizados: `primalex.vercel.app` (completo, con el nombre del proyecto; `vercel.app` solo no lo acepta). Si Google igual lo rechaza, déjalo vacío.
   - No subas logo (obligaría a verificar la app).
   - Permisos (scopes): `openid`, `email`, `profile` (son los básicos; no piden verificación).
   - Al terminar, presiona **Publicar aplicación** (estado «En producción»). Si la dejas en «Prueba», solo podrán entrar los correos que agregues a mano.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo: **Aplicación web**.
   - **Orígenes autorizados de JavaScript:** `https://primalex.vercel.app` y `http://localhost:5199`.
   - **URI de redireccionamiento autorizados:** `https://TU-PROYECTO.supabase.co/auth/v1/callback` (reemplaza por tu Project URL).
4. Copia el **ID de cliente** y el **Secreto de cliente**.
5. En Supabase: **Authentication → Providers → Google** → activa, pega ambos y guarda.

## 4. Microsoft

Registrar la aplicación en Microsoft Entra ID es gratis (con una cuenta de Azure gratuita; no hace falta activar ningún servicio de pago).

1. Entra a <https://entra.microsoft.com> → **Entra ID → Registros de aplicaciones → Nuevo registro**.
   - Nombre: `Prima Lex`.
   - **Tipos de cuenta compatibles:** *Cualquier inquilino de Entra ID + cuentas personales de Microsoft*. (Así entran estudiantes con correo institucional de Microsoft 365 y con Outlook/Hotmail.)
   - **URI de redirección:** plataforma **Web**, `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
2. En **Información general**, anota el **Id. de aplicación (cliente)**. No es secreto.
3. **Configuración de token → Agregar notificación opcional → Id → `email`** → Agregar. Marca la casilla que pide activar el permiso de Microsoft Graph `email`.
4. **Certificados y secretos → Nuevo secreto de cliente** (descripción `Supabase`, el máximo de 24 meses). Copia el **Valor** en ese momento: solo se muestra una vez (el «Id. de secreto» no sirve). **Anota su vencimiento y ponte un recordatorio**: cuando caduque, el ingreso con Microsoft deja de funcionar hasta que crees otro y lo cambies en Supabase.
5. En Supabase: **Authentication → Sign In / Providers → Azure** → activa **Azure enabled** y pega el ID de cliente, el secreto (Value) y en *Azure Tenant URL* `https://login.microsoftonline.com/common`. **Save**.

Limitación conocida: mientras la aplicación no tenga un *editor verificado*, Microsoft muestra «los usuarios finales no pueden dar consentimiento a aplicaciones multiinquilino nuevas sin editor verificado». Con cuentas personales (Outlook, Hotmail) funciona; en algunas universidades un administrador de TI debe aprobar la app para sus alumnos. Se resuelve verificando el editor (requiere un dominio propio y cuenta en el Partner Center); no es urgente.

## 5. Enlace por correo y SMTP propio

En **Authentication → Providers → Email**: déjalo activado (el propio enlace confirma el correo; **Confirm email** debe seguir activo).

Importante: el envío que trae Supabase por defecto es **muy limitado** (pocos correos por hora) y sirve solo para probar. Para el lanzamiento hace falta SMTP propio, y eso exige un **dominio propio** (un Gmail no puede ser remitente: los correos caen en spam o se rechazan). Orden recomendado:

1. Comprar el dominio (p. ej. `primalex.cl` en nic.cl) y, si quieres, pasar su DNS a Cloudflare (gratis): ahí se hacen también los alias de reenvío (`contacto@`, `soporte@`, `privacidad@`) hacia tu correo personal, sin pagar una casilla.
2. **Resend → Domains → Add Domain**: usa un subdominio (`mail.tudominio.cl`) y la región São Paulo. Agrega en el DNS los registros que muestra (SPF y DKIM) y espera a que diga *Verified*. Agrega también un registro `_dmarc` con `v=DMARC1; p=none`.
3. **Resend → API Keys**: crea una con permiso solo de envío ("Sending access") limitada a ese dominio. No la pegues en el código, en el chat ni en Vercel.
4. **Supabase → Authentication → Emails → SMTP Settings** → activa *Custom SMTP*: remitente `no-responder@mail.tudominio.cl`, nombre `Prima Lex`, host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña = la API key.
5. **Authentication → Rate Limits**: sube el tope de correos por hora según tu volumen.
6. Prueba entrando con el enlace a tu Gmail: debe llegar a la bandeja (no a spam) y, en «Mostrar original», SPF, DKIM y DMARC deben decir *pass*.
7. **Authentication → Email Templates**: traduce el «Magic Link» al español.

Cuando el dominio y los alias existan, recién ahí usa `soporte@` / `privacidad@` en la política de privacidad, en la pantalla de consentimiento de Google y en Flow.

## 6. Conectar la app (Vercel)

1. En Vercel → proyecto **primalex** → **Settings → Environment Variables**, agrega para *Production* y *Preview*:
   - `VITE_SUPABASE_URL` = tu Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clave `anon` (o `publishable`)
2. Haz un nuevo despliegue (Deployments → ⋯ → Redeploy). Aparecerá el botón **Entrar** arriba a la derecha.
3. Para probar en tu computador, crea el archivo `.env.local` en la carpeta del proyecto con esas mismas dos líneas (no se sube a git).
4. Esas mismas dos variables las usa también el **servidor** (`api/anthropic.ts`) para confirmar quién es el usuario (cupo mayor de los juegos): la app manda el token de su sesión y Supabase lo valida. Si faltaran, todos quedarían como visitantes.
5. Las variables `RESEND_API_KEY` y `TOKEN_SECRET` ya no se usan (se eliminó el flujo antiguo de verificación por correo): puedes borrarlas de Vercel.

## 7. Comprobar que quedó bien

```
node scripts/verificar_supabase.mjs
```

Revisa desde fuera, sin claves secretas: proveedores activados (Google, Microsoft, correo), confirmación de correo exigida, que el ingreso con Google y Microsoft redirige a su proveedor, que un visitante no ve datos de otros ni puede borrar cuentas, y que la política de contenido del sitio permite Supabase. Úsalo después de cualquier cambio en el panel. Lo que no se ve desde fuera (restricción de 5 MB, SMTP, vencimiento del secreto de Azure) queda como aviso para revisar a mano.

## Cómo funciona la sincronización

- Al entrar, y luego cada vez que cambias algo (a los pocos segundos), al volver a la pestaña y cada 2 minutos, Prima Lex baja lo que se cambió en otros dispositivos, lo une con lo local —si el mismo elemento se editó en dos lados gana el más reciente— y sube el resultado.
- **Limitación conocida:** si borras algo en un dispositivo y otro todavía lo tiene, puede reaparecer. Se resolverá más adelante.
- Al cerrar sesión los datos se quedan en el dispositivo.
- **Eliminar mi cuenta** (en el perfil) borra la cuenta y la copia en la nube.

## Próximo paso: plan Pro y cobro

La tabla `perfiles` ya tiene la columna `plan`. Cuando exista la cuenta de Flow, el servidor (función de Vercel con la clave `service_role` guardada solo como variable privada) cambiará el plan al recibir el aviso de pago, y las reglas de la base exigirán `pro` para sincronizar.

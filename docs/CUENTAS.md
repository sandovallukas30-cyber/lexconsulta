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
   - Dominios autorizados: `primalex.vercel.app` y `supabase.co`.
   - Permisos (scopes): `openid`, `email`, `profile` (son los básicos; no piden verificación).
   - Al terminar, presiona **Publicar aplicación** (estado «En producción»). Si la dejas en «Prueba», solo podrán entrar los correos que agregues a mano.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo: **Aplicación web**.
   - **Orígenes autorizados de JavaScript:** `https://primalex.vercel.app` y `http://localhost:5199`.
   - **URI de redireccionamiento autorizados:** `https://TU-PROYECTO.supabase.co/auth/v1/callback` (reemplaza por tu Project URL).
4. Copia el **ID de cliente** y el **Secreto de cliente**.
5. En Supabase: **Authentication → Providers → Google** → activa, pega ambos y guarda.

## 4. Microsoft

1. Entra a <https://portal.azure.com> → **Microsoft Entra ID → Registros de aplicaciones → Nuevo registro** (cuenta Microsoft personal gratuita basta).
   - Nombre: `Prima Lex`.
   - **Tipos de cuenta compatibles:** *Cuentas en cualquier directorio de la organización y cuentas Microsoft personales*. (Así entran estudiantes con correo institucional de Microsoft 365 y con Outlook/Hotmail.)
   - **URI de redirección:** plataforma **Web**, `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
2. En la página de la app, anota el **ID de aplicación (cliente)**.
3. **Certificados y secretos → Nuevo secreto de cliente**: copia el **Valor** (solo se muestra una vez; el «ID de secreto» no sirve). Anota su vencimiento: hay que renovarlo antes de esa fecha.
4. **Configuración de tokens → Agregar notificación opcional** → tipo **ID** → marca **email** → agregar (acepta que active el permiso de Graph).
5. En Supabase: **Authentication → Providers → Azure** → activa y pega:
   - Application (client) ID y el secreto (Value).
   - **Azure Tenant URL:** `https://login.microsoftonline.com/common`

## 5. Enlace por correo

En **Authentication → Providers → Email**: déjalo activado (el propio enlace confirma el correo).

Importante: el envío de correos que trae Supabase por defecto es **muy limitado** (pocos correos por hora) y sirve solo para probar. Para el lanzamiento configura un servidor de correo propio en **Project Settings → Authentication → SMTP Settings**. Como el proyecto ya usa **Resend**, puedes usar sus datos SMTP (host `smtp.resend.com`, usuario `resend`, contraseña = tu API key de Resend) con un remitente de un dominio que tengas verificado en Resend.

En **Authentication → Email Templates** puedes traducir el mensaje «Magic Link» al español.

## 6. Conectar la app (Vercel)

1. En Vercel → proyecto **primalex** → **Settings → Environment Variables**, agrega para *Production* y *Preview*:
   - `VITE_SUPABASE_URL` = tu Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clave `anon`
2. Haz un nuevo despliegue (Deployments → ⋯ → Redeploy). Aparecerá el botón **Entrar** arriba a la derecha.
3. Para probar en tu computador, crea el archivo `.env.local` en la carpeta del proyecto con esas mismas dos líneas (no se sube a git).

## Cómo funciona la sincronización

- Al entrar, y luego cada vez que cambias algo (a los pocos segundos), al volver a la pestaña y cada 2 minutos, Prima Lex baja lo que se cambió en otros dispositivos, lo une con lo local —si el mismo elemento se editó en dos lados gana el más reciente— y sube el resultado.
- **Limitación conocida:** si borras algo en un dispositivo y otro todavía lo tiene, puede reaparecer. Se resolverá más adelante.
- Al cerrar sesión los datos se quedan en el dispositivo.
- **Eliminar mi cuenta** (en el perfil) borra la cuenta y la copia en la nube.

## Próximo paso: plan Pro y cobro

La tabla `perfiles` ya tiene la columna `plan`. Cuando exista la cuenta de Flow, el servidor (función de Vercel con la clave `service_role` guardada solo como variable privada) cambiará el plan al recibir el aviso de pago, y las reglas de la base exigirán `pro` para sincronizar.

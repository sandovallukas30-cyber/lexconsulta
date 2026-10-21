// Comprobaciones externas de la configuración de cuentas (Supabase) de Prima Lex.
// Solo usa la URL del proyecto y la clave pública (anon/publishable), que ya viajan en el sitio:
// no necesita ni toca ninguna clave secreta. Pruebas de solo lectura, sin crear usuarios ni correos.
//
//   node scripts/verificar_supabase.mjs                  # toma la URL y la clave del sitio publicado
//   node scripts/verificar_supabase.mjs --sitio https://otro.sitio
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/verificar_supabase.mjs
//
// Sale con código 1 si falla alguna comprobación obligatoria.

import { existsSync, readFileSync } from 'node:fs'

const argSitio = process.argv.indexOf('--sitio')
const SITIO = (argSitio > -1 ? process.argv[argSitio + 1] : 'https://primalex.vercel.app').replace(/\/$/, '')
const PROVEEDORES_ESPERADOS = ['google', 'azure', 'email']

const resultados = []
function marca(nivel, nombre, detalle = '') {
  resultados.push({ nivel, nombre, detalle })
  const icono = nivel === 'ok' ? 'OK   ' : nivel === 'aviso' ? 'AVISO' : 'FALLA'
  console.log(`${icono}  ${nombre}${detalle ? ` — ${detalle}` : ''}`)
}

function leerEnvLocal() {
  const e = {}
  for (const archivo of ['.env.local', '.env']) {
    if (!existsSync(archivo)) continue
    for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linea)
      if (m) e[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return e
}

async function configuracion() {
  const local = leerEnvLocal()
  let url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? local.VITE_SUPABASE_URL
  let clave = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? local.VITE_SUPABASE_ANON_KEY
  if (url && clave) return { url, clave, origen: 'entorno' }

  // Sin variables: se leen del sitio publicado (la clave pública va en el JS por diseño).
  const html = await (await fetch(SITIO)).text()
  const js = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1])
  for (const ruta of js) {
    const codigo = await (await fetch(SITIO + ruta)).text()
    url ??= /https:\/\/[a-z0-9]+\.supabase\.co/.exec(codigo)?.[0]
    clave ??= /sb_publishable_[A-Za-z0-9_-]+/.exec(codigo)?.[0] ?? /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.exec(codigo)?.[0]
    if (url && clave) break
  }
  return { url, clave, origen: SITIO }
}

async function main() {
  const { url, clave, origen } = await configuracion()
  if (!url || !clave) {
    marca('falla', 'Configuración del sitio', `no encontré la URL o la clave pública de Supabase en ${origen}`)
    return
  }
  marca('ok', 'Configuración del sitio', `usa ${url.replace('https://', '').split('.')[0]}… (${origen === 'entorno' ? 'variables locales' : 'leída del sitio publicado'})`)
  const cab = { apikey: clave }

  // 1. Proveedores de ingreso
  const ajustes = await (await fetch(`${url}/auth/v1/settings`, { headers: cab })).json()
  const activos = Object.entries(ajustes.external ?? {}).filter(([, v]) => v).map(([k]) => k)
  for (const p of PROVEEDORES_ESPERADOS) {
    activos.includes(p) ? marca('ok', `Proveedor ${p} activado`) : marca('falla', `Proveedor ${p} activado`, 'está apagado en Authentication → Sign In / Providers')
  }
  const extra = activos.filter((p) => !PROVEEDORES_ESPERADOS.includes(p))
  if (extra.length) marca('aviso', 'Proveedores no previstos activados', extra.join(', '))
  ajustes.disable_signup ? marca('aviso', 'Registro de usuarios nuevos', 'está desactivado: nadie nuevo podrá crear cuenta') : marca('ok', 'Registro de usuarios nuevos permitido')
  ajustes.mailer_autoconfirm ? marca('falla', 'Confirmación de correo', 'mailer_autoconfirm está activo: cualquiera entra con un correo ajeno sin confirmarlo') : marca('ok', 'Confirmación de correo exigida')
  ajustes.external?.anonymous_users ? marca('aviso', 'Ingreso anónimo activado') : marca('ok', 'Ingreso anónimo apagado')

  // 2. El ingreso con Google y Microsoft redirige a su proveedor
  for (const [p, host] of [['google', 'accounts.google.com'], ['azure', 'login.microsoftonline.com']]) {
    const r = await fetch(`${url}/auth/v1/authorize?provider=${p}&redirect_to=${encodeURIComponent(SITIO)}`, { headers: cab, redirect: 'manual' })
    const destino = r.headers.get('location') ?? ''
    r.status === 302 && destino.includes(host)
      ? marca('ok', `Ingreso con ${p} redirige a ${host}`)
      : marca('falla', `Ingreso con ${p} redirige a ${host}`, `respuesta ${r.status}`)
  }

  // 3. Un visitante sin sesión no ve datos ajenos (RLS) ni puede borrar cuentas
  for (const tabla of ['perfiles', 'datos_usuario']) {
    const r = await fetch(`${url}/rest/v1/${tabla}?select=*&limit=1`, { headers: cab })
    const cuerpo = r.ok ? await r.json() : null
    if (r.status === 404) marca('falla', `Tabla ${tabla}`, 'no existe: falta correr docs/supabase/esquema.sql')
    else if (r.ok && Array.isArray(cuerpo) && cuerpo.length === 0) marca('ok', `Tabla ${tabla} sin filas visibles para un visitante`, 'consistente con RLS activo (o tabla vacía)')
    else if (r.ok) marca('falla', `Tabla ${tabla}`, 'un visitante sin sesión puede leer filas: revisa RLS')
    else marca('ok', `Tabla ${tabla} cerrada a visitantes`, `respuesta ${r.status}`)
  }
  const del = await fetch(`${url}/rest/v1/rpc/eliminar_mi_cuenta`, { method: 'POST', headers: { ...cab, 'content-type': 'application/json' }, body: '{}' })
  del.status === 401 || del.status === 403 || del.status === 404
    ? marca('ok', 'eliminar_mi_cuenta cerrada a visitantes', `respuesta ${del.status}`)
    : marca('falla', 'eliminar_mi_cuenta cerrada a visitantes', `respuesta ${del.status}: debería rechazarse sin sesión`)

  // 4. El sitio permite conectarse a Supabase (CSP) y manda cabeceras de seguridad
  const cabs = (await fetch(SITIO)).headers
  const csp = cabs.get('content-security-policy') ?? ''
  csp.includes('supabase.co') ? marca('ok', 'La política de contenido (CSP) permite Supabase') : marca('falla', 'La política de contenido (CSP) permite Supabase', 'falta *.supabase.co en connect-src')
  cabs.get('strict-transport-security') ? marca('ok', 'HSTS activo') : marca('aviso', 'HSTS activo', 'falta la cabecera')

  // 5. Lo que no se puede ver desde fuera
  marca('aviso', 'Revisar a mano en el panel', 'restricción de 5 MB (volver a correr esquema.sql), SMTP propio, vencimiento del secreto de Azure, URL Configuration')
}

await main().catch((e) => marca('falla', 'Error inesperado', e instanceof Error ? e.message : String(e)))
const fallas = resultados.filter((r) => r.nivel === 'falla').length
console.log(`\n${resultados.filter((r) => r.nivel === 'ok').length} correctas, ${resultados.filter((r) => r.nivel === 'aviso').length} avisos, ${fallas} fallas`)
process.exit(fallas ? 1 : 0)

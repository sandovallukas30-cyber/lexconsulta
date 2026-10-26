// Prueba de aislamiento entre cuentas de Prima Lex (Supabase): una cuenta NO debe poder leer, cambiar ni borrar los datos
// de otra, ni cambiarse el plan. Es la prueba más importante de la seguridad de las cuentas.
//
// Usa SOLO dos cuentas de prueba (nunca tus cuentas reales): los intentos de ataque, si la protección fallara, modificarían
// datos. Necesita el token de sesión de cada cuenta; no pide contraseñas ni claves secretas.
//
//   1) En el navegador, con la sesión de la cuenta A iniciada, abre la consola (F12) y ejecuta:
//        JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.includes('auth-token')))).access_token
//      Copia el texto que devuelve. Repite con la cuenta B (otra ventana de incógnito).
//   2) Los tokens duran ~1 hora. Ejecuta (PowerShell):
//        $env:TOKEN_A="..."; $env:TOKEN_B="..."; node scripts/probar_aislamiento.mjs --cuentas-de-prueba
//
// Sale con código 1 si alguna comprobación falla.

if (!process.argv.includes('--cuentas-de-prueba')) {
  console.error('Falta --cuentas-de-prueba: confirma que A y B son cuentas creadas solo para esta prueba.')
  process.exit(2)
}
const { TOKEN_A, TOKEN_B } = process.env
if (!TOKEN_A || !TOKEN_B) {
  console.error('Faltan las variables TOKEN_A y TOKEN_B (ver las instrucciones al inicio del archivo).')
  process.exit(2)
}

const SITIO = 'https://primalex.vercel.app'
const html = await (await fetch(SITIO)).text()
let url, clave
for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)) {
  const codigo = await (await fetch(SITIO + m[1])).text()
  url ??= /https:\/\/[a-z0-9]+\.supabase\.co/.exec(codigo)?.[0]
  clave ??= /sb_publishable_[A-Za-z0-9_-]+/.exec(codigo)?.[0] ?? /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.exec(codigo)?.[0]
  if (url && clave) break
}
if (!url || !clave) {
  console.error('No encontré la URL o la clave pública de Supabase en el sitio.')
  process.exit(2)
}

const idDe = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub
const A = { token: TOKEN_A, id: idDe(TOKEN_A) }
const B = { token: TOKEN_B, id: idDe(TOKEN_B) }
if (A.id === B.id) {
  console.error('A y B son la misma cuenta: usa dos cuentas distintas.')
  process.exit(2)
}

const pedir = async (quien, metodo, ruta, cuerpo) => {
  const r = await fetch(url + '/rest/v1/' + ruta, {
    method: metodo,
    headers: { apikey: clave, Authorization: 'Bearer ' + quien.token, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const texto = await r.text()
  let datos
  try {
    datos = JSON.parse(texto)
  } catch {
    datos = texto
  }
  return { estado: r.status, datos }
}

let fallas = 0
const comprobar = (ok, nombre, detalle = '') => {
  if (!ok) fallas++
  console.log(`${ok ? 'OK   ' : 'FALLA'}  ${nombre}${detalle ? ' — ' + detalle : ''}`)
}
const vacio = (r) => r.estado < 300 && Array.isArray(r.datos) && r.datos.length === 0
const rechazado = (r) => r.estado >= 400

// Preparación: A necesita tener su fila de datos para que el ataque de B sea concluyente
let filaA = await pedir(A, 'GET', `datos_usuario?user_id=eq.${A.id}&select=clave,dispositivo,actualizado`)
if (!Array.isArray(filaA.datos) || filaA.datos.length === 0) {
  const crear = await pedir(A, 'POST', 'datos_usuario', { user_id: A.id, clave: 'respaldo', contenido: { prueba: true }, dispositivo: 'prueba-aislamiento' })
  comprobar(crear.estado < 300, 'Preparación: la cuenta A crea su fila de datos', `HTTP ${crear.estado}`)
  filaA = await pedir(A, 'GET', `datos_usuario?user_id=eq.${A.id}&select=clave,dispositivo,actualizado`)
}
const antes = JSON.stringify(filaA.datos)
comprobar(Array.isArray(filaA.datos) && filaA.datos.length === 1, 'A ve su propia fila de datos', `${filaA.datos?.length ?? 0} fila(s)`)

console.log('\n— La cuenta B intenta atacar los datos de A —')
const lecturaGeneral = await pedir(B, 'GET', 'datos_usuario?select=user_id')
comprobar(
  Array.isArray(lecturaGeneral.datos) && lecturaGeneral.datos.every((f) => f.user_id === B.id),
  'B lista todos los datos y solo ve los suyos',
  `${Array.isArray(lecturaGeneral.datos) ? lecturaGeneral.datos.length : '?'} fila(s)`
)
comprobar(vacio(await pedir(B, 'GET', `datos_usuario?user_id=eq.${A.id}&select=*`)), 'B pide directamente los datos de A: no recibe nada')
comprobar(vacio(await pedir(B, 'PATCH', `datos_usuario?user_id=eq.${A.id}`, { dispositivo: 'ataque-de-B' })), 'B intenta modificar los datos de A: 0 filas afectadas')
comprobar(vacio(await pedir(B, 'DELETE', `datos_usuario?user_id=eq.${A.id}`)), 'B intenta borrar los datos de A: 0 filas afectadas')
comprobar(rechazado(await pedir(B, 'POST', 'datos_usuario', { user_id: A.id, clave: 'respaldo', contenido: { x: 1 }, dispositivo: 'ataque' })), 'B intenta crear una fila a nombre de A: rechazado')
comprobar(vacio(await pedir(B, 'GET', `perfiles?id=eq.${A.id}&select=*`)), 'B pide el perfil (plan) de A: no recibe nada')
comprobar(vacio(await pedir(B, 'PATCH', `perfiles?id=eq.${A.id}`, { plan: 'pro' })), 'B intenta subirle el plan a A: 0 filas afectadas')

console.log('\n— Cada cuenta contra su propio plan y sus límites —')
const planAntes = (await pedir(A, 'GET', `perfiles?id=eq.${A.id}&select=plan`)).datos?.[0]?.plan
const subir = await pedir(A, 'PATCH', `perfiles?id=eq.${A.id}`, { plan: 'pro' })
const planDespues = (await pedir(A, 'GET', `perfiles?id=eq.${A.id}&select=plan`)).datos?.[0]?.plan
comprobar(planDespues === planAntes, 'A intenta ponerse el plan pro: el plan no cambia', `antes: ${planAntes}, después: ${planDespues}, HTTP ${subir.estado}`)
comprobar(rechazado(await pedir(A, 'POST', 'perfiles', { id: A.id, plan: 'pro' })), 'A intenta crear un perfil con plan pro: rechazado')
comprobar(
  rechazado(await pedir(A, 'POST', 'datos_usuario', { user_id: A.id, clave: 'otra-clave', contenido: { x: 1 }, dispositivo: 'prueba' })),
  'A intenta crear una segunda clave de datos (límite de una por cuenta): rechazado'
)

console.log('\n— Comprobación final —')
const despues = JSON.stringify((await pedir(A, 'GET', `datos_usuario?user_id=eq.${A.id}&select=clave,dispositivo,actualizado`)).datos)
comprobar(antes === despues, 'Los datos de A quedaron intactos tras todos los intentos de B')

console.log(`\n${fallas === 0 ? 'Todas las comprobaciones pasaron.' : `${fallas} comprobación(es) fallaron: hay que corregir las políticas antes de seguir.`}`)
process.exit(fallas === 0 ? 0 : 1)

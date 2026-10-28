// Prueba del SQL de las estadísticas de uso (docs/supabase/uso.sql) en un Postgres de verdad que corre dentro de Node (PGlite),
// con roles y auth.uid() simulados al estilo Supabase. Comprueba que el script corre (y se puede repetir), que solo el servidor
// escribe, que solo un administrador lee y que las entradas hostiles quedan acotadas. No toca ninguna base real.
//
//   npm install @electric-sql/pglite --no-save      (una vez; no queda en package.json)
//   node scripts/probar_uso_sql.mjs                  (sale con código 1 si algo falla)
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../docs/supabase/uso.sql', import.meta.url), 'utf8')
const db = new PGlite()

// Lo mínimo de Supabase que el script necesita: roles, esquema auth, auth.users y auth.uid()
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`)

let ok = 0, fallas = 0
const comprobar = (cond, nombre, det = '') => {
  if (cond) ok++; else fallas++
  console.log(`${cond ? 'OK   ' : 'FALLA'}  ${nombre}${det ? ' — ' + det : ''}`)
}
const intentar = async (consulta, rol, sub) => {
  try {
    await db.exec(`reset role; ${rol ? `set role ${rol};` : ''} ${sub ? `select set_config('request.jwt.claim.sub','${sub}',false);` : `select set_config('request.jwt.claim.sub','',false);`}`)
    const r = await db.query(consulta)
    return { ok: true, filas: r.rows }
  } catch (e) {
    return { ok: false, error: String(e.message).split('\n')[0] }
  } finally {
    await db.exec('reset role;')
  }
}

// 1) el script corre completo y se puede volver a correr
try { await db.exec(sql); comprobar(true, 'El script se ejecuta completo') } catch (e) { comprobar(false, 'El script se ejecuta completo', e.message); process.exit(1) }
try { await db.exec(sql); comprobar(true, 'Se puede ejecutar una segunda vez sin romperse') } catch (e) { comprobar(false, 'Segunda ejecución', e.message) }

// 2) el servidor (service_role) registra uso
const ADMIN = '11111111-1111-1111-1111-111111111111'
const NORMAL = '22222222-2222-2222-2222-222222222222'
await db.exec(`insert into auth.users values ('${ADMIN}'), ('${NORMAL}'); insert into public.administradores values ('${ADMIN}');`)
const reg = `select public.registrar_uso('tablet', true, true, '{"apunte.nuevo": 3, "repaso.pista": 1}'::jsonb, '{"hoy": 40, "explorador": 100}'::jsonb)`
let r = await intentar(reg, 'service_role')
comprobar(r.ok, 'service_role puede registrar uso', r.error)
r = await intentar(reg, 'service_role')
comprobar(r.ok, 'registrar dos veces suma (no falla por clave repetida)', r.error)
const tot = await db.query(`select tipo, clave, dispositivo, cantidad::int c, segundos::int s from public.uso_diario order by tipo, clave`)
console.log(tot.rows.map((x) => `${x.tipo}/${x.clave}/${x.dispositivo}: ${x.c} veces, ${x.s} s`).join('\n'))
const get = (t, c) => tot.rows.find((x) => x.tipo === t && x.clave === c)
comprobar(get('sesion', 'nueva')?.c === 2, 'cuenta 2 visitas nuevas tras dos envíos')
comprobar(get('evento', 'apunte.nuevo')?.c === 6, 'suma las veces de cada función (3 + 3)')
comprobar(get('vista', 'explorador')?.s === 200, 'suma los segundos por pantalla (100 + 100)')

// 3) entradas hostiles
r = await intentar(`select public.registrar_uso('televisor', true, true, '{}'::jsonb, '{}'::jsonb)`, 'service_role')
comprobar(!r.ok, 'rechaza un dispositivo no válido', r.error)
await intentar(`select public.registrar_uso('movil', false, false, '{"evento.malo": "abc", "otro": "99999999999", "ok.funcion": 999999}'::jsonb, '{"hoy": -5, "tareas": "x"}'::jsonb)`, 'service_role')
const t2 = await db.query(`select clave, cantidad::int c from public.uso_diario where dispositivo = 'movil'`)
comprobar(t2.rows.length === 1 && t2.rows[0].clave === 'ok.funcion' && t2.rows[0].c === 500, 'ignora los valores que no son números válidos (texto, negativos, demasiado largos) y acota el válido', JSON.stringify(t2.rows))
await intentar(`select public.registrar_uso('movil', false, false, '{"apunte.nuevo": 100000}'::jsonb, '{"hoy": 100000}'::jsonb)`, 'service_role')
const t3 = await db.query(`select tipo, cantidad::int c, segundos::int s from public.uso_diario where dispositivo = 'movil' order by tipo`)
comprobar(t3.rows.find((x) => x.tipo === 'evento')?.c === 500 && t3.rows.find((x) => x.tipo === 'vista')?.s === 3600, 'acota un envío exagerado (500 veces, 3600 s)', JSON.stringify(t3.rows))

// 4) permisos: un visitante o una cuenta común NO pueden escribir ni leer
for (const [rol, sub, nombre] of [['anon', null, 'un visitante sin sesión'], ['authenticated', NORMAL, 'una cuenta común']]) {
  r = await intentar(reg, rol, sub)
  comprobar(!r.ok, `${nombre} NO puede llamar a registrar_uso`, r.error)
  r = await intentar(`select * from public.uso_diario`, rol, sub)
  comprobar(!r.ok, `${nombre} NO puede leer la tabla uso_diario directo`, r.error)
  r = await intentar(`insert into public.uso_diario values (current_date, 'evento', 'x', 'movil', 999, 0)`, rol, sub)
  comprobar(!r.ok, `${nombre} NO puede escribir en uso_diario directo`, r.error)
  r = await intentar(`select * from public.administradores`, rol, sub)
  comprobar(!r.ok, `${nombre} NO puede ver la lista de administradores`, r.error)
  r = await intentar(`insert into public.administradores values ('${NORMAL}')`, rol, sub)
  comprobar(!r.ok, `${nombre} NO puede agregarse como administrador`, r.error)
}
r = await intentar(`select * from public.uso_resumen(current_date - 7, current_date)`, 'anon', null)
comprobar(!r.ok, 'un visitante NO puede pedir el resumen', r.error)
r = await intentar(`select * from public.uso_resumen(current_date - 7, current_date)`, 'authenticated', NORMAL)
comprobar(!r.ok && /No autorizado/.test(r.error ?? ''), 'una cuenta común NO puede pedir el resumen', r.error)
r = await intentar(`select public.es_administrador() as v`, 'authenticated', NORMAL)
comprobar(r.ok && r.filas[0].v === false, 'es_administrador() es falso para una cuenta común', JSON.stringify(r))
r = await intentar(`select public.es_administrador() as v`, 'anon', null)
comprobar(!r.ok, 'un visitante NO puede llamar a es_administrador()', r.error)

// 5) el administrador sí
r = await intentar(`select public.es_administrador() as v`, 'authenticated', ADMIN)
comprobar(r.ok && r.filas[0].v === true, 'es_administrador() es verdadero para el administrador', JSON.stringify(r))
r = await intentar(`select * from public.uso_resumen(current_date - 7, current_date)`, 'authenticated', ADMIN)
comprobar(r.ok && r.filas.length > 0, 'el administrador puede pedir el resumen', r.error ?? `${r.filas?.length} filas`)
r = await intentar(`select * from public.uso_resumen(current_date, current_date - 1)`, 'authenticated', ADMIN)
comprobar(!r.ok, 'rechaza un rango de fechas al revés', r.error)
r = await intentar(`select * from public.uso_resumen(current_date - 1000, current_date)`, 'authenticated', ADMIN)
comprobar(!r.ok, 'rechaza un rango de más de 400 días', r.error)

console.log(`\n${fallas === 0 ? 'Todas pasaron' : fallas + ' fallaron'} (${ok} correctas)`)
process.exit(fallas === 0 ? 0 : 1)


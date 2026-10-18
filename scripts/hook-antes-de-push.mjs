// Hook PreToolUse de Claude Code: antes de un `git push` corre tsc, tests y build.
// Si algo falla, sale con código 2 y Claude ve el motivo (el push no se ejecuta).
import { spawnSync } from 'node:child_process'

let entrada = ''
for await (const trozo of process.stdin) entrada += trozo
let orden = ''
try {
  orden = JSON.parse(entrada)?.tool_input?.command ?? ''
} catch {
  process.exit(0)
}
if (!/\bgit\s+push\b/.test(orden)) process.exit(0)

const pasos = [
  ['tsc', 'npx tsc -b'],
  ['tests', 'npx vitest run'],
  ['build', 'npx vite build'],
]
for (const [nombre, cmd] of pasos) {
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd() })
  if (r.status !== 0) {
    const salida = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-25).join('\n')
    process.stderr.write(`Push bloqueado: falló ${nombre}.\n${salida}\n`)
    process.exit(2)
  }
}
process.exit(0)

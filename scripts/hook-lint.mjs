// Hook PostToolUse de Claude Code: tras editar un archivo de src/ o api/, corre eslint
// solo sobre ese archivo y muestra SOLO errores (los avisos antiguos no estorban).
// Sale con código 2 si hay errores, para que Claude los vea y los corrija enseguida.
import { spawnSync } from 'node:child_process'

let entrada = ''
for await (const trozo of process.stdin) entrada += trozo
let archivo = ''
try {
  archivo = JSON.parse(entrada)?.tool_input?.file_path ?? ''
} catch {
  process.exit(0)
}
const ruta = archivo.split('\\').join('/')
if (!/\/(src|api)\/.+\.(ts|tsx)$/.test(ruta)) process.exit(0)

const r = spawnSync('npx', ['eslint', '--quiet', archivo], {
  shell: true,
  encoding: 'utf8',
  cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
})
if (r.status !== 0) {
  process.stderr.write(`eslint encontró errores en ${archivo}:\n${`${r.stdout ?? ''}${r.stderr ?? ''}`.trim().slice(0, 2500)}\n`)
  process.exit(2)
}
process.exit(0)

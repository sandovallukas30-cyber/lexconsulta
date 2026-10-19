import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // versión (commit corto en Vercel) para los avisos técnicos; no es un dato personal
  define: { __VERSION_APP__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7)) },
  test: {
    // la lógica pura corre en Node; los archivos que tocan localStorage o el
    // store lo piden con un comentario `// @vitest-environment jsdom`
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

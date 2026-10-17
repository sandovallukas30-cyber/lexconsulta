import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // la lógica pura corre en Node; los archivos que tocan localStorage o el
    // store lo piden con un comentario `// @vitest-environment jsdom`
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    ssr: 'worker/index.mjs',
    outDir: 'dist/server',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        format: 'es',
      },
    },
  },
})

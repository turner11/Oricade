import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const guardianDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: guardianDir,
  base: '/Oricade/guardian/',
  build: {
    outDir: fileURLToPath(new URL('../dist/guardian', import.meta.url)),
    emptyOutDir: true,
  },
})

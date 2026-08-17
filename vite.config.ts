import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    /* Tem de ficar em sincronia com `paths` no tsconfig.json e com o alias do
       vitest.config.ts — três sítios, mesma verdade. */
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    /* Ainda sem orçamento de bundle a sério: isso é da Tarefa 19, com medições.
       Este aviso serve só para não deixar o tamanho crescer sem se notar. */
    chunkSizeWarningLimit: 600,
  },
})

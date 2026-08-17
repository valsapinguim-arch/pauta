import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Ver prompts/tasks/00-preparacao-do-projeto.md (decisão 6).
 *
 * O ambiente por omissão é `node`: `@/lib` é lógica pura e deve testar-se sem
 * o custo de arrancar um DOM. Testes que precisem de DOM (componentes, a partir
 * da Tarefa 3) declaram-no no próprio ficheiro:
 *
 *     // @vitest-environment jsdom
 *
 * Preferido a `environmentMatchGlobs` (depreciado) e a projetos separados, que
 * seriam configuração a mais para a dimensão desta suite.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    /* Os e2e são do Playwright (Tarefa 20), não do Vitest. */
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    /* Enquanto não houver testes (Tarefa 0), `pnpm test` não deve falhar. */
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*.d.ts'],
    },
  },
})

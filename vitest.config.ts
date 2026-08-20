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
    /* Extensões do jest-dom (toBeDisabled, toBeInTheDocument, …) — inofensivo
       em testes de @/lib (ambiente node): só toca no DOM quando um matcher é
       mesmo chamado, nunca à importação. */
    setupFiles: ['./src/test/setup.ts'],
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
      /* Cobertura como diagnóstico, não como meta (Tarefa 20, decisão 8) —
         mínimo só em `@/lib`, onde os bugs são silenciosos (uma quantização
         errada não estoura, só produz uma pauta errada); nenhuma meta
         global, que levaria a testes escritos só para subir a percentagem
         em código de interface trivial. Agregado sobre `src/lib/**`
         inteiro (não `perFile`) — um ficheiro individual abaixo do limiar
         não falha sozinho enquanto o conjunto se mantiver acima; é o
         conjunto que importa. Valores escolhidos com folga sobre o estado
         atual (~90-99% por subpasta) — descer para fazer passar uma
         alteração é proibido (ver AGENTS.md). */
      thresholds: {
        'src/lib/**': {
          statements: 85,
          branches: 75,
          functions: 90,
          lines: 85,
        },
      },
    },
  },
})

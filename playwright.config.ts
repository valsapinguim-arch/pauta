import { defineConfig, devices } from '@playwright/test'

/**
 * Configuração do Playwright — Tarefa 20, decisões 6 e 7.
 *
 * Corre sempre sobre o build de produção (`pnpm preview`), nunca `pnpm dev`
 * — o service worker está desativado em desenvolvimento de propósito
 * (`vite.config.ts`, `devOptions.enabled: false`, Tarefa 2), e os testes de
 * PWA/offline não testariam nada sobre `dev`. `webServer` assume que
 * `pnpm build` já correu (não o corre aqui: seria repetir ~20 s a cada
 * arranque do Playwright, e o CI já tem um passo de build próprio) —
 * correr `pnpm build` antes de `pnpm test:e2e` localmente.
 *
 * Um só projeto (Chromium): é o único browser que aceita
 * `--use-fake-device-for-media-stream` com um ficheiro WAV como microfone
 * sintético (decisão 6) — sem isto, o percurso de gravação não tem forma
 * nenhuma de correr sem interação humana.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  /* A suite de regressão (decisão 2) corre inferência real, uma janela do
     modelo de cada vez, dentro do mesmo browser — paralelizar entre
     specs não pouparia tempo de CPU nenhum, só competiria pelo mesmo
     recurso. Mais simples e mais previsível correr tudo em série. */
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

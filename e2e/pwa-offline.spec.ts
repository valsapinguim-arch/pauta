import { expect, test } from '@playwright/test'

/**
 * PWA e offline — Tarefa 20, decisão 7. Sobre `pnpm preview` (produção):
 * o service worker está desativado em `pnpm dev` de propósito (Tarefa 2,
 * `devOptions.enabled: false`) — testar isto em desenvolvimento não
 * testaria nada.
 */
test('o service worker instala-se e a app continua a carregar offline', async ({
  page,
  context,
}) => {
  await page.goto('/')

  // Espera o service worker instalar e assumir controlo — sem isso, o
  // segundo carregamento offline serve o `index.html` da rede (que já não
  // existe offline) em vez da shell em cache.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
    timeout: 15_000,
  })

  await context.setOffline(true)
  await page.reload()

  // A shell continua a aparecer — é a promessa central do produto
  // (Notas/Dependências desta tarefa: "o único sítio onde a promessa
  // central do produto — funciona offline — fica verificada
  // automaticamente").
  await expect(page.getByRole('heading', { name: 'pauta' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('button', { name: 'Gravar' })).toBeVisible()

  await context.setOffline(false)
})

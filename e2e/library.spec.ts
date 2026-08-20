import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const FIXTURES_DIR = path.join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../tests/fixtures/audio',
)

/** Percurso "abrir da biblioteca" — Tarefa 20, decisão 6. Depende da
 *  gravação automática (Tarefa 16, decisão 5): transcrever uma vez já
 *  deixa um registo para abrir a seguir, sem passo nenhum a mais. */
test('uma transcrição guardada aparece na biblioteca e reabre', async ({ page }) => {
  await page.goto('/')

  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(FIXTURES_DIR, 'arpeggio.min.wav'))
  await expect(page.getByRole('img')).toBeVisible({ timeout: 30_000 })

  // Gravação automática tem debounce (Tarefa 16) — dar-lhe tempo antes de
  // sair para a biblioteca, ou o registo ainda não existe no IndexedDB.
  await page.waitForTimeout(1_000)

  await page.getByRole('button', { name: 'Biblioteca' }).click()
  await expect(page.getByText('Ainda não há nada guardado')).not.toBeVisible()

  await page.getByRole('button', { name: 'Abrir' }).first().click()
  await expect(page.getByRole('img')).toBeVisible({ timeout: 10_000 })
})

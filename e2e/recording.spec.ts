import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/**
 * Percurso "gravar (microfone falso) → ver pauta" — Tarefa 20, decisão 6.
 *
 * O Chromium aceita um ficheiro WAV como captura de microfone sintética
 * via `--use-fake-device-for-media-stream` +
 * `--use-file-for-fake-audio-capture` — é a única forma de testar este
 * percurso sem hardware nem interação humana. `test.use` com
 * `launchOptions` só neste ficheiro: os outros percursos não precisam de
 * microfone nenhum.
 */
test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      // Sem isto, `getUserMedia` falha com `NotSupportedError` mesmo com o
      // dispositivo falso — o Chromium também espera este segundo flag
      // (que salta o diálogo de permissão nativo, redundante com
      // `test.use({ permissions })` acima, mas aparentemente necessário
      // aqui) para o ficheiro de captura falsa funcionar. Descoberto por
      // tentativa: sem ele, a app cai no erro `not-supported` genuíno.
      '--use-fake-ui-for-media-stream',
      // Caminho com `/`, não `\` — o Chromium não aceita separadores do
      // Windows neste valor.
      `--use-file-for-fake-audio-capture=${path
        .join(fileURLToPath(new URL('.', import.meta.url)), '../tests/fixtures/audio/scale.min.wav')
        .replace(/\\/g, '/')}`,
    ],
  },
})

test('gravar com o microfone falso produz uma pauta', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Gravar' }).click()

  // Explicador de permissão (Tarefa 4, decisão 6) — primeira vez que se
  // pede o microfone nesta sessão de teste.
  const continueButton = page.getByRole('button', { name: 'Continuar' })
  if (await continueButton.isVisible()) await continueButton.click()

  // Fica em "recording" até se parar — o WAV falso do microfone é curto
  // (Tarefa 19, fixture `scale.min.wav`, ~2s), mas a gravação continua até
  // se carregar em parar, não até o ficheiro acabar (o microfone falso do
  // Chromium repete o ficheiro em loop).
  await expect(page.getByRole('button', { name: 'Parar' })).toBeVisible()
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: 'Parar' }).click()

  await expect(page.getByRole('img')).toBeVisible({ timeout: 30_000 })
})

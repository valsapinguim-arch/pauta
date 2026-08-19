import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/**
 * Percurso "importar ficheiro → ver pauta → exportar" — Tarefa 20,
 * decisão 6. Usa um dos fixtures sintéticos (Tarefa 20, decisão 2), não
 * áudio real — o objetivo aqui é provar que as peças estão ligadas, não
 * avaliar musicologia (decisão 1).
 */

const FIXTURES_DIR = path.join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../tests/fixtures/audio',
)

test('importar ficheiro produz uma pauta e permite exportar', async ({ page }) => {
  await page.goto('/')

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'scale.min.wav'))

  // Processamento tem etapas (Tarefa 6/7) até chegar a "result" — a pauta
  // desenhada (role="img", Tarefa 18) é o sinal de que chegou lá.
  await expect(page.getByRole('img')).toBeVisible({ timeout: 30_000 })

  // Confiança agregada (Tarefa 12) — confirma que o pipeline inteiro
  // correu até ao ScoreDocument final, não só até às notas cruas.
  await expect(page.getByText(/Confiança geral/)).toBeVisible()

  // Exportar MusicXML — não há forma fiável de capturar o ficheiro
  // partilhado/descarregado sem mais infraestrutura; o que se verifica
  // aqui é que o botão está operável e não deixa a app presa a "a
  // exportar" (o `Spinner` desaparece). `force: true`: um toast de
  // instalação/atualização (Tarefa 2) pode estar sobreposto ao botão —
  // legítimo no ecrã real, não um problema do teste.
  const exportButton = page.getByRole('button', { name: 'MusicXML' })
  await expect(exportButton).toBeEnabled()
  await exportButton.click({ force: true })
  await expect(exportButton).toBeEnabled({ timeout: 10_000 })
})

test('recupera de um erro conhecido e volta a idle', async ({ page }) => {
  // Mecanismo de desenvolvimento (Tarefa 3, Âmbito técnico) — só ativo em
  // `import.meta.env.DEV`... mas os testes correm sobre `pnpm preview`
  // (produção, decisão 7 desta tarefa), onde este override NÃO existe. O
  // caminho de erro real é testado importando um ficheiro que falha a
  // decodificação — mais lento, mas exercita o código a sério.
  await page.goto('/')

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'corrompido.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from('isto não é um ficheiro WAV válido'),
  })

  await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 })

  // A ação do erro (`getErrorMessage`, @/strings/errors.ts) é sempre
  // "Tentar novamente" ou "Voltar ao início" — as duas devolvem a `idle`
  // (Tarefa 21, `session.reset`). O `<input type="file">` está sempre
  // escondido por CSS (Tarefa 5, decisão qualquer que seja o estado) — o
  // botão "Gravar", visível só em `idle`, é o sinal certo do regresso.
  await page.getByRole('button', { name: /Tentar novamente|Voltar ao início/ }).click()
  await expect(page.getByRole('button', { name: 'Gravar' })).toBeVisible()
})

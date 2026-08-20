import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/**
 * Testes de regressão sobre os fixtures de áudio (Tarefa 20, decisões 2, 3
 * e 4). Corre a inferência real (nada de duplo de teste aqui — é
 * exatamente o ponto: apanhar uma afinação de limiar que melhora um caso e
 * piora outro em silêncio).
 *
 * O "esperado" é um _snapshot_ do Playwright (`toMatchSnapshot`,
 * `e2e/regression.spec.ts-snapshots/`) — escrito na primeira corrida,
 * comparado nas seguintes, só atualizado com `--update-snapshots`
 * explícito. Cumpre a decisão 3 (nunca regenerar em bloco sem rever) só se
 * quem correr `--update-snapshots` rever o diff a sério antes de
 * committar — a ferramenta não substitui essa disciplina, só a habilita.
 *
 * O que se compara é a lista textual de notas (`describeNotes`, Tarefa 18)
 * e a confiança agregada, não o `ScoreDocument` inteiro em JSON — é texto
 * legível por uma pessoa a rever o diff, que é o objetivo da decisão 3.
 */

const FIXTURES_DIR = path.join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../tests/fixtures/audio',
)

const FIXTURES = ['scale', 'arpeggio', 'rhythm', 'silence', 'noise']

for (const fixture of FIXTURES) {
  test(`regressão: ${fixture}.min.wav`, async ({ page }) => {
    await page.goto('/')
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(FIXTURES_DIR, `${fixture}.min.wav`))

    // `silence`/`noise` são casos limite conhecidos (Âmbito técnico desta
    // tarefa) com três resultados válidos, todos comparáveis: pauta normal,
    // pentagrama vazio (Tarefa 13, decisão 9) ou erro "não se ouviu nada"
    // (Tarefa 4, `too-quiet` — é exatamente o que `silence.min.wav` deve
    // disparar).
    const empty = page.getByText('Nada para desenhar')
    const score = page.getByRole('img')
    const error = page.getByRole('alert')
    await expect(empty.or(score).or(error)).toBeVisible({ timeout: 30_000 })

    if (await score.isVisible()) {
      await page.getByRole('button', { name: 'Ver notas em texto' }).click()
      const notes = await page.getByText(/^Compasso 1:/).textContent()
      const confidence = await page.getByText(/Confiança geral/).textContent()
      expect(`${confidence}\n\n${notes}`).toMatchSnapshot(`${fixture}.txt`)
    } else if (await error.isVisible()) {
      const errorText = await error.textContent()
      expect(`erro: ${errorText}`).toMatchSnapshot(`${fixture}.txt`)
    } else {
      expect('sem notas — pentagrama vazio').toMatchSnapshot(`${fixture}.txt`)
    }
  })
}

import axe from 'axe-core'
import { expect } from 'vitest'

/**
 * Corre `axe-core` sobre um nó já montado e falha o teste com uma mensagem
 * legível se houver violações — Tarefa 18, Âmbito técnico ("adicionar
 * axe-core aos testes de componentes, a falhar em violações").
 *
 * `color-contrast` desligado: o jsdom não faz layout nem pintura a sério
 * (sem motor gráfico), por isso essa regra não tem dados fiáveis para
 * avaliar em ambiente de teste — o axe reportaria falsos positivos ou
 * `incomplete` sistematicamente. O contraste é verificado à parte, a
 * partir dos valores de `tokens.css` (ver `AGENTS.md`, Tarefa 18).
 */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  })

  if (results.violations.length === 0) return

  const summary = results.violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact ?? 'desconhecido'}): ${violation.description}\n` +
        violation.nodes.map((node) => `  - ${node.target.join(' ')}`).join('\n'),
    )
    .join('\n\n')

  expect.fail(`Violações de acessibilidade (axe-core):\n\n${summary}`)
}

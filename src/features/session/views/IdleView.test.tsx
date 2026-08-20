// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it } from 'vitest'
import { expectNoA11yViolations } from '@/test/axe'
import { IdleView } from './IdleView'

/** Cobertura de acessibilidade (Tarefa 18, Âmbito técnico) — o ecrã inicial
 *  é o primeiro que qualquer utilizador vê; comportamento já coberto por
 *  `useRecordingFlow`/`useFilePicker` e pelos testes destes. */
describe('IdleView', () => {
  it('não tem violações de acessibilidade', async () => {
    const { container } = render(
      <IdleView
        onStartRecording={() => {}}
        onPickFile={() => {}}
        onFileInputChange={() => {}}
        onFileDrop={() => {}}
      />,
    )
    await expectNoA11yViolations(container)
  })

  it('não tem violações de acessibilidade com o explicador de permissão aberto', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <IdleView
        onStartRecording={() => {}}
        needsPermissionExplainer
        onConfirmPermissionExplainer={() => {}}
        onPickFile={() => {}}
        onFileInputChange={() => {}}
        onFileDrop={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /gravar/i }))

    await expectNoA11yViolations(container)
  })
})

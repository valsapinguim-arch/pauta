// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, it } from 'vitest'
import { expectNoA11yViolations } from '@/test/axe'
import { ErrorView } from './ErrorView'

describe('ErrorView', () => {
  it('não tem violações de acessibilidade', async () => {
    const { container } = render(
      <ErrorView code="permission-denied" recoverable onRestart={() => {}} />,
    )
    await expectNoA11yViolations(container)
  })
})

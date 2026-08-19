// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, it } from 'vitest'
import { expectNoA11yViolations } from '@/test/axe'
import { ProcessingView } from './ProcessingView'

describe('ProcessingView', () => {
  it('não tem violações de acessibilidade', async () => {
    const { container } = render(
      <ProcessingView stage="transcribing" progress={0.4} onCancel={() => {}} />,
    )
    await expectNoA11yViolations(container)
  })
})

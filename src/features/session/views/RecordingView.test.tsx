// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, it } from 'vitest'
import { expectNoA11yViolations } from '@/test/axe'
import { RecordingView } from './RecordingView'

describe('RecordingView', () => {
  it('não tem violações de acessibilidade', async () => {
    const { container } = render(
      <RecordingView level={0.4} elapsedMs={12_000} onStop={() => {}} onCancel={() => {}} />,
    )
    await expectNoA11yViolations(container)
  })
})

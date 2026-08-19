// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '@/test/axe'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('é decorativo (aria-hidden), para não ser anunciado a par do texto de estado', () => {
    const { container } = render(<Spinner />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<Spinner />)
    await expectNoA11yViolations(container)
  })
})

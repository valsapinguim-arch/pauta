// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Progress } from './Progress'

describe('Progress', () => {
  it('expõe o valor via role progressbar', () => {
    render(<Progress value={0.5} label="A transcrever" />)
    const bar = screen.getByRole('progressbar', { name: 'A transcrever' })
    expect(bar).toHaveAttribute('value', '0.5')
  })

  it('fica indeterminado sem `value`', () => {
    render(<Progress label="A preparar o modelo" />)
    const bar = screen.getByRole('progressbar', { name: 'A preparar o modelo' })
    expect(bar).not.toHaveAttribute('value')
  })

  it('limita o valor a [0, 1]', () => {
    render(<Progress value={1.7} label="A transcrever" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
  })
})

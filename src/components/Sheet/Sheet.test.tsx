// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sheet } from './Sheet'

describe('Sheet', () => {
  it('renderiza o conteúdo passado', () => {
    render(<Sheet>Conteúdo</Sheet>)
    expect(screen.getByText('Conteúdo')).toBeInTheDocument()
  })

  it('aceita atributos HTML normais (ex.: role)', () => {
    render(<Sheet role="region">Conteúdo</Sheet>)
    expect(screen.getByRole('region')).toBeInTheDocument()
  })
})

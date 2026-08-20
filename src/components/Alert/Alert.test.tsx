// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '@/test/axe'
import { Alert } from './Alert'

describe('Alert', () => {
  it('tom "error" usa role="alert" (interrompe o leitor de ecrã)', () => {
    render(<Alert tone="error">Algo correu mal</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Algo correu mal')
  })

  it('tom "info" usa role="status" (não interrompe)', () => {
    render(<Alert tone="info">Aviso discreto</Alert>)
    expect(screen.getByRole('status')).toHaveTextContent('Aviso discreto')
  })

  it('mostra o título quando fornecido', () => {
    render(
      <Alert tone="error" title="Falha">
        Detalhe
      </Alert>,
    )
    expect(screen.getByText('Falha')).toBeInTheDocument()
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(
      <Alert tone="error" title="Falha">
        Detalhe
      </Alert>,
    )
    await expectNoA11yViolations(container)
  })
})

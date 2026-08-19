// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/test/axe'
import { Button } from './Button'

describe('Button', () => {
  it('renderiza o texto passado', () => {
    render(<Button>Gravar</Button>)
    expect(screen.getByRole('button', { name: 'Gravar' })).toBeInTheDocument()
  })

  it('responde a clique', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Gravar</Button>)

    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('fica desativado quando disabled, e não responde a clique', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <Button disabled onClick={onClick}>
        Gravar
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Gravar' })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('é type="button" por omissão, para não submeter formulários por acidente', () => {
    render(<Button>Gravar</Button>)
    expect(screen.getByRole('button', { name: 'Gravar' })).toHaveAttribute('type', 'button')
  })

  it('respeita um type explícito', () => {
    render(<Button type="submit">Enviar</Button>)
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('type', 'submit')
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<Button>Gravar</Button>)
    await expectNoA11yViolations(container)
  })
})

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CloseIcon } from '@/components/icons'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('usa `label` como nome acessível', () => {
    render(<IconButton icon={<CloseIcon />} label="Cancelar" />)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('responde a clique', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<IconButton icon={<CloseIcon />} label="Cancelar" onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('fica desativado quando disabled, e não responde a clique', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<IconButton icon={<CloseIcon />} label="Cancelar" disabled onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Cancelar' })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('o ícone fica marcado decorativo (aria-hidden)', () => {
    render(<IconButton icon={<CloseIcon />} label="Cancelar" />)
    const svg = screen.getByRole('button', { name: 'Cancelar' }).querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Toast } from './Toast'
import { ToastProvider } from './ToastProvider'

describe('Toast', () => {
  it('mostra título e descrição quando aberto', () => {
    render(
      <ToastProvider>
        <Toast open onOpenChange={() => {}} title="Há uma versão nova" description="Detalhe" />
      </ToastProvider>,
    )

    expect(screen.getByText('Há uma versão nova')).toBeInTheDocument()
    expect(screen.getByText('Detalhe')).toBeInTheDocument()
  })

  it('não renderiza nada quando fechado', () => {
    render(
      <ToastProvider>
        <Toast open={false} onOpenChange={() => {}} title="Há uma versão nova" />
      </ToastProvider>,
    )

    expect(screen.queryByText('Há uma versão nova')).not.toBeInTheDocument()
  })

  it('a ação chama o seu onClick', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Toast
          open
          onOpenChange={() => {}}
          title="Há uma versão nova"
          action={{ label: 'Atualizar', onClick }}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Atualizar' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('fechar chama onOpenChange(false)', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Toast open onOpenChange={onOpenChange} title="Há uma versão nova" />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

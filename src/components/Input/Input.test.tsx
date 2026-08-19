// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ChangeEvent } from 'react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('expõe o rótulo acessível e o valor', () => {
    render(<Input label="Título" value="Escala de Dó maior" onChange={() => {}} />)
    const input = screen.getByRole('textbox', { name: 'Título' })
    expect(input).toHaveValue('Escala de Dó maior')
  })

  it('responde a interação do utilizador', async () => {
    const user = userEvent.setup()
    let value = ''
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      value = event.target.value
    }
    const { rerender } = render(<Input label="Título" value={value} onChange={handleChange} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'A')
    rerender(<Input label="Título" value={value} onChange={handleChange} />)

    expect(value).toBe('A')
  })

  it('cobre o estado desativado', () => {
    render(<Input label="Título" value="" onChange={() => {}} disabled />)
    expect(screen.getByRole('textbox', { name: 'Título' })).toBeDisabled()
  })
})

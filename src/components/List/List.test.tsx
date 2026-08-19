// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { List, ListItem } from './List'

describe('List', () => {
  it('renderiza uma lista semântica com os seus itens', () => {
    render(
      <List aria-label="Transcrições">
        <ListItem>Primeira</ListItem>
        <ListItem>Segunda</ListItem>
      </List>,
    )

    const list = screen.getByRole('list', { name: 'Transcrições' })
    expect(list).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('aceita className extra sem substituir a própria', () => {
    render(
      <List className="extra" aria-label="Transcrições">
        <ListItem>Item</ListItem>
      </List>,
    )
    expect(screen.getByRole('list')).toHaveClass('extra')
  })
})

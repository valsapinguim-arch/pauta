// @vitest-environment jsdom
/** `fake-indexeddb/auto` antes de tudo — `LibraryView` lê a biblioteca via
 *  `useLibrary`/`repository` (Tarefa 16), que abrem o IndexedDB a sério. */
import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { describe, it } from 'vitest'
import { expectNoA11yViolations } from '@/test/axe'
import { LibraryView } from './LibraryView'

describe('LibraryView', () => {
  it('não tem violações de acessibilidade (estado vazio)', async () => {
    const { container } = render(<LibraryView onClose={() => {}} onOpen={() => {}} />)

    await screen.findByText(/ainda não há nada guardado/i)

    await expectNoA11yViolations(container)
  })
})

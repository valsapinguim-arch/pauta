// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openLibraryDb, TRANSCRIPTIONS_STORE } from '@/features/library/db'
import { AppErrorBoundary } from './AppErrorBoundary'

function Bomb(): never {
  throw new Error('bum')
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    // A árvore de erro do React escreve na consola mesmo com um boundary —
    // silenciar aqui evita ruído sem esconder um `console.error` real de
    // outro sítio (o teste continua a falhar se a asserção falhar).
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mostra o ecrã de recuperação em vez de propagar o erro', () => {
    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Algo correu mal')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument()
  })

  it('não afirma que há trabalho guardado quando a biblioteca está vazia', async () => {
    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    )

    await waitFor(() => expect(screen.queryByText(/já estava guardada/)).not.toBeInTheDocument())
  })

  it('avisa que a última transcrição ficou guardada quando a biblioteca tem pelo menos um registo (Tarefa 21, decisão 10)', async () => {
    const db = await openLibraryDb()
    await db.add(TRANSCRIPTIONS_STORE, {
      id: 'x',
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
      document: {},
    })

    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    )

    await waitFor(() => expect(screen.getByText(/já estava guardada/)).toBeInTheDocument())
  })
})

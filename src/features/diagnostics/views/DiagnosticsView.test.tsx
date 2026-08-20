// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { logError } from '@/features/diagnostics/errorLog'
import { DiagnosticsView } from './DiagnosticsView'

describe('DiagnosticsView', () => {
  beforeEach(async () => {
    const { clearErrorLog } = await import('@/features/diagnostics/errorLog')
    await clearErrorLog()
    localStorage.clear()
  })

  it('mostra o estado vazio quando não há erros registados', async () => {
    render(<DiagnosticsView onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('Sem erros registados.')).toBeInTheDocument())
  })

  it('mostra as entradas registadas e informação do dispositivo', async () => {
    await logError({
      code: 'too-quiet',
      occurredAt: '2026-01-01T00:00:00.000Z',
      context: 'teste',
      technicalDetails: 'detalhe técnico',
    })

    render(<DiagnosticsView onClose={() => {}} />)

    await waitFor(() => expect(screen.getByText(/too-quiet/)).toBeInTheDocument())
    expect(screen.getByText('Versão da app')).toBeInTheDocument()
  })

  it('a telemetria começa desligada, com o texto a explicar que nada é enviado', () => {
    render(<DiagnosticsView onClose={() => {}} />)
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(false)
    expect(screen.getByText(/Nada é enviado atualmente/)).toBeInTheDocument()
  })
})

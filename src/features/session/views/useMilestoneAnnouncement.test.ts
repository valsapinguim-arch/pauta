// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMilestoneAnnouncement } from './useMilestoneAnnouncement'

describe('useMilestoneAnnouncement', () => {
  it('não anuncia nada antes do primeiro marco (25%)', () => {
    const { result } = renderHook(
      ({ progress }) => useMilestoneAnnouncement('transcribing', progress),
      { initialProps: { progress: 0.1 } },
    )
    expect(result.current).toBe('')
  })

  it('anuncia ao cruzar 25%, 50% e 100%, sem repetir entre atualizações no mesmo marco', () => {
    const { result, rerender } = renderHook(
      ({ progress }) => useMilestoneAnnouncement('transcribing', progress),
      { initialProps: { progress: 0 } },
    )

    rerender({ progress: 0.3 })
    expect(result.current).toBe('25% concluído')

    rerender({ progress: 0.31 }) // ainda no marco dos 25% — não avança
    expect(result.current).toBe('25% concluído')

    rerender({ progress: 0.6 })
    expect(result.current).toBe('50% concluído')

    rerender({ progress: 1 })
    expect(result.current).toBe('Concluído')
  })

  it('reinicia os marcos ao mudar de etapa', () => {
    type Props = { stage: 'preprocessing' | 'transcribing'; progress: number }
    const { result, rerender } = renderHook(
      ({ stage, progress }: Props) => useMilestoneAnnouncement(stage, progress),
      { initialProps: { stage: 'preprocessing', progress: 0.9 } as Props },
    )
    expect(result.current).toBe('75% concluído')

    rerender({ stage: 'transcribing', progress: 0.1 })
    expect(result.current).toBe('75% concluído') // sem marco novo ainda

    rerender({ stage: 'transcribing', progress: 0.3 })
    expect(result.current).toBe('25% concluído')
  })
})

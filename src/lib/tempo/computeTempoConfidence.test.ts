import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { computeTempoConfidence } from './computeTempoConfidence'

function note(startSec: number): NoteEvent {
  return { pitchMidi: 60, startSec, durationSec: 0.2, amplitude: 0.5 }
}

/** 8 onsets exatamente a 120 BPM (período de 0.5 s). */
function gridAlignedNotes(count: number): NoteEvent[] {
  return Array.from({ length: count }, (_, i) => note(i * 0.5))
}

describe('computeTempoConfidence', () => {
  it('confiança máxima quando os onsets caem exatamente na grelha e há evidência suficiente', () => {
    expect(computeTempoConfidence(gridAlignedNotes(8), 120)).toBeCloseTo(1, 5)
  })

  it('penaliza contagens baixas mesmo com alinhamento perfeito', () => {
    const result = computeTempoConfidence(gridAlignedNotes(4), 120)
    expect(result).toBeCloseTo(0.5, 5)
  })

  it('penaliza onsets desalinhados da grelha', () => {
    const irregular = [
      note(0),
      note(0.61),
      note(1.34),
      note(1.79),
      note(2.55),
      note(3.02),
      note(3.71),
      note(4.4),
    ]
    const result = computeTempoConfidence(irregular, 120)
    expect(result).toBeLessThan(0.7)
  })

  it('devolve 0 para entrada vazia ou bpm inválido', () => {
    expect(computeTempoConfidence([], 120)).toBe(0)
    expect(computeTempoConfidence(gridAlignedNotes(8), 0)).toBe(0)
  })
})

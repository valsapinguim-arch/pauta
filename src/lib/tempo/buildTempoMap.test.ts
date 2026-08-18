import { describe, expect, it } from 'vitest'
import type { NoteEvent } from '@/lib/types'
import { buildTempoMap } from './buildTempoMap'

function note(startSec: number): NoteEvent {
  return { pitchMidi: 60, startSec, durationSec: 0.2, amplitude: 0.5 }
}

/** `count` onsets espaçados por `periodSec` — semínimas a um andamento fixo. */
function regularNotes(count: number, periodSec: number): NoteEvent[] {
  return Array.from({ length: count }, (_, i) => note(i * periodSec))
}

describe('buildTempoMap', () => {
  it('onsets a 120 BPM em semínimas dão 120', () => {
    const result = buildTempoMap(regularNotes(12, 0.5))
    expect(result.source).toBe('detected')
    expect(result.bpm).toBeCloseTo(120, 0)
    expect(result.timeSignature).toEqual({ numerator: 4, denominator: 4 })
  })

  it('a mesma sequência interpretada a 60 BPM normaliza para dentro da gama', () => {
    const result = buildTempoMap(regularNotes(12, 1))
    expect(result.source).toBe('detected')
    expect(result.bpm).toBeGreaterThanOrEqual(60)
    expect(result.bpm).toBeLessThanOrEqual(200)
  })

  it('onsets irregulares dão source "assumed" e BPM 120', () => {
    const irregular = [
      note(0),
      note(0.13),
      note(0.29),
      note(0.71),
      note(1.03),
      note(1.58),
      note(2.21),
      note(3.02),
      note(3.9),
    ]
    const result = buildTempoMap(irregular)
    expect(result.source).toBe('assumed')
    expect(result.bpm).toBe(120)
  })

  it('lista com uma só nota não lança e devolve "assumed"', () => {
    const result = buildTempoMap([note(2)])
    expect(result.source).toBe('assumed')
    expect(result.bpm).toBe(120)
    expect(result.firstBeatSec).toBe(2)
  })

  it('lista vazia não lança e devolve "assumed" com firstBeatSec 0', () => {
    const result = buildTempoMap([])
    expect(result.source).toBe('assumed')
    expect(result.firstBeatSec).toBe(0)
  })

  it('o primeiro tempo forte é o primeiro onset, sem procurar anacruse', () => {
    const result = buildTempoMap(regularNotes(12, 0.5).map((n) => note(n.startSec + 3)))
    expect(result.firstBeatSec).toBe(3)
  })
})

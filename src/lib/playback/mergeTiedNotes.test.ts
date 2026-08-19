import { describe, expect, it } from 'vitest'
import type { PlaybackEvent } from './scoreToEvents'
import { mergeTiedNotes } from './mergeTiedNotes'

function event(overrides: Partial<PlaybackEvent> = {}): PlaybackEvent {
  return {
    frequencyHz: 440,
    startSec: 0,
    durationSec: 1,
    measureIndex: 0,
    elementIndex: 0,
    tie: null,
    sourceIndex: null,
    ...overrides,
  }
}

describe('mergeTiedNotes', () => {
  it('notas sem ligadura passam intocadas', () => {
    const events = [event({ elementIndex: 0 }), event({ elementIndex: 1, startSec: 1 })]
    expect(mergeTiedNotes(events)).toHaveLength(2)
  })

  it('funde duas notas ligadas numa só com a duração somada', () => {
    const events = [
      event({ startSec: 0, durationSec: 1, tie: 'start', sourceIndex: 5, elementIndex: 0 }),
      event({ startSec: 1, durationSec: 0.5, tie: 'stop', sourceIndex: 5, elementIndex: 1 }),
    ]

    const merged = mergeTiedNotes(events)

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ startSec: 0, durationSec: 1.5, elementIndex: 0 })
  })

  it('funde uma ligadura de três partes através de um sourceIndex partilhado', () => {
    const events = [
      event({ startSec: 0, durationSec: 1, tie: 'start', sourceIndex: 2 }),
      event({ startSec: 1, durationSec: 1, tie: 'continue', sourceIndex: 2 }),
      event({ startSec: 2, durationSec: 0.25, tie: 'stop', sourceIndex: 2 }),
    ]

    const merged = mergeTiedNotes(events)

    expect(merged).toHaveLength(1)
    expect(merged[0]?.durationSec).toBeCloseTo(2.25, 10)
  })

  it('sourceIndex diferente não funde, mesmo com tie preenchido', () => {
    const events = [
      event({ tie: 'start', sourceIndex: 1 }),
      event({ tie: 'stop', sourceIndex: 2, startSec: 1 }),
    ]
    expect(mergeTiedNotes(events)).toHaveLength(2)
  })

  it('não muta o array de entrada', () => {
    const original = [event({ tie: 'start', sourceIndex: 1, durationSec: 1 })]
    const snapshot = { ...original[0] }
    mergeTiedNotes([
      ...original,
      event({ tie: 'stop', sourceIndex: 1, startSec: 1, durationSec: 1 }),
    ])
    expect(original[0]).toEqual(snapshot)
  })
})

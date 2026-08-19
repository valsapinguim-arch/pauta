import { describe, expect, it } from 'vitest'
import type { NotationNote, NotationRest, ScoreDocument } from '@/lib/types'
import { scoreToEvents } from './scoreToEvents'

function note(overrides: Partial<NotationNote> = {}): NotationNote {
  return {
    kind: 'note',
    step: 'C',
    alter: 0,
    octave: 4,
    pitchMidi: 60,
    noteType: 'quarter',
    dots: 0,
    accidental: null,
    tie: null,
    sourceIndex: null,
    ...overrides,
  }
}

function rest(overrides: Partial<NotationRest> = {}): NotationRest {
  return { kind: 'rest', noteType: 'quarter', dots: 0, ...overrides }
}

function document(overrides: Partial<ScoreDocument> = {}): ScoreDocument {
  return {
    metadata: {
      schemaVersion: 1,
      title: 't',
      createdAt: '2024-01-01T00:00:00.000Z',
      sourceName: null,
      durationSec: 0,
      confidence: { overall: 1, notes: 1, tempo: 1, key: 1 },
    },
    tempo: {
      bpm: 60,
      timeSignature: { numerator: 4, denominator: 4 },
      firstBeatSec: 0,
      confidence: 1,
      source: 'detected',
    },
    key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 1, source: 'detected' },
    clef: 'treble',
    measures: [],
    ...overrides,
  }
}

describe('scoreToEvents', () => {
  it('a 60 BPM cada semínima dura 1 segundo, uma a seguir à outra', () => {
    const doc = document({
      measures: [
        { number: 1, elements: [note({ pitchMidi: 60 }), note({ pitchMidi: 62 })] },
        { number: 2, elements: [note({ pitchMidi: 64 }), note({ pitchMidi: 65 })] },
      ],
    })

    const events = scoreToEvents(doc, 1)

    expect(events).toHaveLength(4)
    expect(events[0]).toMatchObject({
      startSec: 0,
      durationSec: 1,
      measureIndex: 0,
      elementIndex: 0,
    })
    expect(events[1]).toMatchObject({
      startSec: 1,
      durationSec: 1,
      measureIndex: 0,
      elementIndex: 1,
    })
    // compasso 2 começa sempre no tick MEASURE_TICKS, independentemente do
    // que preencheu o compasso 1 — aqui coincide (2 semínimas = 1 compasso).
    expect(events[2]).toMatchObject({
      startSec: 4,
      durationSec: 1,
      measureIndex: 1,
      elementIndex: 0,
    })
  })

  it('pausas não geram evento mas avançam a posição das notas seguintes', () => {
    const doc = document({
      measures: [{ number: 1, elements: [note(), rest(), note()] }],
    })

    const events = scoreToEvents(doc, 1)

    expect(events).toHaveLength(2)
    expect(events[0]?.startSec).toBe(0)
    expect(events[1]?.startSec).toBe(2)
  })

  it('respeita firstBeatSec como deslocamento inicial', () => {
    const doc = document({
      tempo: {
        bpm: 60,
        timeSignature: { numerator: 4, denominator: 4 },
        firstBeatSec: 0.5,
        confidence: 1,
        source: 'detected',
      },
      measures: [{ number: 1, elements: [note()] }],
    })

    expect(scoreToEvents(doc, 1)[0]?.startSec).toBe(0.5)
  })

  it('velocidade 0.5 duplica as durações e os instantes sem alterar frequências', () => {
    const doc = document({
      measures: [{ number: 1, elements: [note({ pitchMidi: 69 }), note({ pitchMidi: 69 })] }],
    })

    const normal = scoreToEvents(doc, 1)
    const slow = scoreToEvents(doc, 0.5)

    expect(slow[0]?.durationSec).toBeCloseTo((normal[0]?.durationSec ?? 0) * 2, 10)
    expect(slow[1]?.startSec).toBeCloseTo((normal[1]?.startSec ?? 0) * 2, 10)
    expect(slow[0]?.frequencyHz).toBeCloseTo(normal[0]?.frequencyHz ?? 0, 10)
  })

  it('preserva tie e sourceIndex para mergeTiedNotes', () => {
    const doc = document({
      measures: [
        {
          number: 1,
          elements: [note({ tie: 'start', sourceIndex: 3 }), note({ tie: 'stop', sourceIndex: 3 })],
        },
      ],
    })

    const [first, second] = scoreToEvents(doc, 1)
    expect(first).toMatchObject({ tie: 'start', sourceIndex: 3 })
    expect(second).toMatchObject({ tie: 'stop', sourceIndex: 3 })
  })
})

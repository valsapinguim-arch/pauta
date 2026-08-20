import { describe, expect, it } from 'vitest'
import { QUANTIZE } from '@/lib/quantize/constants'
import { ticksForNoteType } from '@/lib/quantize/noteDurations'
import type { Measure, NotationElement, ScoreDocument } from '@/lib/types'
import {
  changeDuration,
  changePitch,
  deleteNote,
  insertNote,
  resolveTiedGroup,
  transpose,
} from './edit'

function noteEl(overrides: Partial<NotationElement & { kind: 'note' }> = {}): NotationElement {
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

function restEl(overrides: Partial<NotationElement & { kind: 'rest' }> = {}): NotationElement {
  return { kind: 'rest', noteType: 'quarter', dots: 0, ...overrides }
}

function documentWith(measures: Measure[], overrides: Partial<ScoreDocument> = {}): ScoreDocument {
  return {
    metadata: {
      schemaVersion: 1,
      title: 'Teste',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceName: null,
      durationSec: 4,
      confidence: { overall: 1, notes: 1, tempo: 1, key: 1 },
    },
    tempo: {
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      firstBeatSec: 0,
      confidence: 1,
      source: 'detected',
    },
    key: { tonic: 0, mode: 'major', sharpsOrFlats: 0, confidence: 1, source: 'detected' },
    clef: 'treble',
    measures,
    ...overrides,
  }
}

function measureTicksOf(measure: Measure): number {
  return measure.elements.reduce((sum, element) => {
    const ticks = ticksForNoteType(element.noteType, element.dots)
    return sum + (ticks ?? 0)
  }, 0)
}

describe('changePitch', () => {
  it('altera a altura e a grafia conforme a tonalidade', () => {
    const doc = documentWith([
      {
        number: 1,
        elements: [
          noteEl({ pitchMidi: 60, step: 'C', alter: 0 }),
          restEl({ noteType: 'half', dots: 1 }),
        ],
      },
    ])

    const after = changePitch(doc, { measureNumber: 1, elementIndex: 0 }, 1)
    const note = after.measures[0]?.elements[0]

    expect(note).toMatchObject({ pitchMidi: 61, step: 'C', alter: 1, accidental: 'sharp' })
  })

  it('sem efeito numa pausa', () => {
    const doc = documentWith([{ number: 1, elements: [restEl({ noteType: 'whole' })] }])
    const after = changePitch(doc, { measureNumber: 1, elementIndex: 0 }, 1)
    expect(after).toBe(doc)
  })

  it('edita uma parte de uma nota ligada afeta todas', () => {
    const doc = documentWith([
      {
        number: 1,
        elements: [
          restEl({ noteType: 'half', dots: 1 }),
          noteEl({ pitchMidi: 67, tie: 'start', sourceIndex: 3 }),
        ],
      },
      {
        number: 2,
        elements: [
          noteEl({ pitchMidi: 67, tie: 'stop', sourceIndex: 3 }),
          restEl({ noteType: 'half', dots: 1 }),
        ],
      },
    ])

    const after = changePitch(doc, { measureNumber: 1, elementIndex: 1 }, 2)

    expect(after.measures[0]?.elements[1]).toMatchObject({ pitchMidi: 69 })
    expect(after.measures[1]?.elements[0]).toMatchObject({ pitchMidi: 69 })
  })
})

describe('changeDuration', () => {
  it('mantém o compasso a somar measureTicks', () => {
    const doc = documentWith([
      {
        number: 1,
        elements: [
          noteEl({ noteType: 'quarter' }),
          restEl({ noteType: 'quarter' }),
          noteEl({ noteType: 'quarter' }),
          noteEl({ noteType: 'quarter' }),
        ],
      },
    ])

    const after = changeDuration(doc, { measureNumber: 1, elementIndex: 0 }, 'half', 0)
    const measure = after.measures[0] as Measure

    expect(measure.elements[0]).toMatchObject({ noteType: 'half', dots: 0, kind: 'note' })
    expect(measureTicksOf(measure)).toBe(QUANTIZE.MEASURE_TICKS)
  })

  it('rejeita uma figura que não cabe no espaço livre, mantendo o documento anterior', () => {
    const doc = documentWith([
      {
        number: 1,
        elements: [
          noteEl({ noteType: 'quarter' }),
          noteEl({ noteType: 'quarter' }),
          noteEl({ noteType: 'quarter' }),
          noteEl({ noteType: 'quarter' }),
        ],
      },
    ])

    const after = changeDuration(doc, { measureNumber: 1, elementIndex: 0 }, 'whole', 0)
    expect(after).toBe(doc)
  })
})

describe('deleteNote', () => {
  it('deixa uma pausa da mesma duração', () => {
    // eighth (240) + dotted half (1440) + eighth (240) = 1920.
    const doc = documentWith([
      {
        number: 1,
        elements: [
          noteEl({ noteType: 'eighth' }),
          restEl({ noteType: 'half', dots: 1 }),
          restEl({ noteType: 'eighth' }),
        ],
      },
    ])

    const after = deleteNote(doc, { measureNumber: 1, elementIndex: 0 })

    expect(after.measures[0]?.elements[0]).toEqual({ kind: 'rest', noteType: 'eighth', dots: 0 })
  })
})

describe('insertNote', () => {
  it('substitui uma pausa por uma nota da duração pedida', () => {
    const doc = documentWith([{ number: 1, elements: [restEl({ noteType: 'whole' })] }])

    const after = insertNote(doc, { measureNumber: 1, elementIndex: 0 }, 67, 'quarter')
    const measure = after.measures[0] as Measure

    expect(measure.elements[0]).toMatchObject({ kind: 'note', pitchMidi: 67, noteType: 'quarter' })
    expect(measureTicksOf(measure)).toBe(QUANTIZE.MEASURE_TICKS)
  })

  it('sem efeito quando a posição não é uma pausa', () => {
    const doc = documentWith([{ number: 1, elements: [noteEl({ noteType: 'whole' })] }])
    const after = insertNote(doc, { measureNumber: 1, elementIndex: 0 }, 67, 'quarter')
    expect(after).toBe(doc)
  })
})

describe('transpose', () => {
  it('de +2 semitons sobe todas as notas e atualiza a armação', () => {
    const doc = documentWith([
      {
        number: 1,
        elements: [
          noteEl({ pitchMidi: 60 }),
          noteEl({ pitchMidi: 64 }),
          noteEl({ pitchMidi: 60 }),
          noteEl({ pitchMidi: 64 }),
        ],
      },
    ])

    const after = transpose(doc, 2)

    expect(after.measures[0]?.elements[0]).toMatchObject({ pitchMidi: 62 })
    expect(after.measures[0]?.elements[1]).toMatchObject({ pitchMidi: 66 })
    expect(after.key.tonic).toBe(2)
    expect(after.key.sharpsOrFlats).toBe(2)
  })

  it('de −12 semitons pode mudar a clave', () => {
    const doc = documentWith([
      {
        number: 1,
        elements: [
          noteEl({ pitchMidi: 60 }),
          noteEl({ pitchMidi: 64 }),
          noteEl({ pitchMidi: 60 }),
          noteEl({ pitchMidi: 64 }),
        ],
      },
    ])
    expect(doc.clef).toBe('treble')

    const after = transpose(doc, -12)

    expect(after.clef).toBe('bass')
  })
})

describe('resolveTiedGroup', () => {
  it('devolve só a própria posição para uma nota sem ligadura', () => {
    const doc = documentWith([{ number: 1, elements: [noteEl()] }])
    expect(resolveTiedGroup(doc, { measureNumber: 1, elementIndex: 0 })).toEqual([
      { measureNumber: 1, elementIndex: 0 },
    ])
  })

  it('devolve todas as partes de uma nota ligada', () => {
    const doc = documentWith([
      { number: 1, elements: [noteEl({ tie: 'start', sourceIndex: 5 })] },
      { number: 2, elements: [noteEl({ tie: 'stop', sourceIndex: 5 })] },
    ])

    expect(resolveTiedGroup(doc, { measureNumber: 1, elementIndex: 0 })).toEqual([
      { measureNumber: 1, elementIndex: 0 },
      { measureNumber: 2, elementIndex: 0 },
    ])
  })
})

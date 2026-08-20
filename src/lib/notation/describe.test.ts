import { describe as vitestDescribe, expect, it } from 'vitest'
import type { Measure, NotationElement, ScoreDocument } from '@/lib/types'
import { describeNotes, describeScore } from './describe'

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
      bpm: 96,
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

vitestDescribe('describeScore', () => {
  it('descreve tonalidade, compasso, andamento, clave, número de compassos e tessitura', () => {
    const doc = documentWith([
      {
        number: 1,
        elements: [
          noteEl({ step: 'C', octave: 4, pitchMidi: 60 }),
          noteEl({ step: 'G', octave: 5, pitchMidi: 79 }),
          noteEl({ step: 'E', octave: 4, pitchMidi: 64 }),
          restEl(),
        ],
      },
    ])

    const summary = describeScore(doc)

    expect(summary).toContain('Dó maior')
    expect(summary).toContain('compasso 4/4')
    expect(summary).toContain('96 BPM')
    expect(summary).toContain('clave de sol')
    expect(summary).toContain('1 compasso')
    expect(summary).toContain('de dó4 a sol5')
  })

  it('usa "compassos" no plural e não menciona tessitura sem notas', () => {
    const doc = documentWith([
      { number: 1, elements: [restEl({ noteType: 'whole' })] },
      { number: 2, elements: [restEl({ noteType: 'whole' })] },
    ])

    const summary = describeScore(doc)

    expect(summary).toContain('2 compassos')
    expect(summary).not.toContain(' a ')
  })
})

vitestDescribe('describeNotes', () => {
  it('lista as notas de uma melodia conhecida, compasso a compasso', () => {
    const doc = documentWith([
      {
        number: 1,
        elements: [
          noteEl({ step: 'C', accidental: null, noteType: 'quarter' }),
          noteEl({ step: 'D', accidental: null, noteType: 'eighth' }),
        ],
      },
      {
        number: 2,
        elements: [restEl({ noteType: 'half' })],
      },
    ])

    const notes = describeNotes(doc)

    expect(notes).toBe('Compasso 1: dó semínima, ré colcheia. Compasso 2: pausa de mínima.')
  })

  it('inclui o acidente e marca notas ligadas', () => {
    const doc = documentWith([
      {
        number: 1,
        elements: [noteEl({ step: 'F', accidental: 'sharp', tie: 'start', sourceIndex: 0 })],
      },
    ])

    expect(describeNotes(doc)).toBe('Compasso 1: fá sustenido semínima, ligada.')
  })

  it('marca uma nota pontuada', () => {
    const doc = documentWith([{ number: 1, elements: [noteEl({ noteType: 'half', dots: 1 })] }])

    expect(describeNotes(doc)).toBe('Compasso 1: dó mínima pontuada.')
  })
})
